"""신고·차단·필터, 오래 쉬었다 돌아온 사용자, 일기 내보내기."""

from app import missions as ms
from app import moderation
from tests.test_api import DAY, client, signup  # noqa: F401  (client는 fixture)
from tests.test_shop import give


# --- 필터 ------------------------------------------------------------------------

def test_filter_catches_spacing_and_digits():
    assert not moderation.is_clean("시 발")
    assert not moderation.is_clean("씨1발 뭐야")
    assert not moderation.is_clean("ㅅㅂ")
    assert moderation.is_clean("오늘 시발점까지 걸었어")      # 제외 목록
    assert moderation.is_clean("불이 꺼져서 일찍 잤어")        # 일상 표현은 막지 않음
    assert moderation.is_clean("방 너무 예쁘다! 또 놀러 올게")


def test_guestbook_and_nickname_filtered(client):
    r = client.post("/users/me/guestbook", json={"author": "손님", "text": "병신같은 방"})
    assert r.status_code == 422 and r.json()["detail"] == moderation.FILTER_MESSAGE
    assert client.post("/users/me/guestbook", json={"author": "ㅅㅂ", "text": "안녕"}).status_code == 422
    assert client.post("/users", json={"nickname": "개새끼"}).status_code == 422
    assert client.get("/nicknames/check", params={"nickname": "존나멋짐"}).json()["available"] is False


# --- 차단 ------------------------------------------------------------------------

def test_block_hides_both_ways(client):
    a, b = signup(client, "에이"), signup(client, "비이")
    client.get(f"/users/{a['id']}/missions/today", params={"date": DAY})
    client.get(f"/users/{b['id']}/missions/today", params={"date": DAY})
    assert client.post(f"/users/{a['id']}/blocks", json={"target_id": b["id"]}).status_code == 201

    # 추천에서 서로 빠짐
    for me, other in ((a, b), (b, a)):
        rooms = client.get(f"/users/{me['id']}/rooms/recommended", params={"date": DAY}).json()["rooms"]
        assert other["id"] not in [r["id"] for r in rooms]
    # 방문·방명록 양쪽 다 막힘
    assert client.post(f"/users/{a['id']}/visits", params={"date": DAY}, json={"visitor_id": b["id"]}).status_code == 403
    assert client.post(f"/users/{b['id']}/visits", params={"date": DAY}, json={"visitor_id": a["id"]}).status_code == 403
    r = client.post(f"/users/{a['id']}/guestbook", params={"date": DAY}, json={"author_id": b["id"], "text": "안녕"})
    assert r.status_code == 403

    assert client.get(f"/users/{a['id']}/blocks").json()["blocked"] == [{"id": b["id"], "nickname": "비이"}]
    assert client.delete(f"/users/{a['id']}/blocks/{b['id']}").status_code == 200
    assert client.post(f"/users/{a['id']}/visits", params={"date": DAY}, json={"visitor_id": b["id"]}).status_code == 200
    assert client.post("/users/me/blocks", json={"target_id": "me"}).status_code == 422


def test_owner_block_hides_old_guestbook_posts(client):
    client.post("/users/owner/guestbook", json={"author_id": "rude", "author": "무례", "text": "흥"})
    client.post("/users/owner/guestbook", json={"author_id": "nice", "author": "친절", "text": "반가워"})
    client.post("/users/owner/blocks", json={"target_id": "rude"})
    texts = [e["text"] for e in client.get("/users/owner/guestbook").json()["entries"]]
    assert texts == ["반가워"]                                   # 방 주인이 차단한 사람 글은 모두에게 안 보임


# --- 신고 ------------------------------------------------------------------------

def post_entry(client, text="별로네"):
    r = client.post("/users/owner/guestbook", json={"author_id": "writer", "author": "글쓴이", "text": text})
    return r.json()["entry"]["id"]


def report(client, reporter, entry_id, params_date=False, **extra):
    return client.post("/reports", params={"date": DAY} if params_date else {},
                       json={"reporter_id": reporter, "target_type": "guestbook",
                             "target_id": str(entry_id), "reason": "abuse", **extra})


def guestbook_ids(client, viewer=None):
    params = {"viewer_id": viewer} if viewer else {}
    return [e["id"] for e in client.get("/users/owner/guestbook", params=params).json()["entries"]]


def old_member(client, nickname):
    """가입한 지 오래된 회원 (가입일을 2026-01-01로 당겨 둔다)."""
    from app.main import app
    u = signup(client, nickname)
    app.state.conn.execute("UPDATE users SET created_at = '2026-01-01 00:00:00' WHERE id = ?", (u["id"],))
    app.state.conn.commit()
    return u["id"]


def test_report_hides_for_reporter_then_everyone(client):
    r1, r2 = old_member(client, "신고하나"), old_member(client, "신고둘")
    eid = post_entry(client)
    r = report(client, r1, eid)
    assert r.status_code == 201 and r.json()["counted"] is True and r.json()["hidden_for_everyone"] is False
    # 신고한 사람에게만 먼저 숨김
    assert eid not in guestbook_ids(client, r1)
    assert eid in guestbook_ids(client, r2) and eid in guestbook_ids(client)
    assert report(client, r1, eid).json()["first_report_by_you"] is False   # 같은 사람 두 번은 한 번으로
    assert eid in guestbook_ids(client)
    assert report(client, r2, eid).json()["hidden_for_everyone"] is True   # 2명 → 모두에게 숨김
    assert eid not in guestbook_ids(client)


def test_new_account_reports_do_not_hide(client):
    """가입 3일 미만 계정·가입 기록 없는 id의 신고는 기록만 하고 숨김 횟수에 안 셈 (Habitica 방식)."""
    eid = post_entry(client)
    fresh = [signup(client, "새계정하나")["id"], signup(client, "새계정둘")["id"], "no-account"]
    for f in fresh:
        r = report(client, f, eid, params_date=True).json()
        assert r["counted"] is False and r["hidden_for_everyone"] is False
        assert eid not in guestbook_ids(client, f)                       # 신고한 본인에게는 숨김
    assert eid in guestbook_ids(client)                                  # 모두에게는 그대로
    # 3일이 지난 뒤에는 셈
    from app.main import app
    app.state.conn.execute("UPDATE users SET created_at = '2026-01-01 00:00:00' WHERE id IN (?, ?)", tuple(fresh[:2]))
    app.state.conn.commit()
    eid2 = post_entry(client, "또")
    for f in fresh[:2]:
        report(client, f, eid2)
    assert eid2 not in guestbook_ids(client)


# --- 혐오 표현 → 방명록 정지 ------------------------------------------------------------

def test_slur_blocks_post_and_suspends_guestbook(client):
    assert moderation.check("틀딱 같아") == "slur" and moderation.check("ㅅㅂ") == "profanity"
    r = client.post("/users/owner/guestbook", params={"date": "2026-10-01"},
                    json={"author_id": "bad", "author": "나쁨", "text": "틀딱 방이네"})
    assert r.status_code == 403 and "2026-10-07까지" in r.json()["detail"]
    ok = {"author_id": "bad", "author": "나쁨", "text": "안녕"}
    assert client.post("/users/owner/guestbook", params={"date": "2026-10-07"}, json=ok).status_code == 403
    assert client.post("/users/owner/guestbook", params={"date": "2026-10-08"}, json=ok).status_code == 200
    # 일반 욕설은 글만 막고 정지는 없음
    r = client.post("/users/owner/guestbook", params={"date": "2026-10-08"},
                    json={"author_id": "rude", "author": "무례", "text": "ㅅㅂ"})
    assert r.status_code == 422
    assert client.post("/users/owner/guestbook", params={"date": "2026-10-08"},
                       json={"author_id": "rude", "author": "무례", "text": "안녕"}).status_code == 200


def test_report_with_block_and_validation(client):
    eid = post_entry(client)
    r = report(client, "r1", eid, block=True).json()
    assert r["blocked"] is True
    assert client.get("/users/r1/blocks").json()["blocked"][0]["id"] == "writer"

    assert report(client, "writer", eid).status_code == 422               # 내 글은 신고 못 함
    assert report(client, "r1", 99999).status_code == 404
    assert report(client, "r1", eid, reason="boring").status_code == 422
    r = client.post("/reports", json={"reporter_id": "r1", "target_type": "user", "target_id": "writer", "reason": "spam"})
    assert r.status_code == 201


def test_delete_guestbook_by_owner_or_author(client):
    eid = post_entry(client)
    assert client.delete(f"/users/owner/guestbook/{eid}", params={"by": "stranger"}).status_code == 403
    assert client.delete(f"/users/owner/guestbook/{eid}", params={"by": "owner"}).json() == {"deleted": eid}
    assert client.delete(f"/users/owner/guestbook/{eid}", params={"by": "owner"}).status_code == 404
    eid2 = post_entry(client)
    assert client.delete(f"/users/owner/guestbook/{eid2}", params={"by": "writer"}).status_code == 200


# --- 오래 쉬었다 돌아온 사용자 --------------------------------------------------------

def test_short_break_welcomes_without_reset(client):
    give(client, "u1", xp=ms.xp_to_reach(4) + 120)                 # LV.4 + 120
    client.get("/users/u1/home", params={"date": "2026-10-01"})
    home = client.get("/users/u1/home", params={"date": "2026-10-06"}).json()   # 4일 쉼
    assert home["welcome_back"]["days_away"] == 4
    assert home["welcome_back"]["level_reset"] is False
    assert home["bubble"] == home["welcome_back"]["message"]
    assert home["level"]["xp_in_level"] == 120
    # 다음 날은 평소대로
    assert client.get("/users/u1/home", params={"date": "2026-10-07"}).json()["welcome_back"] is None


def test_long_break_restarts_same_level(client):
    give(client, "u1", xp=ms.xp_to_reach(4) + 120)
    coins_before = client.get("/users/u1/coins").json()["coins"]
    client.get("/users/u1/home", params={"date": "2026-10-01"})
    home = client.get("/users/u1/home", params={"date": "2026-10-20"}).json()   # 18일 쉼
    back = home["welcome_back"]
    assert (back["days_away"], back["level_reset"], back["xp_reset"]) == (18, True, 120)
    assert back["message"] == "오랜만이야! 다시 와 줘서 정말 반가워."
    assert (home["level"]["level"], home["level"]["xp_in_level"]) == (4, 0)       # 레벨은 그대로
    assert client.get("/users/u1/coins").json()["coins"] == coins_before          # 코인도 그대로
    # 같은 날 다시 불러도 한 번만
    client.get("/users/u1/missions/today", params={"date": "2026-10-20"})
    assert client.get("/users/u1/level").json()["xp_in_level"] == 0


def test_new_user_has_no_welcome_back(client):
    assert client.get("/users/new/home", params={"date": DAY}).json()["welcome_back"] is None


# --- 일기 내보내기 --------------------------------------------------------------------

def test_diary_export_text(client):
    u = signup(client, "기록왕")
    client.put(f"/users/{u['id']}/diary/2026-10-02", json={"text": "공원에 갔다.", "mood": "좋음"})
    client.put(f"/users/{u['id']}/diary/2026-10-01", json={"text": "집에 있었다."})
    r = client.get(f"/users/{u['id']}/diary/export", params={"from": "2026-10-01", "to": "2026-10-31"})
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/plain")
    assert 'filename="mochi-diary-2026-10-01-2026-10-31.txt"' in r.headers["content-disposition"]
    text = r.text
    assert text.startswith("MOCHI 일기 — 기록왕")
    assert "2편" in text
    assert text.index("■ 2026-10-01") < text.index("■ 2026-10-02")                 # 오래된 순
    assert "기분: 좋음" in text and "공원에 갔다." in text
    bad = client.get(f"/users/{u['id']}/diary/export", params={"from": "2026-10-05", "to": "2026-10-01"})
    assert bad.status_code == 422


# --- 쉬어 가기 --------------------------------------------------------------------

def test_rest_prevents_reset(client):
    give(client, "u1", xp=ms.xp_to_reach(4) + 120)
    client.get("/users/u1/home", params={"date": "2026-10-01"})
    r = client.post("/users/u1/rest", params={"date": "2026-10-01"}, json={"days": 10}).json()
    assert (r["resting"], r["start"], r["until"]) == (True, "2026-10-01", "2026-10-10")
    # 18일 안 들어왔지만 그중 9일(10/2~10/10)은 쉬어 가기 → 9일만 쉰 날 → 초기화 없음
    home = client.get("/users/u1/home", params={"date": "2026-10-20"}).json()
    back = home["welcome_back"]
    assert (back["days_away"], back["rest_days"], back["level_reset"]) == (18, 9, False)
    assert back["message"] == "푹 쉬었어? 다시 와 줘서 반가워!"
    assert home["level"]["xp_in_level"] == 120


def test_rest_limits_and_stop(client):
    assert client.post("/users/u1/rest", json={"days": 31}).status_code == 422
    assert client.post("/users/u1/rest", json={"days": 0}).status_code == 422
    client.post("/users/u1/rest", params={"date": "2026-10-01"}, json={"days": 30})
    assert client.get("/users/u1/rest", params={"date": "2026-10-05"}).json()["resting"] is True
    stopped = client.delete("/users/u1/rest", params={"date": "2026-10-05"}).json()
    assert stopped["resting"] is False                                  # 어제(10/4)까지로 끝남
    assert client.get("/users/u1/rest", params={"date": "2026-10-31"}).json()["resting"] is False
