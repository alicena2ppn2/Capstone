"""
(b) 신한카드 데이터 결합 — 카드 파일이 들어오면 실행
    카드 스키마 (README 24장): TA_YMD, MCT_SGG_CD, MCT_RY_CD, CLN_SGG_CD, SEX_CCD, AGE_CCD, TS_AT, USE_CNT
    카드는 시군구×업종×연령×성별×일 집계라 블록과 직접 조인 불가.
      1) (지역, 연령대)별 '생활업종(식당·카페 등) 결제건수 비중'과 7→12월 추세 계산
      2) 블록의 연령 구성(share_10G~60GU)으로 가중 평균 → 블록 단위 life_consumption_idx
    출력: output/block_card_features.csv  (04_residential_stratify.py가 자동으로 흡수)

사용: python analysis/05_card_join.py <카드CSV경로>   (구분자 자동 감지)
"""
import sys, glob
import numpy as np, pandas as pd

# ---- 설정: 실제 코드표 확인 후 채울 것 (README 24장 원칙: 원본 값 목록 먼저 확인) ----
SGG_TO_REGION = {"11680": "강남구", "11230": "강남구",        # 행안부 / 통계청 코드 둘 다 허용
                 "51110": "춘천시", "42110": "춘천시", "32010": "춘천시"}
LIFE_MCT_CODES: set[str] = set()          # 생활업종(식당·카페·소매 등) MCT_RY_CD 목록 → 코드표 보고 채움
LIFE_MCT_KEYWORDS = ["식당", "한식", "중식", "일식", "양식", "카페", "커피", "제과", "분식", "음식", "편의점", "슈퍼", "마트"]
AGE_MAP = {"10": "10G", "20": "20G", "30": "30G", "40": "40G", "50": "50G", "60": "60GU", "70": "60GU", "80": "60GU", "90": "60GU"}


def load_card(path):
    with open(path, encoding="utf-8-sig") as f:
        head = f.readline()
    sep = "|" if head.count("|") > head.count(",") else ","
    df = pd.read_csv(path, sep=sep, dtype=str, encoding="utf-8-sig")
    df.columns = [c.strip().upper() for c in df.columns]
    need = {"TA_YMD", "MCT_SGG_CD", "MCT_RY_CD", "AGE_CCD", "USE_CNT"}
    missing = need - set(df.columns)
    if missing:
        raise SystemExit(f"카드 파일에 필요한 컬럼 없음: {missing}\n실제 컬럼: {df.columns.tolist()}")
    df["USE_CNT"] = pd.to_numeric(df.USE_CNT, errors="coerce").fillna(0)
    df["STD_YM"] = df.TA_YMD.str[:6]
    df["region"] = df.MCT_SGG_CD.str[:5].map(SGG_TO_REGION)
    df["age_grp"] = df.AGE_CCD.str.extract(r"(\d{2})")[0].map(AGE_MAP)
    return df


def is_life(df):
    if LIFE_MCT_CODES:
        return df.MCT_RY_CD.isin(LIFE_MCT_CODES)
    name_col = next((c for c in df.columns if "MCT_RY" in c and c != "MCT_RY_CD"), None)
    if name_col is None:
        print("!! MCT_RY_CD 코드표/업종명 컬럼이 없어 생활업종을 판별할 수 없습니다.")
        print("   MCT_RY_CD 고유값:", sorted(df.MCT_RY_CD.unique())[:50])
        raise SystemExit("→ LIFE_MCT_CODES 에 생활업종 코드를 채운 뒤 재실행")
    return df[name_col].str.contains("|".join(LIFE_MCT_KEYWORDS), na=False)


def main(path):
    card = load_card(path)
    print("카드 로드:", card.shape, "| 지역:", card.region.value_counts(dropna=False).to_dict())
    unknown = card[card.region.isna()].MCT_SGG_CD.unique()
    if len(unknown):
        print("!! SGG_TO_REGION 에 없는 시군구 코드:", unknown[:10])
    card = card[card.region.notna() & card.age_grp.notna()].copy()
    card["life"] = is_life(card)

    # 1) 지역×연령×월: 생활업종 결제건수, 전체 결제건수
    g = card.groupby(["region", "age_grp", "STD_YM"]).apply(
        lambda s: pd.Series({"life_cnt": s.loc[s.life, "USE_CNT"].sum(), "all_cnt": s.USE_CNT.sum()}),
        include_groups=False).reset_index()
    g["life_share"] = g.life_cnt / g.all_cnt.replace(0, np.nan)
    ra = g.groupby(["region", "age_grp"]).agg(life_share=("life_share", "median"),
                                              life_cnt=("life_cnt", "median")).reset_index()
    first = g[g.STD_YM == g.STD_YM.min()].set_index(["region", "age_grp"]).life_cnt
    last = g[g.STD_YM == g.STD_YM.max()].set_index(["region", "age_grp"]).life_cnt
    ra["life_trend"] = ((last - first) / first.replace(0, np.nan)).reindex(
        pd.MultiIndex.from_frame(ra[["region", "age_grp"]])).values
    # 지역 내 연령대 간 상대 수준 (0~1): 그 연령대가 다른 연령대보다 생활업종 소비를 얼마나 하는가
    ra["life_rel"] = ra.groupby("region").life_share.rank(pct=True)
    print("\n지역×연령대 생활업종 지표\n", ra.round(3).to_string(index=False))
    ra.to_csv("output/region_age_card.csv", index=False, encoding="utf-8-sig")

    # 2) 블록 연령 구성으로 가중 → 블록 지수
    b = pd.read_csv("output/block_features.csv", dtype={"BLOCK_CD": str})
    rows = []
    for _, r in b.iterrows():
        sub = ra[ra.region == r.region].set_index("age_grp")
        w = {a: r[f"share_{a}"] for a in ("10G", "20G", "30G", "40G", "50G", "60GU") if pd.notna(r[f"share_{a}"])}
        if not w or not len(sub):
            rows.append((r.BLOCK_CD, np.nan, np.nan)); continue
        idx = sum(w[a] * sub.life_rel.get(a, 0.5) for a in w) / sum(w.values())
        tr = sum(w[a] * sub.life_trend.get(a, 0) for a in w) / sum(w.values())
        rows.append((r.BLOCK_CD, idx, tr))
    out = pd.DataFrame(rows, columns=["BLOCK_CD", "life_consumption_idx", "life_consumption_trend"])
    out.to_csv("output/block_card_features.csv", index=False, encoding="utf-8-sig")
    print("\n저장: output/block_card_features.csv", out.shape, "→ 04_residential_stratify.py 재실행하면 지수에 반영됨")


if __name__ == "__main__":
    args = sys.argv[1:] or glob.glob("**/*card*.csv", recursive=True) + glob.glob("**/*카드*.csv", recursive=True)
    if not args:
        raise SystemExit("카드 CSV 경로를 인자로 주세요. (아직 파일 없음)")
    main(args[0])
