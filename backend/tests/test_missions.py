import numpy as np
import pytest

from app import missions as ms


@pytest.mark.parametrize("steps, usual, expected", [
    (500, None, True),           # 1,000보 미만
    (3000, None, False),
    (2500, 6000, True),          # 평소의 절반 미만
    (3500, 6000, False),
    (None, 6000, None),
    (np.nan, 6000, None),
])
def test_stayed_home(steps, usual, expected):
    assert ms.stayed_home(steps, usual) is expected


def test_stay_home_gets_outdoor_and_home_and_input():
    out = ms.pick_missions("u1", "2026-10-01", steps=300)
    ids = [m["id"] for m in out["missions"]]
    assert out["stayed_home"] is True
    assert len(ids) == 3 and len(set(ids)) == 3
    assert ids[0] in ms.STAY_HOME_POOL["outdoor"]
    assert ids[1] in ms.STAY_HOME_POOL["home"]
    assert ids[2] in ms.STAY_HOME_POOL["input"]


def test_went_out_gets_no_outdoor_push():
    out = ms.pick_missions("u1", "2026-10-01", steps=8000, usual_steps=6000)
    assert out["stayed_home"] is False
    assert all(m["id"] != "walk" for m in out["missions"])


def test_unknown_steps_treated_like_stay_home():
    out = ms.pick_missions("u1", "2026-10-01", steps=None)
    assert out["missions"][0]["id"] in ms.STAY_HOME_POOL["outdoor"]


def test_same_day_same_missions():
    a = ms.pick_missions("u1", "2026-10-01", steps=300)
    b = ms.pick_missions("u1", "2026-10-01", steps=300)
    assert a == b


def test_avoids_recent_missions():
    recent = ["photo_nature", "drink_run", "meal_photo", "seasonal_food", "local_food", "movies"]
    ids = [m["id"] for m in ms.pick_missions("u1", "2026-10-01", steps=300, recent=recent)["missions"]]
    assert ids == ["walk", "diary", "music"]


def test_walk_goal_follows_usual_steps():
    recent = ["photo_nature", "drink_run"]  # walk만 남게
    out = ms.pick_missions("u1", "2026-10-01", steps=300, usual_steps=4300, recent=recent)
    walk = out["missions"][0]
    assert walk["id"] == "walk"
    assert walk["min_count"] == 2200
    # 카탈로그 원본은 바뀌지 않음
    assert ms.CATALOG["walk"].min_count == 2000


@pytest.mark.parametrize("mid, submission, done", [
    ("walk", {"steps": 2500}, True),
    ("walk", {"steps": 1500}, False),
    ("diary", {"text": "산책했다"}, True),
    ("diary", {"text": "   "}, False),
    ("meal_photo", {"photos": ["p1"]}, True),
    ("meal_photo", {}, False),
    ("movies", {"items": ["A", "B", "C"]}, True),
    ("movies", {"items": ["A", "A", "B"]}, False),   # 중복은 하나로
    ("local_food", {"items": ["A", "", "B"]}, False),
])
def test_is_complete(mid, submission, done):
    assert ms.is_complete(ms.CATALOG[mid], submission) is done


# --- 코인 ------------------------------------------------------------------------

def test_outdoor_missions_pay_more():
    assert ms.CATALOG["drink_run"].coins == ms.COINS_OUTDOOR
    assert ms.CATALOG["diary"].coins == ms.COINS_HOME
    assert ms.COINS_OUTDOOR > ms.COINS_HOME
    assert ms.CATALOG["walk"].to_dict()["coins"] == ms.COINS_OUTDOOR


def today_missions():
    return [ms.CATALOG[m].to_dict() for m in ("drink_run", "meal_photo", "movies")]


def test_settle_partial():
    r = ms.settle_coins(today_missions(), {"drink_run"})
    assert r == {"items": [{"id": "drink_run", "coins": 30}], "total": 30, "all_done": False}


def test_settle_all_done_bonus():
    r = ms.settle_coins(today_missions(), {"drink_run", "meal_photo", "movies"})
    assert r["all_done"]
    assert r["total"] == 30 + 20 + 20 + ms.COINS_ALL_DONE_BONUS


def test_settle_does_not_pay_twice():
    r = ms.settle_coins(today_missions(), {"drink_run", "meal_photo", "movies"},
                        already_paid={"drink_run", "meal_photo"})
    assert [i["id"] for i in r["items"]] == ["movies", "all_done"]
    r = ms.settle_coins(today_missions(), {"drink_run", "meal_photo", "movies"},
                        already_paid={"drink_run", "meal_photo", "movies", "all_done"})
    assert r["total"] == 0


def test_settle_ignores_missions_not_given_today():
    r = ms.settle_coins(today_missions(), {"diary"})
    assert r["total"] == 0
