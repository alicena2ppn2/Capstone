"""동네 탐험: 장소 목록·거리, 장소 쪽지 쓰기·읽기·지우기, 필터·신고·차단·계정 삭제."""

from app import places as pl
from tests.test_api import DAY, client, signup  # noqa: F401  (client는 fixture)

CITY_HALL = {"lat": 37.5663, "lng": 126.9779}     # 서울시청 근처


def at(place):   # 그 장소 바로 앞 (쓰기만 잠금 — 근처에서만 남길 수 있음)
    p = pl.PLACES[place]
    return {"latitude": p["latitude"], "longitude": p["longitude"], "accuracy_m": 10}


def note(client, me, text="오늘 하늘이 맑았어요", place="seoul-plaza", **extra):
    return client.post(f"/places/{place}/notes", params={"date": DAY}, json={"text": text, "author_id": me, **at(place), **extra})


def test_places_list_and_distance():
    assert {"seoul-library", "seoul-plaza", "namsan-park", "seoul-forest", "yeouido-hangang", "national-library", "hanyang-univ", "konkuk-univ"} <= set(pl.PLACES)
    assert len(pl.PLACES) == 21   # 10/21: 서울 공원·한강공원·공공 도서관 12곳, 대학 캠퍼스 6곳 추가
    for p in pl.PLACES.values():   # 서울 안, 쓰기 반경 있음
        assert 37.4 < p["latitude"] < 37.7 and 126.7 < p["longitude"] < 127.2 and p["write_radius_m"] > 0
    assert 0 < pl.distance_m(37.5665, 126.9780, 37.5506, 126.9926) < 2500      # 시청 ↔ 남산 약 2km


def test_places_api_sorted_by_distance(client):
    plain = client.get("/places").json()
    assert len(plain["places"]) == 21 and "distance_m" not in plain["places"][0] and plain["note_limit"] == 140
    near = client.get("/places", params=CITY_HALL).json()["places"]
    ids, dist = [p["id"] for p in near], [p["distance_m"] for p in near]
    assert dist == sorted(dist) and near[0]["distance_m"] < 200 and ids.index("namsan-park") < ids.index("olympic-park")
    assert client.get("/places/nowhere/notes").status_code == 404


def test_write_read_delete_note(client):
    a, b = signup(client, "쪽지쓴이")["id"], signup(client, "쪽지읽이")["id"]
    r = note(client, a, color="mint", sticker="✿")
    assert r.status_code == 201
    made = r.json()["note"]
    assert (made["author"], made["color"], made["sticker"], made["mine"]) == ("쪽지쓴이", "mint", "✿", True)
    view = client.get("/places/seoul-plaza/notes", params={"viewer_id": b}).json()
    assert [n["text"] for n in view["notes"]] == ["오늘 하늘이 맑았어요"] and view["notes"][0]["mine"] is False
    assert view["samples"] and all(s["sample"] for s in view["samples"])                  # 창작 예시는 따로
    assert client.delete(f"/places/seoul-plaza/notes/{made['id']}", params={"by": b}).status_code == 403   # 남의 쪽지
    assert client.delete(f"/places/seoul-plaza/notes/{made['id']}", params={"by": a}).status_code == 200
    assert client.get("/places/seoul-plaza/notes").json()["notes"] == []


def test_note_rules(client):
    a = signup(client, "규칙확인")["id"]
    assert note(client, a, text="가" * 141).status_code == 422                               # 140자까지
    assert note(client, a, color="black").status_code == 422
    assert note(client, None).status_code == 422                                              # 가입한 사람만
    assert note(client, a, text="시발 뭐야").status_code == 422                               # 욕설 필터


def test_report_hides_note_and_account_delete(client):
    a = signup(client, "신고당함")["id"]
    readers = [signup(client, f"신고{i}")["id"] for i in range(3)]
    made = note(client, a).json()["note"]
    for uid in readers:      # 새 계정 신고는 숨김 횟수에 안 세므로 가입일을 앞당긴다
        client.app.state.conn.execute("UPDATE users SET created_at = '2026-01-01' WHERE id = ?", (uid,))
    client.app.state.conn.commit()
    r = client.post("/reports", params={"date": DAY}, json={"reporter_id": readers[0], "target_type": "place_note", "target_id": str(made["id"]), "reason": "spam"})
    assert r.status_code == 201
    assert client.get("/places/seoul-plaza/notes", params={"viewer_id": readers[0]}).json()["notes"] == []   # 신고한 사람에게 바로 숨김
    assert len(client.get("/places/seoul-plaza/notes", params={"viewer_id": readers[2]}).json()["notes"]) == 1
    client.post("/reports", params={"date": DAY}, json={"reporter_id": readers[1], "target_type": "place_note", "target_id": str(made["id"]), "reason": "abuse"})
    assert client.get("/places/seoul-plaza/notes", params={"viewer_id": readers[2]}).json()["notes"] == []   # 여러 명 → 모두에게
    note(client, a, text="두 번째 쪽지", place="namsan-park")
    client.delete(f"/users/{a}")
    assert client.get("/places/namsan-park/notes").json()["notes"] == []                     # 계정 삭제 = 쪽지도 삭제


def test_write_only_near_the_place(client):
    # 10/19 쓰기만 잠금: 읽기는 어디서나, 남기기는 장소 반경 안에서만 (위치는 저장 안 함)
    a = signup(client, "근처확인")["id"]
    far = {"latitude": CITY_HALL["lat"], "longitude": CITY_HALL["lng"], "accuracy_m": 10}
    r = note(client, a, place="namsan-park", **far)
    assert r.status_code == 403 and "떨어져" in r.json()["detail"]                             # 시청에서 남산 쪽지 X
    assert note(client, a, latitude=None, longitude=None).status_code == 403                  # 위치 없음
    assert note(client, a, accuracy_m=120).status_code == 403                                 # 오차가 너무 큼
    assert note(client, a).status_code == 201                                                  # 광장 앞에서는 됨
    assert client.get("/places/seoul-plaza/notes").json()["notes"]                             # 읽기는 위치 없이
    assert client.get("/places").json()["places"][0]["write_radius_m"] > 0
    cols = [c[1] for c in client.app.state.conn.execute("PRAGMA table_info(place_notes)")]
    assert not {"latitude", "longitude"} & set(cols)                                          # 위치는 저장하지 않음
