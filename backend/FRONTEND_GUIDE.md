# 프론트 연결 가이드

프론트(React)를 백엔드 API에 붙일 때 보는 문서. 백엔드 쪽에서 관리한다.
API를 직접 눌러 보려면 서버를 켜고 `http://localhost:8000/docs`.

## 원칙: 게임 규칙은 서버가 기준 (2026-10-04 결정)

코인 · 경험치 · 레벨 · 퀘스트 · 출석 · 상점은 **서버가 계산하고 저장**한다.
프론트는 서버 응답을 보여 주기만 하고, 같은 계산을 따로 하지 않는다.

- 지금 프론트가 localStorage에 저장하는 `mochi.game.v1`(XP·코인·완료 퀘스트·캐릭터), `mochi.wardrobe.v1`(옷)은 **서버로 대체**
- 브라우저에 남겨도 되는 것: 사용자 `id`, 화면 설정(소리·음량 등), 캐릭터 색
- 날짜는 서버가 서울 기준으로 정한다. 프론트가 날짜를 보낼 필요 없음 (시연 때만 `?date=YYYY-MM-DD`)

## 프론트에서 바꿔야 할 것 (지금 프론트 ↔ 서버)

| 항목 | 지금 프론트 | 서버 기준 |
|---|---|---|
| 퀘스트 목록 | `game.js` `QUESTS` 고정 목록 (오늘 8 · 주간 3 · 월간 3) | `GET /missions/today` 가 주는 목록 그대로. 매일 고정 6개 + 매일 바뀌는 3개 |
| 퀘스트 완료 | 버튼 누르면 완료 | 서버가 확인 (사진 업로드, 목록 입력, 걸음, 일기·방문·방명록 기록) |
| 주간·월간 퀘스트 | 있음 | **없음** (서버에 생기면 추가) |
| 출석 보상 | 무작위 (코인 10·20·30 또는 XP 20·35·50) | 고정 10 코인 · 10 XP |
| 하루 펭귄 모찌 | 하루 퀘스트 아무거나 3개 | 매일 바뀌는 3개를 모두 완료 |
| 시작 코인 | 540 | 0 |
| 레벨 공식 | `1 + XP // 100` | 같음 |
| 상점 상품·가격·레벨 조건 | `CHARACTERS`, `CLOTHES` | 같음 (`app/data/shop.json`) |
| 걸음 수 | 화면 안 가짜 값 | 만보기 값을 `POST /steps`로 올리고 `GET /home`의 `steps`를 표시 |
| 방명록 | 샘플 8개, 화면을 떠나면 사라짐 | `GET·POST /guestbook` |

## 앱 시작 흐름

1. localStorage에 사용자 `id`가 없으면 → 닉네임 입력 → `POST /users` → 받은 `id` 저장
   - 입력 중 확인: `GET /nicknames/check?nickname=…` → `available`, `reason`
2. 앱을 열 때마다 `POST /users/{id}/attendance` (하루 한 번만 보상, 여러 번 불러도 됨)
3. `GET /users/{id}/home` 으로 홈 그리기

## 화면별 API

| 화면 | 할 일 | API |
|---|---|---|
| 홈 | 걸음·목표·코인·레벨·장착·말풍선 | `GET /users/{id}/home` |
| 홈 | 만보기 걸음 올리기 (오늘 누적값, 덮어씀) | `POST /users/{id}/steps` `{date, steps}` |
| 퀘스트 | 오늘 미션 목록 | `GET /users/{id}/missions/today` |
| 퀘스트 | 사진 미션: 사진 올리고 → 완료 | `POST /users/{id}/photos` (multipart `file`) → `photo_id` → `POST …/missions/{mission_id}/complete` `{photos: [photo_id]}` |
| 퀘스트 | 찾아보기 미션 | `POST …/complete` `{items: [...], answer: "망원동"}` (`prompt`가 있으면 `answer` 필요) |
| 퀘스트 | 걸음 미션 | `POST …/complete` `{}` (서버가 오늘 걸음으로 판정) |
| 기록(일기) | 오늘의 주제 | `GET /users/{id}/diary/topic` |
| 기록(일기) | 쓰기·고치기 | `PUT /users/{id}/diary/{YYYY-MM-DD}` `{text, use_topic, mood, photos}` → 일기 미션 자동 완료 |
| 기록(일기) | 목록 | `GET /users/{id}/diary?from=…&to=…` |
| 이웃 방문 | 놀러 갈 방 추천 | `GET /users/{id}/rooms/recommended` → `[{id, nickname}]` |
| 이웃 방문 | 놀러 가기 | `POST /users/{방주인}/visits` `{visitor_id: 내 id}` → 방문 미션 자동 완료 |
| 이웃 방문 | 내 방에 온 친구 | `GET /users/{id}/visits` |
| 방명록 | 목록 | `GET /users/{방주인}/guestbook?page=0&per_page=4` |
| 방명록 | 쓰기 | `POST /users/{방주인}/guestbook` `{text, author_id: 내 id}` → 방명록 미션 자동 완료 (내 방은 제외) |
| 상점 | 목록·내 상태 | `GET /users/{id}/shop` |
| 상점 | 구매 | `POST /users/{id}/shop/buy` `{type: "character"\|"outfit", item_id}` |
| 상점 | 장착 | `PUT /users/{id}/equipped` `{character_id}` 또는 `{outfit_id}` (`null`이면 기본 캐릭터 / 옷 벗기) |
| 설정 | 닉네임 바꾸기 | `PATCH /users/{id}` `{nickname}` |
| 설정 | 계정 삭제 | `DELETE /users/{id}` → localStorage `id`도 지우기 |

## 미션 보여 주기

`GET /missions/today` 의 `missions[]` 한 항목:

```json
{"id": "sky_photo", "category": "outdoor", "title": "오늘 하늘 찍기", "desc": "밖에 나가서 오늘 하늘을 찍어 올려요.",
 "kind": "photo", "outdoor": true, "min_count": 1, "prompt": "", "coins": 30, "xp": 100, "done": false}
```

| `kind` | 버튼 / 입력 |
|---|---|
| `checkin` | 출석 — 앱을 열면 자동 |
| `steps` | 진행 바 (`GET /home`의 `steps` / `min_count`), 다 차면 완료 요청 |
| `photo` | 카메라·앨범 → 업로드 → 완료 |
| `list` | `prompt`가 있으면 먼저 묻고, `min_count`개 입력 |
| `text` | 한 줄 입력 |
| `diary` | 일기 화면으로 이동 (`desc`에 오늘의 주제가 들어 있음) |
| `visit` | 이웃 방문 화면으로 이동 |
| `guestbook` | 이웃 방 방명록으로 이동 |

- `category: "daily"` = 매일 고정 미션, 나머지 3개 = 매일 바뀌는 미션
- `done: true`면 완료 표시

## 보상 응답 (미션 완료 · 출석 · 일기 · 방문 · 방명록 공통)

```json
{"earned": [{"id": "sky_photo", "coins": 30, "xp": 100}], "earned_total": 30, "earned_xp": 100,
 "coins": 340, "level": {"level": 4, "xp": 310, "xp_in_level": 10, "xp_to_next": 90, "xp_for_level": 100},
 "leveled_up": true, "all_done": false,
 "new_items": [{"type": "character", "id": "pink", "name": "복숭아 토끼 모찌"}]}
```

- `earned`가 비어 있으면 이미 받은 보상 (중복 지급 없음)
- `leveled_up` → 레벨업 연출, `new_items` → "새 캐릭터를 받았어요" 안내
- 실패하면 `detail`에 사용자에게 보여 줄 수 있는 한국어 문장 (예: "아직 다른 친구 방에 놀러 가지 않았어요.")

## 상점 상태 값

`GET /shop` 의 캐릭터·옷마다 `status`:

| status | 뜻 | 프론트 표시 |
|---|---|---|
| `owned` | 보유 | 장착 / 해제 버튼 |
| `buyable` | 살 수 있음 | 구매 버튼 |
| `no_coins` | 레벨은 되는데 코인 부족 | "코인이 부족해요" |
| `locked` | 레벨 부족 | 캐릭터는 `name: null` → `???` |
| `hidden` | 조건 달성 전 비공개 (하루 펭귄) | `?` |

## 서버 주소

- 개발: `http://localhost:8000` (프론트 `http://localhost:5173`에서 호출 허용됨)
- 프론트 포트가 다르면 서버 실행 시 `CORS_ORIGINS=http://127.0.0.1:5180` 처럼 지정
- 배포 주소는 정해지면 여기에 적는다
- 프론트에서는 `VITE_API_URL` 같은 환경변수로 주소를 받는 것을 권장

## 아직 없는 것

- 로그인 토큰 (지금은 `id`만으로 동작)
- 주간·월간 퀘스트, 방명록 좋아요·답글, 캐릭터 말풍선 AI
