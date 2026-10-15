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
| 주간·월간 퀘스트 | 주간 3 · 월간 2 | 주간 `GET /weekly` (자연 속 산책 2번)만. **월간 목표는 없음** (10/14에 뺌) |
| 단계 사다리 | 없음 | 매일 바뀌는 3개 = 움직이기 · 집 · 이어지기. 각 미션의 `stage`(1 혼자·2 한 명·3 여럿)와 이어지기 미션의 `tip`("이렇게 해 보세요")을 보여 주기. 진행도는 `missions/today`의 `ladder` 또는 `GET /ladder`, 완료 응답 `stage_up`이 있으면 "다음 단계가 열렸어요" |
| 처음 설문 | 없음 | 가입 직후 `GET /users/{id}/survey`가 `done=false`면 `GET /survey/questions` 순서대로 보여 주고 `PUT /users/{id}/survey`로 저장. 모두 건너뛰기 가능 |
| 출석 보상 | 무작위 (코인 10·20·30 또는 XP 20·35·50) | 고정 10 코인 · 10 XP |
| 하루 펭귄 모찌 | 하루 퀘스트 아무거나 3개 | 매일 바뀌는 3개를 모두 완료 |
| 시작 코인 | 540 | 0 |
| 레벨 공식 | `1 + XP // 100` (레벨마다 100) | 다음 레벨까지 100 + 150 × (레벨 − 1) → 100, 250, 400 … **프론트도 서버 `level` 값을 그대로 표시** |
| 상점 상품·가격·레벨 조건 | `CHARACTERS`, `CLOTHES`, `DECOR` | 같음 (`app/data/shop.json`) |
| 집 꾸미기 보유·배치 | localStorage `ownedDecor`, `decor` | `GET /shop`의 `decor`·`placed`, `PUT /decor` |
| 걸음 수 | 화면 안 가짜 값 | 만보기 값을 `POST /steps`로 올리고 `GET /home`의 `steps`를 표시 |
| 방명록 | 샘플 8개, 화면을 떠나면 사라짐 | `GET·POST /guestbook` |

## 앱 시작 흐름

1. 저장된 사용자 `id`가 없으면 → **Supabase 로그인 뒤 `POST /auth/supabase`** (헤더 `Authorization: Bearer <Supabase access_token>`)
   - 200 → `user.id` 저장 (이미 연결된 사용자)
   - 404 → 처음 온 사람: 닉네임 입력 → 같은 요청에 `{nickname}`을 넣어 다시 → 201 `user.id` 저장
   - 입력 중 확인: `GET /nicknames/check?nickname=…` → `available`, `reason`
   - 서버에 `SUPABASE_URL`이 없으면(개발·시연 모드) 토큰 대신 본문 `{supabase_id}`(Supabase `session.user.id`)를 믿음
   - 로그인 없이 시연할 때는 예전처럼 `POST /users` `{nickname}`도 그대로 됨
2. 앱을 열 때마다 `POST /users/{id}/attendance` (하루 한 번만 보상, 여러 번 불러도 됨)
3. `GET /users/{id}/home` 으로 홈 그리기

## 화면별 API

| 화면 | 할 일 | API |
|---|---|---|
| 홈 | 걸음·목표·코인·레벨·장착·말풍선 | `GET /users/{id}/home` |
| 홈 | 다시 온 날 안내 | `GET /home`의 `welcome_back` `{days_away, level_reset, xp_reset, message}` — 있으면 반가움 팝업 (14일 이상 쉬면 `level_reset: true`, 지금 레벨의 처음부터) |
| 홈 | 만보기 걸음 올리기 (오늘 누적값, 덮어씀) | `POST /users/{id}/steps` `{date, steps}` |
| 퀘스트 | 오늘 미션 목록 | `GET /users/{id}/missions/today` |
| 퀘스트 | 사진 미션: 사진 올리고 → 완료 | `POST /users/{id}/photos` (multipart `file`) → `photo_id` → `POST …/missions/{mission_id}/complete` `{photos: [photo_id]}`. 서버 확인에 걸리면 422 `detail` 문구를 그대로 보여 주면 됨 |
| 퀘스트 | 찾아보기 미션 | `POST …/complete` `{items: [...], answer: "망원동"}` (`prompt`가 있으면 `answer` 필요) |
| 퀘스트 | 걸음 미션 | `POST …/complete` `{}` (서버가 오늘 걸음으로 판정) |
| 퀘스트 | 운동 미션 (`kind: "self"`, 윗몸일으키기 20회 등) | "했어요" 버튼 → `POST …/complete` `{}` |
| 퀘스트 | **새로고침 버튼** (`rerollable: true`인 미션에만) | `POST /users/{id}/missions/{mission_id}/reroll` → 바뀐 오늘 미션 전체(`missions`)와 `rerolls_left`. 하루 3번, 다 쓰면 429 문구를 그대로 보여 주기 |
| 퀘스트 | **소감 창** (완료 직후, 건너뛰기 가능) | `PUT /users/{id}/missions/{mission_id}/feedback?date=` `{mood: 1~5, text: "한 줄"}` — 둘 중 하나는 필요, 200자까지, 다시 보내면 고침, **보상 없음**. 그날 완료한 미션만(아니면 404). 글에 위기 표현이 있으면 `care` (일기와 같게 처리). 오늘의 미션 각 항목 `feedback: true`면 이미 씀 |
| 기록 | 내 소감 모아 보기 | `GET /users/{id}/feedback?from=&to=` → `[{date, mission_id, title, mood, text}]` |
| 기록(일기) | 오늘의 주제 | `GET /users/{id}/diary/topic` |
| 기록(일기) | 쓰기·고치기 | `PUT /users/{id}/diary/{YYYY-MM-DD}` `{text, use_topic, mood, photos}` → 일기 미션 자동 완료 |
| 기록(일기) | 목록 | `GET /users/{id}/diary?from=…&to=…` |
| 기록(일기) | 지우기 | `DELETE /users/{id}/diary/{YYYY-MM-DD}` — 지운 날에 다시 쓰면 409 "지운 날의 일기는 다시 쓸 수 없어요." (앱 `deletedJournal`과 같음) |
| 이웃 방문 | 놀러 갈 방 추천 (내 레벨과 가까운 순) | `GET /users/{id}/rooms/recommended` → `{my_level, rooms: [{id, nickname, level, level_diff, similar}]}`. `similar`(레벨 차이 2 이내)면 "나와 비슷한 레벨" 표시 |
| 이웃 방문 | 놀러 가기 | `POST /users/{방주인}/visits` `{visitor_id: 내 id}` → 방문 미션 자동 완료 |
| 이웃 방문 | 내 방에 온 친구 | `GET /users/{id}/visits` |
| 방명록 | 목록 | `GET /users/{방주인}/guestbook?page=0&per_page=4&viewer_id={내 id}` (내가 신고한 글·차단 관계인 사람 글은 빠짐) |
| 방명록 | 지우기 | `DELETE /users/{방주인}/guestbook/{글 id}?by={내 id}` (내 방 글 또는 내가 쓴 글) |
| 방명록·이웃 | 신고 | 글 길게 누르기 → `POST /reports` `{reporter_id, target_type: "guestbook", target_id: "글 id", reason, block}`. 이유: spam·abuse·sexual·hate·self_harm·other |
| 친구 | 추가 | `POST /users/{내 id}/friends` `{nickname}` → `status: pending`(요청 보냄) 또는 `accepted`(상대가 먼저 요청해서 바로 친구). 404면 "찾지 못했어요" 그대로 |
| 친구 | 목록 | `GET /users/{내 id}/friends` → `{friends, received, sent}` 각 `[{id, nickname, level, last_active, visited_today, since}]`. 친구를 누르면 `GET /users/{친구}/room`으로 방 놀러 가기 |
| 친구 | 수락·끊기 | `POST /users/{내 id}/friends/{상대}/accept` / `DELETE /users/{내 id}/friends/{상대}` (끊기·취소·거절 공통) |
| 친구 | 친밀도 | 친구 목록 각 항목의 `friendship` `{level, name, points, next_level_at, points_to_next, next_reward}` → 하트 게이지·"단짝까지 8점" 표시. 방명록·방문 응답의 `friendship.leveled_up`이 true면 "○○님과 '아는 사이'가 됐어요! +20코인" 팝업 (`earned_coins`) |
| 이웃 | 추천 방의 친구 표시 | `GET /rooms/recommended`의 `is_friend` |
| 이웃 | 차단 | `POST /users/{내 id}/blocks` `{target_id}` / 설정 화면 목록 `GET /users/{내 id}/blocks`, 풀기 `DELETE /users/{내 id}/blocks/{id}` |
| 설정·홈 | 쉬어 가기 | `POST /users/{id}/rest` `{days: 1~30}` → `{resting, start, until, message}` / 상태 `GET` / 끝내기 `DELETE`. 쉬는 동안 홈에 "쉬는 중" 표시 |
| 기록(일기) | 내보내기 | `GET /users/{id}/diary/export?from=…&to=…` → .txt 파일. Expo는 `expo-file-system`으로 저장 후 `expo-sharing`으로 공유 시트 |
| 방명록 | 쓰기 | `POST /users/{방주인}/guestbook` `{text, author_id: 내 id}` → 방명록 미션 자동 완료 (내 방은 제외). 422면 `detail` 문구 그대로 보여 주기(욕설 필터), 403이면 `detail` 그대로 (차단 관계, 또는 혐오 표현으로 방명록 쓰기 정지 중) |
| 사진첩 | 내 사진 (최신순, 미션 이름 표시) | `GET /users/{id}/album?page=0&per_page=30` → `photos[]`: `url`, `date`, `used_for.title` |
| 사진첩 | 월별 탭·달력 | `GET /users/{id}/album/months` |
| 사진첩 | 사진 지우기 | `DELETE /users/{id}/photos/{photo_id}` |
| 상점 | 목록·내 상태 | `GET /users/{id}/shop` |
| 상점 | 구매 | `POST /users/{id}/shop/buy` `{type: "character"\|"outfit"\|"decor", item_id}` |
| 상점 | 장착 | `PUT /users/{id}/equipped` `{character_id}` 또는 `{outfit_id}` (`null`이면 기본 캐릭터 / 옷 벗기) |
| 집 꾸미기 | 소품 놓기·빼기 | `PUT /users/{id}/decor` `{slot: "lamp", item_id: "lamp-moon"}` (`null`이면 비우기) → 방 모습 |
| 홈·이웃 방문 | 방 그리기 | 내 방: `GET /home`의 `room` / 이웃 방: `GET /users/{이웃}/room` → `character`, `outfit`, `decor{slot: id}`, `scenery_landscape` |
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

## 주간 미션

`GET /users/{id}/weekly` → `{week_start, week_end, quests: [...]}` (월~일)

```json
{"id": "nature_walk", "title": "이번 주 자연 속 산책 2번", "goal_days": 2,
 "progress": 1, "done_days": ["2026-10-06"], "done_today": false, "completed": false,
 "coins": 100, "xp": 200}
```

- 미션 탭에 "이번 주" 칸으로 `progress / goal_days` (예: 1/2) 표시
- 사진 올리기: 사진 미션처럼 `POST /photos`로 올린 뒤 `POST /users/{id}/weekly/nature_walk/complete` `{photos: [photo_id]}`
- `done_today: true`면 오늘은 버튼 잠금 (같은 날 두 번째는 409). 다 채우면 응답 `earned_total`·`earned_xp`로 보상 표시

## 보상 응답 (미션 완료 · 출석 · 일기 · 방문 · 방명록 공통)

```json
{"earned": [{"id": "sky_photo", "coins": 30, "xp": 100}], "earned_total": 30, "earned_xp": 100,
 "coins": 340, "level": {"level": 3, "xp": 410, "xp_in_level": 60, "xp_to_next": 340, "xp_for_level": 400},
 "leveled_up": true, "all_done": false,
 "new_items": [{"type": "character", "id": "pink", "name": "복숭아 토끼 모찌"}]}
```

- `earned`가 비어 있으면 이미 받은 보상 (중복 지급 없음)
- 레벨 진행 바: `xp_in_level` / `xp_for_level` (레벨마다 필요한 양이 다르므로 서버 값을 그대로 사용)
- `leveled_up` → 레벨업 연출, `new_items` → "새 캐릭터를 받았어요" 안내
- 실패하면 `detail`에 사용자에게 보여 줄 수 있는 한국어 문장 (예: "아직 다른 친구 방에 놀러 가지 않았어요.")

## 사진 올릴 때

- 사진 파일을 **원본 그대로** 올린다 (리사이즈·캔버스 변환을 하면 서버 확인에 필요한 정보가 사라질 수 있음)
- 서버가 사진을 확인하는 방법은 사용자에게 안내하지 않는다

## 위기 표현 응답 (`care`)

일기 저장(`PUT /diary`)과 글·목록 미션 완료 응답에 `care`가 들어온다.

| `care.type` | 프론트 표시 |
|---|---|
| `support` | 다른 화면을 띄우지 말고 차분한 안내 카드: `message` + `contacts`(이름·번호·운영 시간). 번호는 누르면 바로 전화 (`tel:109`) |
| `check_in` | 캐릭터 말풍선으로 `message` (경고처럼 보이지 않게) |
| `null` | 아무것도 표시하지 않음 |

- 어떤 단어가 걸렸는지, "위험도" 같은 말은 사용자에게 보여 주지 않는다
- `support`가 와도 보상·레벨업 연출과 겹치지 않게, 안내 카드를 먼저 보여 준다

## 상점 상태 값

`GET /shop` 의 캐릭터·옷마다 `status`:

| status | 뜻 | 프론트 표시 |
|---|---|---|
| `owned` | 보유 | 장착 / 해제 버튼 |
| `buyable` | 살 수 있음 | 구매 버튼 |
| `no_coins` | 레벨은 되는데 코인 부족 | "코인이 부족해요" |
| `locked` | 레벨 부족 | 캐릭터는 `name: null` → `???` |
| `hidden` | 조건 달성 전 비공개 (하루 펭귄) | `?` |

## Expo(React Native) 앱에서 연결하기

`mobile/`(Expo SDK 57, expo-router, AsyncStorage) 기준. 아래 코드는 **예시**이고, 앱 코드에 넣을 때는 프론트에서 구조에 맞게 옮긴다.

### 1. 서버 주소와 요청 함수

```js
// 예: mobile/src/api.js
const API_URL = process.env.EXPO_PUBLIC_API_URL;   // mobile/.env 에 EXPO_PUBLIC_API_URL=http://192.168.0.10:8000

export async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),   // Supabase 연결 후
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail ?? '잠시 후 다시 시도해 주세요.');   // detail은 사용자에게 보여 줘도 되는 문장
  return data;
}
```

- **휴대폰(Expo Go)에서는 `localhost`가 휴대폰 자신을 가리킨다.** 서버를 `uvicorn app.main:app --host 0.0.0.0 --port 8000`으로 켜고, 컴퓨터의 내부 IP(예: `192.168.0.10`)를 주소로 쓴다. 휴대폰과 컴퓨터가 같은 와이파이여야 하고, Windows 방화벽에서 8000 포트를 허용해야 할 수 있다
- 네이티브 앱 요청에는 CORS가 필요 없다. Expo 웹(`npx expo start --web`)으로 볼 때만 서버의 `CORS_ORIGINS`에 그 주소를 추가
- **`?date=`는 보내지 않는다** (서버가 서울 날짜로 판단). 시연할 때만 사용

### 2. 앱을 열 때 (출석 + 홈)

```js
import { AppState } from 'react-native';

async function onAppOpen(userId) {
  await api(`/users/${userId}/attendance`, { method: 'POST' });   // 하루 한 번만 보상, 여러 번 불러도 됨
  return api(`/users/${userId}/home`);
}
// 처음 실행 + 백그라운드에서 돌아올 때마다
AppState.addEventListener('change', state => { if (state === 'active') onAppOpen(userId); });
```

### 3. 걸음 수 올리기 (`expo-sensors` Pedometer)

```js
import { Pedometer } from 'expo-sensors';

async function uploadSteps(userId) {
  if (!(await Pedometer.isAvailableAsync())) return;
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);            // 기기 시각 기준 오늘 0시
  const yesterday = new Date(start); yesterday.setDate(start.getDate() - 1);

  const today = await Pedometer.getStepCountAsync(start, now);
  const prev = await Pedometer.getStepCountAsync(yesterday, start);  // 어제 걸음 → '안 나간 날' 판단에 쓰임
  await api(`/users/${userId}/steps`, { method: 'POST', body: { date: ymd(yesterday), steps: prev.steps } });
  await api(`/users/${userId}/steps`, { method: 'POST', body: { date: ymd(start), steps: today.steps } });
}
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
```

- 같은 날짜를 다시 올리면 **덮어쓴다** → 앱을 열 때, 걸음 미션을 확인하기 직전에 다시 올리면 된다
- iOS는 최근 7일까지 조회 가능. **Android는 `getStepCountAsync`를 지원하지 않아** `Pedometer.watchStepCount`로 앱이 열려 있는 동안만 셀 수 있음 → Android는 Health Connect 연결이 별도로 필요
- iOS 권한 문구: `app.json` 플러그인에 `["expo-sensors", { "motionPermission": "걸음 수로 오늘의 미션을 확인해요." }]`

### 4. 사진 미션 (`expo-image-picker`)

```js
import * as ImagePicker from 'expo-image-picker';

async function completePhotoMission(userId, missionId) {
  const shot = await ImagePicker.launchCameraAsync({ quality: 1, allowsEditing: false });   // 앨범: launchImageLibraryAsync
  if (shot.canceled) return;
  const a = shot.assets[0];
  const form = new FormData();
  form.append('file', { uri: a.uri, name: a.fileName ?? 'photo.jpg', type: a.mimeType ?? 'image/jpeg' });
  const { photo_id } = await api(`/users/${userId}/photos`, { method: 'POST', body: form });
  return api(`/users/${userId}/missions/${missionId}/complete`, { method: 'POST', body: { photos: [photo_id] } });
}
```

- **`quality: 1`, `allowsEditing: false`로 원본을 그대로** 올린다 (자르기·압축하면 서버 확인에 필요한 정보가 사라질 수 있음)
- 422가 오면 `detail`("오늘 찍은 사진으로 다시 올려 주세요.")을 그대로 보여 준다
- iOS 권한 문구: `["expo-image-picker", { "cameraPermission": "미션 사진을 찍어요.", "photosPermission": "미션 사진을 골라요." }]`

### 5. 일기

| 앱 동작 | API |
|---|---|
| 오늘 쓰기·고치기 | `PUT /users/{id}/diary/{YYYY-MM-DD}` `{text, mood, photos, use_topic}` → 응답의 `care`를 확인 (위 "위기 표현 응답") |
| 날짜별 목록·스탬프 달력 | `GET /users/{id}/diary?from=2026-10-01&to=2026-10-31` → 일기가 있는 날짜에 스탬프 |
| 하루 보기 | `GET /users/{id}/diary/{YYYY-MM-DD}` (없으면 404) |
| 삭제 | **서버에 아직 없음 → 추가 예정** |

### 6. 지금 AsyncStorage 키 → 서버

| `mobile/src/storage.js` 키 | 서버로 바꿀 때 |
|---|---|
| `mochi.game.v1` (XP·코인·완료·캐릭터·출석) | `GET /home`, `/missions/today`, `/level`, `/shop` — 서버가 기준, 앱에는 저장하지 않음 |
| `mochi.wardrobe.v1` (옷) | `GET /shop`, `PUT /equipped` |
| `mochi.homeGuestbook.v1`, `mochi.homeGuestLikes.v1` | `GET·POST /users/{id}/guestbook`, 좋아요 `POST·DELETE /users/{id}/guestbook/{글 id}/like` |
| `mochi.visitors.v1`, `mochi.visitNotes.v1`, `mochi.visitConnections.v1`, `mochi.visitLikes.v1` | `GET /rooms/recommended`, `POST /visits`, `GET /users/{이웃}/room`, `/guestbook` |
| `mochi.petName` | 닉네임 `PATCH /users/{id}` (캐릭터 애칭과 닉네임을 나눌지는 결정 필요) |
| `mochi.settings.v1` (소리·알림) | 앱에만 저장해도 됨 |
| (새로) 사용자 `id`, Supabase 세션 | AsyncStorage (Supabase는 `@supabase/supabase-js`의 `auth.storage`에 AsyncStorage 지정) |

### 7. Supabase 로그인 붙인 뒤

```js
const { data: { session } } = await supabase.auth.getSession();
await api(`/users/${userId}/home`, { token: session?.access_token });
```

서버의 토큰 확인은 아직 없음 → [DATABASE.md](DATABASE.md) "로그인 연결 계획"

## 서버 주소

- 개발: `http://localhost:8000` (웹 `http://localhost:5173`·Expo 웹 `http://localhost:8081`·`http://localhost:5183`에서 호출 허용됨)
- **휴대폰 앱 시연 (같은 와이파이)**: 백엔드에서 `python scripts/serve.py` → 화면에 나오는 `EXPO_PUBLIC_API_URL=http://<노트북 IP>:8000`을 `mobile/.env.local`에 넣고 앱 다시 시작
- 프론트 포트가 다르면 서버 `backend/.env`에 `CORS_ORIGINS=http://127.0.0.1:5180` 처럼 지정
- 배포 주소는 정해지면 여기에 적는다
- 프론트에서는 `VITE_API_URL` 같은 환경변수로 주소를 받는 것을 권장

## 출석 (주간 출석표, 10/15)

- `GET /users/{id}/attendance/week` → `{week_start, days: [{date, reward, claimed, today}], count, claimed_today}`. reward: `{type: coins|xp, amount}` 또는 `{type: outfit|decor, id, name}`
- `POST /users/{id}/attendance` → `gift` (오늘 받은 선물, 이미 가진 옷·소품이면 `{type: coins, amount: 30, duplicate: 이름}`), `coins`, `level`, `week`
- 웹 연결 예시: `frontend/src/api/game.js`

## 아직 없는 것

- 로그인: Supabase 사용자 ↔ 서버 사용자 연결은 `POST /auth/supabase`로 됨. **다른 API는 아직 토큰 확인 없이 `id`만으로 동작** (출시 전에 붙임)
- 방명록 답글, 캐릭터 말풍선 AI
