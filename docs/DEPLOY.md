# 서버 인터넷 배포 — Railway (2026-10-20 결정)

휴대폰에 설치한 앱(APK·iPhone 설치 파일)이 어디서나 접속할 수 있게 서버를 인터넷에 올린다.
**Railway로 정했다**: 발표(10/22)까지 무료 체험 크레딧으로 저장 디스크(Volume)까지 쓸 수 있고, 체험이 끝나면 Hobby 월 $5.
Render는 무료 요금제에 저장 디스크가 없어(재시작·재배포마다 DB·사진이 지워짐) 쓰지 않는다. 같은 Dockerfile로 옮길 수 있게 `render.yaml`은 대안으로 남겨 둔다.

| | Railway | Render |
|---|---|---|
| 요금 | 처음 30일 무료 체험 크레딧 $5 → 이후 Hobby 월 $5 (사용량 $5 포함, 이 서버는 보통 안에 들어옴). 조건은 가입 때 railway.com/pricing 확인 | 무료는 디스크 없음 → Starter 월 $7 + 디스크 1GB 약 $0.25 |
| 지워지지 않는 디스크 | Volume (화면에서 추가) | Disk (`render.yaml`에 있음) |
| 설정 파일 | 저장소 맨 위 `railway.json` + `Dockerfile` | `render.yaml`(저장소 맨 위) |

## 꼭 지킬 것

- **디스크를 `/data`에 연결한다.** DB(`app.db`)와 사진(`uploads/`)이 여기에 저장된다. 연결하지 않으면 다시 배포할 때마다 일기·사진·코인이 사라진다.
- **Supabase 값을 넣는다.** `SUPABASE_URL`, `SUPABASE_KEY`가 없거나 `CAPSTONE_AUTH`가 `required`가 아니면 서버가 **켜지지 않는다** (`scripts/start.py`). 로그인 확인 없이 인터넷에 열리는 것을 막는다.
- **비밀 값은 플랫폼 화면에만 넣는다.** git·README·채팅에 올리지 않는다.

## 환경변수

| 이름 | 값 | 필수 |
|---|---|---|
| `SUPABASE_URL` | Supabase 프로젝트 주소 (`https://….supabase.co`) | ✅ |
| `SUPABASE_KEY` | Supabase publishable(anon) 키 — 로그인 토큰 확인용 | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | 계정 삭제 때 Supabase 계정까지 지우는 관리자 키 (없으면 서버 기록만 삭제) | 권장 |
| `ADMIN_TOKEN` | `/admin/...` 통계·**백업** API용 임의의 긴 문자열 (백업하려면 필요) | 권장 |
| `CAPSTONE_AUTH` | 넣지 않는다 (기본 `required`). `dev`·`off`면 서버가 켜지지 않음 | — |
| `DATA_DIR` | 기본 `/data` (Dockerfile). 디스크를 다른 곳에 연결했을 때만 | — |
| `PORT` | 플랫폼이 자동으로 넣음 | — |

## Railway (사용)

1. railway.com → **New Project → Deploy from GitHub repo** → `alicena2ppn2/Capstone`
2. 설정할 것 없음 — 저장소 맨 위 `Dockerfile`·`railway.json`으로 서버(`backend/`)만 빌드한다. (Root Directory를 `backend`로 바꾼 경우엔 `backend/Dockerfile`을 쓴다. 둘 다 같은 내용)
   - `Railpack failed to prepare the build`가 나오면 맨 위 `Dockerfile`이 없는 예전 커밋이다 → 최신 main으로 다시 배포
3. 서비스에서 **+ Volume** → Mount path `/data`
4. **Variables**에 위 환경변수 넣기
5. **Settings → Networking → Generate Domain** → `https://…up.railway.app` 주소가 생긴다

지금 서버: **https://mymochi-api-production.up.railway.app** (2026-10-20 배포, 아래 확인 통과)

## Render (대안, 지금은 안 씀)

1. render.com → **New → Blueprint** → 저장소 `alicena2ppn2/Capstone` (맨 위 `render.yaml`을 읽어 서비스와 1GB 디스크를 만든다)
2. 비밀 값 4개(`SUPABASE_URL` 등)를 물어보면 넣는다
3. 배포가 끝나면 `https://mymochi-api.onrender.com` 같은 주소가 생긴다

## 확인

```bash
curl https://<서버 주소>/health                      # {"ok":true}
curl https://<서버 주소>/users/아무거나/shop          # 401 로그인이 필요해요 (← 이게 정상)
```

- 맨 앞 주소(`/`)는 `{"detail":"Not Found"}`가 정상이다 (그 주소에 API가 없음). 화면은 앱에 있고, 서버는 `/docs`에서 API 목록·실행만 볼 수 있다
- `/docs`의 Try it out은 배포된 DB에 실제로 요청한다 (POST·DELETE 조심)

시연용 데이터가 필요하면 플랫폼의 셸(Railway: `railway ssh`, Render: Shell 탭)에서 `python scripts/seed_demo.py`.
다만 시연 계정은 로그인 없이 쓸 수 없으니(`CAPSTONE_AUTH=required`), 발표 때는 실제 로그인 계정으로 보여 준다.

## 백업

Railway Volume은 자동 백업이 켜져 있지 않을 수 있다. 발표 전후·큰 변경 전에 DB를 받아 둔다.

```bash
# ADMIN_TOKEN을 Railway 변수에 넣어 둔 뒤 (값은 셸에만, 기록에 남기지 않게 read로 입력)
read -s ADMIN && curl -H "X-Admin-Token: $ADMIN" -o mymochi-backup.db https://<서버 주소>/admin/backup
```

- 쓰는 중에도 일관된 사본을 만든다 (sqlite3 backup). 받은 파일은 git에 올리지 않는다 (개인 기록)
- **사진(uploads/)은 들어 있지 않다.** 사진까지 필요하면 Railway 셸에서 `tar czf /tmp/uploads.tgz -C /data uploads`
- 되돌리기: Volume의 `/data/app.db`를 받은 파일로 바꾸고 서비스 재시작

## 앱에 서버 주소 넣기

서버 주소가 생기면 앱 빌드 환경변수 `EXPO_PUBLIC_API_URL`에 넣는다 → [mobile/README.md](../mobile/README.md)의 설치 파일 만들기.
