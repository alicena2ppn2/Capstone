"""사진 인식: 사진 미션 사진이 미션과 맞는지 본다 — 확실히 다르면 완료를 막고, 맞아 보이면 짧은 반응 (10/21).

- 모델: OpenAI CLIP ViT-B/32 (오픈소스, MIT). 서버 안에서 돌리고 외부 API는 부르지 않는다.
  이미지 쪽 ONNX(scripts/fetch_clip.py가 받음)만 쓰고, 이름표 글 벡터는 미리 계산해 둔다
  (data/clip_labels.json → scripts/build_clip_labels.py → data/clip_text.npy).
- 사진을 이름표 전부(미션과 상관없는 것·셀카·화면 캡처 등 포함)와 비교한다.
- 인증 (확실히 다를 때만 실패): 가장 비슷한 이름표가
    · 화면 캡처·문서·깜깜한 사진·셀카(REJECT)이고 확률 REJECT_PROB 이상, 또는
    · 다른 미션의 내용(예: 요리 미션에 하늘)이고 확률 OTHER_PROB 이상
  이면서 그 미션 이름표들의 확률 합이 WANTED_FLOOR 미만일 때만 실패. 애매하면 통과
  (인식이 틀려 제대로 찍은 사람이 실패하지 않게 — 테스트 20장 중 벽화 1장은 맞는데도 못 알아봄).
- 반응: 가장 비슷한 이름표가 그 미션 것이고 확률 MIN_PROB 이상이면 짧은 반응 한 줄.
- 모델이 없거나 에러가 나면 통과 (서버 문제로 미션을 못 하게 되지 않게).
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
MIN_PROB = 0.2         # 가장 비슷한 이름표의 확률이 이보다 낮으면 반응 안 함
REJECT = {"screen", "document", "dark", "selfie"}   # 미션 사진이 아님
REJECT_PROB = 0.3      # REJECT 이름표가 이 이상으로 1등이면 실패 후보
OTHER_PROB = 0.6       # 다른 미션 내용이 이 이상으로 1등이면 실패 후보
WANTED_FLOOR = 0.1     # 그래도 그 미션 이름표 확률 합이 이 이상이면 통과
NOT_PHOTO_MESSAGE = "화면 캡처나 어두운 사진 말고, 미션 장면을 직접 찍어 올려 주세요."
MISMATCH_MESSAGE = "미션과 다른 사진 같아요. 미션에 맞는 장면을 찍어 다시 올려 주세요."
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


def judge(data: bytes, mission_id: str) -> dict:
    """{"ok": 통과?, "message": 실패 안내, "reaction": {"label", "message"} | None}. 모델이 없거나 에러면 통과."""
    passed = {"ok": True, "message": None, "reaction": None}
    wanted = MISSION_LABELS.get(mission_id)
    if not wanted or not available():
        return passed
    try:
        probs = probabilities(data)
    except Exception:
        return passed
    best = int(probs.argmax())
    label, p = LABELS[best], float(probs[best])
    wanted_sum = float(sum(probs[i] for i, l in enumerate(LABELS) if l["id"] in wanted))
    if label["id"] in wanted:
        return {**passed, "reaction": {"label": label["id"], "message": label["message"]} if p >= MIN_PROB else None}
    if wanted_sum < WANTED_FLOOR:
        if label["id"] in REJECT and p >= REJECT_PROB:
            return {"ok": False, "message": NOT_PHOTO_MESSAGE, "reaction": None}
        if label.get("message") and p >= OTHER_PROB:
            return {"ok": False, "message": MISMATCH_MESSAGE, "reaction": None}
    return passed
