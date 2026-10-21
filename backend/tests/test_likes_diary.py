"""방명록 좋아요, 일기 삭제."""

from tests.test_api import client  # noqa: F401  (client는 fixture)


# --- 방명록 좋아요 ------------------------------------------------------------------

def test_guestbook_like_and_unlike(client):
    eid = client.post("/users/owner/guestbook", json={"author_id": "writer", "author": "글쓴이", "text": "안녕"}).json()["entry"]["id"]
    r = client.post(f"/users/owner/guestbook/{eid}/like", json={"user_id": "fan1"}).json()
    assert (r["likes"], r["liked"]) == (1, True)
    client.post(f"/users/owner/guestbook/{eid}/like", json={"user_id": "fan1"})             # 두 번 눌러도 1
    client.post(f"/users/owner/guestbook/{eid}/like", json={"user_id": "fan2"})
    entry = client.get("/users/owner/guestbook", params={"viewer_id": "fan1"}).json()["entries"][0]
    assert (entry["likes"], entry["liked"]) == (2, True)
    assert client.get("/users/owner/guestbook").json()["entries"][0]["liked"] is False      # 보는 사람 없으면 false

    r = client.delete(f"/users/owner/guestbook/{eid}/like", params={"by": "fan1"}).json()
    assert (r["likes"], r["liked"]) == (1, False)
    assert client.post(f"/users/other/guestbook/{eid}/like", json={"user_id": "fan1"}).status_code == 404   # 다른 방 글 아님
    assert client.post("/users/owner/guestbook/99999/like", json={"user_id": "fan1"}).status_code == 404


def test_like_blocked_author_and_cleanup(client):
    eid = client.post("/users/owner/guestbook", json={"author_id": "writer", "author": "글쓴이", "text": "안녕"}).json()["entry"]["id"]
    client.post("/users/fan/blocks", json={"target_id": "writer"})
    assert client.post(f"/users/owner/guestbook/{eid}/like", json={"user_id": "fan"}).status_code == 404
    client.post(f"/users/owner/guestbook/{eid}/like", json={"user_id": "fan2"})
    client.delete(f"/users/owner/guestbook/{eid}", params={"by": "owner"})                  # 글 지우면 좋아요도 지움
    from app.main import app
    assert app.state.conn.execute("SELECT COUNT(*) AS n FROM guestbook_likes").fetchone()["n"] == 0


# --- 일기 삭제 ---------------------------------------------------------------------

def test_delete_diary_then_rewrite(client):
    client.put("/users/u1/diary/2026-10-05", json={"text": "지울 일기"})
    assert client.delete("/users/u1/diary/2026-10-05").json() == {"deleted": "2026-10-05"}
    assert client.get("/users/u1/diary/2026-10-05").status_code == 404
    assert client.delete("/users/u1/diary/2026-10-05").status_code == 404
    # 10/21: 지운 날도 다시 쓸 수 있다
    r = client.put("/users/u1/diary/2026-10-05", json={"text": "다시 쓰기"})
    assert r.status_code == 200 and client.get("/users/u1/diary/2026-10-05").json()["text"] == "다시 쓰기"
    client.delete("/users/u1/diary/2026-10-05")
    assert client.delete("/users/u1/diary/2026-10-06").status_code == 404
    # 다른 날은 그대로 쓸 수 있음, 내보내기에도 지운 날은 없음
    client.put("/users/u1/diary/2026-10-06", json={"text": "남은 일기"})
    text = client.get("/users/u1/diary/export", params={"from": "2026-10-01", "to": "2026-10-31"}).text
    assert "남은 일기" in text and "지울 일기" not in text


def test_rewrite_after_delete_keeps_reward_once(client):
    day_ = "2026-10-05"
    client.get("/users/u1/missions/today", params={"date": day_})
    done = client.put(f"/users/u1/diary/{day_}", json={"text": "오늘 기록"}).json()
    coins = client.get("/users/u1/coins").json()["coins"]
    assert any(e["id"] == "diary" for e in done["earned"])
    client.delete(f"/users/u1/diary/{day_}")
    assert client.get("/users/u1/coins").json()["coins"] == coins                           # 받은 보상은 그대로
    again = client.put(f"/users/u1/diary/{day_}", json={"text": "다시 쓴 기록"})            # 10/21: 다시 쓸 수 있음
    assert again.status_code == 200 and again.json()["earned"] == []                       # 보상은 두 번 주지 않음
    r = client.post("/users/u1/missions/diary/complete", params={"date": day_}, json={"text": "다시"})
    assert r.status_code == 200 and r.json()["earned"] == []
    assert client.get("/users/u1/coins").json()["coins"] == coins
