"""
SK 통신 유동인구 데이터 → 블록 단위 생활활동 지표 생성
README 23.2 "지역 단위 분석 아이디어" 구현

출력: output/block_features.csv  (BLOCK_CD 1행)
      output/block_month_features.csv (BLOCK_CD × 월)
"""
import glob
import numpy as np
import pandas as pd

D = "2026빅콘테스트_sk통신인구_데이터_레이아웃 (1)"
KEY = ["STD_YM", "BLOCK_CD", "X_COORD", "Y_COORD"]
REGION = {"32010": "춘천시", "11230": "강남구"}   # 그 외 prefix는 경계 유출분 → 제외

TIME_COLS = [f"TMST_{h:02d}" for h in range(24)]
WK_COLS = ["FLOW_POP_CNT_MON", "FLOW_POP_CNT_TUS", "FLOW_POP_CNT_WED",
           "FLOW_POP_CNT_THU", "FLOW_POP_CNT_FRI"]
WE_COLS = ["FLOW_POP_CNT_SAT", "FLOW_POP_CNT_SUN"]
AGE_COLS = [f"{s}_FLOW_POP_CNT_{a}" for s in ("MAN", "WMAN")
            for a in ("10G", "20G", "30G", "40G", "50G", "60GU")]


def load(kind):
    fs = sorted(glob.glob(f"{D}/flow_{kind}_pop_*.csv"))
    df = pd.concat(pd.read_csv(f, sep="|", dtype={"STD_YM": str, "BLOCK_CD": str},
                               encoding="utf-8-sig") for f in fs)
    df = df.drop_duplicates()                       # 202512 파일 통째 중복 제거
    df["region"] = df.BLOCK_CD.str[:5].map(REGION)
    df = df[df.region.notna()].copy()
    return df


def block_month(df, cols):
    """셀 → 블록×월 집계. 합계(총량)와 셀 수를 함께 보관."""
    g = df.groupby(["region", "BLOCK_CD", "STD_YM"])
    out = g[cols].sum()
    out["n_cells"] = g.size()
    out["x"] = g.X_COORD.mean()
    out["y"] = g.Y_COORD.mean()
    return out.reset_index()


# ---------- 1. 시간대 (flow_time_pop) ----------
t = block_month(load("time"), TIME_COLS)
T = t[TIME_COLS].to_numpy()
total = T.sum(axis=1)
prof = np.divide(T, total[:, None], out=np.zeros_like(T), where=total[:, None] > 0)  # 24h 비율 프로파일

# RA (Relative Amplitude): 가장 활발한 연속 10h vs 가장 조용한 연속 5h  (README 8.2, 지역판)
def roll_max(a, w):
    aa = np.concatenate([a, a[:, :w - 1]], axis=1)
    return max(aa[:, i:i + w].mean(axis=1) for i in range(24))
def roll_min(a, w):
    aa = np.concatenate([a, a[:, :w - 1]], axis=1)
    return np.min(np.stack([aa[:, i:i + w].mean(axis=1) for i in range(24)]), axis=0)
M10 = np.max(np.stack([np.concatenate([T, T[:, :9]], 1)[:, i:i + 10].mean(1) for i in range(24)]), 0)
L5 = roll_min(T, 5)
t["RA"] = np.divide(M10 - L5, M10 + L5, out=np.zeros_like(M10), where=(M10 + L5) > 0)
t["night_share"] = prof[:, [0, 1, 2, 3, 4, 5]].sum(1)          # 00~05시 비율
t["day_share"] = prof[:, 9:18].sum(1)                          # 09~17시 비율
t["peak_hour"] = np.argmax(T, axis=1)
t["flatness"] = 1 - (prof.max(1) - prof.min(1)) * 24 / 2      # 0=뾰족, 1=완전 평탄 (근사)
t["time_total"] = total
t["time_per_cell"] = total / t.n_cells

# ---------- 2. 요일 (flow_wkdy_pop) ----------
w = block_month(load("wkdy"), WK_COLS + WE_COLS)
w["weekday_mean"] = w[WK_COLS].mean(1)
w["weekend_mean"] = w[WE_COLS].mean(1)
w["weekend_ratio"] = np.divide(w.weekend_mean, w.weekday_mean,
                               out=np.full(len(w), np.nan), where=w.weekday_mean > 0)
w["wkdy_total"] = w[WK_COLS + WE_COLS].sum(1)
w["wkdy_per_cell"] = w.wkdy_total / w.n_cells

# ---------- 3. 연령 (flow_age_pop) ----------
a = block_month(load("age"), AGE_COLS)
a["age_total"] = a[AGE_COLS].sum(1)
for grp in ("10G", "20G", "30G", "40G", "50G", "60GU"):
    a[f"share_{grp}"] = (a[f"MAN_FLOW_POP_CNT_{grp}"] + a[f"WMAN_FLOW_POP_CNT_{grp}"]) / a.age_total.replace(0, np.nan)
a["share_youth_2030"] = a.share_20G + a.share_30G
a["age_per_cell"] = a.age_total / a.n_cells

# ---------- 병합 (블록×월) ----------
bm = (t[["region", "BLOCK_CD", "STD_YM", "x", "y", "n_cells", "time_total", "time_per_cell",
         "RA", "night_share", "day_share", "peak_hour", "flatness"] + TIME_COLS]
      .merge(w[["BLOCK_CD", "STD_YM", "weekday_mean", "weekend_mean", "weekend_ratio", "wkdy_per_cell"]],
             on=["BLOCK_CD", "STD_YM"], how="outer")
      .merge(a[["BLOCK_CD", "STD_YM", "age_total", "age_per_cell", "share_youth_2030", "share_60GU"]
               + [f"share_{g}" for g in ("10G", "20G", "30G", "40G", "50G")]],
             on=["BLOCK_CD", "STD_YM"], how="outer"))
bm.to_csv("output/block_month_features.csv", index=False, encoding="utf-8-sig")

# ---------- 블록 단위 요약 (6개월) ----------
num_cols = ["time_per_cell", "RA", "night_share", "day_share", "flatness",
            "weekend_ratio", "wkdy_per_cell", "age_per_cell", "share_youth_2030"] +            [f"share_{g}" for g in ("10G", "20G", "30G", "40G", "50G", "60GU")]
g = bm.groupby(["region", "BLOCK_CD"])
b = g[num_cols].median()
b["n_months"] = g.STD_YM.nunique()
b["n_cells"] = g.n_cells.median()
b["x"] = g.x.first(); b["y"] = g.y.first()

# IS(Interdaily Stability)의 지역판: 월별 24h 프로파일이 서로 얼마나 닮았는가
# = 월별 프로파일 벡터 간 평균 상관계수 (1=매달 같은 패턴)
def profile_stability(sub):
    P = sub[TIME_COLS].to_numpy(dtype=float)
    P = P / np.where(P.sum(1, keepdims=True) == 0, 1, P.sum(1, keepdims=True))
    if len(P) < 2 or P.std(1).min() == 0:
        return np.nan
    c = np.corrcoef(P)
    return c[np.triu_indices(len(P), 1)].mean()
b["profile_IS"] = g[TIME_COLS].apply(profile_stability)

# 월별 추세: 7월 대비 12월 유동 변화율 (급락 블록 탐지용)
first = bm[bm.STD_YM == "202507"].set_index("BLOCK_CD").wkdy_per_cell
last = bm[bm.STD_YM == "202512"].set_index("BLOCK_CD").wkdy_per_cell
b = b.reset_index()
b["trend_jul_dec"] = b.BLOCK_CD.map((last - first) / first.replace(0, np.nan))
b.to_csv("output/block_features.csv", index=False, encoding="utf-8-sig")

print("block×month:", bm.shape, " block:", b.shape)
print(b.groupby("region").size())
print(b.describe().T[["mean", "25%", "50%", "75%"]].round(3).to_string())
