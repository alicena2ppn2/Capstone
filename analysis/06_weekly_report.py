"""
(c) 행정향 주간 리포트 생성 (README 23.3)
    섹션 1. 빅콘 데이터로 찾은 생활활동 취약 블록      ← output/block_vulnerability.csv
    섹션 2. 해당 지역 앱 사용자의 비식별 개입 단계 분포 ← output/app_user_stage.csv (컬럼: BLOCK_CD, stage) 있으면 사용
    섹션 3. 연결 가능한 복지 자원                       ← analysis/welfare_resources.csv
출력: output/report/주간리포트_<날짜>.md
사용: python analysis/06_weekly_report.py [--top 10] [--date YYYY-MM-DD]
"""
import argparse, datetime as dt, os
import numpy as np, pandas as pd
from pyproj import Transformer

ap = argparse.ArgumentParser()
ap.add_argument("--top", type=int, default=10)
ap.add_argument("--date", default=dt.date.today().isoformat())
args = ap.parse_args()

b = pd.read_csv("output/block_vulnerability.csv", dtype={"BLOCK_CD": str})
to_wgs = Transformer.from_crs("EPSG:5179", "EPSG:4326", always_xy=True)   # UTM-K → 위경도
b["lon"], b["lat"] = to_wgs.transform(b.x.values, b.y.values)

PCT_LABEL = {"pct_flatness": "낮 피크 없음", "pct_share_60GU": "고령 비중", "pct_wkdy_per_cell": "절대 유동 낮음",
             "pct_weekend_flat": "주중·주말 무차이", "pct_trend_jul_dec": "6개월 감소", "pct_life_consumption_idx": "생활업종 소비 낮음"}
def reasons(r, k=2):
    vals = {PCT_LABEL[c]: r[c] for c in PCT_LABEL if c in r and pd.notna(r[c])}
    return ", ".join(f"{n}(상위 {int((1 - v) * 100)}%)" for n, v in sorted(vals.items(), key=lambda x: -x[1])[:k])

stage_path = "output/app_user_stage.csv"
stages = pd.read_csv(stage_path, dtype={"BLOCK_CD": str}) if os.path.exists(stage_path) else None
welfare = pd.read_csv("analysis/welfare_resources.csv")
week_end = dt.date.fromisoformat(args.date); week_start = week_end - dt.timedelta(days=6)

L = [f"# 생활활동 취약 지역 주간 리포트", "",
     f"- 기간: {week_start} ~ {week_end}", f"- 데이터: SK 통신 유동인구 2025.07~12 (블록 단위 월 집계), 취약지수 v0.2",
     "- 용도: 담당자 내부용. 블록 단위 지역 지표이며 특정 개인을 판정하지 않습니다 (README 12.9).", ""]

for region in ["강남구", "춘천시"]:
    s = b[b.region == region]
    res = s[s.block_type == "거주형"]
    L += [f"## {region}", "",
          f"| 구분 | 도심 | 외곽 |", "|---|---:|---:|",
          f"| 전체 블록 | {(s.zone=='도심').sum()} | {(s.zone=='외곽').sum()} |",
          f"| 거주형(평가 대상) | {((res.zone=='도심')).sum()} | {(res.zone=='외곽').sum()} |",
          f"| 우선 | {((res.zone=='도심')&(res.vuln_grade=='우선')).sum()} | {((res.zone=='외곽')&(res.vuln_grade=='우선')).sum()} |",
          f"| 주의 | {((res.zone=='도심')&(res.vuln_grade=='주의')).sum()} | {((res.zone=='외곽')&(res.vuln_grade=='주의')).sum()} |", ""]
    for zone in ["도심", "외곽"]:
        top = res[(res.zone == zone) & (res.vuln_grade == "우선")].sort_values("vuln_index", ascending=False).head(args.top)
        if top.empty: continue
        L += [f"### 1. 생활활동 취약 블록 — {zone} 우선 {len(top)}곳", "",
              "| 순위 | BLOCK_CD | 위도, 경도 | 취약지수 | 셀당 일유동 | 60+ 비중 | 주말/주중 | 7→12월 | 주요 신호 |",
              "|---:|---|---|---:|---:|---:|---:|---:|---|"]
        for i, (_, r) in enumerate(top.iterrows(), 1):
            L.append(f"| {i} | `{r.BLOCK_CD}` | {r.lat:.5f}, {r.lon:.5f} | {r.vuln_index:.2f} | {r.wkdy_per_cell:,.0f} | "
                     f"{r.share_60GU*100:.0f}% | {r.weekend_ratio:.2f} | {r.trend_jul_dec*100:+.0f}% | {reasons(r)} |")
        L.append("")
    # 섹션 2
    L += ["### 2. 앱 사용자 개입 단계 분포 (비식별)", ""]
    if stages is not None:
        st = stages.merge(s[["BLOCK_CD", "vuln_grade"]], on="BLOCK_CD")
        tab = pd.crosstab(st.vuln_grade, st.stage)
        L += [tab.to_markdown(), ""]
    else:
        L += ["| 블록 등급 | 관찰 | 주의 | 적극적 넛지 | 지원 연결 고려 |", "|---|---:|---:|---:|---:|",
              "| 우선 | – | – | – | – |", "| 주의 | – | – | – | – |", "| 그 외 | – | – | – | – |", "",
              "> 앱 사용자 단계 데이터 미연결 (`output/app_user_stage.csv`, 컬럼 `BLOCK_CD, stage`). 개인 식별 정보 없이 블록×단계 건수만 사용.", ""]
    # 섹션 3
    L += ["### 3. 연결 가능한 복지 자원", "", "| 분류 | 자원 | 비고 |", "|---|---|---|"]
    L += [f"| {r.category} | {r.name} | {r.note} |" for _, r in welfare[welfare.region == region].iterrows()]
    L += [""]

L += ["## 해석 시 주의", "",
      "- 유동인구는 거주자+방문자 합산. 거주형 블록만 평가했지만 '거주자가 외출하지 않음'과 '방문자가 없음'은 완전히 분리되지 않음.",
      "- 외곽 블록은 면적이 커서 도심과 다른 척도로 순위를 매김. 두 권역 순위를 직접 비교하지 말 것.",
      "- 취약지수 가중치는 프로토타입 초기값 (README 12.8과 같은 근거 수준). 카드 데이터 결합·현장 확인 후 보정 예정.",
      "- 이 리포트는 '어디를 먼저 볼지'를 정하는 자료이며, 블록 안의 누구도 진단하지 않음."]

os.makedirs("output/report", exist_ok=True)
path = f"output/report/주간리포트_{args.date}.md"
open(path, "w", encoding="utf-8").write("\n".join(L))
b[["region", "zone", "block_type", "BLOCK_CD", "lat", "lon", "vuln_index", "vuln_grade"]].to_csv(
    "output/block_vulnerability_latlon.csv", index=False, encoding="utf-8-sig")
print("saved", path)
