import io

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
    assert photo_meta.taken_at(JPEG) is None                 # 깨진 파일
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


def test_photo_without_taken_at_is_allowed_by_default(client):
    date, m = find_photo_day(client, "u1")
    p = up(client, jpeg_taken(None), date=date)["photo_id"]
    r = client.post(f"/users/u1/missions/{m['id']}/complete", params={"date": date}, json={"photos": [p]})
    assert r.status_code == 200


def test_can_block_photos_without_taken_at(client, monkeypatch):
    from app import main
    monkeypatch.setattr(main, "ALLOW_PHOTO_WITHOUT_TAKEN_AT", False)
    date, m = find_photo_day(client, "u1")
    p = up(client, jpeg_taken(None), date=date)["photo_id"]
    r = client.post(f"/users/u1/missions/{m['id']}/complete", params={"date": date}, json={"photos": [p]})
    assert r.status_code == 422


def test_diary_accepts_old_photos_and_album_hides_taken_at(client):
    p = up(client, jpeg_taken("2025:05:05 12:00:00"), date="2026-12-01")["photo_id"]
    assert client.put("/users/u1/diary/2026-12-01", json={"text": "옛날 사진", "photos": [p]}).status_code == 200
    photo = client.get("/users/u1/album").json()["photos"][0]
    assert photo["photo_id"] == p and "taken_at" not in photo
