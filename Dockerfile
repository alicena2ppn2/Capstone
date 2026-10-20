# Railway용: 저장소 맨 위에서 빌드해도 서버(backend/)만 들어가게 (Root Directory 설정이 없어도 됨, 10/20)
# 내용은 backend/Dockerfile과 같다 — 고칠 때는 둘 다. 디스크는 /data에 연결 → backend/DEPLOY.md
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DATA_DIR=/data
WORKDIR /srv

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY backend/scripts ./scripts

EXPOSE 8000
CMD ["python", "scripts/start.py"]
