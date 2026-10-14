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


def picked(out):
    """출석하기(매일 고정)를 뺀 하루 미션 3개."""
    return [m for m in out["missions"] if m["category"] != "daily"]


def categories(out):
    return [m["category"] for m in picked(out)]


def test_catalog_size_and_shape():
    assert len(ms.CATALOG) >= 50
    for c in ms.CATEGORIES:
        if c != "daily":
            assert len(ms.BY_CATEGORY[c]) >= 5, c
    assert ms.BY_CATEGORY["daily"] == ["attendance", "walk", "beat_last_week", "diary", "visit", "guestbook"]
    for m in ms.CATALOG.values():
        assert m.title and m.desc
        if m.category in ("outdoor", "home", "explore", "record"):
            assert m.outdoor == (m.category == "outdoor")
        if m.category == "connect":
            assert m.stage >= 1 and m.kind == "text"
        if m.kind == "list":
            assert m.min_count >= 1
    assert ms.CATALOG["walk"].outdoor   # 매일 고정이지만 밖에 나가는 미션


def test_three_slots_move_home_connect():
    out = ms.pick_missions("u1", "2026-10-01", steps=8000, usual_steps=6000)
    ids = [m["id"] for m in picked(out)]
    assert out["stayed_home"] is False
    assert out["missions"][0]["id"] == "attendance"
    assert len(set(ids)) == 3
    assert categories(out) == ["outdoor", "home", "connect"]
    assert [m["stage"] for m in picked(out)][::2] == [1, 1]          # 처음엔 1단계


def test_stages_pick_stage_missions():
    out = ms.pick_missions("u1", "2026-10-01", steps=8000, stages={"move": 3, "connect": 2})
    move, _, connect = picked(out)
    assert move["id"] in ms.BY_STAGE["move"][3]
    assert connect["id"] in ms.BY_STAGE["connect"][2] and connect["tip"]


def test_stay_home_lowers_move_stage_only():
    out = ms.pick_missions("u1", "2026-10-01", steps=300, stages={"move": 3, "connect": 3})
    move, _, connect = picked(out)
    assert move["id"] in ms.BY_STAGE["move"][2]
    assert connect["id"] in ms.BY_STAGE["connect"][3]
    # 걸음 기록이 없으면 안 나간 날처럼 (설문 답이 없을 때)
    out = ms.pick_missions("u1", "2026-10-01", steps=None, stages={"move": 2})
    assert picked(out)[0]["id"] in ms.BY_STAGE["move"][1]


def test_stage_coins_go_up():
    assert ms.CATALOG["sky_photo"].coins == 50                 # 1단계 밖
    assert ms.CATALOG["drink_run"].coins == 60                 # 2단계 밖
    assert ms.CATALOG["parks"].coins == 70                     # 3단계 밖
    assert ms.CATALOG["c1_room_like"].coins == 30              # 1단계 이어지기 (집)
    assert ms.CATALOG["c3_regular_shop"].coins == 70           # 3단계 이어지기 (밖)


def test_requires_survey_answer():
    dog = [m for m in ms.BY_STAGE["connect"][2] if ms.CATALOG[m].requires == "pets:dog"]
    assert dog
    seen_without = {picked(ms.pick_missions("u1", f"2026-10-{d:02d}", steps=8000, stages={"connect": 2}))[2]["id"]
                    for d in range(1, 29)}
    seen_with = {picked(ms.pick_missions("u1", f"2026-10-{d:02d}", steps=8000, stages={"connect": 2},
                                         answers={"pets": ["dog"], "living": "family"}))[2]["id"] for d in range(1, 29)}
    assert not seen_without & set(dog)
    assert seen_with & set(dog)
    assert ms.fits(ms.CATALOG["c1_family_meal"], {"living": "family"})
    assert not ms.fits(ms.CATALOG["c1_family_meal"], {"living": "alone"})
    assert not ms.fits(ms.CATALOG["c1_family_meal"], None)


def test_ladder_progress_goes_up_and_stops_at_3():
    first = ms.BY_STAGE["move"][1][0]
    assert ms.ladder_progress([])["move"] == {"stage": 1, "name": "혼자", "done": 0, "need": 3, "top": False}
    assert ms.ladder_progress([first, first])["move"]["stage"] == 1
    p = ms.ladder_progress([first] * 3)
    assert (p["move"]["stage"], p["move"]["done"], p["connect"]["stage"]) == (2, 0, 1)
    second, third = ms.BY_STAGE["move"][2][0], ms.BY_STAGE["move"][3][0]
    p = ms.ladder_progress([first] * 3 + [second] * 3 + [third] * 9)
    assert (p["move"]["stage"], p["move"]["done"], p["move"]["top"]) == (3, 3, True)
    # 다른 갈래·사다리 밖 미션은 안 셈
    assert ms.ladder_progress(["cook", "new_road"] * 5)["move"]["stage"] == 1


def test_same_day_same_missions_and_days_vary():
    a = ms.pick_missions("u1", "2026-10-01", steps=300)
    assert a == ms.pick_missions("u1", "2026-10-01", steps=300)
    days = {tuple(m["id"] for m in picked(ms.pick_missions("u1", f"2026-10-{d:02d}", steps=300))) for d in range(1, 15)}
    assert len(days) > 7


def test_avoids_recent_missions():
    recent = ms.BY_STAGE["move"][1][:-1] + ms.BY_CATEGORY["home"][:-1]
    ids = [m["id"] for m in picked(ms.pick_missions("u1", "2026-10-01", steps=300, recent=recent))]
    assert ids[0] == ms.BY_STAGE["move"][1][-1]
    assert ids[1] == ms.BY_CATEGORY["home"][-1]


def test_walk_goal_is_daily_step_goal():
    out = ms.pick_missions("u1", "2026-10-01", steps=300, usual_steps=4300)
    walk = out["missions"][1]
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
    ("cook", {"photos": ["p1"]}, True),
    ("cook", {}, False),
    ("movies", {"items": ["A", "B", "C"]}, True),
    ("movies", {"items": ["A", "A", "B"]}, False),   # 중복은 하나로
    ("local_food", {"items": ["A", "", "B"]}, False),
])
def test_is_complete(mid, submission, done):
    assert ms.is_complete(ms.CATALOG[mid], submission) is done


# --- 코인 ------------------------------------------------------------------------

def test_rewards_match_frontend_day_quests():
    # frontend/src/utils/game.js: 오늘 퀘스트 100 XP · 30 코인, 기록하기 40 코인
    # 밖에 나가는 미션은 코인 50 (외출을 이끌기 위해 집 미션보다 많이)
    assert (ms.CATALOG["sky_photo"].coins, ms.CATALOG["sky_photo"].xp) == (50, 100)
    assert (ms.CATALOG["cook"].coins, ms.CATALOG["cook"].xp) == (30, 100)
    assert (ms.CATALOG["diary"].coins, ms.CATALOG["diary"].xp) == (40, 100)
    assert (ms.CATALOG["guestbook"].coins, ms.CATALOG["guestbook"].xp) == (30, 100)
    assert ms.CATALOG["walk"].to_dict()["coins"] == 50


def today_missions():
    return [ms.CATALOG[m].to_dict() for m in ("sky_photo", "cook", "movies")]


def test_settle_partial():
    r = ms.settle_coins(today_missions(), {"sky_photo"})
    assert r == {"items": [{"id": "sky_photo", "coins": 50, "xp": 100}], "total": 50, "xp": 100, "all_done": False}


def test_settle_all_done_has_no_coin_bonus():
    # 3개 완료 보상은 코인이 아니라 특별 캐릭터 (상점 기능에서 지급)
    r = ms.settle_coins(today_missions(), {"sky_photo", "cook", "movies"})
    assert r["all_done"]
    assert r["total"] == 50 + 30 + 30                 # 밖(하늘) 50 + 집 30 + 집 30
    assert [i["id"] for i in r["items"]] == ["sky_photo", "cook", "movies"]


def test_settle_does_not_pay_twice():
    r = ms.settle_coins(today_missions(), {"sky_photo", "cook", "movies"},
                        already_paid={"sky_photo", "cook"})
    assert [i["id"] for i in r["items"]] == ["movies"]
    r = ms.settle_coins(today_missions(), {"sky_photo", "cook", "movies"},
                        already_paid={"sky_photo", "cook", "movies"})
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
    """움직이기 1단계에서 rule_id만 남도록 나머지를 최근 미션으로 넣는다."""
    return [m for m in ms.BY_STAGE["move"][1] if m != rule_id]


def test_beat_yesterday_goal_and_text():
    # 어제 840보 → 안 나간 날 → 밖으로 한 발 미션 자리에 '어제보다 많이 걷기'
    out = ms.pick_missions("u1", "2026-10-01", steps=840, recent=only_outdoor("beat_yesterday"))
    m = picked(out)[0]
    assert m["id"] == "beat_yesterday"
    assert m["min_count"] == 900
    assert m["desc"] == "어제는 840보 걸었어요. 오늘은 900보 이상 걸어 봐요."
    assert ms.is_complete(m, {"steps": 900})
    assert not ms.is_complete(m, {"steps": 840})


def test_beat_last_week_goal_and_text():
    week = [2000, 3000, 2500, 2500, 3000, 2000, 2500]
    out = ms.pick_missions("u1", "2026-10-01", steps=400, last_week_steps=week)
    m = out["missions"][2]                       # 매일 고정: 출석·걸음 다음
    assert m["id"] == "beat_last_week"
    assert m["category"] == "daily"
    assert m["min_count"] == 3500                 # 평균 2,500 + 1,000
    assert "2,500보" in m["desc"] and "3,500보" in m["desc"]


def test_plus_goal_rounds_up_to_100():
    assert ms.plus_goal(2500) == 3500
    assert ms.plus_goal(2643) == 3700
    assert ms.plus_goal(0) == 1000


def test_last_week_skipped_when_walked_enough_yesterday():
    week = [5000] * 7
    ids = lambda steps: [m["id"] for m in ms.pick_missions("u1", "2026-10-01", steps=steps, last_week_steps=week)["missions"]]
    assert "beat_last_week" in ids(7999)
    assert "beat_last_week" not in ids(8000)                       # 어제 8,000보 이상 → 없음
    assert ids(8000)[:5] == ["attendance", "walk", "diary", "visit", "guestbook"]


def test_relative_missions_skipped_without_history():
    for d in range(1, 29):
        ids = [m["id"] for m in ms.pick_missions("u1", f"2026-10-{d:02d}", steps=None)["missions"]]
        assert "beat_yesterday" not in ids and "beat_last_week" not in ids
    # 어제 기록만 있으면 '지난주보다'는 안 나옴
    out = ms.pick_missions("u1", "2026-10-01", steps=300, recent=only_outdoor("beat_last_week"))
    assert picked(out)[0]["id"] != "beat_last_week"


def test_catalog_templates_have_placeholders():
    for m in ms.CATALOG.values():
        if m.goal_rule != "fixed":
            assert m.kind == "steps"
            assert "{prev}" in m.desc and "{goal}" in m.desc


# --- 일기 주제 ------------------------------------------------------------------------

from app import diary  # noqa: E402


def test_topics_count_and_no_repeat_for_50_days():
    assert len(diary.TOPICS) >= 50
    from datetime import date, timedelta
    start = date(2026, 10, 1)
    ids = [diary.topic_for("u1", (start + timedelta(days=i)).isoformat())["id"] for i in range(len(diary.TOPICS))]
    assert len(set(ids)) == len(diary.TOPICS)


def test_topic_order_differs_by_user():
    days = [f"2026-10-{d:02d}" for d in range(1, 11)]
    a = [diary.topic_for("u1", d)["id"] for d in days]
    b = [diary.topic_for("u2", d)["id"] for d in days]
    assert a != b


# --- 출석·레벨 ---------------------------------------------------------------------

def test_attendance_every_day_with_small_reward():
    for d in range(1, 15):
        out = ms.pick_missions("u1", f"2026-10-{d:02d}", steps=300 if d % 2 else 9000)
        assert out["missions"][0]["id"] == "attendance"
        assert len(out["missions"]) == 5 + ms.MISSIONS_PER_DAY
    a = ms.CATALOG["attendance"]
    assert (a.coins, a.xp) == (ms.COINS_DAILY, ms.XP_DAILY)
    assert ms.is_complete(a, {})


def test_all_done_does_not_need_attendance():
    missions = [ms.CATALOG["attendance"].to_dict()] + today_missions()
    assert ms.settle_coins(missions, {"sky_photo", "cook", "movies"})["all_done"]
    assert not ms.settle_coins(missions, {"attendance", "sky_photo", "cook"})["all_done"]


@pytest.mark.parametrize("xp, level, in_level, to_next", [
    (0, 1, 0, 100), (99, 1, 99, 1), (100, 2, 0, 250), (349, 2, 249, 1), (350, 3, 0, 400),
    (1300, 5, 0, 700), (3850, 8, 0, 1150), (9350, 12, 0, 1750),
])
def test_level_from_xp(xp, level, in_level, to_next):
    r = ms.level_from_xp(xp)
    assert (r["level"], r["xp_in_level"], r["xp_to_next"]) == (level, in_level, to_next)


# --- 매일 고정 미션 ------------------------------------------------------------------

def test_daily_fixed_then_three_rotating():
    seen = set()
    for d in range(1, 29):
        out = ms.pick_missions("u1", f"2026-10-{d:02d}", steps=300 if d % 2 else 9000)
        ids = [m["id"] for m in out["missions"]]
        assert ids[:5] == ["attendance", "walk", "diary", "visit", "guestbook"]
        rotating = ids[5:]
        assert len(rotating) == ms.MISSIONS_PER_DAY
        assert not set(rotating) & set(ms.BY_CATEGORY["daily"])
        seen.add(tuple(rotating))
    assert len(seen) > 20                              # 나머지는 매일 다름


def test_daily_diary_suggests_topic_but_any_diary_counts():
    out = ms.pick_missions("u1", "2026-10-01", steps=300)
    d = out["missions"][2]
    topic = diary.topic_for("u1", "2026-10-01")
    assert d["id"] == "diary"
    assert topic["text"] in d["desc"]
    assert d["suggested_topic_id"] == topic["id"]
    assert ms.is_complete(d, {"text": "주제와 상관없는 이야기"})
    assert not ms.is_complete(d, {"text": "  "})


def test_guestbook_mission_needs_server_check():
    g = ms.CATALOG["guestbook"]
    assert ms.is_complete(g, {"written": True})
    assert not ms.is_complete(g, {"written": False})
    assert not ms.is_complete(g, {})


def test_visit_mission_needs_server_check():
    v = ms.CATALOG["visit"]
    assert (v.category, v.coins, v.xp) == ("daily", 30, 100)
    assert ms.is_complete(v, {"visited": True})
    assert not ms.is_complete(v, {})


def test_last_week_daily_only_with_history():
    week = [3000] * 4
    with_history = [m["id"] for m in ms.pick_missions("u1", "2026-10-01", steps=400, last_week_steps=week)["missions"]]
    no_history = [m["id"] for m in ms.pick_missions("u1", "2026-10-01", steps=400, last_week_steps=[3000] * 3)["missions"]]
    assert with_history[:6] == ["attendance", "walk", "beat_last_week", "diary", "visit", "guestbook"]
    assert no_history[:5] == ["attendance", "walk", "diary", "visit", "guestbook"]
    assert "beat_last_week" not in no_history
    assert len(with_history) == len(no_history) + 1


def test_levels_get_slower():
    needs = [ms.xp_for_next(n) for n in range(1, 20)]
    assert needs[0] == 100 and all(b > a for a, b in zip(needs, needs[1:]))   # 갈수록 더 많이 필요
    assert [ms.xp_to_reach(n) for n in (2, 3, 5, 8, 12)] == [100, 350, 1300, 3850, 9350]
    for n in range(1, 30):                                                    # 경계값이 정확히 그 레벨
        assert ms.level_from_xp(ms.xp_to_reach(n))["level"] == n
        assert ms.level_from_xp(ms.xp_to_reach(n) - 1)["level"] == max(1, n - 1)
