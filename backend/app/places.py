"""동네 탐험 장소와 장소 쪽지 (영주 님 웹 시안 frontend/dev/exploration/livePlaces.mjs와 같은 장소·규칙, 10/17).

- 장소: app/data/places.json (서울 15곳: 서울도서관·서울광장·남산공원 + 10/21 공원·한강공원 7곳, 공공 도서관 5곳). 좌표는 장소 구역을 대표하는 참고 지점이며
  입구가 아니다. 보상은 아직 없다
- 쓰기만 잠금 (10/19): 쪽지 읽기는 어디서나, 남기기는 장소 근처(write_radius_m)에서만. 넓은 공원은 반경을 크게.
  위치는 쓸 때 판정에만 쓰고 저장하지 않는다. 휴대폰이 보낸 위치를 믿는 것이라 위치 조작까지 막지는 못한다
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
WRITE_ACCURACY_M: int = DATA["write_accuracy_m"]   # 위치 오차가 이보다 크면 쓰기 판정을 하지 않는다


def distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """두 위경도 사이 거리(미터, 하버사인 공식)."""
    r = math.radians
    d_lat, d_lng = r(lat2 - lat1), r(lng2 - lng1)
    h = math.sin(d_lat / 2) ** 2 + math.cos(r(lat1)) * math.cos(r(lat2)) * math.sin(d_lng / 2) ** 2
    return 6_371_000 * 2 * math.atan2(math.sqrt(h), math.sqrt(1 - h))


def public(place: dict, lat: float | None = None, lng: float | None = None) -> dict:
    """화면에 보내는 장소 모양. 내 위치가 있으면 거리(m)도."""
    out = {k: place[k] for k in ("id", "name", "kind", "icon", "latitude", "longitude", "write_radius_m", "intro", "location_note", "official_url")}
    if lat is not None and lng is not None:
        out["distance_m"] = round(distance_m(lat, lng, place["latitude"], place["longitude"]))
    return out


def write_check(place: dict, lat: float | None, lng: float | None, accuracy: float | None) -> str | None:
    """쪽지를 남길 수 있는 곳인지. 안 되면 화면에 보여 줄 이유, 되면 None."""
    radius = place["write_radius_m"]
    if lat is None or lng is None:
        return f"쪽지는 {place['name']} 근처({radius}m 안)에서 남길 수 있어요. 내 위치를 먼저 확인해 주세요."
    if accuracy is not None and accuracy > WRITE_ACCURACY_M:
        return f"위치가 정확하지 않아요(오차 약 {round(accuracy)}m). 하늘이 트인 곳에서 다시 확인해 주세요."
    far = round(distance_m(lat, lng, place["latitude"], place["longitude"]))
    if far > radius:
        return f"쪽지는 {place['name']} {radius}m 안에서 남길 수 있어요. 지금은 약 {far:,}m 떨어져 있어요."
    return None
