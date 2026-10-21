import io

import pytest

from PIL import Image

from app import photo_meta
from tests.test_api import JPEG, client  # noqa: F401  (client는 fixture)
from tests.test_album import find_photo_day


def jpeg_taken(when: str | None) -> bytes:
    """촬영 일시가 들어간 JPEG. when 예: '2026:11:03 14:05:00'"""
    buf = io.BytesIO()
    exif = Image.Exif()
    if when:
        exif[photo_meta.EXIF_IFD] = {photo_meta.DATETIME_ORIGINAL: when}
    Image.new("RGB", (8, 8), (120, 180, 230)).save(buf, "JPEG", exif=exif)
    return buf.getvalue()


def up(client, data, user="u1", date=None):
    params = {"date": date} if date else {}
    return client.post(f"/users/{user}/photos", params=params, files={"file": ("p.jpg", data, "image/jpeg")}).json()


def stored_taken_at(photo_id):
    from app.main import app
    from app import db
    return db.photo_taken_at(app.state.conn, [photo_id])[photo_id]


def test_reads_taken_at():
    assert photo_meta.taken_at(jpeg_taken("2026:11:03 14:05:00")) == "2026-11-03T14:05:00"
    assert photo_meta.taken_at(jpeg_taken(None)) is None
    assert photo_meta.taken_at(b"\xff\xd8\xff\xe0" + b"0" * 100) is None   # 깨진 파일
    assert photo_meta.taken_at(b"not an image") is None


def test_taken_at_stored_but_not_shown(client):
    r = up(client, jpeg_taken("2026:11:03 14:05:00"))
    assert "taken_at" not in r                                   # 사용자에게는 안 보여 줌
    assert stored_taken_at(r["photo_id"]) == "2026-11-03T14:05:00"
    assert stored_taken_at(up(client, jpeg_taken(None))["photo_id"]) is None


def test_photo_mission_needs_photo_taken_today(client):
    date, m = find_photo_day(client, "u1")
    y, mo, d = date.split("-")
    old = up(client, jpeg_taken("2026:01:15 09:00:00"), date=date)["photo_id"]
    r = client.post(f"/users/u1/missions/{m['id']}/complete", params={"date": date}, json={"photos": [old]})
    assert r.status_code == 422
    assert r.json()["detail"] == "오늘 찍은 사진으로 다시 올려 주세요."   # 날짜·확인 방법은 알리지 않음

    today_photo = up(client, jpeg_taken(f"{y}:{mo}:{d} 10:30:00"), date=date)["photo_id"]
    r = client.post(f"/users/u1/missions/{m['id']}/complete", params={"date": date}, json={"photos": [today_photo]})
    assert r.status_code == 200, r.text


def test_photo_without_taken_at_is_blocked_by_default(client, monkeypatch):
    from app import main
    monkeypatch.setattr(main, "ALLOW_PHOTO_WITHOUT_TAKEN_AT", False)   # 서버 기본값 (client fixture만 True로 바꿔 둠)
    date, m = find_photo_day(client, "u1")
    p = up(client, jpeg_taken(None), date=date)["photo_id"]
    r = client.post(f"/users/u1/missions/{m['id']}/complete", params={"date": date}, json={"photos": [p]})
    assert r.status_code == 422
    assert r.json()["detail"] == main.NO_TAKEN_AT_MESSAGE


def test_default_is_strict():
    import importlib
    from app import main
    assert importlib.reload(main).ALLOW_PHOTO_WITHOUT_TAKEN_AT is False


def test_app_sent_taken_at_used_when_file_has_none(client, monkeypatch):
    from app import main
    monkeypatch.setattr(main, "ALLOW_PHOTO_WITHOUT_TAKEN_AT", False)
    date, m = find_photo_day(client, "u1")
    y, mo, d = date.split("-")

    def send(data, taken):
        return client.post("/users/u1/photos", params={"date": date}, data={"taken_at": taken},
                           files={"file": ("p.jpg", data, "image/jpeg")}).json()["photo_id"]

    p = send(jpeg_taken(None), f"{y}:{mo}:{d} 09:00:00")              # 앱이 보낸 EXIF 형식
    assert stored_taken_at(p) == f"{date}T09:00:00"
    assert client.post(f"/users/u1/missions/{m['id']}/complete", params={"date": date}, json={"photos": [p]}).status_code == 200
    # 파일 EXIF가 있으면 앱 값보다 파일이 우선
    q = send(jpeg_taken("2026:01:15 09:00:00"), f"{y}:{mo}:{d} 09:00:00")
    assert stored_taken_at(q) == "2026-01-15T09:00:00"


@pytest.mark.parametrize("value, expected", [
    ("2026:10:15 14:05:00", "2026-10-15T14:05:00"),
    ("2026-10-15T14:05:00", "2026-10-15T14:05:00"),
    ("2026-10-15T00:30:00Z", "2026-10-15T09:30:00"),          # UTC → 서울
    ("2026-10-14T20:00:00+00:00", "2026-10-15T05:00:00"),     # 서울로 바꾸면 다음 날
    ("", None), (None, None), ("어제", None),
])
def test_parse_client_taken(value, expected):
    assert photo_meta.parse_client_taken(value) == expected


def test_one_shot_photo_complete(client, monkeypatch):
    from app import main
    monkeypatch.setattr(main, "ALLOW_PHOTO_WITHOUT_TAKEN_AT", False)
    date, m = find_photo_day(client, "u1")
    y, mo, d = date.split("-")
    url = f"/users/u1/missions/{m['id']}/photo"
    r = client.post(url, params={"date": date}, files={"file": ("p.jpg", jpeg_taken("2026:01:15 09:00:00"), "image/jpeg")})
    assert r.status_code == 422 and r.json()["detail"] == main.NOT_TODAY_MESSAGE
    r = client.post(url, params={"date": date}, files={"file": ("p.jpg", jpeg_taken(f"{y}:{mo}:{d} 10:00:00"), "image/jpeg")})
    assert r.status_code == 200, r.text
    assert r.json()["mission_id"] == m["id"] and r.json()["earned_total"] == m["coins"] and r.json()["photo"]["photo_id"]
    # 사진첩에 미션 이름으로
    pid = r.json()["photo"]["photo_id"]
    photo = next(p for p in client.get("/users/u1/album").json()["photos"] if p["photo_id"] == pid)
    assert photo["used_for"]["title"] == m["title"]
    # 사진 미션이 아니면 422, 오늘 미션이 아니면 404
    assert client.post("/users/u1/missions/attendance/photo", params={"date": date},
                       files={"file": ("p.jpg", jpeg_taken(None), "image/jpeg")}).status_code == 422
    assert client.post("/users/u1/missions/nope/photo", params={"date": date},
                       files={"file": ("p.jpg", jpeg_taken(None), "image/jpeg")}).status_code == 404


def test_diary_accepts_old_photos_and_album_hides_taken_at(client):
    p = up(client, jpeg_taken("2025:05:05 12:00:00"), date="2026-12-01")["photo_id"]
    assert client.put("/users/u1/diary/2026-12-01", json={"text": "옛날 사진", "photos": [p]}).status_code == 200
    photo = client.get("/users/u1/album").json()["photos"][0]
    assert photo["photo_id"] == p and "taken_at" not in photo



def test_upload_strips_gps_and_device_but_keeps_taken_date(client):
    """10/15: 사진의 위치(GPS)·기기 정보는 지우고, 촬영 일시는 DB에만 남긴다."""
    from app import main
    exif = Image.Exif()
    exif[photo_meta.EXIF_IFD] = {photo_meta.DATETIME_ORIGINAL: "2026:10:15 09:30:00"}
    exif[0x8825] = {1: "N", 2: (37.0, 33.0, 0.0), 3: "E", 4: (126.0, 58.0, 0.0)}   # GPS
    exif[0x010F] = "Apple"                                                          # 기기 회사
    buf = io.BytesIO()
    Image.new("RGB", (40, 20), (200, 100, 50)).save(buf, "JPEG", exif=exif)
    assert Image.open(io.BytesIO(buf.getvalue())).getexif().get_ifd(0x8825)           # 원본엔 GPS 있음
    r = client.post("/users/u1/photos", files={"file": ("p.jpg", buf.getvalue(), "image/jpeg")}).json()
    stored = client.get(r["url"]).content
    saved = Image.open(io.BytesIO(stored)).getexif()
    assert not saved.get_ifd(0x8825) and 0x010F not in saved                         # 위치·기기 정보 없음
    assert stored_taken_at(r["photo_id"]) == "2026-10-15T09:30:00"                   # 촬영 일시는 DB에


def test_rotation_baked_in_and_big_photo_shrunk():
    exif = Image.Exif()
    exif[0x0112] = 6                                    # 90도 돌려서 보라는 정보
    buf = io.BytesIO()
    Image.new("RGB", (4000, 1000), (10, 20, 30)).save(buf, "JPEG", exif=exif)
    data, ext, mime = photo_meta.clean_image(buf.getvalue(), "image/jpeg")
    img = Image.open(io.BytesIO(data))
    assert (ext, mime) == (".jpg", "image/jpeg")
    assert img.size == (320, 1280)                      # 돌려서 세로로, 긴 변 1280으로 줄임
    assert 0x0112 not in img.getexif()


def test_not_a_photo_is_rejected(client):
    r = client.post("/users/u1/photos", files={"file": ("x.jpg", b"not an image", "image/jpeg")})
    assert r.status_code == 422
