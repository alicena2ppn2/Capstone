import pytest

from app import shop
from tests.test_api import DAY, client, do_mission, signup  # noqa: F401  (client는 fixture)


def give(client, user, coins=0, xp=0):
    """테스트용: 장부에 코인·경험치를 직접 넣는다."""
    from app.main import app
    from app import db
    conn = app.state.conn
    conn.execute("INSERT INTO coin_ledger (user_id, date, item_id, coins, xp) VALUES (?, ?, ?, ?, ?)",
                 (user, DAY, f"test:{coins}:{xp}:{len(db.paid_ids(conn, user, DAY))}", coins, xp))
    conn.commit()


def item(view, kind, item_id):
    key = "characters" if kind == "character" else "outfits"
    return next(i for i in view[key] if i["id"] == item_id)


def test_catalog_matches_frontend():
    assert [c["id"] for c in shop.CATALOG["character"].values()] == ["potato", "pink", "mochi", "lavender", "mint", "sky"]
    assert {i["id"]: (i["level"], i["price"]) for i in shop.CATALOG["outfit"].values()} == {
        "sky": (1, 120), "berry": (1, 180), "leaf": (3, 220), "star": (5, 300)}
    assert shop.CATALOG["character"]["mochi"]["price"] == 300


def test_new_user_has_starter_and_secrets_are_hidden(client):
    v = client.get("/users/u1/shop").json()
    assert v["coins"] == 0
    assert v["equipped"] == {"character": "potato", "outfit": None}
    assert item(v, "character", "potato")["status"] == "owned"
    assert item(v, "character", "potato")["equipped"] is True
    lav = item(v, "character", "lavender")
    assert lav["status"] == "locked" and lav["name"] is None          # 잠긴 캐릭터는 이름 비공개
    sky = item(v, "character", "sky")
    assert sky["status"] == "hidden" and sky["name"] is None and sky["level"] is None
    assert item(v, "outfit", "sky")["status"] == "no_coins"
    assert item(v, "outfit", "star")["status"] == "locked"
    assert item(v, "outfit", "star")["name"] == "별빛 잠옷"            # 옷은 잠겨도 이름 보임 (프론트와 같음)


def test_buy_checks_coins_level_and_duplicates(client):
    r = client.post("/users/u1/shop/buy", json={"type": "outfit", "item_id": "sky"})
    assert r.status_code == 422 and "코인" in r.json()["detail"]
    give(client, "u1", coins=1000)
    assert client.post("/users/u1/shop/buy", json={"type": "outfit", "item_id": "star"}).status_code == 422   # LV.5 필요
    assert client.post("/users/u1/shop/buy", json={"type": "outfit", "item_id": "nope"}).status_code == 404
    assert client.post("/users/u1/shop/buy", json={"type": "character", "item_id": "pink"}).status_code in (409, 422)

    r = client.post("/users/u1/shop/buy", json={"type": "outfit", "item_id": "sky"})
    assert r.status_code == 200
    assert r.json()["coins"] == 1000 - 120
    assert client.post("/users/u1/shop/buy", json={"type": "outfit", "item_id": "sky"}).status_code == 409
    assert client.get("/users/u1/coins").json()["coins"] == 880


def test_spending_does_not_lower_level(client):
    give(client, "u1", coins=1000, xp=500)                    # LV.6
    before = client.get("/users/u1/level").json()
    assert client.post("/users/u1/shop/buy", json={"type": "character", "item_id": "mochi"}).status_code == 200
    after = client.get("/users/u1/level").json()
    assert after == before
    assert client.get("/users/u1/coins").json()["coins"] == 700


def test_milestone_character_at_level_3(client):
    give(client, "u1", xp=200)                                # LV.3
    v = client.get("/users/u1/shop").json()
    assert item(v, "character", "pink")["status"] == "owned"
    assert v["equipped"]["character"] == "potato"             # 자동 장착 안 함


def test_equip_rules(client):
    give(client, "u1", coins=1000, xp=500)
    client.post("/users/u1/shop/buy", json={"type": "character", "item_id": "mochi"})
    client.post("/users/u1/shop/buy", json={"type": "outfit", "item_id": "berry"})
    assert client.put("/users/u1/equipped", json={"character_id": "mint"}).status_code == 422
    assert client.put("/users/u1/equipped", json={"outfit_id": "leaf"}).status_code == 422

    r = client.put("/users/u1/equipped", json={"character_id": "mochi", "outfit_id": "berry"}).json()
    assert r == {"character": "mochi", "outfit": "berry"}
    # 보낸 칸만 바뀜
    assert client.put("/users/u1/equipped", json={"outfit_id": None}).json() == {"character": "mochi", "outfit": None}
    # 캐릭터 해제 → 기본 캐릭터, 컬렉션에는 남음
    assert client.put("/users/u1/equipped", json={"character_id": None}).json()["character"] == "potato"
    assert item(client.get("/users/u1/shop").json(), "character", "mochi")["status"] == "owned"
    assert client.get("/users/u1/home", params={"date": DAY}).json()["equipped"] == {"character": "potato", "outfit": None}


def test_all_missions_done_gives_haru_friend(client):
    client.post("/users/u1/steps", json={"date": DAY, "steps": 9000})
    missions = client.get("/users/u1/missions/today", params={"date": DAY}).json()["missions"]
    new_items = []
    for m in missions:
        new_items += do_mission(client, "u1", m, DAY).get("new_items", [])
    assert {"type": "character", "id": "sky", "name": "하루 펭귄 모찌"} in new_items
    assert item(client.get("/users/u1/shop").json(), "character", "sky")["status"] == "owned"


def test_delete_account_clears_shop(client):
    me = signup(client, "상점손님")
    give(client, me["id"], coins=500)
    client.post(f"/users/{me['id']}/shop/buy", json={"type": "outfit", "item_id": "sky"})
    client.delete(f"/users/{me['id']}")
    v = client.get(f"/users/{me['id']}/shop").json()
    assert v["coins"] == 0
    assert item(v, "outfit", "sky")["status"] == "no_coins"


def test_starter_not_announced_as_new(client):
    r = client.post("/users/u9/attendance", params={"date": DAY}).json()
    assert r["new_items"] == []
    assert item(client.get("/users/u9/shop").json(), "character", "potato")["status"] == "owned"
