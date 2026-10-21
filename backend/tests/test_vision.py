"""사진 인식(app/vision.py): 이름표 데이터, 모델 없을 때 건너뛰기, 사진 미션 응답의 reaction."""

import numpy as np
import pytest

from app import missions as ms
from app import vision
from tests.test_album import find_photo_day
from tests.test_api import client  # noqa: F401  (client는 fixture)
from tests.test_photo_taken import jpeg_taken


def test_labels_match_vectors_and_missions():
    ids = [label["id"] for label in vision.LABELS]
    assert len(ids) == len(set(ids)) and vision.TEXT.shape == (len(ids), 512)
    assert np.allclose(np.linalg.norm(vision.TEXT, axis=1), 1, atol=1e-3)
    photo_missions = {m.id for m in ms.CATALOG.values() if m.kind == "photo"}
    assert set(vision.MISSION_LABELS) == photo_missions                      # 사진 미션마다 이름표
    for wanted in vision.MISSION_LABELS.values():
        assert wanted and all(next(l for l in vision.LABELS if l["id"] == w).get("message") for w in wanted)


def test_pixels_shape():
    x = vision.pixels(jpeg_taken(None))   # 8×8 사진도 224×224로
    assert x.shape == (1, 3, 224, 224) and x.dtype == np.float32


def test_no_model_no_reaction(monkeypatch, tmp_path):
    monkeypatch.setattr(vision, "MODEL", tmp_path / "없음.onnx")
    assert vision.react(jpeg_taken(None), "sky_photo") is None
    assert vision.react(jpeg_taken(None), "attendance") is None               # 사진 미션 아님


def fake_probs(label_id):
    def probs(data):
        p = np.full(len(vision.LABELS), 0.01)
        p[[label["id"] for label in vision.LABELS].index(label_id)] = 0.9
        return p / p.sum()
    return probs


def test_react_only_for_mission_labels(monkeypatch):
    monkeypatch.setattr(vision, "available", lambda: True)
    monkeypatch.setattr(vision, "probabilities", fake_probs("sky"))
    assert vision.react(b"", "sky_photo") == {"label": "sky", "message": "오늘 하늘이 잘 담겼어요!"}
    assert vision.react(b"", "cook") is None                                  # 요리 미션에 하늘 사진
    def broken(data):
        raise RuntimeError("모델 에러")
    monkeypatch.setattr(vision, "probabilities", broken)
    assert vision.react(b"", "sky_photo") is None                             # 에러여도 None


@pytest.mark.parametrize("reaction", [None, {"label": "sky", "message": "오늘 하늘이 잘 담겼어요!"}])
def test_photo_mission_response_has_reaction(client, monkeypatch, reaction):
    monkeypatch.setattr(vision, "react", lambda data, mission_id: reaction)
    date, m = find_photo_day(client, "u1")
    y, mo, d = date.split("-")
    r = client.post(f"/users/u1/missions/{m['id']}/photo", params={"date": date},
                    files={"file": ("p.jpg", jpeg_taken(f"{y}:{mo}:{d} 10:00:00"), "image/jpeg")})
    assert r.status_code == 200 and r.json()["reaction"] == reaction and r.json()["earned_total"] == m["coins"]
