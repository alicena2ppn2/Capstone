# MY MOCHI 코드 구조

최종 수정: 2026-10-15. 참고: https://expo.dev/blog/expo-app-folder-structure-best-practices 및 SDK 57 공식 문서. 일반 코드가 라우트로 인식되지 않도록 app 밖에 두며, 현재 경로/내부 화면 전환은 유지한다.

## 변경 전 → 후

```text
이전
mobile/src/{GameApp,AuthGate,ui,storage,api,Character,MissionReplacement,...}
mobile/src/app/ (얇은 라우트)
mobile/src/screens/ (화면)
frontend/src/utils/ (게임 규칙+콘텐츠+웹 저장+React 훅)
frontend/src/components/ (웹 UI+모바일 공유 그림)

현재
shared/
  data/       missions.js, characters.js, clothes.js, decor.js, dailySentences.js
  features/   game.js, dailyMissions.js, missionGuidance.js, journal.js,
              finalFriends.js, wardrobeActions.js, ... (+기존 테스트)
  utils/      seoulDate.js, roomTime.js, color.js
  theme/      tokens.js, icons.js
  api/        backendClient.mjs
  auth/       authBackendController.mjs (+테스트), AuthContext.js
  art/        플랫폼 태그를 주입받는 승인 SVG 도형
  hooks/      useBriefFeedback.js
mobile/src/
  app/        기존 라우트와 레이아웃, auth/callback, 개발 미리보기
  GameApp.jsx 화면·동작 연결 (기존 내부 전환 유지)
  hooks/      useGameState.js
  storage/    storage.js (+테스트)
  api/        client.js
  auth/       AuthGate, useMobileAuthEntry, Supabase core/플랫폼 어댑터
  components/ ui, Character, BottomNav, UiIcon, MenuIcon, RewardPanel, BriefNotice
  screens/    home/, quests/, login/, shop/CharacterShop, diary/PhotoAlbum,
              기존 작은 Diary/Shop/Settings/Visit/개발 미리보기 화면
  art/        네이티브 SVG·캐릭터 모션·방 렌더러
frontend/src/  기존 웹 화면·DOM/CSS·웹 사진 저장·인증 기본 어댑터
```

## 수정할 곳

| 작업 | 파일 |
| --- | --- |
| 모바일 홈 배치/홈 전용 스타일 | src/screens/home/HomeScreen.jsx |
| 모바일 생명주기·출석·저장 연결 | src/hooks/useGameState.js |
| 미션 제목·조건·24개 후보·주월 목표 | ../shared/data/missions.js |
| 6개 일일 구성·교체·넘긴 이력·완료 | ../shared/features/dailyMissions.js |
| 추천 선호·읽기 전용 수행 조건 | ../shared/features/missionGuidance.js |
| 캐릭터 목록·해금·가격 | ../shared/data/characters.js 및 ../shared/features/finalFriends.js |
| 의상/가구 | ../shared/data/clothes.js, decor.js |
| 보상·레벨·구매·지급 방지 | ../shared/features/game.js |
| 모바일 목록·교체 창 | src/screens/quests/Quests.jsx, MissionReplacement.jsx |
| 로그인 표시 / 진입 판단 | src/screens/login/LoginScreen.jsx / src/auth/AuthGate.jsx |
| 백엔드 연결·신규회원404·계정변경 | ../shared/auth/authBackendController.mjs |
| HTTP·오류·Bearer·시간 제한 | ../shared/api/backendClient.mjs |
| 환경별 주소 | src/api/client.js, ../frontend/src/api/client.js |
| 로컬 저장/백업/이관 | src/storage/storage.js |
| 일일 문장 / 날짜 선정 | ../shared/data/dailySentences.js / ../shared/features/dailySentence.js |

## 경계와 보존

공유 규칙·data·utils·HTTP/controller는 DOM/RN UI/localStorage/AsyncStorage/SecureStore에 직접 의존하지 않는다. React 기반 공유 art/hooks/AuthContext는 명시적으로 별도이며 art는 HTML 또는 RN SVG 태그를 주입받는다. 플랫폼별 사용처에서 모션과 이벤트를 연결한다. Metro는 shared만 감시하고 React는 모바일 설치본으로 강제한다. Vite도 웹 React 설치본을 사용한다. 패키지 매니저·의존성·전체 TS 전환·새 서버·새 탐색 방식은 추가하지 않았다.

Expo entry → app/_layout → AuthGate → GameApp. app/index와 [page]는 기존 null 라우트, callback은 기존 Redirect. 미리보기 두 경로는 기존처럼 게임 저장 effect를 마운트하지 않는다. 일반 UI/테스트/데이터는 app 밖에 있다. Hook은 GameApp 한 곳에서만 호출하며 기존 구독·타이머 해제와 저장 큐를 그대로 옮겼다. GameApp의 문장 높이 상태도 유지하여 화면 재진입 시 원래 배치를 보존한다.

.android → Supabase native 어댑터 재수출, iOS → .native, Expo 웹 → 기본 authClient(미설정). Vite 웹도 기존 미설정 어댑터. Expo 웹에서 실제 OAuth를 구현한 것으로 보고하지 않는다. 기존 Google/Firebase core 두 미추적 파일은 실행 import와 네이티브 진입점/설정을 확인했으며 앱 번들에서 사용하지 않는다. 보존 필요가 있는 기존 로컬 파일이므로 삭제하지 않았다. app.config.js의 기존 Google services file 연결, 원격 프로젝트/키/설정은 변경하지 않았다.

EXPO_PUBLIC_API_URL / VITE_API_URL, Supabase 환경변수, scheme/redirect, 저장 키/ID/완료 형식은 유지. access_token은 실제 SDK 세션에서 가져와 Bearer로 사용하고 backendUserId를 분리하며, 알려진404만 가입·기타 실패 재시도·중복 요청/이전 계정 응답 차단을 유지한다. 서버 주소 미설정/실제 서버 인증 미검증은 기존과 같다. 로컬 게임 데이터를 계정에 자동 병합하지 않는다.

개발 미리보기/모의 인증 검사는 frontend/scripts와 기존 개발 라우트에만 있다. artifacts/dist는 import되지 않으며 생성물은 앱 소스 경로로 옮기지 않았다. 관련 없는 스크린샷 변경·PDF 삭제 상태·AGENTS·로컬 백업은 보존한다. 커밋·푸시 없음.

## 검사 명령과 기존 문제

```powershell
cd mobile
npm run test       # 기존 기본 검사 101개 (경로만 변경)
npm run test:all   # 공유 검사 전체 포함; 기존 exceptions 2개 실패도 숨기지 않음
npm run lint
npm run typecheck
npm run export -- --output-dir dist/structure-verified-20261015
cd ../frontend
npm run build
node scripts/design-tokens.mjs
node scripts/check-auth-backend.mjs    # MOCK ONLY
node scripts/check-mission-replacement.mjs
node scripts/check-structure-native.mjs # Expo dev web localhost:5183 필요
```

전체 공유 검사에는 오래된 exceptions.test.js 기대값 2개가 현재 규칙과 맞지 않는다. (1) 사진 미션에 자기확인 완료를 호출한 뒤 완료 슬롯으로 가정 (실제로 사진 저장 경로 필요), (2) hard 응답 후 모든 미션 effort=0 가정 (최근 선호·추천 변경과 불일치). HEAD a87377a 복사본에서도 동일한 2개 실패. 리팩토링을 이유로 미션 규칙이나 기대값을 변경하지 않았다. 초기 기본 테스트/타입 검사는 통과, 초기 lint는 파일 이동과 겹쳐 파일경로 오류로 중단되어 독립 기준 결과로 사용하지 않는다. 최종 검사는 실제 최종 코드에 실행한다.

## 남은 구조/기능 문제

작은 Settings/Diary/Visit와 웹 App의 화면 내부 연결은 보존했다. 일반 화면 전체의 Router 전환, 웹 상태 소유권 전면 분리, 기존 순수 규칙 파일의 모든 내부 함수 분할은 이번 범위에 넣지 않았다. 기본 저장 흐름은 기존 성공 저장+상태 자동 저장을 그대로 유지하여 동작 변경을 피했으며, 저장 큐 최적화는 별도 검토가 가능하다. 사진 실제 카메라/키보드/보안 저장, OAuth 복귀와 실제 서버 계정 생성은 iPhone/Android 실기기 검증이 필요하다.

## 최종 검증 결과

아래 결과는 작업 종료 시 갱신한다. 빌드/모의 테스트/실기기 검증은 구분한다.

- 기존 기본 테스트 101/101, 웹 기본 인증 어댑터 3/3 통과. 확장 검사 122개 중 120 통과/2 기존 실패; HEAD 복사본에서 같은 실패 재현.
- 웹 빌드 통과. 토큰 생성 파일 일치 및 실제 텍스트 대비 4.5:1 이상 검사 통과. 모바일 lint/typecheck, iOS·Android·Expo 웹 로컬 export 통과.
- 별도 Edge 임시 프로필: Vite 교체/소진/명시적 다시 보기/저장 실패와 재시도/서울 날짜 갱신/중복 지급 방지 통과. 모의 인증 기존회원/신규404/닉네임409/입력 유지/중복 제출/네트워크 재시도/로그아웃 통과 (실제 서버 인증 아님).
- Expo dev web localhost:5183: 360/390/430px 및 360×600, 홈→퀘스트 교체/로컬 완료→일기 저장→옷 구매(1회 차감, 자동 장착 없음)/장착→새로고침 기록 유지→이웃/방명록/설정/로그아웃 통과. 실제 iPhone/Android 실행과 센서/카메라/가상 키보드는 미확인.
- 승인된 공유 SVG 11개의 도형 본문은 HEAD와 동일함을 확인. 런타임 상대 import 순환 없음, 모바일에서 frontend/src 직접 import 없음. Vite/Expo 웹 배포 entry에 이전 Firebase 어댑터와 모의 인증 harness 미포함.
- Expo 웹의 빈 오류 문자열이 View 자식으로 전달되던 경고는 MissionPreferences/MissionReplacement의 조건을 boolean으로 정리해 제거. 기존 접근성 SVG 속성 accessible=false가 웹 DOM에 전달되는 개발 경고는 이전 캡처 로그에서도 확인됐으며 이번 그림/모션 변경 범위에 넣지 않고 남겼다. 캡처에는 해당 기존 개발 경고 배너가 보일 수 있다.
- 실제 계정/배포 서버 접속·신규회원 생성, iPhone/Android OAuth 복귀는 미검증. 현재 서버 주소 미설정과 backend 계약 배포 확인 필요는 기존 제한 그대로.
- 캡처: ../artifacts/ui-review/structure-20261015/ (홈·미션 360/390/430, 일기·상점·의상·이웃·방명록·로그인). 원본 사용자 브라우저 저장소는 사용하지 않았다.
