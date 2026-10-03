"""상점: 캐릭터·의상 목록과 지급 규칙.

상품 목록은 app/data/shop.json (프론트 game.js·Shop.jsx와 같은 값).
- starter   : 처음부터 가지고 있음 (꼬질 감자 모찌)
- milestone : 레벨에 도달하면 무료로 지급 (LV.3 복숭아 토끼 모찌)
- quest     : 하루 미션을 모두 끝내면 무료로 지급 (하루 펭귄 모찌)
- 그 외     : 레벨 조건을 채우고 코인으로 구매
"""

from __future__ import annotations

import json
from pathlib import Path

CATALOG_PATH = Path(__file__).resolve().parent / "data" / "shop.json"
TYPES = ("character", "outfit")
DEFAULT_CHARACTER = "potato"


def load_catalog(path: Path = CATALOG_PATH) -> dict[str, dict[str, dict]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    catalog: dict[str, dict[str, dict]] = {}
    for kind, key in (("character", "characters"), ("outfit", "outfits")):
        items = {}
        for row in raw[key]:
            item = {"level": 1, "price": 0, "method": None, **row, "type": kind}
            if item["id"] in items:
                raise ValueError(f"상품 id 중복: {kind}/{item['id']}")
            if item["method"] not in (None, "starter", "milestone", "quest"):
                raise ValueError(f"알 수 없는 획득 방법: {kind}/{item['id']} → {item['method']}")
            items[item["id"]] = item
        catalog[kind] = items
    if DEFAULT_CHARACTER not in catalog["character"]:
        raise ValueError("기본 캐릭터가 목록에 없습니다")
    return catalog


CATALOG = load_catalog()


def free_grants(level: int, all_done: bool) -> list[tuple[str, str]]:
    """지금 조건으로 무료로 받을 수 있는 상품 (이미 가졌는지는 따지지 않음)."""
    out = []
    for kind, items in CATALOG.items():
        for item in items.values():
            m = item["method"]
            if m == "starter" or (m == "milestone" and level >= item["level"]) or (m == "quest" and all_done):
                out.append((kind, item["id"]))
    return out


def buy_problem(kind: str, item_id: str, level: int, coins: int, owned: set[tuple[str, str]]) -> tuple[int, str] | None:
    """구매할 수 없으면 (HTTP 상태, 이유). 살 수 있으면 None."""
    item = CATALOG.get(kind, {}).get(item_id)
    if item is None:
        return 404, "없는 상품입니다."
    if (kind, item_id) in owned:
        return 409, "이미 가지고 있어요."
    if item["method"]:
        return 422, "살 수 없는 상품이에요. 조건을 채우면 무료로 받아요."
    if level < item["level"]:
        return 422, f"LV.{item['level']}부터 살 수 있어요."
    if coins < item["price"]:
        return 422, "코인이 부족해요."
    return None


def status(item: dict, level: int, coins: int, owned: set[tuple[str, str]]) -> str:
    """owned(보유) · buyable(구매 가능) · no_coins(레벨은 되는데 코인 부족) · locked(레벨 부족) · hidden(조건 달성 전 비공개)"""
    if (item["type"], item["id"]) in owned:
        return "owned"
    if item["method"] in ("quest", "milestone", "starter"):
        return "hidden" if item["method"] == "quest" else "locked"
    if level < item["level"]:
        return "locked"
    return "buyable" if coins >= item["price"] else "no_coins"
