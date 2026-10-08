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
    assert set(card) == {"id", "nickname", "level", "last_active", "visited_today", "since"}
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
