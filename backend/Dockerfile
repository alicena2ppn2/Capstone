# MY MOCHI 서버 (Railway·Render 공통). 빌드 위치: backend 폴더
# 지워지지 않는 디스크를 /data에 연결해야 DB(app.db)와 사진(uploads/)이 남는다 → DEPLOY.md
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DATA_DIR=/data
WORKDIR /srv

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY scripts ./scripts

EXPOSE 8000
CMD ["python", "scripts/start.py"]
