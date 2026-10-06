from app import shop
from tests.test_api import DAY, client, signup  # noqa: F401  (client는 fixture)
from tests.test_shop import give


def decor(view, item_id):
    return next(i for i in view["decor"] if i["id"] == item_id)


def test_decor_catalog_matches_frontend():
    items = shop.CATALOG["decor"]
    assert len(items) == 16
    assert set(shop.DECOR_SLOTS) == {"lamp", "carpet", "frame", "doll", "scenery"}
    assert (items["lamp-moon"]["level"], items["lamp-moon"]["price"]) == (1, 90)
    assert (items["view-newyork"]["level"], items["view-newyork"]["price"]) == (12, 520)
    assert sum(1 for i in items.values() if i["slot"] == "scenery") == 8


def test_shop_lists_decor_and_hides_locked(client):
    v = client.get("/users/u1/shop").json()
    assert v["placed"] == {s: None for s in shop.DECOR_SLOTS}
    moon = decor(v, "lamp-moon")
    assert moon["status"] == "no_coins" and moon["name"] == "달빛 전등" and moon["slot"] == "lamp"
    ny = decor(v, "view-newyork")
    assert ny["status"] == "locked" and ny["name"] is None and ny["level"] is None   # 잠긴 소품은 숨김
    assert decor(v, "view-gangneung")["landscape"] == "coast"


def test_buy_and_place_decor(client):
    give(client, "u1", coins=1000, xp=300)                         # LV.4
    assert client.post("/users/u1/shop/buy", json={"type": "decor", "item_id": "carpet-sea"}).status_code == 422   # LV.5
    assert client.post("/users/u1/shop/buy", json={"type": "decor", "item_id": "lamp-flower"}).status_code == 200
    assert client.post("/users/u1/shop/buy", json={"type": "decor", "item_id": "view-jeju"}).status_code == 200
    assert client.post("/users/u1/shop/buy", json={"type": "decor", "item_id": "lamp-flower"}).status_code == 409
    assert client.get("/users/u1/coins").json()["coins"] == 1000 - 180 - 200

    # 사도 자동 배치 안 함
    assert client.get("/users/u1/shop").json()["placed"]["lamp"] is None
    # 자리가 안 맞거나 안 가진 소품은 못 놓음
    assert client.put("/users/u1/decor", json={"slot": "carpet", "item_id": "lamp-flower"}).status_code == 422
    assert client.put("/users/u1/decor", json={"slot": "lamp", "item_id": "lamp-moon"}).status_code == 422
    assert client.put("/users/u1/decor", json={"slot": "roof", "item_id": None}).status_code == 422

    room = client.put("/users/u1/decor", json={"slot": "lamp", "item_id": "lamp-flower"}).json()
    room = client.put("/users/u1/decor", json={"slot": "scenery", "item_id": "view-jeju"}).json()
    assert room["decor"]["lamp"] == "lamp-flower" and room["decor"]["scenery"] == "view-jeju"
    assert room["scenery_landscape"] == "jeju"
    v = client.get("/users/u1/shop").json()
    assert decor(v, "lamp-flower")["placed"] is True

    # 빼도 보유는 그대로
    room = client.put("/users/u1/decor", json={"slot": "lamp", "item_id": None}).json()
    assert room["decor"]["lamp"] is None
    assert decor(client.get("/users/u1/shop").json(), "lamp-flower")["status"] == "owned"


def test_room_view_for_neighbors_and_home(client):
    me = signup(client, "꾸미는사람")
    give(client, me["id"], coins=500)
    client.post(f"/users/{me['id']}/shop/buy", json={"type": "decor", "item_id": "carpet-peach"})
    client.put(f"/users/{me['id']}/decor", json={"slot": "carpet", "item_id": "carpet-peach"})

    room = client.get(f"/users/{me['id']}/room").json()             # 이웃이 보는 내 방
    assert room["nickname"] == "꾸미는사람"
    assert room["character"] == "potato" and room["decor"]["carpet"] == "carpet-peach"
    home = client.get(f"/users/{me['id']}/home", params={"date": DAY}).json()
    assert home["room"]["decor"]["carpet"] == "carpet-peach"


def test_delete_account_clears_decor(client):
    me = signup(client, "지울방주인")
    give(client, me["id"], coins=500)
    client.post(f"/users/{me['id']}/shop/buy", json={"type": "decor", "item_id": "carpet-peach"})
    client.put(f"/users/{me['id']}/decor", json={"slot": "carpet", "item_id": "carpet-peach"})
    client.delete(f"/users/{me['id']}")
    assert client.get(f"/users/{me['id']}/room").json()["decor"]["carpet"] is None
