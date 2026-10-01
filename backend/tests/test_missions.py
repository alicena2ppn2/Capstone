import json

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


def categories(out):
    return [ms.CATALOG[m["id"]].category for m in out["missions"]]


def test_catalog_size_and_shape():
    assert len(ms.CATALOG) >= 50
    for c in ms.CATEGORIES:
        assert len(ms.BY_CATEGORY[c]) >= 5, c
    for m in ms.CATALOG.values():
        assert m.title and m.desc
        assert m.outdoor == (m.category == "outdoor")
        if m.kind == "list":
            assert m.min_count >= 1


def test_stay_home_gets_outdoor_and_home_and_explore():
    out = ms.pick_missions("u1", "2026-10-01", steps=300)
    ids = [m["id"] for m in out["missions"]]
    assert out["stayed_home"] is True
    assert len(set(ids)) == 3
    assert categories(out) == ["outdoor", "home", "explore"]


def test_went_out_gets_record_instead_of_outdoor():
    out = ms.pick_missions("u1", "2026-10-01", steps=8000, usual_steps=6000)
    assert out["stayed_home"] is False
    assert categories(out) == ["record", "home", "explore"]


def test_unknown_steps_treated_like_stay_home():
    out = ms.pick_missions("u1", "2026-10-01", steps=None)
    assert categories(out)[0] == "outdoor"


def test_same_day_same_missions_and_days_vary():
    a = ms.pick_missions("u1", "2026-10-01", steps=300)
    assert a == ms.pick_missions("u1", "2026-10-01", steps=300)
    days = {tuple(m["id"] for m in ms.pick_missions("u1", f"2026-10-{d:02d}", steps=300)["missions"]) for d in range(1, 15)}
    assert len(days) > 7


def test_avoids_recent_missions():
    recent = ms.BY_CATEGORY["outdoor"][:-1] + ms.BY_CATEGORY["home"][:-1]
    ids = [m["id"] for m in ms.pick_missions("u1", "2026-10-01", steps=300, recent=recent)["missions"]]
    assert ids[0] == ms.BY_CATEGORY["outdoor"][-1]
    assert ids[1] == ms.BY_CATEGORY["home"][-1]


def test_walk_goal_is_daily_step_goal():
    recent = [m for m in ms.BY_CATEGORY["outdoor"] if m != "walk"]   # walk만 남게
    out = ms.pick_missions("u1", "2026-10-01", steps=300, usual_steps=4300, recent=recent)
    walk = out["missions"][0]
    assert walk["id"] == "walk"
    assert walk["min_count"] == ms.DAILY_STEP_GOAL == 8000


def test_load_catalog_rejects_duplicates(tmp_path):
    p = tmp_path / "m.json"
    row = {"id": "x", "category": "home", "title": "t", "desc": "d", "kind": "text", "outdoor": False}
    p.write_text(json.dumps([row, row]), encoding="utf-8")
    with pytest.raises(ValueError):
        ms.load_catalog(p)


@pytest.mark.parametrize("mid, submission, done", [
    ("walk", {"steps": 8000}, True),
    ("walk", {"steps": 7999}, False),
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


# --- 기록 기반 걸음 미션 -------------------------------------------------------------

@pytest.mark.parametrize("prev, goal", [(3240, 3300), (3200, 3300), (0, 100), (7999.5, 8000)])
def test_beat_goal(prev, goal):
    assert ms.beat_goal(prev) == goal


def test_step_baselines_need_data():
    assert ms.step_baselines(None, None) == {}
    assert ms.step_baselines(np.nan, [1000, 2000, 3000]) == {}          # 지난주 3일뿐
    b = ms.step_baselines(500, [1000, 2000, 3000, 4000, None])
    assert b == {"yesterday": 500.0, "last_week": 2500.0}


def only_outdoor(rule_id):
    """outdoor에서 rule_id만 남도록 나머지를 최근 미션으로 넣는다."""
    return [m for m in ms.BY_CATEGORY["outdoor"] if m != rule_id]


def test_beat_yesterday_goal_and_text():
    # 어제 840보 → 안 나간 날 → 밖으로 한 발 미션 자리에 '어제보다 많이 걷기'
    out = ms.pick_missions("u1", "2026-10-01", steps=840, recent=only_outdoor("beat_yesterday"))
    m = out["missions"][0]
    assert m["id"] == "beat_yesterday"
    assert m["min_count"] == 900
    assert m["desc"] == "어제는 840보 걸었어요. 오늘은 900보 이상 걸어 봐요."
    assert ms.is_complete(m, {"steps": 900})
    assert not ms.is_complete(m, {"steps": 840})


def test_beat_last_week_goal_and_text():
    week = [2000, 3000, 2500, 2500, 3000, 2000, 2500]
    out = ms.pick_missions("u1", "2026-10-01", steps=400, last_week_steps=week, recent=only_outdoor("beat_last_week"))
    m = out["missions"][0]
    assert m["id"] == "beat_last_week"
    assert m["min_count"] == 2600
    assert "2,500보" in m["desc"] and "2,600보" in m["desc"]


def test_relative_missions_skipped_without_history():
    for d in range(1, 29):
        ids = [m["id"] for m in ms.pick_missions("u1", f"2026-10-{d:02d}", steps=None)["missions"]]
        assert "beat_yesterday" not in ids and "beat_last_week" not in ids
    # 어제 기록만 있으면 '지난주보다'는 안 나옴
    out = ms.pick_missions("u1", "2026-10-01", steps=300, recent=only_outdoor("beat_last_week"))
    assert out["missions"][0]["id"] != "beat_last_week"


def test_catalog_templates_have_placeholders():
    for m in ms.CATALOG.values():
        if m.goal_rule != "fixed":
            assert m.kind == "steps"
            assert "{prev}" in m.desc and "{goal}" in m.desc
