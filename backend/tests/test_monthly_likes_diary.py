"""월간 목표, 방명록 좋아요, 일기 삭제."""

from tests.test_api import client, upload  # noqa: F401  (client는 fixture)


def record_completion(user, date, mission_id):
    """테스트용: 미션 완료 기록을 직접 넣는다."""
    from app.main import app
    app.state.conn.execute("INSERT INTO completions (user_id, date, mission_id, submission) VALUES (?, ?, ?, '{}')",
                           (user, date, mission_id))
    app.state.conn.commit()


def goal(client, goal_id, date="2026-10-20"):
    goals = client.get("/users/u1/monthly", params={"date": date}).json()["goals"]
    return next(g for g in goals if g["id"] == goal_id)


# --- 월간 목표 ---------------------------------------------------------------------

def test_monthly_outdoor_counts_outdoor_missions_and_walks(client):
    for d in range(1, 8):                                   # 바깥 미션 7번
        record_completion("u1", f"2026-10-{d:02d}", "drink_run")
    record_completion("u1", "2026-10-08", "meal_photo")    # 집 미션은 안 셈
    record_completion("u1", "2026-09-30", "drink_run")     # 지난달은 안 셈
    g = goal(client, "month_outdoor")
    assert (g["progress"], g["target"], g["done"], g["claimed"]) == (7, 8, False, False)
    assert client.post("/users/u1/monthly/month_outdoor/claim", params={"date": "2026-10-20"}).status_code == 422

    # 주간 산책 사진도 바깥 1번으로
    photo = upload(client).json()["photo_id"]
    client.post("/users/u1/weekly/nature_walk/complete", params={"date": "2026-10-09"}, json={"photos": [photo]})
    assert goal(client, "month_outdoor")["done"] is True

    r = client.post("/users/u1/monthly/month_outdoor/claim", params={"date": "2026-10-20"}).json()
    assert (r["earned_total"], r["earned_xp"], r["goal"]["claimed"]) == (150, 300, True)
    assert client.post("/users/u1/monthly/month_outdoor/claim", params={"date": "2026-10-25"}).status_code == 409
    # 다음 달은 새로
    nxt = goal(client, "month_outdoor", "2026-11-02")
    assert (nxt["progress"], nxt["claimed"]) == (0, False)


def test_monthly_diary_days(client):
    for d in range(1, 11):
        client.put(f"/users/u1/diary/2026-10-{d:02d}", json={"text": f"{d}일 기록"})
    g = client.get("/users/u1/monthly", params={"date": "2026-10-15"}).json()
    assert (g["month"], g["month_start"], g["month_end"]) == ("2026-10", "2026-10-01", "2026-10-31")
    assert goal(client, "month_diary")["done"] is True
    assert client.post("/users/u1/monthly/month_diary/claim", params={"date": "2026-10-15"}).status_code == 200
    assert client.post("/users/u1/monthly/nope/claim").status_code == 404


def test_month_range_edges():
    from datetime import date
    from app import missions as ms
    assert ms.month_range(date(2026, 2, 10)) == (date(2026, 2, 1), date(2026, 2, 28))
    assert ms.month_range(date(2026, 12, 31)) == (date(2026, 12, 1), date(2026, 12, 31))


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

def test_delete_diary_blocks_rewrite(client):
    client.put("/users/u1/diary/2026-10-05", json={"text": "지울 일기"})
    assert client.delete("/users/u1/diary/2026-10-05").json() == {"deleted": "2026-10-05"}
    assert client.get("/users/u1/diary/2026-10-05").status_code == 404
    r = client.put("/users/u1/diary/2026-10-05", json={"text": "다시 쓰기"})
    assert r.status_code == 409 and r.json()["detail"] == "지운 날의 일기는 다시 쓸 수 없어요."
    assert client.delete("/users/u1/diary/2026-10-05").status_code == 404
    assert client.delete("/users/u1/diary/2026-10-06").status_code == 404
    # 다른 날은 그대로 쓸 수 있음, 내보내기에도 지운 날은 없음
    client.put("/users/u1/diary/2026-10-06", json={"text": "남은 일기"})
    text = client.get("/users/u1/diary/export", params={"from": "2026-10-01", "to": "2026-10-31"}).text
    assert "남은 일기" in text and "지울 일기" not in text


def test_deleted_day_blocks_diary_mission_and_keeps_reward(client):
    day_ = "2026-10-05"
    client.get("/users/u1/missions/today", params={"date": day_})
    done = client.put(f"/users/u1/diary/{day_}", json={"text": "오늘 기록"}).json()
    coins = client.get("/users/u1/coins").json()["coins"]
    assert any(e["id"] == "diary" for e in done["earned"])
    client.delete(f"/users/u1/diary/{day_}")
    assert client.get("/users/u1/coins").json()["coins"] == coins                           # 받은 보상은 그대로
    r = client.post("/users/u1/missions/diary/complete", params={"date": day_}, json={"text": "다시"})
    assert r.status_code == 409
