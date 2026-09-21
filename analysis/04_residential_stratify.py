"""
(a) 거주형 블록 필터 + 도심/외곽 분리 → 취약지수 v0.2
    - zone      : 도심 / 외곽  (n_cells > 50 → 외곽. 외곽은 셀당 유동이 도심의 1/10 이하라 같은 척도 비교 불가)
    - block_type: 거주형 / 업무상업형  (권역 내 야간/주간 비율 상위 50% → 거주형)
    - 취약지수는 '거주형' 블록에 대해서만, (region × zone) 층 안에서 백분위 계산
출력: output/block_vulnerability.csv (v0.2, 덮어씀)
"""
import numpy as np, pandas as pd

b = pd.read_csv("output/block_features.csv", dtype={"BLOCK_CD": str})
b = b[b.n_months >= 4].copy()
b["zone"] = np.where(b.n_cells > 50, "외곽", "도심")
b["night_day_ratio"] = b.night_share / b.day_share
b["stratum"] = b.region + "·" + b.zone
med = b.groupby("stratum").night_day_ratio.transform("median")
b["block_type"] = np.where(b.night_day_ratio >= med, "거주형", "업무상업형")
b["weekend_flat"] = -np.abs(np.log(b.weekend_ratio.clip(0.05, 20)))

W = {"flatness": 0.30, "share_60GU": 0.20, "wkdy_per_cell": -0.20,
     "weekend_flat": 0.15, "trend_jul_dec": -0.15}
# (b) 카드 결합 결과가 있으면 생활소비 축 추가 (05_card_join.py 산출)
try:
    card = pd.read_csv("output/block_card_features.csv", dtype={"BLOCK_CD": str})
    b = b.merge(card, on="BLOCK_CD", how="left")
    W["life_consumption_idx"] = -0.15          # 생활업종 소비 낮을수록 취약
    print("카드 결합 지표 포함:", card.columns.tolist())
except FileNotFoundError:
    print("카드 결합 지표 없음 (output/block_card_features.csv 미존재) → 통신 지표만 사용")
tot = sum(abs(v) for v in W.values())
W = {k: v / tot for k, v in W.items()}         # 가중치 합 1로 정규화

res = b[b.block_type == "거주형"].copy()
for c in W:
    p = res.groupby("stratum")[c].rank(pct=True)
    res[f"pct_{c}"] = 1 - p if W[c] < 0 else p
res["vuln_index"] = sum(abs(W[c]) * res[f"pct_{c}"].fillna(0.5) for c in W)
res["vuln_rank_in_stratum"] = res.groupby("stratum").vuln_index.rank(ascending=False).astype(int)
res["vuln_grade"] = pd.cut(res.groupby("stratum").vuln_index.rank(pct=True),
                           [0, .8, .9, .95, 1], labels=["일반", "관찰", "주의", "우선"]).astype(str)

out = b.merge(res[["BLOCK_CD", "vuln_index", "vuln_rank_in_stratum", "vuln_grade"] + [f"pct_{c}" for c in W]],
              on="BLOCK_CD", how="left")
out["vuln_grade"] = out.vuln_grade.fillna("제외(업무상업형)")
out = out.sort_values(["region", "zone", "vuln_index"], ascending=[True, True, False])
out.to_csv("output/block_vulnerability.csv", index=False, encoding="utf-8-sig")

pd.set_option("display.width", 220)
print("\n층별 블록 수 / 거주형 수 / 우선 수")
print(out.groupby("stratum").agg(blocks=("BLOCK_CD", "size"),
                                 residential=("block_type", lambda s: (s == "거주형").sum()),
                                 priority=("vuln_grade", lambda s: (s == "우선").sum())))
show = ["BLOCK_CD", "zone", "vuln_index", "flatness", "share_60GU", "wkdy_per_cell", "weekend_ratio", "trend_jul_dec", "night_day_ratio"]
for st, s in out[out.vuln_grade == "우선"].groupby("stratum"):
    print(f"\n=== {st} 우선 상위 5"); print(s[show].head(5).round(3).to_string(index=False))
