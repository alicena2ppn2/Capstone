"""지표 계산 모듈.

규칙 엔진(점수 → 게이트 → 2주 지속 → 안전장치)에 넣을 값을 계산한다.
점수 매기기와 단계 판정은 여기서 하지 않는다.

정의는 루트 INITIAL_PLAN.md(초기 기획)를 따른다.
- 8.2   IS (Interdaily Stability)
- 9     저활동일: baseline 중앙값의 50% 미만인 날
- 11    수면 중간점 이동, 연속 미수집
- 12.1  baseline: 첫 28일, 유효 데이터 21일 이상, 중앙값 사용
- 12.4  절대 저활동: 최근 7일 걸음 중앙값 < 1,000보
- 12.5  안전장치: 7일 연속 일 100보 미만

입력은 한 사람의 일별 데이터 (Daily_Data 시트와 같은 컬럼).
결측일은 행이 있되 data_available=False, 값은 NaN 이다.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass

import numpy as np
import pandas as pd

BASELINE_DAYS = 28
BASELINE_MIN_VALID_DAYS = 21
WINDOW_DAYS = 7
LOW_ACTIVITY_RATIO = 0.5
ABSOLUTE_LOW_STEPS = 1_000
SAFETY_STEPS = 100
SAFETY_DAYS = 7


# ---------------------------------------------------------------------------
# 개별 지표
# ---------------------------------------------------------------------------

def interdaily_stability(hourly: np.ndarray) -> float:
    """시간별 활동량으로 IS를 계산한다.

    hourly: (일수, 24) 배열. 값이 하나라도 NaN인 날은 빼고 계산한다.
    IS = (n · Σ_h (x̄_h − x̄)²) / (p · Σ_i (x_i − x̄)²)
    유효한 날이 2일 미만이거나 활동량이 전부 같으면 NaN.
    """
    x = np.asarray(hourly, dtype=float)
    if x.ndim != 2 or x.shape[1] != 24:
        raise ValueError(f"hourly는 (일수, 24) 배열이어야 합니다: {x.shape}")
    x = x[~np.isnan(x).any(axis=1)]
    if x.shape[0] < 2:
        return float("nan")

    p = x.shape[1]
    n = x.size
    mean = x.mean()
    total_var = ((x - mean) ** 2).sum()
    if total_var == 0:
        return float("nan")
    hourly_mean = x.mean(axis=0)
    return float(n * ((hourly_mean - mean) ** 2).sum() / (p * total_var))


def wrap_clock(hours: float) -> float:
    """시각을 0 이상 24 미만으로 맞춘다. 부동소수 오차로 24.0이 나오는 경우도 0으로 돌린다."""
    h = hours % 24
    return 0.0 if h >= 24 - 1e-9 else float(h)


def parse_clock(value) -> float:
    """'07:37' → 7.616… (시 단위). 결측이면 NaN."""
    if not isinstance(value, str) or ":" not in value:
        return float("nan")
    h, m = value.split(":")[:2]
    return int(h) + int(m) / 60


def sleep_midpoint(wake_time, sleep_duration_h) -> float:
    """수면 중간점(시 단위, 0~24).

    잠든 시각 = 기상 시각 − 수면 시간, 중간점 = 기상 시각 − 수면 시간 / 2.
    예: 07:00 기상, 8시간 수면 → 03:00 (3.0)
    """
    wake = parse_clock(wake_time)
    if np.isnan(wake) or sleep_duration_h is None or np.isnan(sleep_duration_h):
        return float("nan")
    return wrap_clock(wake - sleep_duration_h / 2)


def clock_diff_hours(later: float, earlier: float) -> float:
    """두 시각의 차이(시간). 자정을 넘는 경우를 고려해 -12~+12 범위로 돌려준다.

    양수 = later가 더 늦음. 예: clock_diff_hours(1.0, 23.0) == 2.0
    """
    if np.isnan(later) or np.isnan(earlier):
        return float("nan")
    return (later - earlier + 12) % 24 - 12


def circular_median_clock(hours: pd.Series) -> float:
    """시각들의 중앙값. 자정 앞뒤로 흩어진 값(23시, 1시)도 제대로 묶이게 한다."""
    h = pd.Series(hours, dtype=float).dropna()
    if h.empty:
        return float("nan")
    # 원형 평균 방향을 기준점으로 잡고, 거기서의 차이로 중앙값을 구한다.
    angles = h / 24 * 2 * np.pi
    center = np.arctan2(np.sin(angles).mean(), np.cos(angles).mean()) / (2 * np.pi) * 24
    offsets = h.map(lambda v: clock_diff_hours(v, center))
    return wrap_clock(center + offsets.median())


def clock_sd_minutes(hours: pd.Series) -> float:
    """시각의 표준편차(분). 자정 넘김을 고려한다. 기상 시각 변동폭에 쓴다."""
    h = pd.Series(hours, dtype=float).dropna()
    if len(h) < 2:
        return float("nan")
    center = circular_median_clock(h)
    offsets = h.map(lambda v: clock_diff_hours(v, center))
    return float(offsets.std(ddof=1) * 60)


def longest_run(mask: pd.Series) -> int:
    """True가 연속으로 나온 최대 길이."""
    best = cur = 0
    for v in mask:
        cur = cur + 1 if v else 0
        best = max(best, cur)
    return best


def trailing_run(mask: pd.Series) -> int:
    """끝에서부터 True가 연속으로 나온 길이 (오늘까지 이어지는 연속 일수)."""
    n = 0
    for v in reversed(list(mask)):
        if not v:
            break
        n += 1
    return n


# ---------------------------------------------------------------------------
# baseline과 최근 7일 지표
# ---------------------------------------------------------------------------

def prepare(daily: pd.DataFrame) -> pd.DataFrame:
    """날짜순 정렬, 비어 있는 날짜는 결측일로 채우고, 수면 중간점·기상 시각 컬럼을 추가한다."""
    df = daily.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").drop_duplicates("date").set_index("date")
    full = pd.date_range(df.index.min(), df.index.max(), freq="D")
    df = df.reindex(full)
    df.index.name = "date"
    available = df["data_available"].astype("boolean").fillna(False) if "data_available" in df else df["steps"].notna()
    df["data_available"] = available.astype(bool) & df["steps"].notna()
    df["wake_h"] = df["wake_time"].map(parse_clock)
    df["sleep_mid_h"] = [sleep_midpoint(w, d) for w, d in zip(df["wake_time"], df["sleep_duration_h"])]
    return df.reset_index()


@dataclass
class Baseline:
    start: pd.Timestamp
    end: pd.Timestamp
    valid_days: int
    ready: bool               # 유효 데이터 21일 이상인지
    steps_median: float
    is_median: float
    sleep_mid_h: float        # 수면 중간점 중앙값 (시)
    wake_h: float             # 기상 시각 중앙값 (시)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["start"] = self.start.date().isoformat()
        d["end"] = self.end.date().isoformat()
        return d


def compute_baseline(daily: pd.DataFrame, days: int = BASELINE_DAYS) -> Baseline:
    """가입 후 첫 `days`일로 개인 baseline을 만든다 (12.1)."""
    df = prepare(daily)
    start = df["date"].min()
    end = start + pd.Timedelta(days=days - 1)
    win = df[(df["date"] >= start) & (df["date"] <= end)]
    valid = win[win["data_available"]]
    return Baseline(
        start=start,
        end=end,
        valid_days=len(valid),
        ready=len(valid) >= BASELINE_MIN_VALID_DAYS,
        steps_median=float(valid["steps"].median()),
        is_median=float(valid["is_7d"].median()) if "is_7d" in valid else float("nan"),
        sleep_mid_h=circular_median_clock(valid["sleep_mid_h"]),
        wake_h=circular_median_clock(valid["wake_h"]),
    )


@dataclass
class WindowIndicators:
    end_date: str
    days_in_window: int
    valid_days: int
    in_baseline_period: bool
    # 활동
    steps_median_7d: float
    steps_reduction_pct: float      # baseline 대비 감소율 (0.3 = 30% 감소, 늘었으면 음수)
    low_activity_days: int          # baseline 중앙값의 50% 미만인 날 수
    absolute_low: bool              # 최근 7일 걸음 중앙값 < 1,000보
    # 리듬
    is_7d: float
    is_drop: float                  # baseline IS − 최근 IS (양수 = 하락)
    # 수면
    sleep_mid_h: float
    sleep_mid_shift_h: float        # baseline 대비 수면 중간점 이동 (양수 = 늦어짐)
    wake_time_sd_min: float
    sleep_duration_median_h: float
    waso_median_min: float
    # 결측
    missing_days: int
    missing_streak_current: int     # 오늘까지 이어지는 연속 미수집 일수
    missing_streak_max: int         # 최근 7일 안 최대 연속 미수집
    # 안전장치
    safety_low_steps_streak: int    # 오늘까지 이어지는 일 100보 미만 연속 일수 (결측일은 끊김으로 봄)
    safety_triggered: bool          # 7일 연속 일 100보 미만

    def to_dict(self) -> dict:
        return asdict(self)


def compute_window(
    daily: pd.DataFrame,
    end_date,
    baseline: Baseline | None = None,
    window: int = WINDOW_DAYS,
) -> WindowIndicators:
    """`end_date`까지 최근 `window`일의 지표를 계산한다.

    IS는 시간별 데이터가 없어서 해당 날짜의 7일 IS(is_7d)를 그대로 쓴다.
    시간별 데이터가 생기면 interdaily_stability()로 바꾼다.
    """
    df = prepare(daily)
    end = pd.Timestamp(end_date)
    if baseline is None:
        baseline = compute_baseline(daily)

    start = end - pd.Timedelta(days=window - 1)
    win = df[(df["date"] >= start) & (df["date"] <= end)]
    valid = win[win["data_available"]]
    missing = ~win["data_available"]

    steps_med = float(valid["steps"].median())
    reduction = (
        (baseline.steps_median - steps_med) / baseline.steps_median
        if baseline.steps_median and not np.isnan(steps_med)
        else float("nan")
    )
    low_days = int((valid["steps"] < baseline.steps_median * LOW_ACTIVITY_RATIO).sum())

    is_now = valid["is_7d"].iloc[-1] if "is_7d" in valid and len(valid) else float("nan")
    is_drop = baseline.is_median - is_now

    mid = circular_median_clock(valid["sleep_mid_h"])

    # 안전장치는 baseline과 무관하게 전체 기록에서 오늘까지의 연속 일수를 본다.
    upto = df[df["date"] <= end]
    low_steps = upto["data_available"] & (upto["steps"] < SAFETY_STEPS)
    safety_streak = trailing_run(low_steps)

    return WindowIndicators(
        end_date=end.date().isoformat(),
        days_in_window=len(win),
        valid_days=len(valid),
        in_baseline_period=end <= baseline.end,
        steps_median_7d=steps_med,
        steps_reduction_pct=float(reduction),
        low_activity_days=low_days,
        absolute_low=bool(steps_med < ABSOLUTE_LOW_STEPS) if not np.isnan(steps_med) else False,
        is_7d=float(is_now),
        is_drop=float(is_drop),
        sleep_mid_h=mid,
        sleep_mid_shift_h=clock_diff_hours(mid, baseline.sleep_mid_h),
        wake_time_sd_min=clock_sd_minutes(valid["wake_h"]),
        sleep_duration_median_h=float(valid["sleep_duration_h"].median()),
        waso_median_min=float(valid["waso_min"].median()),
        missing_days=int(missing.sum()),
        missing_streak_current=trailing_run(missing),
        missing_streak_max=longest_run(missing),
        safety_low_steps_streak=safety_streak,
        safety_triggered=safety_streak >= SAFETY_DAYS,
    )


def compute_weekly(daily: pd.DataFrame) -> pd.DataFrame:
    """baseline 이후 7일마다 지표를 계산해 표로 돌려준다 (매주 1회 평가)."""
    baseline = compute_baseline(daily)
    df = prepare(daily)
    last = df["date"].max()
    rows = []
    end = baseline.end + pd.Timedelta(days=WINDOW_DAYS)
    while end <= last:
        rows.append(compute_window(daily, end, baseline).to_dict())
        end += pd.Timedelta(days=WINDOW_DAYS)
    return pd.DataFrame(rows)
