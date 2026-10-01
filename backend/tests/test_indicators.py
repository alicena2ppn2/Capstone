import numpy as np
import pandas as pd
import pytest

from app import indicators as ind


def make_daily(steps, start="2026-06-01", wake="07:00", sleep_h=8.0, is_7d=0.5):
    """테스트용 일별 데이터. steps에 None을 넣으면 결측일."""
    rows = []
    for i, s in enumerate(steps):
        ok = s is not None
        rows.append({
            "date": pd.Timestamp(start) + pd.Timedelta(days=i),
            "steps": s if ok else np.nan,
            "sleep_duration_h": sleep_h if ok else np.nan,
            "waso_min": 30.0 if ok else np.nan,
            "wake_time": wake if ok else np.nan,
            "is_7d": is_7d if ok else np.nan,
            "data_available": ok,
        })
    return pd.DataFrame(rows)


# --- IS --------------------------------------------------------------------

def test_is_identical_days_is_one():
    day = np.array([0] * 7 + [100] * 12 + [20] * 5, dtype=float)
    assert ind.interdaily_stability(np.tile(day, (7, 1))) == pytest.approx(1.0)


def test_is_random_days_is_low():
    rng = np.random.default_rng(0)
    assert ind.interdaily_stability(rng.random((28, 24))) < 0.2


def test_is_skips_nan_days():
    day = np.arange(24, dtype=float)
    x = np.tile(day, (3, 1))
    x[1, 5] = np.nan
    assert ind.interdaily_stability(x) == pytest.approx(1.0)


def test_is_rejects_wrong_shape():
    with pytest.raises(ValueError):
        ind.interdaily_stability(np.zeros((3, 12)))


# --- 수면 중간점 --------------------------------------------------------------

def test_sleep_midpoint():
    assert ind.sleep_midpoint("07:00", 8) == pytest.approx(3.0)
    assert ind.sleep_midpoint("01:00", 6) == pytest.approx(22.0)   # 19시 취침 → 22시
    assert np.isnan(ind.sleep_midpoint(np.nan, 8))


def test_clock_diff_wraps_midnight():
    assert ind.clock_diff_hours(1.0, 23.0) == pytest.approx(2.0)
    assert ind.clock_diff_hours(23.0, 1.0) == pytest.approx(-2.0)


def test_circular_median_around_midnight():
    assert ind.circular_median_clock(pd.Series([23.0, 23.5, 0.5, 1.0, 0.0])) == pytest.approx(0.0)


# --- 연속 일수 ----------------------------------------------------------------

def test_runs():
    m = pd.Series([True, True, False, True, True, True])
    assert ind.longest_run(m) == 3
    assert ind.trailing_run(m) == 3
    assert ind.trailing_run(pd.Series([True, False])) == 0


# --- baseline / 7일 지표 ------------------------------------------------------

def test_baseline_uses_median_and_first_28_days():
    steps = [5000] * 27 + [50000] + [100] * 10    # 29일째부터는 baseline 밖
    b = ind.compute_baseline(make_daily(steps))
    assert b.valid_days == 28
    assert b.ready
    assert b.steps_median == 5000
    assert b.sleep_mid_h == pytest.approx(3.0)


def test_baseline_not_ready_with_too_many_missing():
    steps = [5000] * 20 + [None] * 8
    assert not ind.compute_baseline(make_daily(steps)).ready


def test_window_reduction_and_low_days():
    steps = [6000] * 28 + [3000, 3000, 2000, 2000, 4000, 6000, 6000]
    df = make_daily(steps)
    w = ind.compute_window(df, df["date"].max())
    assert w.steps_median_7d == 3000
    assert w.steps_reduction_pct == pytest.approx(0.5)
    assert w.low_activity_days == 2            # 3,000 미만인 날: 2000, 2000
    assert not w.in_baseline_period


def test_window_missing_streaks():
    steps = [6000] * 28 + [6000, None, None, 6000, None, None, None]
    df = make_daily(steps)
    w = ind.compute_window(df, df["date"].max())
    assert w.missing_days == 5
    assert w.missing_streak_current == 3
    assert w.missing_streak_max == 3
    assert w.valid_days == 2


def test_missing_dates_without_rows_count_as_missing():
    df = make_daily([6000] * 35).drop(index=[30, 31])
    w = ind.compute_window(df, df["date"].max())
    assert w.missing_days == 2


def test_sleep_shift_later():
    base = make_daily([6000] * 28)
    late = make_daily([6000] * 7, start="2026-06-29", wake="10:00")   # 3시간 늦게 기상
    w = ind.compute_window(pd.concat([base, late]), "2026-07-05")
    assert w.sleep_mid_shift_h == pytest.approx(3.0)


def test_safety_triggers_in_baseline_period():
    df = make_daily([5000] * 3 + [50] * 7)
    w = ind.compute_window(df, df["date"].max())
    assert w.in_baseline_period
    assert w.safety_low_steps_streak == 7
    assert w.safety_triggered


def test_absolute_low():
    df = make_daily([800] * 35)
    w = ind.compute_window(df, df["date"].max())
    assert w.absolute_low
    assert w.steps_reduction_pct == pytest.approx(0.0)


def test_compute_weekly_runs_every_7_days_after_baseline():
    df = make_daily([6000] * 90)
    weekly = ind.compute_weekly(df)
    assert len(weekly) == 8                       # 29~90일 → 7일 단위 8번
    assert weekly["end_date"].iloc[0] == "2026-07-05"
