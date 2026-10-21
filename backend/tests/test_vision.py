"""사진 인식(app/vision.py): 이름표 데이터, 확실히 다른 사진만 실패, 모델 없거나 에러면 통과, 응답의 reaction."""

import numpy as np

from app import missions as ms
from app import vision
from tests.test_album import find_photo_day
from tests.test_api import client  # noqa: F401  (client는 fixture)
from tests.test_photo_taken import jpeg_taken

PASS = {"ok": True, "message": None, "reaction": None}


def test_labels_match_vectors_and_missions():
    ids = [label["id"] for label in vision.LABELS]
    assert len(ids) == len(set(ids)) and vision.TEXT.shape == (len(ids), 512)
    assert np.allclose(np.linalg.norm(vision.TEXT, axis=1), 1, atol=1e-3)
    photo_missions = {m.id for m in ms.CATALOG.values() if m.kind == "photo"}
    assert set(vision.MISSION_LABELS) == photo_missions                      # 사진 미션마다 이름표
    for wanted in vision.MISSION_LABELS.values():
        assert wanted and all(next(l for l in vision.LABELS if l["id"] == w).get("message") for w in wanted)
    assert vision.REJECT <= set(ids)


def test_pixels_shape():
    x = vision.pixels(jpeg_taken(None))   # 8×8 사진도 224×224로
    assert x.shape == (1, 3, 224, 224) and x.dtype == np.float32


def test_no_model_passes(monkeypatch, tmp_path):
    monkeypatch.setattr(vision, "MODEL", tmp_path / "없음.onnx")
    assert vision.judge(jpeg_taken(None), "sky_photo") == PASS
    assert vision.judge(jpeg_taken(None), "attendance") == PASS               # 사진 미션 아님


def fake_probs(label_id, p=0.9):
    def probs(data):
        out = np.full(len(vision.LABELS), (1 - p) / (len(vision.LABELS) - 1))
        out[[label["id"] for label in vision.LABELS].index(label_id)] = p
        return out
    return probs


def test_judge_fails_only_when_clearly_different(monkeypatch):
    monkeypatch.setattr(vision, "available", lambda: True)
    monkeypatch.setattr(vision, "probabilities", fake_probs("sky"))
    assert vision.judge(b"", "sky_photo") == {**PASS, "reaction": {"label": "sky", "message": "오늘 하늘이 잘 담겼어요!"}}
    assert vision.judge(b"", "cook") == {"ok": False, "message": vision.MISMATCH_MESSAGE, "reaction": None}   # 요리에 하늘
    monkeypatch.setattr(vision, "probabilities", fake_probs("screen"))
    assert vision.judge(b"", "cook")["message"] == vision.NOT_PHOTO_MESSAGE                                  # 화면 캡처
    monkeypatch.setattr(vision, "probabilities", fake_probs("sky", 0.4))
    assert vision.judge(b"", "cook") == PASS                                                                 # 애매하면 통과
    monkeypatch.setattr(vision, "probabilities", fake_probs("wall"))
    assert vision.judge(b"", "cook") == PASS                                                                 # '빈 벽'은 실패 사유 아님

    def broken(data):
        raise RuntimeError("모델 에러")
    monkeypatch.setattr(vision, "probabilities", broken)
    assert vision.judge(b"", "cook") == PASS                                                                 # 에러면 통과


def photo_mission(client, monkeypatch, verdict):
    monkeypatch.setattr(vision, "judge", lambda data, mission_id: verdict)
    date, m = find_photo_day(client, "u1")
    y, mo, d = date.split("-")
    return date, m, jpeg_taken(f"{y}:{mo}:{d} 10:00:00")


def test_photo_mission_passes_with_reaction(client, monkeypatch):
    verdict = {**PASS, "reaction": {"label": "sky", "message": "오늘 하늘이 잘 담겼어요!"}}
    date, m, photo = photo_mission(client, monkeypatch, verdict)
    r = client.post(f"/users/u1/missions/{m['id']}/photo", params={"date": date}, files={"file": ("p.jpg", photo, "image/jpeg")})
    assert r.status_code == 200 and r.json()["reaction"] == verdict["reaction"] and r.json()["earned_total"] == m["coins"]


def test_photo_mission_blocked_and_photo_removed(client, monkeypatch):
    date, m, photo = photo_mission(client, monkeypatch, {"ok": False, "message": vision.MISMATCH_MESSAGE, "reaction": None})
    r = client.post(f"/users/u1/missions/{m['id']}/photo", params={"date": date}, files={"file": ("p.jpg", photo, "image/jpeg")})
    assert r.status_code == 422 and r.json()["detail"] == vision.MISMATCH_MESSAGE
    assert client.get("/users/u1/album").json()["total"] == 0                                 # 실패한 사진은 안 남김
    # 사진을 먼저 올리고 완료하는 길로도 못 피함
    pid = client.post("/users/u1/photos", params={"date": date}, files={"file": ("p.jpg", photo, "image/jpeg")}).json()["photo_id"]
    r = client.post(f"/users/u1/missions/{m['id']}/complete", params={"date": date}, json={"photos": [pid]})
    assert r.status_code == 422 and r.json()["detail"] == vision.MISMATCH_MESSAGE
