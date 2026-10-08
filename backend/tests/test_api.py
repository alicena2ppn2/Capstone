import pytest
from fastapi.testclient import TestClient

from app import missions as ms

DAY = "2026-10-02"
YESTERDAY = "2026-10-01"


JPEG = b"\xff\xd8\xff\xe0" + b"0" * 100


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("CAPSTONE_DB", str(tmp_path / "test.db"))
    monkeypatch.setenv("CAPSTONE_UPLOADS", str(tmp_path / "uploads"))
    from app.main import app
    with TestClient(app) as c:
        yield c


def upload(client, user="u1", content=JPEG, content_type="image/jpeg"):
    return client.post(f"/users/{user}/photos", files={"file": ("sky.jpg", content, content_type)})


def submission_for(m, client=None, user="u1"):
    if m["kind"] in ("text", "diary"):
        return {"text": "했어요"}
    if m["kind"] == "photo":
        return {"photos": [upload(client, user).json()["photo_id"] for _ in range(m["min_count"])]}
    if m["kind"] == "list":
        return {"items": [f"항목{i}" for i in range(m["min_count"])]}
    return {}


def do_mission(client, user, m, date):
    """미션 하나를 실제 사용 흐름대로 끝내고 응답(earned·leveled_up 포함)을 돌려준다."""
    if m["kind"] == "visit":
        # 방문 미션: 다른 친구 방에 놀러 가면 자동 완료
        r = client.post(f"/users/friend-of-{user}/visits", params={"date": date}, json={"visitor_id": user})
    elif m["kind"] == "guestbook":
        # 방명록 미션: 다른 친구 방에 쓰면 자동 완료
        r = client.post(f"/users/friend-of-{user}/guestbook", params={"date": date},
                        json={"author": user, "text": "놀러 왔어요", "author_id": user})
    else:
        r = client.post(f"/users/{user}/missions/{m['id']}/complete", params={"date": date},
                        json={**submission_for(m, client, user), **answer_for(m)})
    assert r.status_code == 200, r.text
    return r.json()


def answer_for(m):
    return {"answer": "성수동"} if m.get("prompt") else {}


def test_health(client):
    assert client.get("/health").json() == {"ok": True}


def test_stay_home_yesterday_gives_outdoor_mission(client):
    client.post("/users/u1/steps", json={"date": YESTERDAY, "steps": 200})
    r = client.get("/users/u1/missions/today", params={"date": DAY}).json()
    assert r["stayed_home"] is True
    assert len(r["missions"]) == 8                      # 매일 고정 5개 + 매일 바뀌는 3개
    assert [m["id"] for m in r["missions"][:5]] == ["attendance", "walk", "diary", "visit", "guestbook"]
    assert r["missions"][1]["min_count"] == 8000
    assert r["missions"][5]["category"] == "outdoor"
    assert all(not m["done"] for m in r["missions"])


def test_missions_are_fixed_for_the_day(client):
    a = client.get("/users/u1/missions/today", params={"date": DAY}).json()
    client.post("/users/u1/steps", json={"date": YESTERDAY, "steps": 9000})   # 나중에 걸음이 바뀌어도
    b = client.get("/users/u1/missions/today", params={"date": DAY}).json()
    assert a == b


def test_complete_all_pays_coins_once(client):
    client.post("/users/u1/steps", json={"date": YESTERDAY, "steps": 200})
    missions = client.get("/users/u1/missions/today", params={"date": DAY}).json()["missions"]
    # 걸음 미션이면 오늘 걸음을 충분히 올려 둔다
    client.post("/users/u1/steps", json={"date": DAY, "steps": 9000})

    total = 0
    for m in missions:
        r = do_mission(client, "u1", m, DAY)
        total += sum(i["coins"] for i in r["earned"])
    assert r["all_done"]
    expected = sum(m["coins"] for m in missions)
    assert total == expected
    assert client.get("/users/u1/coins").json()["coins"] == expected

    # 다시 제출해도 코인은 늘지 않음
    m = missions[-1]
    again = client.post(f"/users/u1/missions/{m['id']}/complete", params={"date": DAY},
                        json={**submission_for(m, client), **answer_for(m)}).json()
    assert again["earned_total"] == 0
    assert again["coins"] == expected

    home = client.get("/users/u1/home", params={"date": DAY}).json()
    assert home["missions_done"] == 8
    assert home["checked_in"] is True
    assert home["step_goal"] == 8000
    assert home["coins"] == expected


def test_incomplete_submission_rejected(client):
    missions = client.get("/users/u1/missions/today", params={"date": DAY}).json()["missions"]
    m = next(m for m in missions if m["kind"] in ("text", "photo", "list"))
    r = client.post(f"/users/u1/missions/{m['id']}/complete", params={"date": DAY}, json=answer_for(m))
    assert r.status_code == 422
    assert client.get("/users/u1/coins").json()["coins"] == 0


def test_prompt_answer_required(client):
    # 동네를 먼저 묻는 미션이 나오는 날을 찾아서 확인
    for d in range(1, 29):
        date = f"2026-11-{d:02d}"
        missions = client.get("/users/u2/missions/today", params={"date": date}).json()["missions"]
        m = next((m for m in missions if m.get("prompt")), None)
        if m:
            r = client.post(f"/users/u2/missions/{m['id']}/complete", params={"date": date}, json=submission_for(m, client, "u2"))
            assert r.status_code == 422
            assert m["prompt"] in r.json()["detail"]
            return
    pytest.skip("prompt 미션이 나온 날이 없음")


def test_not_todays_mission_404(client):
    r = client.post("/users/u1/missions/not_a_mission/complete", params={"date": DAY}, json={"text": "x"})
    assert r.status_code == 404


def test_bad_date_422(client):
    assert client.get("/users/u1/missions/today", params={"date": "10/02"}).status_code == 422


def test_guestbook(client):
    client.post("/users/u1/guestbook", json={"author": "루비", "text": "예쁜 방이에요"})
    client.post("/users/u1/guestbook", json={"author": "준호", "text": "또 올게요"})
    entries = client.get("/users/u1/guestbook").json()["entries"]
    assert [e["author"] for e in entries] == ["준호", "루비"]
    assert client.post("/users/u1/guestbook", json={"author": "a", "text": ""}).status_code == 422


# --- 사진 ------------------------------------------------------------------------

def test_upload_and_view_photo(client):
    r = upload(client)
    assert r.status_code == 200
    got = client.get(r.json()["url"])
    assert got.status_code == 200
    assert got.content == JPEG
    assert got.headers["content-type"] == "image/jpeg"


def test_upload_rejects_non_image(client):
    assert upload(client, content=b"hello", content_type="text/plain").status_code == 415
    assert upload(client, content=b"").status_code == 422


def photo_mission_day(client, user):
    """사진 미션이 나오는 날짜를 찾는다."""
    for d in range(1, 29):
        date = f"2026-11-{d:02d}"
        missions = client.get(f"/users/{user}/missions/today", params={"date": date}).json()["missions"]
        m = next((m for m in missions if m["kind"] == "photo"), None)
        if m:
            return date, m
    pytest.fail("사진 미션이 나온 날이 없음")


def test_photo_mission_needs_real_upload(client):
    date, m = photo_mission_day(client, "u1")
    r = client.post(f"/users/u1/missions/{m['id']}/complete", params={"date": date}, json={"photos": ["made-up-id"]})
    assert r.status_code == 422

    photo_id = upload(client, "u1").json()["photo_id"]
    r = client.post(f"/users/u1/missions/{m['id']}/complete", params={"date": date}, json={"photos": [photo_id]})
    assert r.status_code == 200
    assert r.json()["earned_total"] >= m["coins"]


def test_cannot_use_someone_elses_photo(client):
    date, m = photo_mission_day(client, "u1")
    other = upload(client, "u2").json()["photo_id"]
    r = client.post(f"/users/u1/missions/{m['id']}/complete", params={"date": date}, json={"photos": [other]})
    assert r.status_code == 422


def test_relative_step_missions_use_uploaded_steps(client):
    """지난 6일 3,000보, 어제 500보 → 어제보다: 600보 / 지난주보다: 평균 2,643보 → 2,700보"""
    seen = {}
    for n in range(40):                      # 사용자마다 고르는 미션이 달라서 여러 명으로 확인
        user = f"walker{n}"
        for d in range(24, 30):
            client.post(f"/users/{user}/steps", json={"date": f"2026-09-{d:02d}", "steps": 3000})
        client.post(f"/users/{user}/steps", json={"date": "2026-09-30", "steps": 500})
        for m in client.get(f"/users/{user}/missions/today", params={"date": "2026-10-01"}).json()["missions"]:
            if m["id"] in ("beat_yesterday", "beat_last_week"):
                seen[m["id"]] = m["min_count"]
    assert seen == {"beat_yesterday": 600, "beat_last_week": 2700}


# --- 일기 ------------------------------------------------------------------------

def test_diary_topic_is_stable(client):
    a = client.get("/users/u1/diary/topic", params={"date": DAY}).json()
    assert a == client.get("/users/u1/diary/topic", params={"date": DAY}).json()
    assert a["text"] and a["id"].startswith("t")


def test_write_and_read_diary(client):
    photo = upload(client).json()["photo_id"]
    r = client.put(f"/users/u1/diary/{DAY}", json={"text": "산책했다", "use_topic": True, "mood": "좋음", "photos": [photo]})
    assert r.status_code == 200
    topic = client.get("/users/u1/diary/topic", params={"date": DAY}).json()
    assert r.json()["entry"]["topic"]["id"] == topic["id"]

    got = client.get(f"/users/u1/diary/{DAY}").json()
    assert got["text"] == "산책했다" and got["mood"] == "좋음" and got["photos"] == [photo]

    # 고치기
    client.put(f"/users/u1/diary/{DAY}", json={"text": "산책하고 빵 샀다"})
    got = client.get(f"/users/u1/diary/{DAY}").json()
    assert got["text"] == "산책하고 빵 샀다" and got["topic"] is None

    entries = client.get("/users/u1/diary", params={"from": "2026-10-01", "to": "2026-10-31"}).json()["entries"]
    assert [e["date"] for e in entries] == [DAY]
    assert client.get("/users/u1/diary/2026-10-03").status_code == 404


def test_diary_rejects_unknown_photo(client):
    r = client.put(f"/users/u1/diary/{DAY}", json={"text": "x", "photos": ["nope"]})
    assert r.status_code == 422




# --- 출석·레벨 ---------------------------------------------------------------------

def test_attendance_once_a_day(client):
    r = client.post("/users/u1/attendance", params={"date": DAY}).json()
    assert r["already_checked_in"] is False
    assert r["earned_total"] == ms.COINS_DAILY and r["earned_xp"] == ms.XP_DAILY
    assert r["level"]["level"] == 1

    again = client.post("/users/u1/attendance", params={"date": DAY}).json()
    assert again["already_checked_in"] is True
    assert again["earned_total"] == 0

    nxt = client.post("/users/u1/attendance", params={"date": "2026-10-03"}).json()
    assert nxt["already_checked_in"] is False
    assert client.get("/users/u1/coins").json()["coins"] == 2 * ms.COINS_DAILY
    assert client.get("/users/u1/home", params={"date": DAY}).json()["checked_in"] is True


def test_level_up_after_enough_missions(client):
    leveled, total_xp, saw_last_week = False, 0, False
    for d in range(1, 10):
        date = f"2026-10-{d:02d}"
        # 매일 조금씩 더 걸어서 '지난주보다 많이 걷기'도 채운다
        client.post("/users/u1/steps", json={"date": date, "steps": 9000 + d * 300})
        for m in client.get("/users/u1/missions/today", params={"date": date}).json()["missions"]:
            leveled = do_mission(client, "u1", m, date)["leveled_up"] or leveled
            total_xp += m["xp"]
            saw_last_week = saw_last_week or m["id"] == "beat_last_week"
    level = client.get("/users/u1/level").json()
    assert leveled and saw_last_week
    assert level == {"user_id": "u1", **ms.level_from_xp(total_xp)}
    home = client.get("/users/u1/home", params={"date": "2026-10-09"}).json()
    assert home["level"] == {k: v for k, v in level.items() if k != "user_id"}


# --- 매일 고정: 일기·방명록 ---------------------------------------------------------

def test_any_diary_completes_daily_diary_mission(client):
    m = client.get("/users/u1/missions/today", params={"date": DAY}).json()["missions"][2]
    assert m["id"] == "diary"
    r = client.put(f"/users/u1/diary/{DAY}", json={"text": "주제 말고 다른 이야기"}).json()
    assert r["completed_missions"] == ["diary"]
    assert r["earned"] == [{"id": "diary", "coins": 40, "xp": 100}]
    # 고쳐도 다시 주지 않음
    assert client.put(f"/users/u1/diary/{DAY}", json={"text": "고침"}).json()["earned"] == []


def test_completing_diary_mission_saves_diary_with_suggested_topic(client):
    m = client.get("/users/u1/missions/today", params={"date": DAY}).json()["missions"][2]
    r = client.post("/users/u1/missions/diary/complete", params={"date": DAY}, json={"text": "미션에서 바로 씀"})
    assert r.status_code == 200
    entry = client.get(f"/users/u1/diary/{DAY}").json()
    assert entry["text"] == "미션에서 바로 씀"
    assert entry["topic"]["id"] == m["suggested_topic_id"]


def test_guestbook_in_friends_room_completes_mission(client):
    # 미션 완료 버튼만 누르면 안 됨
    assert client.post("/users/u1/missions/guestbook/complete", params={"date": DAY}, json={}).status_code == 422
    # 내 방에 쓴 건 인정 안 함
    r = client.post("/users/u1/guestbook", params={"date": DAY}, json={"author": "나", "text": "내 방", "author_id": "u1"}).json()
    assert r["completed_missions"] == []
    # 친구 방에 쓰면 자동 완료 + 보상
    client.get("/users/u1/missions/today", params={"date": DAY})
    r = client.post("/users/u2/guestbook", params={"date": DAY}, json={"author": "나", "text": "놀러 왔어요", "author_id": "u1"}).json()
    assert r["completed_missions"] == ["guestbook"]
    assert r["earned"] == [{"id": "guestbook", "coins": 30, "xp": 100}]
    # 같은 날 또 써도 보상은 한 번
    r = client.post("/users/u3/guestbook", params={"date": DAY}, json={"author": "나", "text": "또 왔어요", "author_id": "u1"}).json()
    assert r["earned"] == []
    assert client.get("/users/u2/guestbook").json()["entries"][0]["author_id"] == "u1"


def test_guestbook_without_author_id_still_works(client):
    r = client.post("/users/u2/guestbook", json={"author": "손님", "text": "안녕"})
    assert r.status_code == 200
    assert r.json()["completed_missions"] == []


# --- 친구 방 놀러 가기 ----------------------------------------------------------------

def test_visit_friends_room_completes_mission(client):
    client.get("/users/u1/missions/today", params={"date": DAY})
    assert client.post("/users/u1/missions/visit/complete", params={"date": DAY}, json={}).status_code == 422
    assert client.post("/users/u1/visits", params={"date": DAY}, json={"visitor_id": "u1"}).status_code == 422

    r = client.post("/users/u2/visits", params={"date": DAY}, json={"visitor_id": "u1"}).json()
    assert r["first_visit_today"] is True
    assert r["completed_missions"] == ["visit"]
    assert r["earned"] == [{"id": "visit", "coins": 30, "xp": 100}]

    again = client.post("/users/u2/visits", params={"date": DAY}, json={"visitor_id": "u1"}).json()
    assert again["first_visit_today"] is False and again["earned"] == []
    assert client.get("/users/u2/visits", params={"date": DAY}).json()["visitors"] == [{"id": "u1", "nickname": None}]


def test_recommended_rooms_are_recent_other_users(client):
    for u, d in [("a", "2026-10-01"), ("b", DAY), ("old", "2026-09-01")]:
        client.get(f"/users/{u}/missions/today", params={"date": d})
    client.get("/users/me/missions/today", params={"date": DAY})
    rooms = client.get("/users/me/rooms/recommended", params={"date": DAY}).json()["rooms"]
    assert [r["id"] for r in rooms] == ["b", "a"]


# --- 사용자 ------------------------------------------------------------------------

def signup(client, nickname):
    r = client.post("/users", json={"nickname": nickname})
    assert r.status_code == 201, r.text
    return r.json()


def test_signup_and_profile(client):
    me = signup(client, "  모찌  러버 ")
    assert me["nickname"] == "모찌 러버"           # 앞뒤·연속 공백 정리
    assert len(me["id"]) == 32
    got = client.get(f"/users/{me['id']}").json()
    assert got["nickname"] == "모찌 러버"
    assert got["level"]["level"] == 1
    assert client.get("/users/nobody").status_code == 404


@pytest.mark.parametrize("name", ["가", "열세글자닉네임은너무길어요", "   "])
def test_nickname_length(client, name):
    assert client.post("/users", json={"nickname": name}).status_code == 422


def test_nickname_unique_ignoring_case_and_spaces(client):
    signup(client, "Mochi Lover")
    assert client.post("/users", json={"nickname": "mochilover"}).status_code == 409
    check = client.get("/nicknames/check", params={"nickname": "MOCHI lover"}).json()
    assert check["available"] is False
    assert client.get("/nicknames/check", params={"nickname": "새 이름"}).json()["available"] is True


def test_rename(client):
    a = signup(client, "에이")
    b = signup(client, "비이")
    assert client.patch(f"/users/{a['id']}", json={"nickname": "비이"}).status_code == 409
    assert client.patch(f"/users/{a['id']}", json={"nickname": "에이 "}).status_code == 200   # 내 이름 그대로는 허용
    r = client.patch(f"/users/{a['id']}", json={"nickname": "새에이"}).json()
    assert r["nickname"] == "새에이"
    assert client.patch("/users/nobody", json={"nickname": "아무개"}).status_code == 404


def test_names_shown_for_visits_and_rooms(client):
    a = signup(client, "놀러감")
    b = signup(client, "방주인")
    client.get(f"/users/{b['id']}/missions/today", params={"date": DAY})
    client.post(f"/users/{b['id']}/visits", params={"date": DAY}, json={"visitor_id": a["id"]})
    visitors = client.get(f"/users/{b['id']}/visits", params={"date": DAY}).json()["visitors"]
    assert visitors == [{"id": a["id"], "nickname": "놀러감"}]
    rooms = client.get(f"/users/{a['id']}/rooms/recommended", params={"date": DAY}).json()["rooms"]
    assert any(r["id"] == b["id"] and r["nickname"] == "방주인" for r in rooms)


def test_guestbook_uses_nickname_when_author_missing(client):
    a = signup(client, "글쓴이")
    r = client.post("/users/someone/guestbook", params={"date": DAY}, json={"text": "안녕", "author_id": a["id"]})
    assert r.status_code == 200
    assert r.json()["entry"]["author"] == "글쓴이"
    assert client.post("/users/someone/guestbook", json={"text": "익명"}).status_code == 422


def test_delete_account_removes_everything(client, tmp_path):
    a = signup(client, "지울사람")
    b = signup(client, "남는사람")
    uid = a["id"]
    client.post(f"/users/{uid}/steps", json={"date": DAY, "steps": 9000})
    client.post(f"/users/{uid}/attendance", params={"date": DAY})
    photo = upload(client, uid).json()["photo_id"]
    client.put(f"/users/{uid}/diary/{DAY}", json={"text": "일기", "photos": [photo]})
    client.post(f"/users/{b['id']}/visits", params={"date": DAY}, json={"visitor_id": uid})
    client.post(f"/users/{b['id']}/guestbook", params={"date": DAY}, json={"text": "흔적", "author_id": uid})
    client.post(f"/users/{uid}/guestbook", params={"date": DAY}, json={"text": "내 방 글", "author": "손님"})
    assert len(list((tmp_path / "uploads").iterdir())) == 1

    assert client.delete(f"/users/{uid}").json() == {"deleted": uid}

    assert client.get(f"/users/{uid}").status_code == 404
    assert client.get(f"/users/{uid}/coins").json()["coins"] == 0
    assert client.get(f"/users/{uid}/diary/{DAY}").status_code == 404
    assert client.get(f"/photos/{photo}").status_code == 404
    assert list((tmp_path / "uploads").iterdir()) == []
    assert client.get(f"/users/{b['id']}/visits", params={"date": DAY}).json()["visitors"] == []
    assert client.get(f"/users/{b['id']}/guestbook").json()["entries"] == []
    assert client.get(f"/users/{uid}/guestbook").json()["entries"] == []
    # 닉네임은 다시 쓸 수 있다
    assert signup(client, "지울사람")["nickname"] == "지울사람"
    # 다른 사람은 그대로
    assert client.get(f"/users/{b['id']}").status_code == 200
    assert client.delete("/users/nobody").status_code == 404


def test_default_date_is_seoul(client, monkeypatch):
    from datetime import date
    from app import main
    monkeypatch.setattr(main, "seoul_today", lambda: date(2026, 12, 25))
    assert client.get("/users/u1/missions/today").json()["date"] == "2026-12-25"


def test_recommended_rooms_prefer_similar_level(client):
    from tests.test_shop import give
    # 나: LV.5 / 이웃: LV.1, LV.4, LV.5, LV.6, LV.12
    give(client, "me", xp=ms.xp_to_reach(5))
    for u, lv in [("lv1", 1), ("lv4", 4), ("lv5", 5), ("lv6", 6), ("lv12", 12)]:
        if lv > 1:
            give(client, u, xp=ms.xp_to_reach(lv))
        client.get(f"/users/{u}/missions/today", params={"date": DAY})
    r = client.get("/users/me/rooms/recommended", params={"date": DAY, "limit": 5}).json()
    assert r["my_level"] == 5
    ids = [x["id"] for x in r["rooms"]]
    assert ids[0] == "lv5"                                  # 같은 레벨이 먼저
    assert set(ids[1:3]) == {"lv4", "lv6"}                  # 그다음 ±1
    assert ids[3:] == ["lv1", "lv12"]                       # 멀수록 뒤 (부족하면 채움)
    lv12 = next(x for x in r["rooms"] if x["id"] == "lv12")
    assert (lv12["level"], lv12["level_diff"], lv12["similar"]) == (12, 7, False)
    assert next(x for x in r["rooms"] if x["id"] == "lv6")["similar"] is True

    # 개수 제한이면 가까운 레벨만
    near = client.get("/users/me/rooms/recommended", params={"date": DAY, "limit": 3}).json()["rooms"]
    assert {x["id"] for x in near} == {"lv5", "lv4", "lv6"}
