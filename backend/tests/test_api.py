import pytest
from fastapi.testclient import TestClient

from app import missions as ms

DAY = "2026-10-02"
YESTERDAY = "2026-10-01"


def _tiny_jpeg() -> bytes:
    import io
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), (168, 211, 244)).save(buf, "JPEG")
    return buf.getvalue()


JPEG = _tiny_jpeg()   # 서버가 메타데이터를 지우고 다시 저장하므로 진짜 그림이어야 함


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("CAPSTONE_DB", str(tmp_path / "test.db"))
    monkeypatch.setenv("CAPSTONE_UPLOADS", str(tmp_path / "uploads"))
    from app import main
    from app.main import app
    # 테스트 사진(가짜 JPEG)에는 촬영 일시가 없다. 날짜 확인은 tests/test_photo_taken.py에서 따로 본다
    monkeypatch.setattr(main, "ALLOW_PHOTO_WITHOUT_TAKEN_AT", True)
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
    assert r["missions"][1]["kind"] == "photo"           # 10/15: 만보기가 없어 걷기도 사진으로
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
    # 동네를 먼저 묻는 미션(찾아보기)은 10/14부터 매일 미션에 안 나와서, 그날 미션으로 직접 넣고 확인
    from app import db
    from app.main import app
    m = ms.CATALOG["local_food"].to_dict()
    db.save_mission_day(app.state.conn, "u2", {"date": DAY, "stayed_home": None, "missions": [m]})
    r = client.post(f"/users/u2/missions/{m['id']}/complete", params={"date": DAY}, json=submission_for(m, client, "u2"))
    assert r.status_code == 422
    assert m["prompt"] in r.json()["detail"]
    r = client.post(f"/users/u2/missions/{m['id']}/complete", params={"date": DAY},
                    json={**submission_for(m, client, "u2"), "answer": "망원동"})
    assert r.status_code == 200


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
    assert got.content[:2] == b"\xff\xd8"                  # 다시 저장된 JPEG (메타데이터 없음)
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
    """지난 6일 3,000보, 어제 500보 → 어제보다: 600보 / 지난주보다: 평균 2,643보 + 1,000 → 3,700보"""
    seen = {}
    for n in range(40):                      # 사용자마다 고르는 미션이 달라서 여러 명으로 확인
        user = f"walker{n}"
        for d in range(24, 30):
            client.post(f"/users/{user}/steps", json={"date": f"2026-09-{d:02d}", "steps": 3000})
        client.post(f"/users/{user}/steps", json={"date": "2026-09-30", "steps": 500})
        for m in client.get(f"/users/{user}/missions/today", params={"date": "2026-10-01"}).json()["missions"]:
            if m["id"] in ("beat_yesterday", "beat_last_week"):
                seen[m["id"]] = m["min_count"]
    assert seen == {"beat_yesterday": 600, "beat_last_week": 3700}


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
    """출석은 연속 출석표의 오늘 칸 선물 (10/16: 1~7일차 사다리). 하루 한 번."""
    week = client.get("/users/u1/attendance/week", params={"date": DAY}).json()
    assert len(week["days"]) == 7 and week["count"] == 0
    planned = next(d["reward"] for d in week["days"] if d["today"])
    assert week == client.get("/users/u1/attendance/week", params={"date": DAY}).json()   # 같은 날 다시 열어도 같은 선물
    r = client.post("/users/u1/attendance", params={"date": DAY}).json()
    assert r["already_checked_in"] is False
    assert r["gift"]["type"] == planned["type"]
    coins = r["coins"]
    if planned["type"] == "coins":
        assert r["earned_total"] == planned["amount"] == coins
    again = client.post("/users/u1/attendance", params={"date": DAY}).json()
    assert again["already_checked_in"] is True and again["gift"] is None and again["earned_total"] == 0
    assert again["week"]["claimed_today"] is True and again["week"]["count"] == 1

    nxt = client.post("/users/u1/attendance", params={"date": "2026-10-03"}).json()
    assert nxt["already_checked_in"] is False and nxt["gift"] is not None
    assert client.get("/users/u1/home", params={"date": DAY}).json()["checked_in"] is True


def test_level_up_after_enough_missions(client):
    leveled, total_xp, saw_last_week = False, 0, False
    for d in range(1, 10):
        date = f"2026-10-{d:02d}"
        # 8,000보 아래로 매일 더 걸어서 '지난주보다 많이 걷기'도 나오고 채워지게 한다
        walked = 2000 + d * 600
        client.post("/users/u1/steps", json={"date": date, "steps": walked})
        for m in client.get("/users/u1/missions/today", params={"date": date}).json()["missions"]:
            if m["kind"] == "steps" and walked < m["min_count"]:
                continue                     # 8,000보 미션처럼 못 채운 걸음 미션은 건너뛴다
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
    assert r["earned"] == [{"id": "diary", "coins": 15, "xp": 50}]
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
    assert r["earned"] == [{"id": "guestbook", "coins": 12, "xp": 50}]
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
    assert r["earned"] == [{"id": "visit", "coins": 12, "xp": 50}]

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


# --- 주간 미션 ---------------------------------------------------------------------

def weekly_walk(client, user, date):
    photo = upload(client, user).json()["photo_id"]
    return client.post(f"/users/{user}/weekly/nature_walk/complete", params={"date": date}, json={"photos": [photo]})


def test_weekly_nature_walk_twice_on_different_days(client):
    # 2026-10-05(월) ~ 10-11(일)
    w = client.get("/users/u1/weekly", params={"date": "2026-10-07"}).json()
    assert (w["week_start"], w["week_end"]) == ("2026-10-05", "2026-10-11")
    q = w["quests"][0]
    assert (q["id"], q["goal_days"], q["progress"], q["completed"]) == ("nature_walk", 2, 0, False)

    first = weekly_walk(client, "u1", "2026-10-06").json()
    assert first["quest"]["progress"] == 1 and first["earned"] == []
    assert weekly_walk(client, "u1", "2026-10-06").status_code == 409        # 같은 날 두 번은 안 셈

    second = weekly_walk(client, "u1", "2026-10-09").json()
    assert second["quest"]["completed"] is True
    assert (second["earned_total"], second["earned_xp"]) == (50, 100)
    assert second["coins"] == 50

    third = weekly_walk(client, "u1", "2026-10-10").json()                    # 더 해도 보상은 한 번
    assert third["quest"]["progress"] == 2 and third["earned"] == []
    assert client.get("/users/u1/coins").json()["coins"] == 50

    # 다음 주는 새로 시작
    nxt = client.get("/users/u1/weekly", params={"date": "2026-10-12"}).json()["quests"][0]
    assert (nxt["progress"], nxt["done_today"]) == (0, False)


def test_weekly_needs_own_photo_and_shows_in_album(client):
    assert client.post("/users/u1/weekly/nature_walk/complete", params={"date": DAY}, json={}).status_code == 422
    other = upload(client, "u2").json()["photo_id"]
    r = client.post("/users/u1/weekly/nature_walk/complete", params={"date": DAY}, json={"photos": [other]})
    assert r.status_code == 422
    assert client.post("/users/u1/weekly/nope/complete", params={"date": DAY}, json={}).status_code == 404

    assert weekly_walk(client, "u1", DAY).status_code == 200
    photos = client.get("/users/u1/album").json()["photos"]
    assert next(p for p in photos if p["used_for"])["used_for"] == {"type": "weekly", "id": "weekly:nature_walk", "title": "이번 주 자연 속 산책 2번"}


def test_attendance_cycle_rewards():
    """연속 출석표 선물: 1~6일차는 정해진 코인·XP, 7일차는 사람·바퀴마다 정해지는 옷·소품."""
    from datetime import date
    from app import attendance as att
    start = date(2026, 10, 12)
    plan = att.cycle_plan("u1", start, ["sky", "berry"], ["lamp-moon"])
    assert len(plan) == 7 and plan[:6] == att.DAY_REWARDS
    assert plan == att.cycle_plan("u1", start, ["sky", "berry"], ["lamp-moon"])              # 같은 사람·바퀴 → 같음
    kinds = {att.cycle_plan(f"u{u}", start, ["sky"], ["lamp-moon"])[6]["type"] for u in range(50)}
    assert kinds == {"outfit", "decor"}
    assert att.cycle_plan("u1", start, [], [])[6] == att.SPECIAL_FALLBACK


def test_attendance_streak_position():
    from datetime import date, timedelta
    from app import attendance as att
    today = date(2026, 10, 16)
    days = lambda *ago: {(today - timedelta(days=n)).isoformat() for n in ago}
    assert att.position(set(), today) == {"start": today, "index": 0, "streak": 0, "reset": False}
    assert att.position(days(1, 2), today)["index"] == 2                                   # 어제까지 2일 → 오늘 3일차
    assert att.position(days(0, 1, 2), today)["index"] == 2                                # 오늘 받았으면 오늘이 3일차
    p = att.position(days(2, 3), today)                                                    # 어제 빠짐 → 1일차부터
    assert (p["index"], p["start"], p["reset"]) == (0, today, True)
    assert att.position(days(*range(1, 8)), today)["index"] == 0                           # 7일차 다음 = 새 바퀴 1일차
    assert att.position(days(*range(0, 8)), today)["index"] == 0                           # 8일 연속이면 오늘이 새 바퀴 1일차


def test_attendance_streak_api(client):
    """매일 오면 1→2→3일차, 하루 빠지면 다시 1일차."""
    seen = []
    for d in ("2026-10-12", "2026-10-13", "2026-10-14"):
        r = client.post("/users/u1/attendance", params={"date": d}).json()
        seen.append(r["week"]["today_day"])
    assert seen == [1, 2, 3]
    week = client.get("/users/u1/attendance/week", params={"date": "2026-10-15"}).json()
    assert (week["today_day"], week["streak"], week["count"], week["reset"]) == (4, 3, 3, False)
    assert [d["day"] for d in week["days"]] == [1, 2, 3, 4, 5, 6, 7] and week["days"][6]["special"] is True
    gap = client.get("/users/u1/attendance/week", params={"date": "2026-10-17"}).json()   # 10/15·16 안 옴
    assert (gap["today_day"], gap["count"], gap["reset"], gap["week_start"]) == (1, 0, True, "2026-10-17")
    r = client.post("/users/u1/attendance", params={"date": "2026-10-17"}).json()
    assert r["gift"] == {"type": "coins", "amount": 10}                                   # 다시 1일차 선물


def test_attendance_duplicate_item_becomes_coins(client, monkeypatch):
    from app import attendance as att
    monkeypatch.setattr(att, "cycle_plan", lambda *a, **k: [{"type": "outfit", "id": "sky"}] * 7)
    first = client.post("/users/u1/attendance", params={"date": "2026-10-13"}).json()
    assert first["gift"] == {"type": "outfit", "id": "sky", "name": "하늘빛 맨투맨"}
    second = client.post("/users/u1/attendance", params={"date": "2026-10-14"}).json()
    assert second["gift"]["type"] == "coins" and second["gift"]["amount"] == att.DUPLICATE_COINS
    assert second["coins"] == att.DUPLICATE_COINS


def test_profile_nickname_and_bio(client):
    uid = signup(client, "프로필")["id"]
    r = client.patch(f"/users/{uid}", json={"bio": "  산책을 좋아해요  "})
    assert r.status_code == 200 and (r.json()["nickname"], r.json()["bio"]) == ("프로필", "산책을 좋아해요")
    assert client.get(f"/users/{uid}/room").json()["bio"] == "산책을 좋아해요"     # 이웃이 방에서 봄
    r = client.patch(f"/users/{uid}", json={"nickname": "새이름"})
    assert (r.json()["nickname"], r.json()["bio"]) == ("새이름", "산책을 좋아해요")   # 보낸 칸만 바뀜
    assert client.patch(f"/users/{uid}", json={"bio": "가" * 41}).status_code == 422
    assert client.patch(f"/users/{uid}", json={"bio": "시발"}).status_code == 422
    assert client.patch(f"/users/{uid}", json={"bio": ""}).json()["bio"] is None
