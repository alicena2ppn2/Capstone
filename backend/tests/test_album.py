from tests.test_api import JPEG, client, upload  # noqa: F401  (client는 fixture)


def photo_mission(client, user, date):
    """그날 사진 미션을 하나 찾는다 (없으면 None)."""
    missions = client.get(f"/users/{user}/missions/today", params={"date": date}).json()["missions"]
    return next((m for m in missions if m["kind"] == "photo"), None)


def find_photo_day(client, user):
    for d in range(1, 29):
        date = f"2026-11-{d:02d}"
        m = photo_mission(client, user, date)
        if m:
            return date, m
    raise AssertionError("사진 미션이 나온 날이 없음")


def test_album_shows_mission_and_diary_photos_newest_first(client):
    date, m = find_photo_day(client, "u1")
    p1 = client.post("/users/u1/photos", params={"date": date},
                     files={"file": ("a.jpg", JPEG, "image/jpeg")}).json()["photo_id"]
    assert client.post(f"/users/u1/missions/{m['id']}/complete", params={"date": date}, json={"photos": [p1]}).status_code == 200

    p2 = client.post("/users/u1/photos", params={"date": "2026-12-01"},
                     files={"file": ("b.jpg", JPEG, "image/jpeg")}).json()["photo_id"]
    client.put("/users/u1/diary/2026-12-01", json={"text": "사진 일기", "photos": [p2]})

    p3 = client.post("/users/u1/photos", params={"date": "2026-12-02"},
                     files={"file": ("c.jpg", JPEG, "image/jpeg")}).json()["photo_id"]   # 아직 안 씀

    album = client.get("/users/u1/album").json()
    assert album["total"] == 3
    assert [p["photo_id"] for p in album["photos"]] == [p3, p2, p1]
    by_id = {p["photo_id"]: p for p in album["photos"]}
    assert by_id[p1]["used_for"] == {"type": "mission", "id": m["id"], "title": m["title"]}
    assert by_id[p1]["date"] == date
    assert by_id[p2]["used_for"] == {"type": "diary", "id": "diary", "title": "일기"}
    assert by_id[p3]["used_for"] is None
    assert by_id[p1]["url"] == f"/photos/{p1}"
    assert client.get(by_id[p1]["url"]).content[:2] == b"\xff\xd8"


def test_album_filters_pages_and_months(client):
    for d in ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"]:
        client.post("/users/u1/photos", params={"date": d}, files={"file": ("x.jpg", JPEG, "image/jpeg")})
    nov = client.get("/users/u1/album", params={"from": "2026-11-01", "to": "2026-11-30"}).json()
    assert nov["total"] == 3 and {p["date"] for p in nov["photos"]} == {"2026-11-01", "2026-11-02", "2026-11-03"}
    page1 = client.get("/users/u1/album", params={"per_page": 2, "page": 1}).json()
    assert [p["date"] for p in page1["photos"]] == ["2026-11-01", "2026-10-31"]
    assert client.get("/users/u1/album/months").json()["months"] == [
        {"month": "2026-11", "count": 3}, {"month": "2026-10", "count": 2}]
    assert client.get("/users/u2/album").json() == {"photos": [], "total": 0, "page": 0, "per_page": 30}


def test_delete_photo_from_album(client, tmp_path):
    p = upload(client, "u1").json()["photo_id"]
    client.put("/users/u1/diary/2026-12-01", json={"text": "일기", "photos": [p]})
    other = upload(client, "u2").json()["photo_id"]

    assert client.delete(f"/users/u1/photos/{other}").status_code == 404     # 남의 사진은 못 지움
    assert client.delete(f"/users/u1/photos/{p}").json() == {"deleted": p}
    assert client.get(f"/photos/{p}").status_code == 404
    assert client.get("/users/u1/diary/2026-12-01").json()["photos"] == []   # 일기에서도 떨어짐
    assert client.get("/users/u1/album").json()["total"] == 0
    assert len(list((tmp_path / "uploads").iterdir())) == 1                  # u2 사진만 남음
