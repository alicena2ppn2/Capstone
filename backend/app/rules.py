"""규칙 엔진 v0.2.

지표(indicators.py) → 점수 → 게이트 → 2주 지속 → 안전장치 → 단계 + 유형 태그.
정의는 루트 README 11~12장을 따른다.

단계는 사용자에게 보여주는 위험 등급이 아니라, 에이전트의 개입 강도를 정하는 내부 상태다.
점수와 근거(reasons)는 심사위원용(admin) 화면에서만 쓴다.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field

import numpy as np
import pandas as pd

from . import indicators as ind

# 단계 (README 11장 "내부 개입 수준")
OBSERVE, CAUTION, NUDGE, SUPPORT = 0, 1, 2, 3
STAGE_NAMES = {OBSERVE: "관찰", CAUTION: "주의", NUDGE: "적극적 넛지", SUPPORT: "지원 연결 고려"}
BASELINE_STAGE_NAME = "기준선 수집 중"

ABSOLUTE_LOW_WEEKS = 4      # 12.4 절대 저활동 4주 지속
SUPPORT_REFER_WEEKS = 4     # 12.7 "지원 연결 고려" 4주 지속 시 기관 안내

ACTIVITY_MAX, RHYTHM_MAX, SLEEP_MAX, MOBILITY_MAX, MISSING_MAX = 25, 25, 20, 20, 10


# ---------------------------------------------------------------------------
# 점수 (11장)
# ---------------------------------------------------------------------------

def _band(value: float, cuts: list[tuple[float, int]]) -> int:
    """value가 cuts의 경계값 이상이면 그 점수. cuts는 경계값 오름차순. NaN은 0점."""
    if value is None or np.isnan(value):
        return 0
    score = 0
    for cut, pts in cuts:
        if value >= cut:
            score = pts
    return score


def activity_score(reduction: float) -> int:
    """baseline 대비 걸음수 감소율: <10% 0 / 10~20% 5 / 20~30% 15 / ≥30% 25"""
    return _band(reduction, [(0.10, 5), (0.20, 15), (0.30, 25)])


def rhythm_score(is_drop: float) -> int:
    """baseline 대비 IS 하락폭: <0.02 0 / 0.02~0.05 5 / 0.05~0.08 15 / ≥0.08 25"""
    return _band(is_drop, [(0.02, 5), (0.05, 15), (0.08, 25)])


def sleep_score(mid_shift_h: float) -> int:
    """수면 중간점이 baseline보다 늦어진 정도: <0.5h 0 / 0.5~1.5h 5 / 1.5~3h 12 / ≥3h 20

    README 기준이 "늦어졌는지"라서 일찍 자는 쪽(음수)은 0점으로 본다.
    """
    return _band(mid_shift_h, [(0.5, 5), (1.5, 12), (3.0, 20)])


def missing_score(streak: int) -> int:
    """연속 미수집: <3일 0 / 3~4일 3 / 5~6일 5 / ≥7일 10"""
    return _band(float(streak), [(3, 3), (5, 5), (7, 10)])


def stage_from_score(total: float) -> int:
    """0–29 관찰 / 30–49 주의 / 50–69 적극적 넛지 / 70–100 지원 연결 고려"""
    if total >= 70:
        return SUPPORT
    if total >= 50:
        return NUDGE
    if total >= 30:
        return CAUTION
    return OBSERVE


@dataclass
class Scores:
    activity: int
    rhythm: int
    sleep: int
    mobility: int | None      # GPS 미허용(또는 아직 미계산)이면 None
    missing: int
    total: float              # 100점 기준. mobility가 None이면 80점 만점을 100점으로 환산

    @classmethod
    def from_indicators(cls, w: ind.WindowIndicators, mobility: int | None = None) -> "Scores":
        a = activity_score(w.steps_reduction_pct)
        r = rhythm_score(w.is_drop)
        s = sleep_score(w.sleep_mid_shift_h)
        m = missing_score(w.missing_streak_max)
        if mobility is None:
            total = (a + r + s + m) * 100 / 80
        else:
            total = a + r + s + mobility + m
        return cls(a, r, s, mobility, m, round(total, 1))


def type_tag(scores: Scores) -> str | None:
    """12.6 유형 태그. 영역별 만점 대비 비율로 비교한다. 신호가 없으면 None.

    리듬형: (Rhythm + Sleep) 비율 > (Activity + Mobility) 비율
    고립형: 그 외
    """
    rhythm_max = RHYTHM_MAX + SLEEP_MAX
    rhythm_ratio = (scores.rhythm + scores.sleep) / rhythm_max
    if scores.mobility is None:
        iso_ratio = scores.activity / ACTIVITY_MAX
    else:
        iso_ratio = (scores.activity + scores.mobility) / (ACTIVITY_MAX + MOBILITY_MAX)
    if rhythm_ratio == 0 and iso_ratio == 0:
        return None
    return "리듬형" if rhythm_ratio > iso_ratio else "고립형"


# ---------------------------------------------------------------------------
# 한 사람의 시간 흐름 평가 (12장)
# ---------------------------------------------------------------------------

@dataclass
class Evaluation:
    date: str
    in_baseline_period: bool
    stage: int | None             # 확정 단계. baseline 기간이고 안전장치가 없으면 None
    stage_name: str
    candidate: int | None         # 이번 주만 보면 나오는 단계 (2주 지속 확인 전)
    scores: Scores | None
    type_tag: str | None
    gate_passed: bool | None      # 12.2 양 AND 리듬 동시 조건
    absolute_low_weeks: int
    safety_triggered: bool
    support_weeks: int            # "지원 연결 고려" 연속 주 수
    refer_to_agency: bool         # 4주 지속 → 기관 안내
    reasons: list[str] = field(default_factory=list)
    indicators: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        d = asdict(self)
        return d


def _candidate(scores: Scores, abs_low_persisting: bool) -> tuple[int, bool, list[str]]:
    """점수 → 단계 후보. 게이트와 절대 저활동 규칙을 적용한다."""
    reasons = []
    stage = stage_from_score(scores.total)
    reasons.append(f"점수 {scores.total}점 → {STAGE_NAMES[stage]}")

    quantity = scores.activity > 0 or abs_low_persisting
    rhythm = scores.rhythm > 0 or scores.sleep > 0
    gate = quantity and rhythm
    if stage >= NUDGE and not gate:
        stage = CAUTION
        missing = "양(활동량)" if not quantity else "리듬·수면"
        reasons.append(f"게이트 미충족({missing} 신호 없음) → 주의에서 멈춤")

    if abs_low_persisting and stage < CAUTION:
        stage = CAUTION
        reasons.append(f"절대 저활동 {ABSOLUTE_LOW_WEEKS}주 지속 → 최소 주의")
    return stage, gate, reasons


def evaluate_person(daily: pd.DataFrame, mobility: dict[str, int] | None = None) -> list[Evaluation]:
    """가입일부터 7일마다 평가한다. 첫 28일(baseline 기간)에는 안전장치만 본다.

    mobility: {평가일(YYYY-MM-DD): Mobility 점수}. 없으면 GPS 미허용으로 보고 80점 환산.
    """
    baseline = ind.compute_baseline(daily)
    df = ind.prepare(daily)
    first, last = df["date"].min(), df["date"].max()

    results: list[Evaluation] = []
    confirmed: int = OBSERVE
    prev_candidate: int | None = None
    abs_low_weeks = 0
    support_weeks = 0

    end = first + pd.Timedelta(days=ind.WINDOW_DAYS - 1)
    while end <= last:
        w = ind.compute_window(daily, end, baseline)
        reasons: list[str] = []
        abs_low_weeks = abs_low_weeks + 1 if w.absolute_low else 0
        abs_low_persisting = abs_low_weeks >= ABSOLUTE_LOW_WEEKS
        in_baseline = w.in_baseline_period or not baseline.ready

        scores = None
        tag = None
        gate = None
        candidate = None

        if in_baseline:
            if not baseline.ready and not w.in_baseline_period:
                reasons.append(f"baseline 유효 데이터 부족({baseline.valid_days}일 < {ind.BASELINE_MIN_VALID_DAYS}일) → 판정 보류")
            stage = None
            if w.safety_triggered:
                stage = max(confirmed, NUDGE)
                confirmed = stage
                reasons.append(f"안전장치: {w.safety_low_steps_streak}일 연속 일 {ind.SAFETY_STEPS}보 미만 → 즉시 적극적 넛지 이상")
        else:
            mob = (mobility or {}).get(w.end_date)
            scores = Scores.from_indicators(w, mob)
            tag = type_tag(scores)
            candidate, gate, cand_reasons = _candidate(scores, abs_low_persisting)
            reasons += cand_reasons

            if w.safety_triggered:
                candidate = max(candidate, NUDGE)
                confirmed = max(confirmed, candidate)
                reasons.append(f"안전장치: {w.safety_low_steps_streak}일 연속 일 {ind.SAFETY_STEPS}보 미만 → 즉시 적극적 넛지 이상")
            elif prev_candidate is not None and candidate > confirmed and prev_candidate > confirmed:
                confirmed = min(candidate, prev_candidate)
                reasons.append(f"2주 연속 상승 조건 → {STAGE_NAMES[confirmed]}로 상승 확정")
            elif prev_candidate is not None and candidate < confirmed and prev_candidate < confirmed:
                confirmed = max(candidate, prev_candidate)
                reasons.append(f"2주 연속 하강 조건 → {STAGE_NAMES[confirmed]}로 하강 확정")
            elif candidate != confirmed:
                reasons.append(f"이번 주 후보 {STAGE_NAMES[candidate]}, 2주 지속 확인 전이라 {STAGE_NAMES[confirmed]} 유지")
            prev_candidate = candidate
            stage = confirmed

        support_weeks = support_weeks + 1 if stage == SUPPORT else 0
        refer = support_weeks >= SUPPORT_REFER_WEEKS
        if refer:
            reasons.append(f"지원 연결 고려 {support_weeks}주 지속 → 기관 안내")

        results.append(Evaluation(
            date=w.end_date,
            in_baseline_period=in_baseline,
            stage=stage,
            stage_name=STAGE_NAMES[stage] if stage is not None else BASELINE_STAGE_NAME,
            candidate=candidate,
            scores=scores,
            type_tag=tag,
            gate_passed=gate,
            absolute_low_weeks=abs_low_weeks,
            safety_triggered=w.safety_triggered,
            support_weeks=support_weeks,
            refer_to_agency=refer,
            reasons=reasons,
            indicators=w.to_dict(),
        ))
        end += pd.Timedelta(days=ind.WINDOW_DAYS)
    return results


def evaluations_to_frame(evals: list[Evaluation]) -> pd.DataFrame:
    """평가 결과를 표로 (검증·리포트용)."""
    rows = []
    for e in evals:
        s = e.scores
        rows.append({
            "date": e.date,
            "stage_name": e.stage_name,
            "candidate": STAGE_NAMES.get(e.candidate) if e.candidate is not None else None,
            "total": s.total if s else None,
            "activity": s.activity if s else None,
            "rhythm": s.rhythm if s else None,
            "sleep": s.sleep if s else None,
            "missing": s.missing if s else None,
            "type_tag": e.type_tag,
            "gate": e.gate_passed,
            "abs_low_weeks": e.absolute_low_weeks,
            "safety": e.safety_triggered,
            "refer": e.refer_to_agency,
        })
    return pd.DataFrame(rows)
