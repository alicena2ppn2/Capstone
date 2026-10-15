# 데이터베이스 구조

회원마다 DB를 따로 두지 않는다. **DB 파일 하나(`backend/app.db`, SQLite)를 모든 회원이 같이 쓰고**, 표의 각 줄에 붙은 `user_id`(회원 id)로 누구 데이터인지 구분한다. 대부분의 앱이 쓰는 일반적인 방식이다.

- 스키마(표 정의): `app/db.py`의 `SCHEMA`. 서버를 켤 때 표가 없으면 만들고, 예전 DB 파일에 없는 칸은 자동으로 추가한다
- DB 파일 경로: 환경변수 `CAPSTONE_DB` (기본 `backend/app.db`), 사진 파일: `CAPSTONE_UPLOADS` (기본 `backend/uploads/`)
- 둘 다 Git에 올리지 않는다 (`.gitignore`)

최종 갱신: 2026-10-06

## 한눈에 보기

```text
app.db (SQLite 파일 하나)
 ├─ users            회원 목록 (id, 닉네임)
 ├─ steps            user_id + 날짜 → 걸음
 ├─ diary            user_id + 날짜 → 일기
 ├─ coin_ledger      user_id + 날짜 + 항목 → 코인·경험치
 └─ ...              회원 데이터 표에는 모두 user_id 칸이 있음
backend/uploads/     사진 파일 (파일 이름 = photo_id, 주인은 photos 표에 기록)
```

예: 모찌주인의 일기를 보여 줄 때는 `diary` 표에서 `user_id = 'demo-mochi'`인 줄만 꺼낸다.

## 표 목록

| 구분 | 표 | 한 줄 = | 회원 구분 칸 | 내용 |
|---|---|---|---|---|
| 회원 | `users` | 회원 1명 | `id` | 닉네임, 중복 확인용 키, Game Center 연결 칸(나중에) |
| 활동 기록 | `steps` | 회원·날짜 | `user_id` | 그날 걸음 수 (덮어씀) |
| | `mission_days` | 회원·날짜 | `user_id` | 그날 받은 미션 목록(JSON). 처음 부를 때 정해지고 하루 동안 고정 |
| | `completions` | 회원·날짜·미션 | `user_id` | 미션 완료 기록과 제출 내용(JSON) |
| | `weekly_progress` | 회원·주·주간 미션·날짜 | `user_id` | 주간 미션을 채운 날과 제출 사진. 주(`week_start`)는 그 주 월요일 |
| | `coin_ledger` | 회원·날짜·항목 | `user_id` | 코인·경험치 장부. 보상은 +, 상점 구매는 −. 주간 미션 보상은 그 주 월요일 날짜, 항목 `weekly:<id>` |
| | `diary` | 회원·날짜 | `user_id` | 일기 글, 기분, 사진 id 목록, 오늘의 주제 id |
| | `photos` | 사진 1장 | `user_id` | 파일 이름, 사진첩 날짜, 어디에 썼는지(미션 id·diary), 촬영 일시(서버 확인용) |
| 이웃 | `visits` | 방문 1번 | `owner_id`(방 주인), `visitor_id`(방문자) | 같은 날 같은 방은 한 번만 |
| | `guestbook` | 방명록 글 1개 | `owner_id`(방 주인), `author_id`(쓴 사람) | 보이는 이름, 글, 날짜 |
| 상점 | `inventory` | 회원·상품 | `user_id` | 가진 캐릭터·옷·집 소품, 어떻게 얻었는지(구매·처음 지급·레벨·미션) |
| | `equipped` | 회원 1명 | `user_id` | 장착한 캐릭터·옷 |
| | `decor_placement` | 회원·자리 | `user_id` | 자리(전등·카페트·액자·인형·창밖 풍경)마다 놓은 소품 |
| 방명록 | `guestbook_likes` | 글·누른 사람 | `user_id` | 좋아요 (한 사람이 한 글에 한 번) |
| 일기 | `diary_deleted` | 회원·날짜 | `user_id` | 지운 일기 날짜 → 그날은 다시 쓸 수 없음 |
| 친구 | `friends` | 요청 1건 | `user_id`(요청한 사람), `friend_id`(받은 사람) | `pending`(요청) → `accepted`(친구). 관계 하나에 한 줄 |
| | `friendship_points` | 사람·친구·날짜·종류 | `user_a`·`user_b`(두 사람), `actor_id` | 친밀도 점수 기록 (방명록 2·방문 1). 합계 = 친밀도. 보상은 `coin_ledger` 항목 `friend:<친구 id>:lv<n>` |
| 신고·차단 | `blocks` | 회원·차단한 사람 | `user_id`, `blocked_id` | 차단 관계 (서로에게 안 보이게) |
| | `reports` | 신고 1건 | `reporter_id` | 대상(방명록 글 id·user id), 이유, 처리 상태, 숨김 횟수에 세는지(`counted`, 가입 3일 미만이면 0). 같은 사람이 같은 대상은 한 번만 |
| | `guestbook_bans` | 회원 1명 | `user_id` | 방명록 쓰기 정지 마지막 날, 이유(혐오 표현) |
| 쉬어 가기 | `rests` | 회원 1명 | `user_id` | 쉬는 기간(시작·끝). 이 기간은 오래 쉰 날로 치지 않음 |
| 위기 | `crisis_signals` | 신호 1개 | `user_id` | 날짜, 어디서(일기·미션), 위험도, 분류. **글 내용은 저장하지 않음** |
| 공용 | `crisis_terms` | 표현 1개 | — | 위기 표현 목록. `app/data/crisis_lexicon.json`을 서버 시작 때 옮김 |
| | `kote_comments` | 댓글 1개 | — | KOTE 한국어 감정 댓글 5만 개 (위기 표현 점검용, `scripts/import_kote.py`) |

## 저장하지 않고 계산하는 값

| 값 | 계산 방법 |
|---|---|
| 코인 잔액 | `coin_ledger.coins` 합계 |
| 경험치·레벨 | `coin_ledger.xp` 합계 → 레벨 공식 (`app/missions.py` `level_from_xp`) |
| 오늘 완료한 미션 | 그날 `completions` 줄 |
| 미션 목록·상품 목록·일기 주제 | 회원과 상관없는 파일: `app/data/missions.json`, `shop.json`, `diary_topics.json` |

장부에서 합계를 내는 방식이라 같은 보상이 두 번 들어가지 않고(같은 회원·날짜·항목은 한 줄만), 코인을 써도 경험치는 줄지 않는다.

## 계정 삭제

`DELETE /users/{id}` 하면 위 표에서 그 회원 id가 붙은 줄을 모두 지우고 `uploads/`의 사진 파일도 지운다.

- 두 사람이 관련된 `visits`, `guestbook`, `blocks`, `friends`, `friendship_points`는 그 회원이 **어느 쪽이든** 지운다. `reports`는 그 회원이 한 신고를 지운다
- 공용 표(`crisis_terms`, `kote_comments`)는 회원 데이터가 아니라 그대로 둔다

## 한계와 출시 전 할 일

1. **로그인 확인이 없음** — 지금은 회원 구분이 `user_id`로만 되고, 그 id를 보낸 사람이 정말 그 회원인지 확인하지 않는다. 남의 id를 알면 그 사람 데이터를 보거나 바꿀 수 있다
   - **결정(10/6): 로그인은 Supabase로, 프론트에서 한다.** 백엔드는 나중에 요청마다 Supabase 로그인 토큰(JWT)을 확인하고, 토큰 안의 사용자 id로만 동작하게 바꾼다 (아래 "로그인 연결 계획")
2. **SQLite는 파일 하나** — 시연·소규모에는 충분하다. 동시 접속이 많아지면 PostgreSQL 같은 서버형 DB로 옮긴다 (Supabase를 쓰면 Supabase의 PostgreSQL로 옮기는 것도 방법). DB를 다루는 코드는 `app/db.py` 한 곳에 모여 있어 옮기기 어렵지 않다
3. **배포 시 저장 공간** — DB 파일과 사진 폴더는 서버를 다시 켜도 남아 있어야 한다. Render 같은 곳은 기본 디스크가 재시작 때 지워지므로 따로 저장 공간(디스크)을 붙여야 함
4. **백업** — 지금은 없음. 배포 후 DB 파일·사진 폴더를 주기적으로 복사해 두기

## 로그인 연결 (Supabase)

**10/14 1단계 완료:** `POST /auth/supabase` — Supabase 사용자를 서버 사용자와 이어 줌 (`users.supabase_id`, 하나에 하나)
- 서버 환경변수 `SUPABASE_URL`·`SUPABASE_KEY`(publishable key)가 있으면 토큰을 Supabase `/auth/v1/user`에 물어봐서 확인 (서명 방식 상관없이 동작). 없으면 개발·시연 모드로 본문 `supabase_id`를 믿음
- `users.id`는 그대로 서버가 만든 id를 씀 (아래 표의 "Supabase id를 그대로 쓰기" 대신 연결 칸 방식 — 기존 사용자·시연 데이터를 바꾸지 않으려고)
- 남은 일: 다른 API도 요청마다 토큰 확인 → 주소의 `{id}`와 토큰의 사용자가 같은지 확인

### 처음 계획

로그인·회원가입은 **프론트에서 Supabase Auth**로 한다 (2026-10-06 결정). 백엔드가 할 일:

```text
프론트: Supabase 로그인 → 로그인 토큰(JWT)
   ↓ 요청마다 Authorization: Bearer <토큰>
백엔드: 토큰이 Supabase가 발급한 진짜인지 확인 → 토큰 안의 사용자 id(sub)로만 동작
```

| 할 일 | 내용 |
|---|---|
| 토큰 확인 | 요청마다 Supabase JWT 서명·만료 확인 (Supabase 프로젝트의 서명 키 필요). 확인 실패 → 401 |
| 회원 id | `users.id`를 Supabase 사용자 id로 사용. 주소의 `{id}`와 토큰의 id가 다르면 거절 (관리자 제외) |
| 가입 API | `POST /users`는 닉네임 등록 용도로만 (계정 자체는 Supabase가 만듦) |
| 계정 삭제 | 우리 DB 기록 삭제 + Supabase 계정 삭제를 함께 (Supabase 관리자 키는 서버에만) |
| (선택) DB 이전 | SQLite → Supabase PostgreSQL |
