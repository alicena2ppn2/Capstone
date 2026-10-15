"""미션 새로고침, 스스로 체크(운동) 미션, 집 미션 정리."""

from app import missions as ms
from tests.test_api import client, submission_for  # noqa: F401  (client는 fixture)

DAY = "2026-10-14"


def today(client, user="u1", date=DAY):
    return client.get(f"/users/{user}/missions/today", params={"date": date}).json()


def rotating(out):
    return [m for m in out["missions"] if m["category"] != "daily"]


def test_reroll_same_slot_and_stage(client):
    out = today(client)
    assert out["rerolls_left"] == ms.REROLLS_PER_DAY
    old = rotating(out)
    for i, m in enumerate(old):
        r = client.post(f"/users/u1/missions/{m['id']}/reroll", params={"date": DAY})
        assert r.status_code == 200
        new = r.json()["mission"]
        assert new["id"] != m["id"] and new["category"] == m["category"]
        assert new.get("stage", 0) == m.get("stage", 0)
        assert r.json()["rerolls_left"] == ms.REROLLS_PER_DAY - i - 1
        assert new["id"] in [x["id"] for x in r.json()["missions"]]
    # 다시 불러도 바뀐 그대로
    after = today(client)
    assert len({m["id"] for m in rotating(after)} & {m["id"] for m in old}) == 0
    assert after["rerolls_left"] == 0
    r = client.post(f"/users/u1/missions/{rotating(after)[0]['id']}/reroll", params={"date": DAY})
    assert r.status_code == 429
    # 다음 날은 다시 3번
    assert today(client, date="2026-10-15")["rerolls_left"] == ms.REROLLS_PER_DAY


def test_reroll_not_daily_or_done(client):
    out = today(client)
    assert client.post("/users/u1/missions/attendance/reroll", params={"date": DAY}).status_code == 422
    assert client.post("/users/u1/missions/nope/reroll", params={"date": DAY}).status_code == 404
    connect = next(m for m in rotating(out) if m["category"] == "connect")
    client.post(f"/users/u1/missions/{connect['id']}/complete", params={"date": DAY}, json=submission_for(connect, client))
    assert client.post(f"/users/u1/missions/{connect['id']}/reroll", params={"date": DAY}).status_code == 409
    flags = {m["id"]: m["rerollable"] for m in today(client)["missions"]}
    assert flags["attendance"] is False and flags[connect["id"]] is False


def test_reroll_is_deterministic():
    missions = ms.pick_missions("u1", DAY, steps=9000)["missions"]
    home = next(m for m in missions if m["category"] == "home")
    a = ms.reroll("u1", DAY, missions, home["id"], 1, steps=9000)
    assert a == ms.reroll("u1", DAY, missions, home["id"], 1, steps=9000)
    assert a["category"] == "home" and a["id"] != home["id"]


def test_self_check_exercise_missions():
    # 10/15: 걸음 말고는 모두 사진 → 운동도 운동한 자리 사진 (스스로 체크 종류 self는 남겨 둠)
    for mid in ("situps", "squats", "pushups", "plank", "stretch"):
        m = ms.CATALOG[mid]
        assert (m.kind, m.category, m.coins, m.xp) == ("photo", "home", ms.COINS_HOME, ms.XP_HOME)
    assert ms.is_complete({"kind": "self", "min_count": 1}, {})
    run = ms.CATALOG["run_block"]
    assert (run.kind, run.stage) == ("photo", 2)


def test_static_home_missions_removed():
    for mid in ("draw", "tea", "read_10", "fruit", "window_view", "outfit", "desk_photo", "seasonal_food", "meal_photo"):
        assert mid not in ms.CATALOG
    assert {"dishes", "laundry_fold", "floor_clean"} <= set(ms.BY_CATEGORY["home"])
