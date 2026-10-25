# MY MOCHI 서버 (Railway·Render 공통). 빌드 위치: backend 폴더
# 지워지지 않는 디스크를 /data에 연결해야 DB(app.db)와 사진(uploads/)이 남는다 → docs/DEPLOY.md
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DATA_DIR=/data
WORKDIR /srv

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 사진 인식 모델 (CLIP 이미지 쪽 89MB, 리비전·SHA-256 고정). 코드보다 먼저 받아 두면 코드만 바뀔 때 다시 안 받음
COPY scripts/fetch_clip.py ./scripts/fetch_clip.py
RUN python scripts/fetch_clip.py /srv/models/clip-vision.onnx

COPY app ./app
COPY scripts ./scripts

EXPOSE 8000
CMD ["python", "scripts/start.py"]
