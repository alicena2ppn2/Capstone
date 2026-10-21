"""사진 인식 모델(CLIP 이미지 쪽, 89MB) 받기. Dockerfile이 빌드할 때 한 번 돌린다.

모델: OpenAI CLIP ViT-B/32 (MIT 라이선스)를 ONNX로 바꾼 Hugging Face Xenova/clip-vit-base-patch32의
vision_model_quantized.onnx. 리비전과 SHA-256을 고정해서 다른 파일이 들어오지 않게 한다.
git에는 올리지 않는다 (크기). 내 컴퓨터에서 써 보려면:
    python scripts/fetch_clip.py            → backend/models/clip-vision.onnx
모델이 없으면 서버는 사진 인식만 건너뛴다 (app/vision.py).
"""

from __future__ import annotations

import hashlib
import sys
import urllib.request
from pathlib import Path

REVISION = "d15189d7028b43f1d3e65039190477f6af591c2a"
URL = f"https://huggingface.co/Xenova/clip-vit-base-patch32/resolve/{REVISION}/onnx/vision_model_quantized.onnx"
SHA256 = "583fd1110a514667812fee7d684952aaf82a99b959760c8d7dca7e0ab9839299"
DEFAULT = Path(__file__).resolve().parent.parent / "models" / "clip-vision.onnx"


def main(dest: Path) -> None:
    if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest() == SHA256:
        print(f"{dest}: 이미 있음")
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    data = urllib.request.urlopen(URL, timeout=300).read()
    digest = hashlib.sha256(data).hexdigest()
    if digest != SHA256:
        sys.exit(f"모델 파일이 달라요 (sha256 {digest})")
    dest.write_bytes(data)
    print(f"{dest}: {len(data) // 1_000_000}MB")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT)
