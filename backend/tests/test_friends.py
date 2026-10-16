"""친구: 닉네임으로 요청 → 수락, 목록, 끊기, 차단과의 관계."""

from tests.test_api import DAY, client, signup  # noqa: F401  (client는 fixture)


def add(client, me, nickname):
    return client.post(f"/users/{me}/friends", json={"nickname": nickname})


def test_request_accept_and_list(client):
    a, b = signup(client, "모찌"), signup(client, "Dango")
    r = add(client, a["id"], " dan go ")                      # 대소문자·띄어쓰기 무시
    assert r.status_code == 201 and r.json()["status"] == "pending"

    a_view = client.get(f"/users/{a['id']}/friends").json()
    b_view = client.get(f"/users/{b['id']}/friends").json()
    assert [x["nickname"] for x in a_view["sent"]] == ["Dango"] and a_view["friends"] == []
    assert [x["nickname"] for x in b_view["received"]] == ["모찌"]

    r = client.post(f"/users/{b['id']}/friends/{a['id']}/accept")
    assert r.json()["status"] == "accepted"
    for me, other in ((a, b), (b, a)):
        view = client.get(f"/users/{me['id']}/friends").json()
        assert [x["id"] for x in view["friends"]] == [other["id"]]
        assert view["received"] == [] and view["sent"] == []
    card = client.get(f"/users/{a['id']}/friends").json()["friends"][0]
    assert set(card) == {"id", "nickname", "level", "last_active", "visited_today", "since", "friendship"}
    assert (card["friendship"]["level"], card["friendship"]["name"], card["friendship"]["points"]) == (1, "새 친구", 0)
    assert card["level"] == 1 and card["visited_today"] is False


def test_mutual_request_becomes_friends(client):
    a, b = signup(client, "에이"), signup(client, "비이")
    add(client, a["id"], "비이")
    r = add(client, b["id"], "에이")                          # 서로 요청하면 바로 친구
    assert r.json()["status"] == "accepted"
    assert add(client, a["id"], "비이").status_code == 409   # 이미 친구


def test_request_errors(client):
    a = signup(client, "혼자")
    assert add(client, a["id"], "없는사람").status_code == 404
    assert add(client, a["id"], "혼자").status_code == 422
    b = signup(client, "상대")
    add(client, a["id"], "상대")
    assert add(client, a["id"], "상대").status_code == 409   # 이미 보냄
    assert client.post(f"/users/{a['id']}/friends/{b['id']}/accept").status_code == 404   # 내가 보낸 요청은 내가 수락 못 함


def test_remove_cancel_decline(client):
    a, b, c = signup(client, "하나"), signup(client, "둘이"), signup(client, "셋이")
    add(client, a["id"], "둘이")
    assert client.delete(f"/users/{a['id']}/friends/{b['id']}").status_code == 200        # 보낸 요청 취소
    add(client, a["id"], "셋이")
    assert client.delete(f"/users/{c['id']}/friends/{a['id']}").status_code == 200        # 받은 요청 거절
    add(client, a["id"], "둘이")
    client.post(f"/users/{b['id']}/friends/{a['id']}/accept")
    assert client.delete(f"/users/{b['id']}/friends/{a['id']}").status_code == 200        # 친구 끊기
    assert client.get(f"/users/{a['id']}/friends").json() == {"friends": [], "received": [], "sent": []}
    assert client.delete(f"/users/{b['id']}/friends/{a['id']}").status_code == 404


def test_block_removes_friend_and_hides_request(client):
    a, b = signup(client, "친구가"), signup(client, "친구나")
    add(client, a["id"], "친구나")
    client.post(f"/users/{b['id']}/friends/{a['id']}/accept")
    client.post(f"/users/{b['id']}/blocks", json={"target_id": a["id"]})
    assert client.get(f"/users/{a['id']}/friends").json()["friends"] == []
    # 차단 관계면 찾을 수 없음 (누가 차단했는지 알리지 않음)
    assert add(client, a["id"], "친구나").status_code == 404
    assert add(client, b["id"], "친구가").status_code == 404


def test_visited_today_and_recommended_flag(client):
    a, b = signup(client, "놀러가"), signup(client, "놀러와")
    add(client, a["id"], "놀러와")
    client.post(f"/users/{b['id']}/friends/{a['id']}/accept")
    client.get(f"/users/{b['id']}/missions/today", params={"date": DAY})
    client.post(f"/users/{b['id']}/visits", params={"date": DAY}, json={"visitor_id": a["id"]})
    card = client.get(f"/users/{a['id']}/friends", params={"date": DAY}).json()["friends"][0]
    assert card["visited_today"] is True and card["last_active"] == DAY
    rooms = client.get(f"/users/{a['id']}/rooms/recommended", params={"date": DAY}).json()["rooms"]
    assert next(r for r in rooms if r["id"] == b["id"])["is_friend"] is True


def test_delete_account_removes_friendships(client):
    a, b = signup(client, "떠나요"), signup(client, "남아요")
    add(client, a["id"], "남아요")
    client.post(f"/users/{b['id']}/friends/{a['id']}/accept")
    client.delete(f"/users/{a['id']}")
    assert client.get(f"/users/{b['id']}/friends").json()["friends"] == []


# --- 친밀도 ------------------------------------------------------------------------

def make_friends(client, n1, n2):
    a, b = signup(client, n1), signup(client, n2)
    add(client, a["id"], n2)
    client.post(f"/users/{b['id']}/friends/{a['id']}/accept")
    return a["id"], b["id"]


def write(client, author, owner, date):
    r = client.post(f"/users/{owner}/guestbook", params={"date": date}, json={"author_id": author, "text": "놀러 왔어"})
    assert r.status_code == 200, r.text
    return r.json()["friendship"]


def coins(client, user):
    return client.get(f"/users/{user}/coins").json()["coins"]


def test_guestbook_grows_friendship_and_pays_both(client):
    a, b = make_friends(client, "방명록왕", "받는이")
    first = write(client, a, b, "2026-10-01")
    assert (first["gained"], first["points"], first["level"], first["leveled_up"]) == (2, 2, 1, False)
    assert write(client, a, b, "2026-10-01")["gained"] == 0            # 같은 날 두 번째는 안 셈
    second = write(client, a, b, "2026-10-02")                         # 4점 → LV.2 아는 사이
    assert (second["level"], second["name"], second["leveled_up"], second["earned_coins"]) == (2, "아는 사이", True, 20)
    # 두 사람 모두 20코인 (방명록 미션 보상과 별개로 장부 항목 friend:*:lv2)
    for me, other in ((a, b), (b, a)):
        from app.main import app
        row = app.state.conn.execute("SELECT coins FROM coin_ledger WHERE user_id = ? AND item_id = ?",
                                     (me, f"friend:{other}:lv2")).fetchone()
        assert row["coins"] == 20
    card = client.get(f"/users/{b}/friends").json()["friends"][0]["friendship"]
    assert (card["level"], card["points"], card["next_level_at"], card["points_to_next"], card["next_reward"]) == (2, 4, 12, 8, 40)


def test_both_sides_add_up_with_visits(client):
    a, b = make_friends(client, "오가는", "사이좋")
    client.get(f"/users/{a}/missions/today", params={"date": "2026-10-01"})
    client.get(f"/users/{b}/missions/today", params={"date": "2026-10-01"})
    v = client.post(f"/users/{b}/visits", params={"date": "2026-10-01"}, json={"visitor_id": a}).json()["friendship"]
    assert (v["gained"], v["points"]) == (1, 1)
    write(client, b, a, "2026-10-01")                                  # 상대가 쓴 것도 같은 점수에
    r = client.post(f"/users/{a}/visits", params={"date": "2026-10-01"}, json={"visitor_id": b}).json()["friendship"]
    assert (r["points"], r["level"]) == (4, 2)


def test_not_friends_grow_friendship_without_coins(client):
    """10/15: 친구가 아니어도 서로 교류하면 친밀도가 쌓인다. 레벨업 코인은 친구 사이만."""
    a, b = signup(client, "모르는"), signup(client, "사이임")
    for d in ("2026-10-01", "2026-10-02"):
        bond = write(client, a["id"], b["id"], d)
    assert (bond["points"], bond["level"], bond["is_friend"], bond["earned_coins"]) == (4, 2, False, 0)
    assert client.get(f"/users/{a['id']}/coins").json()["coins"] == 0
    client.post(f"/users/{a['id']}/visits", params={"date": "2026-10-02"}, json={"visitor_id": b["id"]})
    f = client.get(f"/users/{b['id']}/friendship/{a['id']}").json()
    assert (f["points"], f["level"], f["name"], f["is_friend"]) == (5, 2, "아는 사이", False)
    assert f["counts"] == {"mine": {"visit": 1, "guestbook": 0, "like": 0}, "theirs": {"visit": 0, "guestbook": 2, "like": 0}}


def test_like_grows_friendship_once_a_day(client):
    a, b = signup(client, "글쓴이"), signup(client, "좋아요")
    entry = client.post(f"/users/{b['id']}/guestbook", params={"date": "2026-10-01"}, json={"text": "안녕", "author_id": a["id"]}).json()["entry"]
    r = client.post(f"/users/{b['id']}/guestbook/{entry['id']}/like", json={"user_id": b["id"]}).json()
    assert r["friendship"]["gained"] == 1
    client.delete(f"/users/{b['id']}/guestbook/{entry['id']}/like", params={"by": b["id"]})
    again = client.post(f"/users/{b['id']}/guestbook/{entry['id']}/like", json={"user_id": b["id"]}).json()
    assert again["friendship"]["gained"] == 0                       # 다시 눌러도 그날은 한 번만
    assert client.get(f"/users/{a['id']}/friendship/{b['id']}").json()["counts"]["theirs"]["like"] == 1


def test_friendship_reward_only_once_after_refriend(client):
    a, b = make_friends(client, "다시만", "남이야")
    write(client, a, b, "2026-10-01")
    write(client, a, b, "2026-10-02")                                  # LV.2 → 20코인씩
    paid = coins(client, b)
    client.delete(f"/users/{a}/friends/{b}")
    add(client, a, "남이야")
    client.post(f"/users/{b}/friends/{a}/accept")
    r = write(client, a, b, "2026-10-03")
    assert r["level"] >= 2 and r["earned_coins"] == 0                 # 점수는 남고 보상은 다시 안 줌
    assert coins(client, b) == paid


def test_friendship_levels_table():
    from app import friendship as fs
    assert [fs.level_from_points(p)["level"] for p in (0, 3, 4, 11, 12, 24, 39, 40, 999)] == [1, 1, 2, 2, 3, 4, 4, 5, 5]
    top = fs.level_from_points(40)
    assert (top["name"], top["next_level_at"], top["points_to_next"]) == ("베스트 프렌드", None, 0)


def test_room_visit_counts(client):
    for visitor, d in [("v1", "2026-10-14"), ("v2", "2026-10-15"), ("v1", "2026-10-15"), ("v1", "2026-10-15")]:
        client.post("/users/owner/visits", params={"date": d}, json={"visitor_id": visitor})
    assert client.get("/users/owner/room", params={"date": "2026-10-15"}).json()["visits"] == {"today": 2, "total": 3}
    assert client.get("/users/nobody/room").json()["visits"] == {"today": 0, "total": 0}


# --- 친구 코드 (10/16) -------------------------------------------------------------

def test_friend_code_unique_and_shown(client):
    a, b = signup(client, "코드하나"), signup(client, "코드둘")
    ca = client.get(f"/users/{a['id']}").json()["friend_code"]
    cb = client.get(f"/users/{b['id']}/room").json()["friend_code"]          # 이웃이 방에서 봄
    assert len(ca) == 6 and ca != cb and not set(ca) & set("01IO")


def test_search_and_add_by_code(client):
    a, b = signup(client, "찾는사람"), signup(client, "찾을사람")
    code = client.get(f"/users/{b['id']}").json()["friend_code"]
    messy = "#" + code[:3].lower() + "-" + code[3:] + " "                     # #·소문자·- 괜찮음
    found = client.get(f"/users/{a['id']}/friends/search", params={"code": messy}).json()
    assert (found["id"], found["nickname"], found["status"]) == (b["id"], "찾을사람", "none")
    assert client.get(f"/users/{a['id']}/friends/search", params={"code": "ZZZZZZ"}).status_code == 404
    me = client.get(f"/users/{a['id']}/friends/search", params={"code": client.get(f"/users/{a['id']}").json()["friend_code"]}).json()
    assert me["status"] == "me"
    r = client.post(f"/users/{a['id']}/friends", json={"code": messy})
    assert r.status_code == 201 and r.json()["status"] == "pending"
    assert client.get(f"/users/{a['id']}/friends/search", params={"code": code}).json()["status"] == "sent"
    assert client.get(f"/users/{b['id']}/friends/search", params={"code": client.get(f"/users/{a['id']}").json()["friend_code"]}).json()["status"] == "received"
    assert client.post(f"/users/{a['id']}/friends", json={}).status_code == 422
    assert client.post(f"/users/{a['id']}/friends", json={"code": "ZZZZZZ"}).status_code == 404


def test_recommended_refresh_mixes_neighbors(client):
    me = signup(client, "새로고침")["id"]
    others = [signup(client, f"이웃{i}")["id"] for i in range(8)]
    for uid in [me] + others:
        client.post(f"/users/{uid}/attendance", params={"date": DAY})                   # 최근 활동한 사람만 추천
    first = client.get(f"/users/{me}/rooms/recommended", params={"date": DAY, "limit": 3}).json()
    assert first["refresh"] == 0 and len(first["rooms"]) == 3
    seen = {tuple(r["id"] for r in client.get(f"/users/{me}/rooms/recommended", params={"date": DAY, "limit": 3, "refresh": n}).json()["rooms"]) for n in range(1, 6)}
    assert len(seen) > 1                                                                   # 새로고침하면 다른 이웃
    again = client.get(f"/users/{me}/rooms/recommended", params={"date": DAY, "limit": 3, "refresh": 2}).json()
    assert again == client.get(f"/users/{me}/rooms/recommended", params={"date": DAY, "limit": 3, "refresh": 2}).json()
