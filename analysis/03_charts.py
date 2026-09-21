"""분석 결과 시각화 → output/charts/*.png"""
import numpy as np, pandas as pd, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
import os
os.makedirs("output/charts", exist_ok=True)
for f in ["Malgun Gothic", "NanumGothic", "AppleGothic"]:
    if any(f == x.name for x in font_manager.fontManager.ttflist):
        plt.rcParams["font.family"] = f; break
plt.rcParams.update({"axes.unicode_minus": False, "figure.facecolor": "#fcfcfb", "axes.facecolor": "#fcfcfb",
                     "axes.spines.top": False, "axes.spines.right": False, "axes.edgecolor": "#c3c2b7",
                     "grid.color": "#e6e5e0", "text.color": "#0b0b0b", "axes.labelcolor": "#52514e",
                     "xtick.color": "#52514e", "ytick.color": "#52514e", "font.size": 10})
C = {"강남구": "#2a78d6", "춘천시": "#eb6834"}          # categorical slot 1, 2

b = pd.read_csv("output/block_vulnerability.csv", dtype={"BLOCK_CD": str})
bm = pd.read_csv("output/block_month_features.csv", dtype={"BLOCK_CD": str, "STD_YM": str})
T = [f"TMST_{h:02d}" for h in range(24)]

# 1. 24h 프로파일: 지역별 + 취약등급별
fig, axes = plt.subplots(1, 2, figsize=(11, 3.8), sharey=True)
p = bm.groupby("region")[T].sum(); p = p.div(p.sum(1), axis=0) * 100
for r in p.index:
    axes[0].plot(range(24), p.loc[r], color=C[r], lw=2, label=r)
axes[0].set_title("지역별 24시간 유동 분포 (%)", loc="left", fontsize=11); axes[0].legend(frameon=False)
g = bm.merge(b[["BLOCK_CD", "vuln_grade"]], on="BLOCK_CD")
pg = g[g.region == "강남구"].groupby("vuln_grade")[T].sum(); pg = pg.div(pg.sum(1), axis=0) * 100
shade = {"일반": "#c7dbf4", "관찰": "#8fb6ea", "주의": "#4f8fdc", "우선": "#1d4f96"}
for gr in ["일반", "관찰", "주의", "우선"]:
    if gr in pg.index: axes[1].plot(range(24), pg.loc[gr], color=shade[gr], lw=2, label=gr)
axes[1].set_title("강남구 취약등급별 24시간 분포 — 우선 블록은 낮 피크가 낮다", loc="left", fontsize=11)
axes[1].legend(frameon=False, title="취약등급")
for ax in axes: ax.set_xticks(range(0, 24, 3)); ax.set_xlabel("시각"); ax.grid(axis="y")
axes[0].set_ylabel("하루 유동 중 비율(%)")
fig.tight_layout(); fig.savefig("output/charts/01_profile24.png", dpi=150); plt.close()

# 2. 월별 추세
fig, ax = plt.subplots(figsize=(6.5, 3.5))
m = bm.groupby(["region", "STD_YM"]).apply(lambda s: (s.weekday_mean * 5 + s.weekend_mean * 2).sum() / 7, include_groups=False).unstack(0)
m = m / m.iloc[0] * 100
for r in m.columns: ax.plot(m.index, m[r], color=C[r], lw=2, marker="o", ms=5, label=r)
ax.axhline(100, color="#c3c2b7", lw=1, ls="--"); ax.set_ylabel("2025.07 = 100"); ax.legend(frameon=False)
ax.set_title("월별 총 유동인구 지수 — 큰 변동 없음, 12월 소폭 감소", loc="left", fontsize=11); ax.grid(axis="y")
fig.tight_layout(); fig.savefig("output/charts/02_monthly_trend.png", dpi=150); plt.close()

# 3. 지도: 취약지수 (지역별 별도 패널, 단일 색상 sequential)
fig, axes = plt.subplots(1, 2, figsize=(12, 5.5))
for ax, r in zip(axes, ["강남구", "춘천시"]):
    s = b[b.region == r]
    if r == "춘천시":  # 도심만 (외곽 면 지역은 셀이 커서 산점이 왜곡됨)
        s = s[(s.x.between(1015500, 1023000)) & (s.y.between(1980000, 1987000))]
    sc = ax.scatter(s.x, s.y, c=s.vuln_index, cmap="Blues", s=10, vmin=0.2, vmax=0.9, linewidths=0)
    top = s[s.vuln_grade == "우선"]
    ax.scatter(top.x, top.y, facecolors="none", edgecolors="#eb6834", s=40, linewidths=1.2, label="우선 블록")
    ax.set_title(f"{r} 블록별 생활활동 취약지수" + (" (도심)" if r == "춘천시" else ""), loc="left", fontsize=11)
    ax.set_aspect("equal"); ax.set_xticks([]); ax.set_yticks([]); ax.legend(frameon=False, loc="lower right")
fig.colorbar(sc, ax=axes, shrink=0.6, label="취약지수 (0~1)")
fig.savefig("output/charts/03_map_vuln.png", dpi=150, bbox_inches="tight"); plt.close()

# 4. 고령 비중 vs 유동 밀도 (블록 산점도)
fig, ax = plt.subplots(figsize=(6.5, 4))
for r, s in b.groupby("region"):
    ax.scatter(s.share_60GU * 100, s.wkdy_per_cell, s=8, alpha=.5, color=C[r], label=r, linewidths=0)
ax.set_yscale("log"); ax.set_xlabel("60세 이상 유동 비중 (%)"); ax.set_ylabel("셀당 일평균 유동 (log)")
ax.set_title("고령 비중이 높은 블록일수록 유동 밀도가 낮다 (r = -0.37)", loc="left", fontsize=11)
ax.legend(frameon=False); ax.grid(axis="y")
fig.tight_layout(); fig.savefig("output/charts/04_age_vs_density.png", dpi=150); plt.close()
print("saved", os.listdir("output/charts"))
