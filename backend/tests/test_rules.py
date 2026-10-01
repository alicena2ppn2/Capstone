import numpy as np
import pandas as pd
import pytest

from app import indicators as ind
from app import rules
from tests.test_indicators import make_daily


def window(**kw):
    """테스트용 WindowIndicators. 지정 안 한 값은 '변화 없음'."""
    base = dict(
        end_date="2026-07-05", days_in_window=7, valid_days=7, in_baseline_period=False,
        steps_median_7d=6000.0, steps_reduction_pct=0.0, low_activity_days=0, absolute_low=False,
        is_7d=0.5, is_drop=0.0, sleep_mid_h=3.0, sleep_mid_shift_h=0.0, wake_time_sd_min=20.0,
        sleep_duration_median_h=7.0, waso_median_min=30.0,
        missing_days=0, missing_streak_current=0, missing_streak_max=0,
        safety_low_steps_streak=0, safety_triggered=False,
    )
    base.update(kw)
    return ind.WindowIndicators(**base)


# --- 점수 구간 ------------------------------------------------------------------

@pytest.mark.parametrize("v, pts", [(0.05, 0), (0.10, 5), (0.25, 15), (0.30, 25), (0.9, 25), (-0.2, 0), (np.nan, 0)])
def test_activity_score(v, pts):
    assert rules.activity_score(v) == pts


@pytest.mark.parametrize("v, pts", [(0.01, 0), (0.02, 5), (0.06, 15), (0.08, 25)])
def test_rhythm_score(v, pts):
    assert rules.rhythm_score(v) == pts


@pytest.mark.parametrize("v, pts", [(0.4, 0), (0.5, 5), (2.0, 12), (3.0, 20), (-4.0, 0)])
def test_sleep_score(v, pts):
    assert rules.sleep_score(v) == pts


@pytest.mark.parametrize("v, pts", [(2, 0), (3, 3), (4, 3), (5, 5), (6, 5), (7, 10)])
def test_missing_score(v, pts):
    assert rules.missing_score(v) == pts


@pytest.mark.parametrize("v, stage", [(0, 0), (29.9, 0), (30, 1), (50, 2), (70, 3), (100, 3)])
def test_stage_from_score(v, stage):
    assert rules.stage_from_score(v) == stage


def test_total_scaled_without_mobility():
    s = rules.Scores.from_indicators(window(steps_reduction_pct=0.3, is_drop=0.08))
    assert s.total == pytest.approx(62.5)          # (25 + 25) × 100 / 80


def test_total_with_mobility():
    s = rules.Scores.from_indicators(window(steps_reduction_pct=0.3, is_drop=0.08), mobility=10)
    assert s.total == 60


# --- 유형 태그 --------------------------------------------------------------------

def test_type_tag():
    rhythm = rules.Scores.from_indicators(window(is_drop=0.08))
    iso = rules.Scores.from_indicators(window(steps_reduction_pct=0.3, is_drop=0.02))
    none = rules.Scores.from_indicators(window())
    assert rules.type_tag(rhythm) == "리듬형"
    assert rules.type_tag(iso) == "고립형"
    assert rules.type_tag(none) is None


# --- 게이트 / 절대 저활동 --------------------------------------------------------

def test_gate_caps_at_caution_without_rhythm_signal():
    # 다리 부상: 걸음만 크게 줄고 리듬·수면은 그대로, 결측 7일까지 겹쳐 점수는 높음
    s = rules.Scores.from_indicators(window(steps_reduction_pct=0.5, missing_streak_max=7))
    assert s.total >= 30
    stage, gate, _ = rules._candidate(s, abs_low_persisting=False)
    assert not gate
    assert stage <= rules.CAUTION


def test_gate_caps_rhythm_only():
    s = rules.Scores.from_indicators(window(is_drop=0.1, sleep_mid_shift_h=3.5))
    assert s.total >= 50
    stage, gate, _ = rules._candidate(s, abs_low_persisting=False)
    assert not gate
    assert stage == rules.CAUTION


def test_absolute_low_raises_to_caution_and_counts_as_quantity():
    s = rules.Scores.from_indicators(window())
    stage, _, _ = rules._candidate(s, abs_low_persisting=True)
    assert stage == rules.CAUTION

    s = rules.Scores.from_indicators(window(is_drop=0.08, sleep_mid_shift_h=3.0))
    stage, gate, _ = rules._candidate(s, abs_low_persisting=True)
    assert gate
    assert stage >= rules.NUDGE


# --- 시간 흐름 (2주 지속, 안전장치, baseline) --------------------------------------

def steps_plan(*weeks):
    """(걸음수, 주 수) 묶음을 일별 리스트로."""
    out = []
    for steps, n in weeks:
        out += [steps] * (7 * n)
    return out


def stages(evals):
    return [e.stage_name for e in evals]


def test_baseline_period_has_no_stage():
    ev = rules.evaluate_person(make_daily(steps_plan((6000, 4))))
    assert stages(ev) == ["기준선 수집 중"] * 4
    assert all(e.scores is None for e in ev)


def test_one_bad_week_does_not_raise_stage():
    df = make_daily(steps_plan((6000, 4), (6000, 1), (2000, 1), (6000, 2)))
    assert all(e.stage == rules.OBSERVE for e in rules.evaluate_person(df) if not e.in_baseline_period)


def test_two_bad_weeks_raise_stage_then_two_good_weeks_lower_it():
    df = make_daily(steps_plan((6000, 4), (2000, 3), (6000, 3)))
    # 리듬 신호가 있어야 게이트를 넘으므로 IS도 같이 떨어뜨린다.
    df.loc[28:48, "is_7d"] = 0.4
    ev = [e for e in rules.evaluate_person(df) if not e.in_baseline_period]
    names = [e.stage_name for e in ev]
    assert names[0] == "관찰"              # 첫 나쁜 주: 후보만 올라감
    assert ev[0].candidate >= rules.NUDGE
    assert names[1] == "적극적 넛지"        # 2주 연속 → 확정
    assert names[3] == "적극적 넛지"        # 회복 첫 주: 유지
    assert names[4] == "관찰"              # 회복 2주 → 하강 확정


def test_safety_triggers_during_baseline():
    df = make_daily(steps_plan((6000, 1), (50, 1), (6000, 2)))
    ev = rules.evaluate_person(df)
    assert ev[1].safety_triggered
    assert ev[1].stage == rules.NUDGE
    assert ev[1].stage_name == "적극적 넛지"


def test_safety_skips_two_week_rule_after_baseline():
    df = make_daily(steps_plan((6000, 4), (50, 1)))
    ev = rules.evaluate_person(df)
    assert ev[-1].safety_triggered
    assert ev[-1].stage >= rules.NUDGE


def test_absolute_low_four_weeks_gives_caution():
    df = make_daily(steps_plan((800, 10)))
    ev = rules.evaluate_person(df)
    after = [e for e in ev if not e.in_baseline_period]
    assert after[0].absolute_low_weeks >= rules.ABSOLUTE_LOW_WEEKS
    # 후보가 주의로 올라가고, 2주 지속 후 확정
    assert after[0].candidate == rules.CAUTION
    assert after[1].stage == rules.CAUTION


def test_baseline_not_ready_holds_judgement():
    steps = [6000] * 10 + [None] * 18 + [2000] * 14
    ev = rules.evaluate_person(make_daily(steps))
    assert all(e.stage is None for e in ev)
    assert any("판정 보류" in r for e in ev for r in e.reasons)


def test_refer_after_four_support_weeks():
    df = make_daily(steps_plan((6000, 4), (1000, 7)))
    df.loc[28:, "is_7d"] = 0.3
    df.loc[28:, "wake_time"] = "11:00"
    ev = rules.evaluate_person(df)
    assert any(e.stage == rules.SUPPORT for e in ev)
    assert ev[-1].refer_to_agency


def test_reasons_are_filled():
    df = make_daily(steps_plan((6000, 4), (2000, 2)))
    ev = rules.evaluate_person(df)
    assert all(e.reasons for e in ev if not e.in_baseline_period)
    assert isinstance(rules.evaluations_to_frame(ev), pd.DataFrame)
