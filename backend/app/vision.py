"""사진 인식: 사진 미션 사진이 미션과 맞아 보이면 앱에 보일 짧은 반응을 준다 (10/21).

- 모델: OpenAI CLIP ViT-B/32 (오픈소스, MIT). 서버 안에서 돌리고 외부 API는 부르지 않는다.
  이미지 쪽 ONNX(scripts/fetch_clip.py가 받음)만 쓰고, 이름표 글 벡터는 미리 계산해 둔다
  (data/clip_labels.json → scripts/build_clip_labels.py → data/clip_text.npy).
- 반응만 준다. 맞지 않거나, 모델이 없거나, 에러가 나도 미션 완료·보상은 그대로 (None).
  인식이 틀릴 수 있어서 인증(막기)에는 쓰지 않는다.
- 사진 전체를 이름표 전부(미션과 상관없는 것·셀카·화면 캡처 등 포함)와 비교해서, 가장 비슷한 이름표가
  그 미션의 이름표이고 확률이 MIN_PROB 이상일 때만 반응한다.
- 모델은 처음 쓸 때 한 번만 연다 (메모리 아끼기: 스레드 1개, 메모리 풀 끔).
"""

from __future__ import annotations

import io
import json
import os
import threading
from pathlib import Path

import numpy as np
from PIL import Image

DATA = Path(__file__).resolve().parent / "data"
MODEL = Path(os.environ.get("CAPSTONE_CLIP_MODEL") or Path(__file__).resolve().parent.parent / "models" / "clip-vision.onnx")
MIN_PROB = 0.2         # 가장 비슷한 이름표의 확률이 이보다 낮으면 반응 안 함 (반응만 주므로 넉넉하게)
LOGIT_SCALE = 100.0    # CLIP 학습값
SIZE = 224
MEAN = np.array([0.48145466, 0.4578275, 0.40821073], dtype=np.float32)
STD = np.array([0.26862954, 0.26130258, 0.27577711], dtype=np.float32)

_spec = json.loads((DATA / "clip_labels.json").read_text(encoding="utf-8"))
LABELS: list[dict] = _spec["labels"]
MISSION_LABELS: dict[str, list[str]] = _spec["missions"]
TEXT = np.load(DATA / "clip_text.npy")          # (이름표 수, 512), 길이 1로 맞춰 둠
_session = None
_lock = threading.Lock()


def available() -> bool:
    return MODEL.exists()


def _model():
    global _session
    with _lock:
        if _session is None:
            import onnxruntime as ort   # 모델이 있을 때만 필요
            opts = ort.SessionOptions()
            opts.intra_op_num_threads = 1
            opts.inter_op_num_threads = 1
            opts.enable_cpu_mem_arena = False
            _session = ort.InferenceSession(str(MODEL), opts, providers=["CPUExecutionProvider"])
        return _session


def pixels(data: bytes) -> np.ndarray:
    """CLIP 입력: 짧은 변 224로 줄이고(bicubic) 가운데 224×224를 잘라 정규화 → (1, 3, 224, 224)."""
    image = Image.open(io.BytesIO(data)).convert("RGB")
    w, h = image.size
    scale = SIZE / min(w, h)
    image = image.resize((max(SIZE, round(w * scale)), max(SIZE, round(h * scale))), Image.BICUBIC)
    w, h = image.size
    left, top = (w - SIZE) // 2, (h - SIZE) // 2
    image = image.crop((left, top, left + SIZE, top + SIZE))
    x = (np.asarray(image, dtype=np.float32) / 255.0 - MEAN) / STD
    return x.transpose(2, 0, 1)[None]


def probabilities(data: bytes) -> np.ndarray:
    """이름표마다 확률 (합 1)."""
    emb = _model().run(["image_embeds"], {"pixel_values": pixels(data)})[0][0]
    emb = emb / np.linalg.norm(emb)
    logits = LOGIT_SCALE * TEXT @ emb
    e = np.exp(logits - logits.max())
    return e / e.sum()


def react(data: bytes, mission_id: str) -> dict | None:
    """미션과 맞아 보이면 {"label", "message"}, 아니면 None. 실패해도 None (미션에는 영향 없음)."""
    wanted = MISSION_LABELS.get(mission_id)
    if not wanted or not available():
        return None
    try:
        probs = probabilities(data)
    except Exception:
        return None
    best = int(probs.argmax())
    label = LABELS[best]
    if label["id"] not in wanted or probs[best] < MIN_PROB:
        return None
    return {"label": label["id"], "message": label["message"]}
