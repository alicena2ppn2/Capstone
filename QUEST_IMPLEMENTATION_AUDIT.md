# MY MOCHI 퀘스트 구현 비교 보고서

분석일: 2026-10-15. 앱·서버·데이터·설정 수정, 병합, 테스트·빌드·실제 API 호출은 하지 않았다. 원격 확인은 `git fetch origin`만 수행했다. 지도 A안 선택과 기존 시안 코드는 보존한다. 이번에 작성하는 파일은 이 보고서뿐이며 커밋·푸시하지 않는다.

## 비개발자를 위한 핵심 요약

1. **프론트와 서버는 아직 서로 다른 퀘스트 게임이다.** 프론트는 고정3개＋변동3개를 로컬에서 제공한다. 서버는 고정5~6개＋변동3개로 총8~9개다.
2. **로그인 연결은 게임 기록 동기화가 아니다.** 모바일의 계정 연결 코드는 있지만, 현재 퀘스트·일기·사진·방명록·재화는 서버 API를 호출하지 않고 로컬에서 처리한다.
3. **보상과 레벨 공식이 다르다.** 프론트는 일반 활동15XP/25코인,100XP마다 레벨 상승이다. 서버는 대부분100XP와30~70코인, 다음 레벨에 필요한XP가100·250·400…으로 증가한다.
4. **교체·부담 피드백·일기 재작성·특별 캐릭터 조건도 다르다.** 프론트의 ‘다른 활동으로’를 서버의 reroll에 그대로 연결하면 현재 경험이 달라진다.
5. **일반 게임 API의 사용자 권한 검사도 미완성이다.** 계정 연결 API 외에는 경로의 사용자ID를 토큰 소유자와 대조하지 않는다. 프론트에서ID를 분리하는 것만으로 타인 기록 접근을 막을 수 없다.

아래는 현재 코드의 사실이다. 교수님 의견, 팀의 확정 정책, 배포 성공, 예방·치료 효과를 의미하지 않는다.

## 1. 분석 기준과 실제 코드 흐름

- 브랜치 `영주`, HEAD `bde8fc65b07e6006087eed1dc624b36c472d7b08`.
- fetch 후 `origin/main`은 `74155a0`(PR#34 병합). 현재 브랜치에 병합하지 않았다.
- HEAD의 backend 마지막 변경은 `6ea1982`. **HEAD와 origin/main의 backend 파일 내용은 동일**하다. 배포 서버가 이 버전인지는 미확인이다.
- 미커밋 지도 시안·관련 문서·기존 캡처/검증파일 및 기존 참고PDF 삭제 상태를 보존했다. `shared/data/missions.js`, `shared/features/dailyMissions.js`, `backend/app/`에는 로컬 변경이 없다.
- 이 보고서의 경로·함수 근거는 별도 표기가 없으면 위 HEAD 기준이다. 실제 사용자 저장소·서버DB는 조회하지 않았다.

### 1.1 백엔드 원격 브랜치

| 브랜치 | tip | JSON행수 | main조상 | tip내용 |
| --- | --- | --- | --- | --- |
| origin/backend | 589162c | 75 | 예 | Merge pull request #5 from alicena2ppn2/backend-missions |
| origin/backend-album | 4f22a5a | 77 | 예 | 백엔드: 사진첩, 사진 촬영 일시 서버 확인 |
| origin/backend-decor | 07cb6aa | 77 | 예 | 문서: 작업 기록을 날짜 기간 기준으로 정리, 담당 칸 추가 |
| origin/backend-demo-data | faec4d4 | 77 | 예 | 백엔드: 시연용 데이터 스크립트, 프론트 연결 가이드, 작업 기록 |
| origin/backend-expo-guide | 6340da4 | 77 | 예 | 문서: 작업 기록에 10/7~10/8 기간 추가 |
| origin/backend-home-missions | 6c6d69f | 92 | 예 | 문서: 작업 기록 10/13까지 PR 기준으로 채우기 |
| origin/backend-level | 99b1a64 | 77 | 예 | 백엔드: 매일 고정 미션, 출석·레벨, 친구 방 방문·방명록 미션 |
| origin/backend-missions | 8b6662c | 75 | 예 | 백엔드: 일기 주제 50개, 일기 API, 주제 일기 미션 추가 |
| origin/backend-neighbor-level | 426824f | 77 | 예 | 백엔드: 월간 목표, 방명록 좋아요, 일기 삭제 |
| origin/backend-onboarding-survey | 82c24f5 | 90 | 예 | 백엔드: 처음 설문, 단계 사다리 퀘스트, 미션 소감, Supabase 로그인 연결, 월간 목표 빼기 |
| origin/backend-rules | 79d2c79 | 카탈로그없음 | 아니요 | 백엔드: 규칙 엔진 v0.2 추가 |
| origin/backend-users | 059fe7c | 77 | 예 | 백엔드: 사용자 등록·계정 삭제, 상점 서버 저장, 서울 날짜 기준 |


`backend-onboarding-survey`에는 설문·사다리·소감과90개 카탈로그, `backend-home-missions`에는 집 운동·교체를 포함한92개 카탈로그가 있다. 현재 main은 이들과 연결 준비 커밋 `6ea1982`를 포함한다. `backend-rules`는 `app/rules.py`·`app/indicators.py` 중심의 별도 구버전 연구 코드로 현재 미션 카탈로그가 없다. main 조상이 아니므로 최신 퀘스트 최종본으로 간주하지 않는다. **조상 여부는 이력 포함 여부이며 최종 승인·실제 배포 여부가 아니다.**

### 1.2 실제 사용 파일과 호출 흐름

| 대상 | 화면/호출 흐름 | 콘텐츠·규칙 | 저장 |
|---|---|---|---|
| 웹 | `frontend/src/main.jsx` → 인증 게이트 → `App.jsx` → `screens/Quest.jsx` | `shared/data/missions.js` → `features/dailyMissions.js`, `missionGuidance.js`, `game.js` | localStorage `mochi.game.v1`; 옷장/방명록 별도 키, 사진IndexedDB |
| 모바일 | `mobile/src/app/_layout.jsx` → 인증 게이트 → `GameApp.jsx` → `screens/quests/Quests.jsx` | 웹과 같은 shared 모듈 | `hooks/useGameState.js`/`storage/storage.js`의AsyncStorage, 사진기기문서폴더 |
| 서버 | `backend/app/main.py` → `todays_missions/complete_mission/finish_and_pay` | `app/missions.py:load_catalog`가 `app/data/missions.json`을 직접 읽음 | `app/db.py` SQLite mission_days/completions/coin_ledger/diary/photos 등 |
| 인증 | Supabase 세션 → `shared/auth/authBackendController.mjs:connect` → `shared/api/backendClient.mjs:link` | `POST /auth/supabase` | Supabase ID와backendUserId 분리. 게임 자산 병합 없음 |

**missions.js는 프론트용인가?** 현재 저장소의 `shared/data/missions.js`는 웹·모바일 공용이며 서버에서는 사용하지 않는다. 서버는 Python＋별도JSON이다. 과거 따로 전달한 파일과 현재 파일이 정확히 같은지는 원본이 없어 확인할 수 없다. 리팩토링 전 `frontend/src/utils/game.js` 경로와 서버의 ‘프론트와 같은 보상’ 주석은 현재 코드와 다르다.

## 2. 정의 수와 하루 제공 수

| 대상 | 정의된 목록 | 현재 사용 범위 |
|---|---|---|
| 프론트 | DAILY_CHALLENGES25개(구 일기1포함), ROUTINES3개, GOALS5개 | 변동 pool은input 일기를 제외한24개. 하루고정3＋변동최대3. 별도주간3·월간2 |
| 프론트 신규 추천 | 변동24개 중effort2가3개 | `recommendMissions`는effort≤1, 즉21개를 다시 선호·시간·그룹으로 필터. 기존 저장 목록은 유지 |
| 서버 | JSON92개: daily6/outdoor26/home15/explore23/record11/connect11 | 고정5~6＋변동3=8~9개 |
| 서버 변동 실제 후보 | outdoor stage1~3의21＋home15＋connect11=47개 | 현재단계·설문·기준기록에 맞는 슬롯별 후보에서1개씩 |
| 서버 현재 미배정 | outdoor stage0의5＋explore23＋record11=39개 | 로드는 하지만 `DAILY_PLAN/slot_options`에 들어가지 않음. 옛DB 저장 목록은 미조회 |
| 서버 주월 | WEEKLY_QUESTS1/월간0 | 주간사진 별도 제출. 현재 월간API 없음 |

프론트6개는 기본 제공 구조다. 후보가 부족할 때 `ensureDailyMissions`는 억지로3개를 채우지 않지만 UI 분모는6 고정이라 부족한 상태의 표시 차이는 확인이 필요하다. 전체6개 완료가 개별 보상 조건은 아니다. 서버 `MISSIONS_PER_DAY=3`은 **변동3개**를 뜻하며 총미션 수가 아니다.

## 3. 프론트 전체 목록

공통 근거: `shared/data/missions.js:action/DAILY_CHALLENGES/GOALS`, `shared/features/dailyMissions.js:ROUTINES/ensureDailyMissions/startDailyMission/finishDailyMission`, `missionGuidance.js:eligibleMission/recommendMissions`.

### 3.1 고정3개

| ID/제목 | 기간·유형 | 분류/유사그룹 | 설명·완료 조건 | 배정·제외 | 확인 | XP·코인·아이템 | 사용 |
|---|---|---|---|---|---|---|---|
| day-attendance / 출석하기 | 일일·고정 | 루틴/별도group없음 | 오늘 claimAttendance 실제 성공. 화면 열기만으로 완료되지 않음 | 항상 | 로컬지급결과 | 미션추가0/0. 출석표 실제보상만 | 웹/모바일 |
| day-diary / 오늘의 일기 쓰기 | 일일·고정 | 일기/prepare정의재사용 | 당일 공백 아닌 일기 저장, 최대2,000자, 감정선택 | 항상. 변동pool제외 | saveDiaryMission | 15XP/25코인·같은날1회 | 웹/모바일 |
| day-guestbook / 방명록 남기기 | 일일·고정 | 방명록/별도group없음 | 다른 샘플이웃방에 유효글 로컬저장. 샘플글/화면방문은 제외 | 항상 | 저장성공→루틴 | 0XP/0코인(pending-policy), 아이템없음 | 로컬시연. 실제전달아님 |

### 3.2 변동 후보24개

공통으로 오늘 배정 슬롯·시작·미완료·미보류를 확인한다. 일반 자기 확인은 실제 행동 횟수·시간을 센서로 확인하지 않는다. 기본15XP/25코인＋해당 미션ID의 활동기록이 처음이면5XP. 직접 아이템 지급은 없다.

조건약어: **P**=시간상한/명시적제외, 신규effort≤1, 당일그룹중복회피. **O**=이동·외출제외시비대상. **C**=contact관심을직접선택해야하며연락제외시비대상. **M/R/H**=음악/독서/취미관심필요(음악은기존음악취향도인정). **F**=사진제외시비대상.

| ID/제목 | 주기·유형 | 분류/유사그룹 | 설명·행동기준 | 배정·제외 | 확인 | 보상 | 현재사용 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| day-tidy / 물건 세 개 제자리로 | 일일·변동 | prepare / tidy | 가까이에 있는 물건 세 개를 원래 자리에 놓아 주세요. | P; 3분,effort1 | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |
| day-space / 내 자리 한 칸 비우기 | 일일·변동 | prepare / tidy | 책상이나 선반에서 손바닥 크기 공간 한 칸을 비워 주세요. | P; 3분,effort1 | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |
| day-cup / 컵 하나 씻기 | 일일·변동 | prepare / day-cup | 사용한 컵 하나를 평소 방법으로 씻어 놓아 주세요. | P; 3분,effort1 | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |
| day-hobby / 좋아하던 것 잠깐 | 일일·변동 | prepare / day-hobby | 원래 즐기던 취미를 내가 정한 짧은 만큼 해 보세요. | P / H; 5분,effort1 | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |
| day-listen / 익숙한 한 곡 듣기 | 일일·변동 | prepare / day-listen | 좋아하는 곡 하나의 듣고 싶은 구간을 들어 보세요. | P / M; 5분,effort1 | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |
| day-read / 한 쪽 다시 읽기 | 일일·변동 | prepare / day-read | 읽고 싶은 책이나 글 한 쪽을 읽어 주세요. | P / R; 5분,effort1 | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |
| day-local / 생활권 소식 하나 보기 | 일일·변동 | prepare / day-local | 관심 있는 공공시설 게시판이나 공식 페이지에서 소식 하나를 읽어 보세요. | P; 3분,effort1 | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |
| day-photo-detail / 작은 발견 사진 남기기 | 일일·변동 | prepare / photo-moment | 집 안이나 주변에서 눈에 들어온 물건 하나를 찍어 사진을 저장해 주세요. | P / F; 2분,effort0 | 로컬사진저장→완료 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |
| day-photo-sky / 오늘의 하늘 담기 | 일일·변동 | outside / photo-moment | 안전한 범위로 잠깐 나가 하늘 사진 한 장을 찍어 저장해 주세요. | P / O,F; 3분,effort1 | 로컬사진저장→완료 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |
| day-photo-leaf / 초록 한 장 발견하기 | 일일·변동 | outside / photo-moment | 밖에서 만난 나무나 풀 사진 한 장을 찍어 저장해 주세요. | P / O,F; 3분,effort1 | 로컬사진저장→완료 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |
| day-wake / 내 하루 시작하기 | 일일·변동 | prepare / start-day | 커튼 열기나 물 마시기처럼 평소 하루를 시작하던 행동 하나를 해 보세요. | P; 5분,effort1 | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |
| day-seasonal / 제철 음식 알아보기 | 일일·변동 | prepare / seasonal | 구매하거나 먹을 필요 없이 제철 음식 하나의 이름을 찾아 확인해 주세요. | P; 5분,effort1 | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |
| day-walk / 잠깐 밖에 나가보기 | 일일·변동 | outside / short-outing | 거리와 시간은 편한 만큼 정해 집 밖에서 공기를 맡고 돌아오세요. | P / O; 3분,effort1 | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |
| day-more-steps / 내 만큼 걸어 보기 | 일일·변동 | outside / short-outing | 1·5·10분 중 오늘 가능한 목표를 골라 정한 만큼 걸어 주세요. | P / O; 5분,effort1;1/5/10분목표선택필수(타이머아님) | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |
| day-drink / 동네 둘러보기 | 일일·변동 | outside / short-outing | 구매하지 않아도 괜찮으니 익숙한 가까운 가게나 장소를 잠깐 둘러보고 돌아오세요. | P / O; 5분,effort1 | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |
| day-place / 다른 길 만나기 | 일일·변동 | outside / short-outing | 안전한 익숙한 길에서 다른 골목이나 공공 쉼터 한 곳을 잠깐 둘러보세요. | P / O; 10분,effort2 | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규기본제외,기존저장등에한정 |
| day-greet / 짧은 인사 건네기 | 일일·변동 | connect / greeting | 자연스럽게 마주친 사람에게 “안녕하세요”라고 한 번 인사해 보세요. | P / C; 3분,effort1 | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |
| day-checkin / 안부 한 줄 보내기 | 일일·변동 | connect / checkin | 답장은 없어도 괜찮으니 연락하고 싶은 사람에게 “잘 지내?”처럼 안부 한 번을 전해 보세요. | P / C; 3분,effort1 | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |
| day-thanks / 고마움 표현하기 | 일일·변동 | connect / thanks | 도움을 준 사람에게 “덕분에 도움이 됐어요”처럼 고마움을 한 번 전해 보세요. | P / C; 3분,effort1 | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |
| day-question / 관심사 질문 남기기 | 일일·변동 | connect / question | 이용하는 관심사 커뮤니티에 궁금한 질문 하나를 남겨 주세요. | P / C; 5분,effort2 | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규기본제외,기존저장등에한정 |
| day-invite / 함께할 활동 제안하기 | 일일·변동 | connect / invite | 성사되지 않아도 괜찮으니 원하는 상대나 커뮤니티에 “같이 해볼까요?”처럼 활동을 한 번 제안해 보세요. | P / C; 10분,effort2 | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규기본제외,기존저장등에한정 |
| day-door / 문밖 한 걸음 | 일일·변동 | outside / short-outing | 안전하게 문밖으로 나가 주변을 잠깐 보고 돌아오세요. | P / O; 1분,effort0 | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |
| day-nod / 눈인사 건네기 | 일일·변동 | connect / greeting | 자연스럽게 마주친 사람에게 고개를 가볍게 끄덕여 한 번 인사해 보세요. | P / C; 1분,effort0 | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |
| day-water / 물 한 모금 | 일일·변동 | prepare / start-day | 편하게 마실 수 있는 물 한 모금을 마셔 주세요. | P; 1분,effort0 | 시작→해냈어요! 자기확인 | 15XP(+최초5)/25코인/없음 | 신규추천/조건부교체 |


`day-place/day-question/day-invite`는effort2여서 신규 기본 추천에는 나오지 않는다. 과거 저장된effort2 목록/그런 슬롯에서의 교체는 가능하다. 특정 사용자의 실제 배정은 저장 데이터를 읽지 않아 미확인이다.

### 3.3 주간·월간 목표5개

| ID/제목 | 주기·유형 | 분류/그룹 | 조건·배정 | 확인 | 보상 | 현재사용 |
| --- | --- | --- | --- | --- | --- | --- |
| week-walk / 이번 주 바깥 발견 | 주간·집계 | outside / 그룹없음 | 이번 주 외출 완료 기록 2회;목표이상수령가능 | 기간/분류일치비입력활동기록수 | 30XP/30코인/없음 | 양쪽탭,자동집계후수동수령 |
| week-diary / 이번 주 하루 기록 | 주간·집계 | 일기 / 그룹없음 | 서로 다른 날짜에 하루 기록 3일;목표이상수령가능 | 최소날짜원장포함일기날짜수 | 30XP/30코인/없음 | 양쪽탭,자동집계후수동수령 |
| week-connect / 이번 주 작은 연결 | 주간·집계 | connect / 그룹없음 | 이번 주 교류 완료 기록 2회;목표이상수령가능 | 기간/분류일치비입력활동기록수 | 30XP/30코인/없음 | 양쪽탭,자동집계후수동수령 |
| month-place / 이번 달 바깥 발견 | 월간·집계 | outside / 그룹없음 | 이번 달 외출 완료 기록 8회;목표이상수령가능 | 기간/분류일치비입력활동기록수 | 60XP/60코인/없음 | 양쪽탭,자동집계후수동수령 |
| month-diary / 이번 달 하루 기록 | 월간·집계 | 일기 / 그룹없음 | 서로 다른 날짜에 하루 기록 10일;목표이상수령가능 | 최소날짜원장포함일기날짜수 | 60XP/60코인/없음 | 양쪽탭,자동집계후수동수령 |


### 3.4 옛 정의/호환 경로

- `DAILY_CHALLENGES`의 구 `day-diary`(input:true)는 변동pool에서 제외된다. 현 화면은 고정루틴→공통 일기다. 구 `completeQuest`의80자 제한을 현재 일기 제한으로 설명하면 틀리다.
- `game.js:LEGACY_QUESTS`의 `week-wake/month-rhythm`은 기간 없는 옛 완료 기록의1회 이관ID다. 현재 목표로 배정하지 않는다. 일부 다른legacy ID는 현목표와 공유한다. `questPeriodsMigrated`로 재이관을 막는다.
- `day-music/day-food`는 현재 일일보상이 아니라 `migrateChallenges`가 과거답변을 취향으로 이관하는ID다.
- `startQuest/completeQuest/selectChallenge/pauseChallenge/replaceChallenge/previewReward`는 옛 선택3개·하루3회 경로다. 현재 앱 화면의 호출은 확인되지 않는다. `ensureDailyMissions`가 `ensureChallenges`를 호출해 옛 메타데이터를 유지하는 점은 남아 있다.
- 긴 방법보기/light/extend UI는 제거되어 있다. `missionMode/missionCriterion`·legacy조건은 과거 진행조건 보존용이다. **day-more-steps의1/5/10분 목표 선택은 별도로 현재 남아 있다.**

## 4. 백엔드 전체 목록

근거: `backend/app/data/missions.json`92행 전수, `app/missions.py:load_catalog/slot_options/usable/personalize/is_complete/Mission.coins/Mission.xp`. JSON에는 주기필드가 없고 today경로에서 일일로 사용한다. 제목이 ‘이번 주’인record도 실제 주간API로 분류하지 않았다. **activityGroup은 없다.** 표에 임의의 의미 그룹을 만들지 않았다.

배정약어: **D**=고정daily, **H**=home슬롯, **S1~3**=현재move/connect단계(후보부족시하위단계탐색). requires는서버설문답필수다. 시간/이동/연락/사진제외 설정은 서버배정에 없다.

확인약어:
- **PH(n)**: 소유photo_id 중복제거 후n장 이상, EXIF촬영일이 있으면 제출일 일치. 촬영일없음은 현재허용. 내용·장소·실제체류시간 검증아님.
- **ST**: 서버steps테이블 값≥목표. 그 값은 클라이언트 정수업로드로, 건강앱/센서무결성 검증과 다름.
- **TX**: 공백 아닌text. **LS(n)**: 공백·중복 제거한items n개 이상. prompt가 있으면answer 필요. 실제행동/정보진실성 검증아님.
- **SELF**: 완료요청 자체 인정. 운동횟수·시간 검증없음.
- **ATT/DI/VIS/GB**: 출석/일기/방문/방명록 경로. 세부자동완료 차이는6절 참조.

모든 미션의 직접 아이템 보상은 없다. 특별 캐릭터는 공통 `grant_free_items`로 별도 조건 지급한다.

### 4.1 고정일일6개

| ID/제목 | 기간·유형 | 분류/단계/그룹 | 설명·행동기준 | 배정·제외 | 코드확인 | 보상 | 현재사용 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| attendance / 출석하기 | 일일·고정 | daily/stage0/그룹없음 | 오늘도 와 줘서 고마워요! 앱을 열면 출석돼요. | D | ATT | 10XP/10코인/없음 | 배정경로있음(조건부) |
| walk / 오늘 걸음 채우기 | 일일·고정 | daily/stage0/그룹없음 | 하루 권장 걸음 8,000보를 채워 봐요. | D | ST(≥8000보) | 100XP/50코인/없음 | 배정경로있음(조건부) |
| beat_last_week / 지난주보다 1,000보 더 걷기 | 일일·고정 | daily/stage0/그룹없음 | 지난 7일 동안 하루 평균 {prev}보 걸었어요. 오늘은 1,000보 더, {goal}보 이상 걸어 봐요. | D;지난7일유효걸음≥4일,어제8,000보미만/미기록;평균+1,000을100보단위올림 | ST(개인화목표) | 100XP/50코인/없음 | 배정경로있음(조건부) |
| diary / 오늘의 일기 쓰기 | 일일·고정 | daily/stage0/그룹없음 | 오늘의 주제: {topic} 다른 이야기를 써도 괜찮아요. | D | DI/TX | 100XP/40코인/없음 | 배정경로있음(조건부) |
| visit / 다른 친구 방 놀러 가기 | 일일·고정 | daily/stage0/그룹없음 | 다른 친구 방에 한 번 놀러 가 봐요. | D | VIS | 100XP/30코인/없음 | 배정경로있음(조건부) |
| guestbook / 방명록 남기기 | 일일·고정 | daily/stage0/그룹없음 | 다른 친구 방에 놀러 가서 방명록을 한 줄 남겨요. | D | GB | 100XP/30코인/없음 | 배정경로있음(조건부) |

### 4.2 바깥활동26개

| ID/제목 | 기간·유형 | 분류/단계/그룹 | 설명·행동기준 | 배정·제외 | 코드확인 | 보상 | 현재사용 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| door_5min / 집 앞 5분 나가기 | 일일·변동후보 | outdoor/stage2/그룹없음 | 현관문 열고 딱 5분만 밖에 있어 봐요. 걸음으로 확인할게요. | S2 | ST(≥500보) | 100XP/60코인/없음 | 배정경로있음(조건부) |
| beat_yesterday / 어제보다 많이 걷기 | 일일·변동후보 | outdoor/stage1/그룹없음 | 어제는 {prev}보 걸었어요. 오늘은 {goal}보 이상 걸어 봐요. | S1;어제걸음존재,어제보다큰다음100보단위 | ST(개인화목표) | 100XP/50코인/없음 | 배정경로있음(조건부) |
| block_walk / 동네 한 바퀴 | 일일·변동후보 | outdoor/stage2/그룹없음 | 집 주변 블록을 한 바퀴 돌아봐요. | S2 | ST(≥1500보) | 100XP/60코인/없음 | 배정경로있음(조건부) |
| run_block / 동네 한 바퀴 뛰기 | 일일·변동후보 | outdoor/stage2/그룹없음 | 가볍게 뛰어서 동네 한 바퀴. 2,000보를 넘기면 완료! | S2 | ST(≥2000보) | 100XP/60코인/없음 | 배정경로있음(조건부) |
| sky_photo / 오늘 하늘 찍기 | 일일·변동후보 | outdoor/stage1/그룹없음 | 밖에 나가서 오늘 하늘을 찍어 올려요. | S1 | PH(1장) | 100XP/50코인/없음 | 배정경로있음(조건부) |
| photo_nature / 밖에서 만난 친구 찍기 | 일일·변동후보 | outdoor/stage2/그룹없음 | 고양이, 강아지, 꽃… 눈에 띈 걸 찍어서 스토리에 올려봐요. | S2 | PH(1장) | 100XP/60코인/없음 | 배정경로있음(조건부) |
| drink_run / 좋아하는 음료수 사 오기 | 일일·변동후보 | outdoor/stage2/그룹없음 | 가까운 가게에 들러 좋아하는 음료수를 사 와서 찍어 올려요. | S2 | PH(1장) | 100XP/60코인/없음 | 배정경로있음(조건부) |
| snack_new / 편의점 신상 간식 사 오기 | 일일·변동후보 | outdoor/stage2/그룹없음 | 편의점에서 처음 보는 간식을 하나 사 와서 찍어 올려요. | S2 | PH(1장) | 100XP/60코인/없음 | 배정경로있음(조건부) |
| bakery / 동네 빵집 빵 사 오기 | 일일·변동후보 | outdoor/stage2/그룹없음 | 동네 빵집에서 마음에 드는 빵을 사 와서 찍어 올려요. | S2 | PH(1장) | 100XP/60코인/없음 | 배정경로있음(조건부) |
| sunlight / 햇볕 10분 쬐기 | 일일·변동후보 | outdoor/stage1/그룹없음 | 해 있을 때 밖에서 10분 쉬고, 그때 본 풍경을 찍어 올려요. | S1 | PH(1장) | 100XP/50코인/없음 | 배정경로있음(조건부) |
| bench / 공원 벤치에 앉아 보기 | 일일·변동후보 | outdoor/stage3/그룹없음 | 공원 벤치에 앉아서 보이는 풍경을 찍어 올려요. | S3 | PH(1장) | 100XP/70코인/없음 | 배정경로있음(조건부) |
| sunset / 노을 찍기 | 일일·변동후보 | outdoor/stage0/그룹없음 | 해 질 무렵 밖에 나가 노을을 찍어 올려요. | 현재배정없음 | PH(1장) | 100XP/50코인/없음 | 로드만됨·자동미배정 |
| season_scene / 계절 풍경 찾기 | 일일·변동후보 | outdoor/stage0/그룹없음 | 요즘 계절이 느껴지는 장면(낙엽, 벚꽃, 눈…)을 찍어 올려요. | 현재배정없음 | PH(1장) | 100XP/50코인/없음 | 로드만됨·자동미배정 |
| mural / 동네 벽화·간판 찾기 | 일일·변동후보 | outdoor/stage0/그룹없음 | 동네에서 재밌는 벽화나 간판을 찾아 찍어 올려요. | 현재배정없음 | PH(1장) | 100XP/50코인/없음 | 로드만됨·자동미배정 |
| flower_shop / 꽃집 구경하기 | 일일·변동후보 | outdoor/stage0/그룹없음 | 꽃집 앞을 지나가며 마음에 드는 꽃을 찍어 올려요. | 현재배정없음 | PH(1장) | 100XP/50코인/없음 | 로드만됨·자동미배정 |
| market / 시장 구경 가기 | 일일·변동후보 | outdoor/stage3/그룹없음 | 가까운 시장에 들러 구경하고 한 장 찍어 올려요. | S3 | PH(1장) | 100XP/70코인/없음 | 배정경로있음(조건부) |
| library_visit / 도서관 들러 보기 | 일일·변동후보 | outdoor/stage3/그룹없음 | 가까운 도서관에 가서 입구나 책장을 찍어 올려요. | S3 | PH(1장) | 100XP/70코인/없음 | 배정경로있음(조건부) |
| cafe_visit / 동네 카페 가 보기 | 일일·변동후보 | outdoor/stage3/그룹없음 | 안 가 본 동네 카페에 가서 음료 사진을 올려요. | S3 | PH(1장) | 100XP/70코인/없음 | 배정경로있음(조건부) |
| recycle / 분리수거 내놓기 | 일일·변동후보 | outdoor/stage1/그룹없음 | 쌓인 분리수거를 들고 나가 버리고, 분리수거장 사진을 올려요. | S1 | PH(1장) | 100XP/50코인/없음 | 배정경로있음(조건부) |
| bus_stop_walk / 한 정거장 걸어 보기 | 일일·변동후보 | outdoor/stage3/그룹없음 | 버스 한 정거장 거리를 걸어봐요. | S3 | ST(≥1500보) | 100XP/70코인/없음 | 배정경로있음(조건부) |
| new_road / 안 가 본 길로 걷기 | 일일·변동후보 | outdoor/stage0/그룹없음 | 평소 안 다니던 골목으로 걸어 보고 찍어 올려요. | 현재배정없음 | PH(1장) | 100XP/50코인/없음 | 로드만됨·자동미배정 |
| trail / 가까운 산책로 걷기 | 일일·변동후보 | outdoor/stage3/그룹없음 | 근처 산책로나 하천길을 걸어봐요. | S3 | ST(≥3000보) | 100XP/70코인/없음 | 배정경로있음(조건부) |
| errand / 작은 볼일 보러 나가기 | 일일·변동후보 | outdoor/stage2/그룹없음 | 우체국, 은행, 세탁소처럼 미뤄 둔 볼일을 보고 그곳 사진을 올려요. | S2 | PH(1장) | 100XP/60코인/없음 | 배정경로있음(조건부) |
| parks / 가까운 공원 가 보기 | 일일·변동후보 | outdoor/stage3/그룹없음 | 가까운 공원에 가서 사진을 찍어 올려요. | S3 | PH(1장) | 100XP/70코인/없음 | 배정경로있음(조건부) |
| door_step / 문밖 한 걸음 | 일일·변동후보 | outdoor/stage1/그룹없음 | 현관문을 열고 한 걸음만 나가 봐요. 눈에 보이는 걸 한 장 찍어 주세요. | S1 | PH(1장) | 100XP/50코인/없음 | 배정경로있음(조건부) |
| pet_walk_more / 강아지 산책 5분 더 | 일일·변동후보 | outdoor/stage2/그룹없음 | 평소 산책에 5분만 더 걸어 봐요. 산책 사진 한 장이면 돼요. | S2;pets:dog필요 | PH(1장) | 100XP/60코인/없음 | 배정경로있음(조건부) |

### 4.3 집활동15개

| ID/제목 | 기간·유형 | 분류/단계/그룹 | 설명·행동기준 | 배정·제외 | 코드확인 | 보상 | 현재사용 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cook / 간단한 요리 해 보기 | 일일·변동후보 | home/stage0/그룹없음 | 계란 프라이라도 좋아요. 직접 만든 음식을 찍어 올려요. | H | PH(1장) | 100XP/30코인/없음 | 배정경로있음(조건부) |
| make_bed / 이불 개기 | 일일·변동후보 | home/stage0/그룹없음 | 일어나서 이불을 개고 찍어 올려요. | H | PH(1장) | 100XP/30코인/없음 | 배정경로있음(조건부) |
| air_out / 창문 열고 환기하기 | 일일·변동후보 | home/stage0/그룹없음 | 창문을 활짝 열고, 열린 창문 사진을 올려요. | H | PH(1장) | 100XP/30코인/없음 | 배정경로있음(조건부) |
| tidy_corner / 방 한 구석 정리하기 | 일일·변동후보 | home/stage0/그룹없음 | 책상 위나 서랍 하나만 정리하고 찍어 올려요. | H | PH(1장) | 100XP/30코인/없음 | 배정경로있음(조건부) |
| water_plant / 화분 물 주기 | 일일·변동후보 | home/stage0/그룹없음 | 화분에 물을 주고 찍어 올려요. 화분이 없으면 물 한 잔이라도! | H | PH(1장) | 100XP/30코인/없음 | 배정경로있음(조건부) |
| dishes / 설거지 하기 | 일일·변동후보 | home/stage0/그룹없음 | 쌓인 설거지를 해 봐요. 깨끗해진 개수대를 한 장 찍어 주세요. | H | PH(1장) | 100XP/30코인/없음 | 배정경로있음(조건부) |
| laundry_fold / 빨래 개기 | 일일·변동후보 | home/stage0/그룹없음 | 마른 빨래를 개어 정리해요. 갠 빨래를 찍어 주세요. | H | PH(1장) | 100XP/30코인/없음 | 배정경로있음(조건부) |
| floor_clean / 바닥 청소 5분 | 일일·변동후보 | home/stage0/그룹없음 | 방바닥을 5분만 쓸거나 닦아 봐요. 청소한 자리를 찍어 주세요. | H | PH(1장) | 100XP/30코인/없음 | 배정경로있음(조건부) |
| fridge_tidy / 냉장고 한 칸 정리 | 일일·변동후보 | home/stage0/그룹없음 | 냉장고 한 칸만 정리하고, 오래된 건 버려요. 정리한 칸을 찍어 주세요. | H | PH(1장) | 100XP/30코인/없음 | 배정경로있음(조건부) |
| desk_tidy / 책상 위 정리 | 일일·변동후보 | home/stage0/그룹없음 | 책상 위에 있는 것들을 제자리에 두어요. 정리한 책상을 찍어 주세요. | H | PH(1장) | 100XP/30코인/없음 | 배정경로있음(조건부) |
| stretch / 스트레칭 5분 | 일일·변동후보 | home/stage0/그룹없음 | 일어나서 5분 동안 몸을 쭉 펴 봐요. 다 했으면 눌러 주세요. | H | SELF | 50XP/10코인/없음 | 배정경로있음(조건부) |
| situps / 윗몸일으키기 20회 | 일일·변동후보 | home/stage0/그룹없음 | 천천히 20번. 힘들면 나눠서 해도 괜찮아요. | H | SELF | 50XP/10코인/없음 | 배정경로있음(조건부) |
| squats / 스쿼트 20회 | 일일·변동후보 | home/stage0/그룹없음 | 의자 앞에서 앉았다 일어나기 20번. 무릎이 발끝을 넘지 않게. | H | SELF | 50XP/10코인/없음 | 배정경로있음(조건부) |
| pushups / 팔굽혀펴기 10회 | 일일·변동후보 | home/stage0/그룹없음 | 무릎을 대고 해도 좋아요. 10번이면 완료! | H | SELF | 50XP/10코인/없음 | 배정경로있음(조건부) |
| plank / 플랭크 30초 | 일일·변동후보 | home/stage0/그룹없음 | 팔꿈치를 대고 몸을 일자로 30초 버텨요. | H | SELF | 50XP/10코인/없음 | 배정경로있음(조건부) |

### 4.4 찾아보기23개 — 현재미배정

| ID/제목 | 기간·유형 | 분류/단계/그룹 | 설명·행동기준 | 배정·제외 | 코드확인 | 보상 | 현재사용 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| local_food / 우리 동네 맛집 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 사는 동네 맛집을 직접 찾아보고 몇 곳 적어 올려요. 끌리는 곳이 있으면 다음엔 가 봐요! | 현재배정없음;answer필요: 사는 동네가 어디예요? | LS(3) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| movies / 요즘 상영 영화 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 요즘 극장에서 하는 영화를 찾아보고 세 편 이상 적어봐요. | 현재배정없음 | LS(3) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| music / 좋아하는 음악 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 좋아하는 장르의 음악을 직접 찾아 듣고 세 곡 이상 적어봐요. | 현재배정없음;answer필요: 좋아하는 음악 장르는? | LS(3) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| cafes / 가 보고 싶은 카페 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 동네에서 가 보고 싶은 카페를 세 곳 찾아 적어요. | 현재배정없음;answer필요: 사는 동네가 어디예요? | LS(3) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| bakeries / 동네 빵집 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 근처 빵집을 세 곳 찾아 적어요. | 현재배정없음;answer필요: 사는 동네가 어디예요? | LS(3) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| walk_course / 산책 코스 짜 보기 | 일일·변동후보 | explore/stage0/그룹없음 | 집에서 출발하는 30분 산책 코스를 지도에서 찾아 들를 곳 세 군데를 적어요. | 현재배정없음 | LS(3) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| festival / 동네 행사 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 이번 달 동네 축제나 행사를 찾아 세 개 적어요. | 현재배정없음;answer필요: 사는 동네가 어디예요? | LS(3) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| exhibitions / 무료 전시 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 가까운 곳의 무료 전시나 공연을 세 개 찾아 적어요. | 현재배정없음 | LS(3) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| library_program / 도서관 프로그램 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 가까운 도서관에서 하는 강좌·모임을 찾아 세 개 적어요. | 현재배정없음 | LS(3) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| hobbies / 배우고 싶은 취미 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 해 보고 싶은 취미를 세 가지 찾아 적어요. | 현재배정없음 | LS(3) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| classes / 원데이 클래스 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 가까운 원데이 클래스(공방, 요리, 운동…)를 세 개 찾아 적어요. | 현재배정없음 | LS(3) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| gyms / 가까운 운동 시설 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 구민체육센터나 공원 운동기구 같은 곳을 세 군데 찾아 적어요. | 현재배정없음 | LS(3) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| fruits / 제철 과일 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 지금이 제철인 과일을 세 가지 찾아 적어요. | 현재배정없음 | LS(3) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| recipes / 해 보고 싶은 요리 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 만들어 보고 싶은 간단한 요리를 세 개 찾아 적어요. | 현재배정없음 | LS(3) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| books / 요즘 인기 책 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 요즘 많이 읽는 책을 세 권 찾아 적어요. | 현재배정없음 | LS(3) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| trips / 가 보고 싶은 곳 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 당일치기로 가 볼 만한 곳을 세 군데 찾아 적어요. | 현재배정없음 | LS(3) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| markets / 동네 시장 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 가까운 시장이나 장터를 찾아 적고, 열리는 날도 같이 적어요. | 현재배정없음;answer필요: 사는 동네가 어디예요? | LS(2) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| volunteer / 봉사활동 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 가까운 곳에서 할 수 있는 봉사활동을 두 개 찾아 적어요. | 현재배정없음 | LS(2) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| youth_center / 동네 청년·주민 센터 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 가까운 청년센터나 주민센터 프로그램을 두 개 찾아 적어요. | 현재배정없음;answer필요: 사는 동네가 어디예요? | LS(2) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| weekend_plan / 주말에 갈 곳 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 주말 날씨를 확인하고 가 볼 만한 곳을 두 군데 적어요. | 현재배정없음 | LS(2) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| podcasts / 들어 볼 팟캐스트 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 관심 가는 팟캐스트나 라디오를 세 개 찾아 적어요. | 현재배정없음 | LS(3) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| dramas / 볼 만한 드라마 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 요즘 볼 만한 드라마를 세 편 찾아 적어요. | 현재배정없음 | LS(3) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| snacks / 먹어 보고 싶은 간식 찾아보기 | 일일·변동후보 | explore/stage0/그룹없음 | 편의점이나 동네 가게에서 먹어 보고 싶은 간식을 세 개 적어요. | 현재배정없음 | LS(3) | 100XP/30코인/없음 | 로드만됨·자동미배정 |

### 4.5 기록11개 — 현재미배정

| ID/제목 | 기간·유형 | 분류/단계/그룹 | 설명·행동기준 | 배정·제외 | 코드확인 | 보상 | 현재사용 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| grateful / 감사한 일 세 가지 | 일일·변동후보 | record/stage0/그룹없음 | 오늘 고마웠던 일을 세 가지 적어요. 아주 작은 것도 좋아요. | 현재배정없음 | LS(3) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| mood_word / 오늘 기분 한 단어 | 일일·변동후보 | record/stage0/그룹없음 | 오늘 기분을 한 단어로 적어요. | 현재배정없음 | TX | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| good_moment / 오늘 좋았던 순간 | 일일·변동후보 | record/stage0/그룹없음 | 오늘 가장 좋았던 순간 하나를 적어요. | 현재배정없음 | TX | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| tomorrow / 내일 하고 싶은 일 하나 | 일일·변동후보 | record/stage0/그룹없음 | 내일 해 보고 싶은 일을 하나만 적어요. | 현재배정없음 | TX | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| ate_today / 오늘 먹은 것 적기 | 일일·변동후보 | record/stage0/그룹없음 | 오늘 먹은 것들을 적어요. | 현재배정없음 | LS(1) | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| week_win / 이번 주 잘한 일 | 일일·변동후보 | record/stage0/그룹없음 | 이번 주에 잘한 일 하나를 적어요. | 현재배정없음 | TX | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| interest / 요즘 관심 있는 것 | 일일·변동후보 | record/stage0/그룹없음 | 요즘 궁금하거나 관심 가는 걸 적어요. | 현재배정없음 | TX | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| childhood / 어릴 때 좋아했던 것 | 일일·변동후보 | record/stage0/그룹없음 | 어릴 때 좋아했던 놀이나 음식을 적어요. | 현재배정없음 | TX | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| wish_place / 언젠가 가 보고 싶은 곳 | 일일·변동후보 | record/stage0/그룹없음 | 언젠가 꼭 가 보고 싶은 곳을 적어요. | 현재배정없음 | TX | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| today_song / 오늘의 노래 | 일일·변동후보 | record/stage0/그룹없음 | 오늘 들은 노래 중 하나를 적어요. | 현재배정없음 | TX | 100XP/30코인/없음 | 로드만됨·자동미배정 |
| small_change / 어제와 달라진 것 하나 | 일일·변동후보 | record/stage0/그룹없음 | 어제와 다르게 해 본 것을 하나 적어요. | 현재배정없음 | TX | 100XP/30코인/없음 | 로드만됨·자동미배정 |

### 4.6 연결11개

| ID/제목 | 기간·유형 | 분류/단계/그룹 | 설명·행동기준 | 배정·제외 | 코드확인 | 보상 | 현재사용 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c1_guestbook_read / 친구 방명록 읽어 보기 | 일일·변동후보 | connect/stage1/그룹없음 | 친구 방에 놀러 가서 방명록을 읽어 봐요. 마음에 든 글을 한 줄 적어 주세요. | S1 | TX | 100XP/30코인/없음 | 배정경로있음(조건부) |
| c1_room_like / 이웃 방에서 마음에 든 것 찾기 | 일일·변동후보 | connect/stage1/그룹없음 | 이웃 방을 구경하고 마음에 든 물건이나 꾸밈을 적어 봐요. | S1 | TX | 100XP/30코인/없음 | 배정경로있음(조건부) |
| c1_family_meal / 가족과 한 끼 같이 먹기 | 일일·변동후보 | connect/stage1/그룹없음 | 같은 상에서 한 끼 먹어요. 무엇을 먹었는지 적어 주세요. / tip: 대화할 때 휴대폰은 잠깐 내려놓아요. | S1;living:family필요 | TX | 100XP/30코인/없음 | 배정경로있음(조건부) |
| c2_greet / 짧은 인사 한마디 | 일일·변동후보 | connect/stage2/그룹없음 | 가게 직원·경비원·이웃에게 "안녕하세요" 한마디. 누구에게 했는지 적어 주세요. / tip: 눈을 잠깐 보고 짧게. 대답이 없어도 괜찮아요. | S2 | TX | 100XP/60코인/없음 | 배정경로있음(조건부) |
| c2_thanks / 고마움 한마디 전하기 | 일일·변동후보 | connect/stage2/그룹없음 | 가족·친구·가게 직원 누구든, 고마웠던 걸 말이나 메시지로 전해요. 무엇을 전했는지 적어 주세요. / tip: 무엇이 고마웠는지 하나만 구체적으로 말해 보세요. | S2 | TX | 100XP/40코인/없음 | 배정경로있음(조건부) |
| c2_family_talk / 가족에게 오늘 있었던 일 한마디 | 일일·변동후보 | connect/stage2/그룹없음 | 저녁에 가족에게 오늘 있었던 일을 하나 이야기해 봐요. 어떤 이야기를 했는지 적어 주세요. / tip: 내 얘기만 하지 말고 질문을 하나 해 보세요. | S2;living:family필요 | TX | 100XP/40코인/없음 | 배정경로있음(조건부) |
| c2_pet_neighbor / 강아지 산책하며 이웃과 인사 | 일일·변동후보 | connect/stage2/그룹없음 | 산책길에 만난 이웃이나 다른 보호자에게 인사해 봐요. 어땠는지 적어 주세요. / tip: 눈을 잠깐 보고 짧게. 대답이 없어도 괜찮아요. | S2;pets:dog필요 | TX | 100XP/60코인/없음 | 배정경로있음(조건부) |
| c3_interest_q / 관심사 질문 남기기 | 일일·변동후보 | connect/stage3/그룹없음 | 친구 방명록에 요즘 관심 있는 걸 묻는 질문을 남겨 봐요. 남긴 질문을 적어 주세요. / tip: 처음엔 내 이야기를 너무 많이 하지 않기. 날씨·주변 이야기처럼 가벼운 것부터. | S3 | TX | 100XP/50코인/없음 | 배정경로있음(조건부) |
| c3_reply / 받은 방명록에 답하기 | 일일·변동후보 | connect/stage3/그룹없음 | 내 방에 남은 글에 답을 남겨 봐요. 어떻게 답했는지 적어 주세요. / tip: 상대 말에 한 번 맞장구치고, 질문을 하나 덧붙여 보세요. | S3 | TX | 100XP/50코인/없음 | 배정경로있음(조건부) |
| c3_regular_shop / 늘 가던 가게에서 한마디 더 | 일일·변동후보 | connect/stage3/그룹없음 | 자주 가는 가게에서 인사에 한마디를 더해 봐요. "오늘 덥네요"처럼요. 무슨 말을 했는지 적어 주세요. / tip: 처음엔 내 이야기를 너무 많이 하지 않기. 날씨·주변 이야기처럼 가벼운 것부터. | S3 | TX | 100XP/70코인/없음 | 배정경로있음(조건부) |
| c3_check_in / 먼저 안부 보내기 | 일일·변동후보 | connect/stage3/그룹없음 | 한동안 연락 안 한 친구나 가족에게 먼저 안부 메시지를 보내요. 누구에게 보냈는지 적어 주세요. / tip: 내 얘기만 하지 말고 질문을 하나 해 보세요. | S3 | TX | 100XP/50코인/없음 | 배정경로있음(조건부) |


### 4.7 주간1개·월간 없음·특별 지급

| ID/제목 | 주기·유형 | 분류/그룹 | 조건·확인 | 보상 | 사용 |
|---|---|---|---|---|---|
| nature_walk / 이번 주 자연 속 산책2번 | 주간·별도제출 | outdoor/그룹없음 | 자연산책사진을서로다른2일제출. 소유사진≥1/일＋촬영일규칙. 자연인지분석안함 | 200XP/100코인,주월요일기준1회 | `/weekly`/`weekly/{id}/complete` |
| sky / 하루 펭귄 모찌 | 특별캐릭터(미션아님) | 별도그룹없음 | 같은날변동전체완료 all_done | sky무료,별도숫자코인보너스없음 | settle_coins→grant_free_items→shop.free_grants |

현재 월간목표 목록/라우트는 없다. 구 `backend-neighbor-level`의 월간 구현을 현재API로 소개하지 않는다. `backend/scripts/seed_demo.py`·tests는 시연/검증 데이터이며 실제 사용자 수행으로 세지 않는다. 기존DB에 미배정 옛미션이 남았는지는 미확인이다.

## 5. 미션 운영 규칙 비교

| 주제 | 프론트 실제 동작 | 서버 실제 동작 | 근거·차이 |
|---|---|---|---|
| 최초배정/유지 | 날짜별activities를한번저장,날짜해시,옛지급슬롯무보상이관 | 저장된mission_day우선,없으면사용자ID+날짜seed | dailyMissions:ensureDailyMissions / main:todays_missions. 배정주체·ID·seed다름 |
| 초기질문 | 활동/시간/제외3개,건너뛰기 | 직업/동거/반려동물/외출빈도/관심사/일상6개,건너뛰기 | missionGuidance:PREFERENCE_QUESTIONS / survey:QUESTIONS |
| 선호반영 | 친숙함순위·시간·제외우선,연락은명시관심 | 외출빈도는걸음미기록시,requires는동거/반려동물. 관심/일상은순위에아직안씀 | eligibleMission/recommendMissions 대 fits/pick_missions |
| 부담응답 | easy/okay/hard. 최근ID/그룹의hard를다음신규추천후순위,보상동일 | mood1~5/text/expected저장. 배정/교체가피드백을읽지않음 | feedback형식·의미·반영미합의 |
| 자동상승 | 완료횟수로올리지않음,신규effort≤1 | 현재단계누적3회완료→다음단계(최대3);어제적게걸으면move배정만일시1단계낮춤 | ladder_progress. 사다리자동개방은현재프론트와충돌 |
| 익숙2+확장1 | 친숙우선/3번째미사용목적우선,엄격2+1보장없음 | move/home/connect각1개 | 기획방향과실제보장구분 |
| 다른활동 | 카테고리넘기허용,현재부담/시간이하,현재/다른슬롯/완료/넘긴유사그룹제외 | 동일슬롯·단계(부족시하위)에서현재목록ID제외,하루성공3회 | replacementCandidates 대 reroll. 서버에유사그룹/상대부담검사없음 |
| 넘긴이력/소진 | 날짜별passed/replacements저장. 소진안내와명시적다시보기. 다시봐도제외/완료/다른슬롯중복금지 | 최근2개mission_day우선회피,없으면재사용. 오늘넘긴이력없음,409소진/429횟수소진 | 서버는A→B→A가능. recent_mission_ids는today제외 |
| 보류/시작 | paused/started저장. 시작무보상,재시작보류해제 | 시작/보류API·상태없음 | 서버목록은done/feedback/rerollable |
| 완료/수령 | 해냈어요!/사진저장성공에완료+보상. 고정은기능성공 | complete가판정+지급. 시작기록요구없음 | 별도일반수령API없음 |
| 서울자정 | seoulDateKey,웹1초+visibility/모바일1초+AppState | seoul_today UTC+9,요청시 | 날짜기준일치. 서버override는별도문제 |
| 자정넘긴제출 | finish는제출순간서울날짜의배정/시작검사. 사진은화면date현재일치. 일기는초안이어쓰기선택 | date없으면현재서울날짜,있으면그날짜. 일기는entry_date | 시작일/제출일/유예계약없음. 미세UI경계는미실행 |
| 일기수정/재작성 | 당일수정,과거읽기/삭제,당일삭제후재작성가능. 지급·날짜원장유지 | 당일만수정검사없어과거/미래URL날짜도코드상허용. 삭제날짜재작성409 | journal:saveJournal/deleteJournal 대 put_diary/db.diary_deleted |
| 일기선행저장 | 어디서저장해도recordRoutine직접완료. 과거원장이관무보상 | auto_complete는이미mission_day있는날만처리,없으면자동완료없음 | with_status도일기를조회해보정안함 |
| 사진 | 진행슬롯·기기저장·imageMIME·10MB검사. EXIF/내용검증없음 | 소유ID/개수/촬영일검사. EXIF없음허용. 다른미션사용사진ID배제없음 | 같은증거재사용정책필요 |
| 걸음 | 1/5/10분선택후자기확인. 센서/API없음 | steps테이블값,업로드는임의정수/date upsert | 센서기반자동인증과다름 |
| 중복 | 날짜:ID완료＋날짜:slot영수증,교체시유지 | ledger PK(user_id,date,item_id),INSERT OR IGNORE | 서로다른장부라양쪽동시지급은막지못함 |
| 주간 | outside2/connect2/일기3날자동집계후수령 | 자연사진2날별도POST | 목표·증거·보상다름 |
| 월간 | outside8/일기10날자동집계후수령 | 없음 | 서버계약없음 |
| 펭귄 | 입력제외activityRecords누적10개,사진포함,날짜달라도가능 | 당일변동전체완료 | 조건충돌 |
| 미접속 | 퀘스트·재화감소없음 | 14일이상(휴식기간제외)뒤현레벨내XP를0으로돌리는음수원장. 레벨/코인유지 | main:comeback_reset/todays_missions. 기획과별도합의필요 |

근거 브랜치·커밋은1절. 일기원장집계는 `challenges:goalProgress`/`journal:journalDates`, 서버주간은 `weekly_status/complete_weekly`다. 일기를 삭제해도 프론트의 일기 목표 날짜 집계는 최소 날짜원장을 포함하며 달력스탬프는 실제본문이 있는 날만 표시한다.

웹 `App:commitGame`은 일기/사진/교체/출석에서 저장성공 후 상태를 적용하지만 일반 활동완료·주월수령은setGame 후effect저장이고 실패를빈catch로넘기는경로가 남아 있다. 모바일 `useGameState:commitState`는AsyncStorage저장큐를쓰지만 일반updateGame→autosave도있다. 모든완료의영구저장을보장한다고보고하면안된다. 여러탭/동시요청/저장경합은미검증이다.

웹 방명록은타인샘플방글저장성공후onPosted로루틴을별도기록한다. 모바일은visitNotes와recordRoutine을같은commitState에담는다. 샘플방명록은sample-neighbor-local,현실교류는real-world-self-report채널로구분하며방명록을썼다고오늘연락미션을자동교체하지않는다. 실제전달/관계개선의검증이아니다.

## 6. 보상·성장·구매 연결

### 6.1 보상표

| 항목 | 프론트 현UI | 서버 |
|---|---|---|
| 일반/사진변동 | 15XP/25코인,ID최초기록이면+5XP | outdoor100XP/50코인,그외100XP/30코인. stage2+10/stage3+20코인 |
| 자기확인운동 | 일반자기확인과동일 | self50XP/10코인 |
| 일기 | 15XP/25코인,최초보너스없음 | 100XP/40코인 |
| 방명록 | 0/0,정책대기·완료만 | 100XP/30코인 |
| 방문 | 별도보상미션없음 | 100XP/30코인 |
| 출석 | 코인10/20/30 또는XP5/8/10 또는의상/소품. 실제1개만 | 10XP+10코인,동일attendance장부 |
| 출석중복아이템 | 30코인대체 | 무작위아이템출석없음 |
| 주간 | 각30XP/30코인×3 | 자연사진200XP/100코인×1 |
| 월간 | 각60XP/60코인×2 | 없음 |
| 전체완료 | 전체6개보너스없음 | 당일변동전체완료시sky,별도숫자코인보너스없음 |
| 일일제한 | 변동3슬롯각1회+고정별기록. 구previewReward3회제한은현UI미사용 | 고정5~6+변동3. 하루교체3회는보상3회제한아님 |
| 신규자금 | initialGame90코인/0XP, demo:true540별도 | db.create_user는초기코인장부없음→0. seed_demo는별도 |

근거: `dailyMissions:dailyReward/recordRoutine`, `game:ensureAttendanceWeek/claimAttendance/claimGoal/initialGame`, `missions:Mission.coins/Mission.xp/settle_coins`, `main:finish_and_pay`, `db:create_user/coin_balance`.

출석 신규계획은의상10%/소품10%/기본후보80%의roll을쓰지만직전날과완전히같으면다른보상으로보정하므로최종분포가각날독립10/10/80이라고단정하면안된다. 과거XP20/35/50은호환허용값이고신규XP후보는5/8/10이다. `randomAttendanceReward`는정의만남고현UI는주간계획을쓴다.

서버PK는중복장부를막지만 `finish_and_pay`의계산·완료저장·장부저장은여러commit이다. 동시에온두응답이모두earned를표시하는지까지보호된것으로단정할수없다. 실제동시성검사는하지않았다.

### 6.2 레벨

- 프론트 `game:levelFor`: `1+floor(xp/100)`.
- 서버 `missions:xp_for_next/level_from_xp`: LV.n→n+1은 `100+150×(n−1)`. LV.L까지누적은 `100(L−1)+75(L−1)(L−2)`.

| LV | 프론트누적XP | 서버누적XP |
|---|---|---|
| 3 | 200 | 350 |
| 4 | 300 | 750 |
| 5 | 400 | 1,300 |
| 8 | 700 | 3,850 |
| 12 | 1,100 | 9,350 |
| 25 | 2,400 | 43,800 |

같은누적400XP라도프론트LV.5/서버LV.3이다. 기존사용자를그대로옮기면해금권한이후퇴할수있다. 이번에는장기진행시간/실제플레이경제를실행검증하지않았다.

### 6.3 캐릭터 조건/가격

| ID | 이름 | 프론트조건 | 서버조건 |
| --- | --- | --- | --- |
| potato | 꼬질 감자 | 기본무료 | 기본무료 |
| sky | 하루 펭귄 모찌 | 활동누적10회무료 | 당일변동전체완료무료 |
| pink | 복숭아 토끼 | LV.3무료 | LV.3무료(서버LV) |
| proto-pebble | 버터 곰 | LV.4 / 120코인 | 서버상품없음 |
| mochi | 구름 모찌 | LV.5 / 300코인 | LV.5 / 300코인 |
| proto-pear | 살구 강아지 라니 | LV.7 / 150코인 | 서버상품없음 |
| lavender | 달빛 양 | LV.8 / 450코인 | LV.8 / 450코인 |
| proto-quilt | 솜귀 고양이 루루 | LV.10 / 150코인 | 서버상품없음 |
| mint | 새잎 거북 모찌 | LV.12 / 600코인 | LV.12 / 600코인 |
| draft-duck | 버블 오리 포포 | LV.15 / 300코인 | 서버상품없음 |
| draft-deer | 잎귀 사슴 메루 | LV.20 / 350코인 | 서버상품없음 |
| draft-hedgehog | 밤톨 고슴도치 도토 | LV.25 / 375코인 | 서버상품없음 |


프론트12종/서버6종이다. 신규6종ID를서버구매에바로보내면없는상품이된다. 기존일부가격·ID가같아도레벨공식때문에구매시점이다르다. 의상/가구도별도카탈로그로연결전전수ID·가격합의가필요하다. 양쪽구매시레벨/코인/중복보유검사,구매와장착분리는일치한다.

근거: `shared/data/characters.js`, `features/finalFriends.js`, `game:buyCharacter`, `wardrobeActions:buyOutfit`, `backend/app/data/shop.json`, `shop:buy_problem/free_grants`.

### 6.4 단순연결시 중복/속도 위험

1. 로컬지급함수를실행한뒤서버완료를호출하면두장부각각지급된다. 서버earned를로컬잔액에또더하면화면이재증가할수있다.
2. 서버일기/방명록성공이자동완료보상을돌려줄수있다. 이후complete를또호출할때UI는이미처리한보상결과를다시적용하면안된다.
3. day-*와서버ID가달라제목매칭으로이관할수없다. 최초5XP/슬롯/완료키도별도다.
4. 레벨공식·출석·시작자금·펭귄·미접속XP감소정책이달라진다. 로컬자산을서버계정에임의자동병합하면안된다.

## 7. 실제 API 계약과 연결 상태

`U=/users/{backendUserId}`. 아래 응답은 관련 핵심 필드이며 실제 배포 계약을 호출해 검증한 것은 아니다. 일반 오류는 `{detail:...}`이고 스키마422는 detail 배열일 수 있다.

**호출 상태:** 현재 런타임 검색에서 `/auth/supabase` 계정 연결 외 게임 API 호출을 찾지 못했다. `requestUser`는 준비된 함수이지만 앱 화면에서 호출하지 않는다. 테스트의 모의fetch와 문서 예시는 실제 게임 연결로 세지 않았다. 모바일 실제Google/서버/실기기 로그인 성공도 이번에는 미확인이다. 웹 소셜 인증 어댑터는 미연결이다.

**인증 범위:** `/auth/supabase`만Bearer를 검증한다. 아래 일반 게임 API는 `Depends(get_conn)`로DB만 받고 토큰-경로사용자ID 소유자 대조가 없다. 표에서 ‘보호 없음’은 저장소의 이 서버 구현 기준이며 실제 배포 프록시/별도 인증계층은 미확인이다.

| 메서드·경로 | 요청 | 응답 핵심 | 현재 프론트 처리 / 서버 함수 |
|---|---|---|---|
| POST /auth/supabase | Bearer토큰,기존{} / 신규{nickname} | 200/201 `{user:{id,nickname,…},created}`. 정확한신규404 detail만닉네임분기 | 모바일연결코드있음·실서버미검증 / login_supabase,backendClient:link |
| GET U/missions/today | date선택 | date,stayed_home,missions[{id,title,desc,kind,min_count,coins,xp,stage,requires,done,feedback,rerollable,…}],done_count,rerolls_left,ladder | 미호출·로컬ensureDailyMissions / get_missions_today,with_status |
| POST U/missions/{id}/reroll | 본문없음,date선택 | replaced,mission,갱신missions/done_count/rerolls_left;409/429 | 미호출·replaceDailyMission / reroll_mission |
| POST U/missions/{id}/complete | `{text?,photos?:photo_id[],items?:string[],answer?}`;steps/self/checkin은{}가능 | mission_id,earned[],earned_total,earned_xp,coins,level,leveled_up,new_items,all_done,care,ladder,stage_up | 미호출·finishDailyMission / complete_mission,finish_and_pay,rewards |
| GET U/ladder | 없음 | move/connect:{stage,name,done,need,top} | 미호출·사다리UI없음 / get_ladder |
| PUT U/missions/{id}/feedback | `{mood?:1~5,text?:≤200자,expected?:1~5}`;mood/text중1개,완료필수,date선택 | mission_id,date,mood,text,expected,care | 미호출·easy/okay/hard로컬 / put_feedback |
| GET U/feedback | from,to필수 | `{feedback:[날짜/ID/기분/글/예상/제목…]}` | 미호출 / list_feedback |
| GET U/weekly | date선택 | week_start,week_end,quests[{id,title,goal_days,done_days,progress,completed,done_today,coins,xp,…}] | 미호출·GOALS / get_weekly |
| POST U/weekly/{id}/complete | `{photos:photo_id[]}`,date선택 | quest,earned[],earned_total,earned_xp,coins,level,leveled_up,new_items | 미호출·프론트주간은별도사진제출안함 / complete_weekly |
| POST U/attendance | 본문없음,date선택 | date,already_checked_in,공통보상응답 | 미호출·claimAttendance+recordRoutine / check_in |
| POST U/steps | `{date:YYYY-MM-DD,steps:정수≥0}` | user_id,date,steps | 미호출·센서연결없음 / post_steps |
| POST U/photos | multipart file(jpeg/png/webp/heic/heif,≤10MB),date선택 | `{photo_id,url:'/photos/{id}'}` | 미호출·IndexedDB/기기폴더 / upload_photo |
| GET /photos/{photo_id} | 없음 | FileResponse이미지 | 미호출·현재로컬blob/uri / get_photo,토큰소유검사없음 |
| GET U/album | from/to선택,page기본0,per_page기본30(최대100) | photos[{photo_id,url,date,used_for,uploaded_at}],total,page,per_page | 미호출·albumPhotos / get_album |
| GET U/album/months | 없음 | `{months:월별집계}` | 미호출 / get_album_months,db.album_months |
| DELETE U/photos/{photo_id} | 없음 | `{deleted:photo_id}`,이미받은보상유지 | 미호출 / delete_photo,경로ID기준사진소유검사 |
| GET U/diary/topic | date선택 | date+주제id/text등 | 미호출·shared/data/diaryPrompts.js / get_diary_topic |
| PUT U/diary/{entry_date} | `{text:1~2000,use_topic?:false,mood?:≤20자,photos?:[]}` | entry+topic,completed_missions,earned,new_items,coins,level,leveled_up,care | 미호출·saveDiaryMission / put_diary,auto_complete |
| GET U/diary/{date} | 없음 | 날짜/본문/감정/사진/주제/저장필드+topic,없으면404 | 미호출·game.journals / get_diary_entry |
| GET U/diary | from,to필수 | `{entries:[일기+topic]}` | 미호출·로컬목록/달력 / list_diary |
| DELETE U/diary/{date} | 없음 | `{deleted:date}`;해당날짜이후재작성409 | 미호출·deleteDiaryMission / delete_diary |
| GET U/diary/export | from,to필수 | txt다운로드 | 미호출·설정JSON백업은별개 / export_diary |
| POST /users/{방주인}/visits | `{visitor_id:방문자backendID}`,date선택 | owner_id,visitor_id,date,first_visit_today,completed_missions,earned,new_items,coins,level,leveled_up,friendship | 미호출·샘플방문 / post_visit,auto_complete |
| GET U/visits | date선택 | `{owner_id,date,visitors:[id,nickname]}` | 미호출 / get_visits |
| GET U/rooms/recommended | date선택,limit기본5(1~20) | my_level,rooms[{id,nickname,level,level_diff,similar,…}] | 미호출·샘플12명중일일3명 / recommended_rooms |
| GET /users/{방주인}/guestbook | page0,per_page4(최대50),viewer_id선택 | entries[글+likes/liked] | 미호출·로컬글 / get_guestbook |
| POST /users/{방주인}/guestbook | `{author?:≤20,text:1~60,author_id?:작성자backendID}`,date선택 | entry+completed_missions/earned/coins/level/new_items/friendship;작성자없거나자기방은자동완료없음 | 미호출·로컬저장성공후루틴 / post_guestbook |
| POST /users/{방주인}/guestbook/{entry_id}/like | `{user_id:반응자ID}` | entry_id,likes,liked | 미호출·로컬좋아요 / like_guestbook |
| DELETE /users/{방주인}/guestbook/{entry_id}/like | by=반응자ID | entry_id,likes,liked | 미호출 / unlike_guestbook |
| DELETE /users/{방주인}/guestbook/{entry_id} | by=삭제요청자ID | `{deleted:entry_id}`;방주인/작성자ID문자열대조 | 미호출 / delete_guestbook |
| GET U/coins | 없음 | `{user_id,coins}` | 미호출·game.coins / get_coins |
| GET U/level | 없음 | user_id,level,xp,xp_in_level,xp_to_next,xp_for_level | 미호출·levelFor / get_level |
| GET U/home | date선택 | steps,step_goal,coins,level,equipped,room,checked_in,missions_done/total,bubble,welcome_back | 미호출·로컬홈 / get_home |
| GET U/shop | 없음 | 캐릭터/의상/소품/보유/장착/배치/구매상태 | 미호출·로컬카탈로그 / get_shop,shop_view |
| POST U/shop/buy | `{type:character/outfit/decor,item_id}`,date선택 | `{bought:{type,id,name,price},coins}` | 미호출·로컬구매 / buy |
| PUT U/equipped / PUT U/decor | `{character_id?,outfit_id?}` / `{slot,item_id:null가능}` | 장착/배치결과 | 미호출·로컬장착/배치 / equip,place_decor |
| GET /survey/questions | 없음 | `{questions:[…]}` | 미호출·별도3질문 / survey_questions |
| PUT U/survey / GET U/survey | PUT:`{answers:{질문ID:답}}` | answers,done,GET은updated_at포함 | 미호출·선호로컬 / put_survey,get_survey |

월간·시작·보류·넘긴활동다시보기 전용API는없다. 보상은완료/일기/방명록/출석/주간응답에포함되며일반‘보상만받기’API는없다. 경로·요청·응답근거는모두 `backend/app/main.py`의표기함수다. 실제화면미호출근거는양쪽App/화면과 `shared/api/backendClient.mjs`·`auth/authBackendController.mjs:requestUser`의호출추적이다.

### 7.1 인증·권한 확인 결과

- `backend/app/auth.py:supabase_user_id/verify_on`은SUPABASE_URL·SUPABASE_KEY가모두있을때Supabase `/auth/v1/user`로Bearer검증한다. 없으면개발경로에서본문supabase_id를믿는다. 프론트는가짜ID를보내우회하지않고서버설정오류를표시한다.
- `main.py:login_supabase`는검증SupabaseID를서버user.id로연결한다. 프론트는정확한신규회원404만닉네임으로분기하고일반route404·네트워크실패를가입으로처리하지않는다.
- `authBackendController:requestUser`는현재backendID와최신토큰을쓰고로그아웃/계정변경시이전ID·늦은결과를버리도록준비돼있다. **이클라이언트방어는서버권한검사가아니다.**
- 일기목록/수정/삭제API는경로ID와로그인주체의대조가없다. `/photos/{id}`도사진ID로파일을돌려준다. check_photos는지정한user_id의사진인지만검사한다. 그ID가요청자본인인지는검사하지않는다. by/visitor_id/author_id/좋아요user_id도토큰에서유도하지않는다.
- 관리자API의X-Admin-Token은별도보호이며일반사용자API보호를대체하지않는다. CORS역시인증이아니다. 코드상기본CORS는5173/8081로현재5180허용운영설정은확인필요다.
- 조사한로컬파일에는VITE_API_URL/EXPO_PUBLIC_API_URL설정이없고backend/.env도없다. 프로세스/EAS/배포환경주입값은확인하지않았다. 실제값을출력하지않았고실서버로그인성공을보고하지않는다.

### 7.2 일기/자동완료/사진 예외

1. `DiaryIn`의min_length는strip이전이다. 코드상공백글이스키마를통과한후빈본문으로저장될수있어보인다. `is_complete`는공백을불인정해보상은없다. 실행재현이아닌정적판단이다.
2. `auto_complete`는기존mission_day만순회한다. 일기/방명록/방문을첫미션조회보다먼저수행하면자동완료가없을수있고 `with_status`도기능기록을읽어사후보정하지않는다.
3. `check_taken_today`는촬영일미기록을현재허용하며내용·위치·자연사진여부는분석하지않는다. `tag_photos`도다른미션사용사진을금지하지않고태그를덮어쓴다.
4. `screen_text`는서버일기/글미션/소감의키워드검사와care반환·신호분류저장을한다. 현재로컬프론트일기는호출하지않으며최근도움안내는본문과무관한외부링크다. 서버일기연결시개인정보안내/범위를다시합의해야한다. 전문진단·교수님보증으로설명하면안된다.

## 8. 문서·주석의 오래된 설명

| 설명 | 현재 구현 |
|---|---|
| backend/FRONTEND_GUIDE의프론트오늘8개/가짜걸음/샘플8개휘발 | 프론트고정3+변동3,가상걸음제거,샘플이웃12명/로컬영속글 |
| missions.py의프론트동일100XP/30코인 | 프론트15XP/25코인,서버별도 |
| 서버‘하루최대3개’ | 고정5~6+변동3 |
| 서버삭제후재작성금지가앱과같다는주석 | 현재앱당일재작성허용,서버금지 |
| 구completeQuest의80자/하루3회 | 현일기2,000자/현6미션슬롯과다름 |
| 서버상품이프론트와같다는주석 | 캐릭터12대6,레벨공식차이 |

위파일을고치지는않았고현재코드의동작을기준으로기록했다.

## 9. 팀 협의 결론

### 이미 일치하는 부분

- 서울날짜기본값,당일배정목록보존,완료미션교체금지,동일미션/날짜재지급방지기록.
- 일기/방명록기능성공과미션을연결하려는구조,개별완료보상,구매/장착분리.
- 동일한기존캐릭터일부ID와무료획득방향. 구체수치/조건은앞표처럼다름.

### 충돌하거나 연결이 빠진 부분

6개대8~9개,ID/분류/단계/선호/교체/부담피드백,출석/보상/레벨/주월/펭귄/미접속감소,일기과거수정/재작성/자정귀속/선행작성처리,게임API·자산동기화·신규상품·서버소유자검사.

### 프론트에서 수정할 부분 (팀정책 확정 이후, 이번에 미구현)

- 확정된API미션/상품ID와화면모델·선호스키마매핑. 제목매칭이나서버응답추측으로연결하지않기.
- 서버가최종지급주체라면현로컬지급과중복되지않게분리하고서버확정결과만반영하기.
- 일기/방명록자동완료결과와재시도·실패·중복클릭처리연결,사진/걸음/이웃실제연동범위구분.
- 주월UI·선호질문·교체소진UI를합의안에맞추고기존자산·기록의이관/백업정책적용.
- 현UI가사용하지않는옛함수와오래된문서를현재규칙과구분해정리하기.

### 백엔드 담당자와 결정/확인할 질문

| 질문 | 현재 프론트 | 현재 서버 | 필요한 자료/결정 |
|---|---|---|---|
| 최종고정/변동구성? | 3+3 | 5~6+3 | 걸음/방문고정유지여부,최종ID목록 |
| 배정·선호·부담의주체? | 로컬3질문/시간/제외/hard순위 | 서버6설문/사다리/생활조건 | 승인된추천규칙·설문JSON·피드백매핑 |
| 교체/소진/다시보기? | 그룹/넘긴이력,명시다시보기 | 같은슬롯/단계,하루3회,재등장가능 | 횟수/활동그룹/소진응답/다시보기계약 |
| 최종보상·성장·펭귄? | 15/25·100XP단위·누적펭귄 | 100/30~70·증가형XP·당일전체펭귄 | 최종보상표,기존레벨/해금보존이관안 |
| 일기삭제/과거수정/선행작성? | 당일재작성가능/과거수정금지 | 삭제일금지/과거수정허용/day필요 | 일기계약,본문삭제와지급원장분리,성공응답예시 |
| 자정·날짜override? | 제출순간서울날짜·사진date검사 | date/entry_date지정허용 | 시작일/제출일귀속,출시override차단,멱등키 |
| 자기확인·사진·걸음의검증범위? | 대부분자기확인/로컬사진 | self/사진ID·EXIF/클라이언트steps | 증거별지원표·재사용·센서연결범위 |
| 주월·미접속감소? | 주3/月2/감소없음 | 주사진1/月없음/14일XP감소 | 승인된유지/삭제정책과기록보존 |
| 배포·권한은준비됐나? | 주소파일미설정/게임API미연결 | 일반API소유자토큰검사없음 | 배포HTTPS주소/커밋/OpenAPI·소유자검사계획 |
| 자산·상품이관? | 로컬자산/12캐릭터 | 서버DB/6캐릭터 | 계정별충돌/병합규칙,최종상품JSON |

이질문은새규칙을확정한것이아니라현재충돌을해소하기위한확인목록이다. 핵심근거함수는각절에기록했으며분석브랜치/커밋은1절이다.

## 10. 미확인/분석 범위

실행검증이아닌정적호출추적·콘텐츠전수대조다. 실제서버/API/로그인/실기기/배포설정/운영DB는확인하지않았다. 테스트파일이존재해도이번에실행하지않았고,동시완료·저장경합·자정순간은별도재현이필요하다. 비밀값·토큰·개인정보·개인PC절대경로는문서에넣지않았다.

‘익숙한활동2+작은확장1’과부담을줄이는기획은현재코드가항상보장하는정책이나교수님의효과검증이아니다. 실제최종서버동작을확정하려면백엔드담당자에게배포커밋과현재OpenAPI를받아야한다.
