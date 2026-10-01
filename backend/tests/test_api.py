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


def answer_for(m):
    return {"answer": "성수동"} if m.get("prompt") else {}


def test_health(client):
    assert client.get("/health").json() == {"ok": True}


def test_stay_home_yesterday_gives_outdoor_mission(client):
    client.post("/users/u1/steps", json={"date": YESTERDAY, "steps": 200})
    r = client.get("/users/u1/missions/today", params={"date": DAY}).json()
    assert r["stayed_home"] is True
    assert len(r["missions"]) == 3
    assert ms.CATALOG[r["missions"][0]["id"]].category == "outdoor"
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
        r = client.post(f"/users/u1/missions/{m['id']}/complete", params={"date": DAY},
                        json={**submission_for(m, client), **answer_for(m)})
        assert r.status_code == 200, r.text
        total += r.json()["earned_total"]
    assert r.json()["all_done"]
    expected = sum(m["coins"] for m in missions) + ms.COINS_ALL_DONE_BONUS
    assert total == expected
    assert client.get("/users/u1/coins").json()["coins"] == expected

    # 다시 제출해도 코인은 늘지 않음
    m = missions[0]
    again = client.post(f"/users/u1/missions/{m['id']}/complete", params={"date": DAY},
                        json={**submission_for(m, client), **answer_for(m)}).json()
    assert again["earned_total"] == 0
    assert again["coins"] == expected

    home = client.get("/users/u1/home", params={"date": DAY}).json()
    assert home["missions_done"] == 3
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


def topic_mission_day(client, user):
    for d in range(1, 29):
        date = f"2026-11-{d:02d}"
        missions = client.get(f"/users/{user}/missions/today", params={"date": date}).json()["missions"]
        m = next((m for m in missions if m["id"] == "topic_diary"), None)
        if m:
            return date, m
    pytest.fail("주제 일기 미션이 나온 날이 없음")


def test_topic_mission_shows_todays_topic(client):
    date, m = topic_mission_day(client, "u1")
    topic = client.get("/users/u1/diary/topic", params={"date": date}).json()
    assert m["topic_id"] == topic["id"]
    assert topic["text"] in m["desc"]


def test_writing_topic_diary_completes_mission_and_pays(client):
    date, m = topic_mission_day(client, "u1")
    # 주제 없이 쓰면 주제 미션은 완료 안 됨
    r = client.put(f"/users/u1/diary/{date}", json={"text": "그냥 쓴 일기"}).json()
    assert "topic_diary" not in r["completed_missions"]
    # 오늘의 주제로 쓰면 완료 + 코인
    r = client.put(f"/users/u1/diary/{date}", json={"text": "주제로 쓴 일기", "use_topic": True}).json()
    assert "topic_diary" in r["completed_missions"]
    assert {"id": "topic_diary", "coins": m["coins"]} in r["earned"]
    # 다시 고쳐도 코인은 한 번만
    r = client.put(f"/users/u1/diary/{date}", json={"text": "고친 일기", "use_topic": True}).json()
    assert r["earned"] == []


def test_completing_diary_mission_saves_diary(client):
    date, m = topic_mission_day(client, "u1")
    r = client.post(f"/users/u1/missions/topic_diary/complete", params={"date": date}, json={"text": "미션에서 바로 씀"})
    assert r.status_code == 200
    entry = client.get(f"/users/u1/diary/{date}").json()
    assert entry["text"] == "미션에서 바로 씀"
    assert entry["topic"]["id"] == m["topic_id"]
