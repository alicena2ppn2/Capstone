"""동네 탐험 장소와 장소 쪽지 (영주 님 웹 시안 frontend/dev/exploration/livePlaces.mjs와 같은 장소·규칙, 10/17).

- 장소: app/data/places.json (실제 장소 3곳: 서울도서관·서울광장·남산공원). 좌표는 장소 구역을 대표하는 참고 지점이며
  입구나 도착 판정 반경이 아니다 → 아직 '도착 확인'·보상은 하지 않는다
- 쪽지: 장소마다 남기는 짧은 글(140자) + 종이 색 + 스티커. 다른 사람이 보는 글이라 방명록과 같은 필터·신고·차단을 쓴다
- 샘플 쪽지(sample_notes)는 실제 주민 글이 아닌 창작 예시라 화면에서 구분해서 보여 준다
"""

from __future__ import annotations

import json
import math
from pathlib import Path

DATA = json.loads((Path(__file__).resolve().parent / "data" / "places.json").read_text(encoding="utf-8"))
PLACES: dict[str, dict] = {p["id"]: p for p in DATA["places"]}
NOTE_LIMIT: int = DATA["note_limit"]
COLORS: tuple[str, ...] = tuple(DATA["colors"])
STICKERS: tuple[str, ...] = tuple(DATA["stickers"])


def distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """두 위경도 사이 거리(미터, 하버사인 공식)."""
    r = math.radians
    d_lat, d_lng = r(lat2 - lat1), r(lng2 - lng1)
    h = math.sin(d_lat / 2) ** 2 + math.cos(r(lat1)) * math.cos(r(lat2)) * math.sin(d_lng / 2) ** 2
    return 6_371_000 * 2 * math.atan2(math.sqrt(h), math.sqrt(1 - h))


def public(place: dict, lat: float | None = None, lng: float | None = None) -> dict:
    """화면에 보내는 장소 모양. 내 위치가 있으면 거리(m)도."""
    out = {k: place[k] for k in ("id", "name", "kind", "icon", "latitude", "longitude", "intro", "location_note", "official_url")}
    if lat is not None and lng is not None:
        out["distance_m"] = round(distance_m(lat, lng, place["latitude"], place["longitude"]))
    return out
