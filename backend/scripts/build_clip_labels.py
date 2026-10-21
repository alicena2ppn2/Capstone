"""사진 인식 이름표 → 글 벡터(app/data/clip_text.npy) 만들기. 이름표(clip_labels.json)를 고쳤을 때만 다시 돌린다.

서버는 이미지 모델만 쓰고, 글 쪽은 여기서 미리 계산해 둔다 (서버에 토크나이저·글 모델이 필요 없게).
개발용 패키지가 따로 필요하다 (requirements.txt에는 안 넣음):
    pip install onnxruntime tokenizers numpy

실행 (backend 폴더에서)
    python scripts/build_clip_labels.py <모델 폴더>
<모델 폴더>: Hugging Face Xenova/clip-vit-base-patch32 (fetch_clip.py와 같은 리비전)에서 받은
    onnx/text_model_quantized.onnx, tokenizer.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer

ROOT = Path(__file__).resolve().parent.parent
LABELS = ROOT / "app" / "data" / "clip_labels.json"
OUT = ROOT / "app" / "data" / "clip_text.npy"


def main(model_dir: Path) -> None:
    labels = json.loads(LABELS.read_text(encoding="utf-8"))["labels"]
    tok = Tokenizer.from_file(str(model_dir / "tokenizer.json"))
    tok.enable_padding(pad_id=49407, length=77)
    tok.enable_truncation(max_length=77)
    text = ort.InferenceSession(str(model_dir / "onnx" / "text_model_quantized.onnx"))
    rows = []
    for label in labels:   # 이름표 하나 = 설명 문장 여러 개의 평균
        ids = np.array([e.ids for e in tok.encode_batch(label["prompts"])], dtype=np.int64)
        emb = text.run(["text_embeds"], {"input_ids": ids})[0]
        emb /= np.linalg.norm(emb, axis=1, keepdims=True)
        mean = emb.mean(axis=0)
        rows.append(mean / np.linalg.norm(mean))
    np.save(OUT, np.stack(rows).astype(np.float32))
    print(f"{OUT.name}: 이름표 {len(rows)}개")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
