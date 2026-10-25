# Supabase 세션 → 백엔드 사용자 연결

최종 수정: 2026-10-15. 모바일은 Google·Kakao Supabase OAuth/PKCE 연결을 구현했다. 실제 Kakao 설정과 실제 서버·모바일 기기 로그인 성공 여부는 각각 별도로 확인한다.

## 확인한 계약과 현재 환경

현재 체크아웃 backend/app/main.py에는 /auth/supabase가 없다. origin/backend-onboarding-survey(확인 시82c24f5)의 backend/app/main.py, app/auth.py, FRONTEND_GUIDE.md를 읽어 계약을 확인했다. backend 파일·브랜치·DB·원격 정책은 수정/병합하지 않았다.

- 기존 회원: POST /auth/supabase, Authorization Bearer(실제 SDK access_token), JSON 본문 {}. body가 필수이므로 생략하지 않는다.
- 신규 회원: 404 + JSON detail이 정확히 ‘처음 오셨네요. 닉네임을 정해 주세요.’일 때만 닉네임 화면. 라우트404(Not Found), HTML404, 다른404/401/403/네트워크 실패는 신규 회원으로 처리하지 않는다.
- 등록: 같은 API에 {nickname}, 성공201 및 {user:{id,nickname,...},created:true}. 기존회원200/created:false.
- 서버 clean_nickname: 공백 정리 후2~12자, 욕설 검사, 대소문자/띄어쓰기 무시 중복.422/409 오류 문구를 표시하고 입력을 유지한다. 길이·중복의 최종 판정은 서버다.
- 서버 Supabase 설정이 없으면 supabase_id 본문을 믿는 시연 분기가 존재한다. 앱은 그 분기를 사용하지 않고 ID를 본문에 넣어 우회하지 않는다. 서버 SUPABASE_URL/SUPABASE_KEY를 실제 프로젝트에 맞게 준비해야 한다.

mobile/.env.local에 Supabase 공개 설정은 있지만 EXPO_PUBLIC_API_URL은 없다. 실제 서버 주소를 받지 못해 임의 localhost/IP/도메인을 넣지 않았다. 현재 연결은 서버 주소 미설정 오류를 표시한다.

## 상태·ID·토큰

getSession은 기존 verified/user.id/source를 유지하고 실제 SDK session.access_token을 추가 반환한다. 기존 getUser 검증을 유지한다. 로그인·재실행/복원 모두 백엔드 연결 성공 후에만 authenticated/홈으로 이동한다. 신규 회원 닉네임/등록 중/연결 오류/재시도를 구분한다.

backendUserId는 성공한 서버 user.id, supabaseUserId는 검증된 Supabase user.id이다. 현재 인증 컨트롤러/React AuthContext 메모리에 별도로 저장하며 서버 ID를 영구 캐시해서 로그인 검증을 생략하지 않는다. 앱을 다시 켜면 SDK 세션을 복원한 뒤 다시 연결한다. 토큰은 기존 SDK SecureStore 외에 별도로 영구 저장하거나 상태·문서·로그에 노출하지 않는다.

AuthContext.requestUser('/home')는 /users/{backendUserId}/home에 현재 SDK 토큰으로 요청한다. SDK ID를 사용자 API 경로에 넣지 않는다. 계정 변경/로그아웃 때 ID를 즉시 비우고 이전 요청·지연 응답을 취소/거절한다. 방문/방명록 같은 다른 방 대상 API의 author_id/visitor_id도 서버 사용자 ID를 써야 한다. 현재 게임 화면에는 실제 게임 API 호출이 없어 기존 호출을 일괄 전환했다고 주장하지 않는다.

OAuth callback/인증 이벤트/복원은 같은 연결 작업을 공유한다. onAuthStateChange에서 SDK를 await하지 않고 다음 작업으로 넘긴다. 같은 계정 SIGNED_IN/TOKEN_REFRESHED는 중복 연결하지 않는다. 닉네임 제출은 직렬화하며 계정이 바뀌면 이전 계정의 입력을 새 계정에 제출하지 않는다.

## 보존한 범위

기존 로그인 디자인·Google/Kakao OAuth/PKCE·SDK 세션 갱신·로그아웃·개발 미리보기를 유지한다. 두 provider는 같은 앱 복귀 주소와 Supabase 세션 검증·백엔드 계정 연결을 사용한다. 로그인 UI는 이메일·닉네임·프로필 이미지를 필수값으로 읽지 않는다.

로컬 게임/옷장/일기/출석/사진/방명록을 초기화·계정에 업로드·자동 병합하지 않는다. 홈은 백엔드 연결 성공 뒤에만 진입한다. 서버 게임 데이터 동기화와 게스트 병합은 별도 합의/작업이다. Apple 및 Vite 웹 소셜 인증은 미연결이다.

## Kakao 로그인 설정과 제한

모바일 로그인 화면은 Kakao provider를 Google과 같은 브라우저 OAuth/PKCE·앱 복귀·세션 검증 흐름으로 연결한다. 앱은 Kakao 이메일·닉네임·프로필 이미지를 계정 식별 조건으로 사용하지 않으며, Supabase user ID로 백엔드 계정 연결을 시도한다.

- Kakao Developers의 REST API key 설정에 등록할 Supabase provider callback: `https://vayotfrfmokgdbquvxhg.supabase.co/auth/v1/callback`
- Supabase Authentication → URL Configuration의 앱 복귀 허용 주소: `capstone-mochi://auth/callback`
- Supabase Kakao provider에 REST API key를 Client ID로, 활성화한 Kakao Login Client Secret을 Client Secret으로 입력한다. Client Secret은 모바일 환경 파일에 두지 않는다.
- Supabase Auth Kakao provider는 기본 요청 scope로 `account_email`, `profile_image`, `profile_nickname`을 사용한다. 콘솔에서 프로필 동의 항목을 사용 가능하게 설정한다. 이메일 없이 사용자 허용은 이메일 응답이 비어 있는 계정의 처리를 돕지만, Kakao 앱에서 요청 scope 자체를 허용하지 않으면 OAuth가 시작 단계에서 실패할 수 있다. account_email을 설정할 수 없는 앱 유형이면 Kakao Developers의 앱 권한을 먼저 확인한다.
- Kakao console 설정 완료는 사용자가 알려 준 내용이며, 실제 Supabase provider 값과 실기기 OAuth는 이 저장소에서 독립적으로 검증하지 않았다.

## 실제 연결을 위한 남은 설정

1. 앱에서 접근 가능한 실제 백엔드 주소와 /auth/supabase 배포 여부를 팀에서 확인한다. 휴대폰의 localhost는 PC가 아니다.
2. mobile/.env.local에 EXPO_PUBLIC_API_URL=<확인한 실제 주소>를 설정한다. 기기에 로그인 토큰을 보내는 서버이므로 배포 주소/소유를 확인한다. URL에 secret/key/자격 증명을 넣지 않는다.
3. 서버는 같은 Supabase 프로젝트의 SUPABASE_URL/SUPABASE_KEY를 설정하고 Bearer 검증 분기를 사용한다. 변경은 백엔드 팀 몫이다.
4. 환경값 변경 후 mobile에서 npm run start:dev로 개발 서버를 재시작하고 설치된 development 앱에서 Google 또는 Kakao 로그인을 확인한다. 신규 회원은 닉네임, 기존 회원은 백엔드 연결 성공 뒤 홈 진입, 취소·재시도·로그아웃·재실행을 확인한다.
5. EAS development 빌드에서도 EXPO_PUBLIC_API_URL을 해당 환경에 제공해야 한다. 이번에 클라우드 빌드를 실행하거나 서버 주소를 임의로 EAS에 등록하지 않았다.
6. 실제 웹 인증을 추후 연결하면 VITE_API_URL과 서버 CORS 허용 origin을 설정한다. frontend/.env.example는 주소 이름만 안내한다.

## 검증과 실행 명령

모의 응답 테스트: 기존회원/신규닉네임/422·409/일반404·401·403·500/네트워크 재시도/복원/콜백 이벤트 중복/계정변경·늦은응답/로그아웃/다른API 서버ID·새토큰 사용/토큰 숨김. 모의 테스트와 캡처는 실제 인증·서버 저장 성공의 증거가 아니다.

- mobile: npm test, npm run typecheck, npm run lint
- frontend: npm run build
- 웹 모의 UI: frontend에서 node scripts/check-auth-backend.mjs (별도 Edge 프로필만 사용)
- 이번 local export: mobile/dist/backend-auth-20261014 (iOS/Android/Web). 클라우드 개발 빌드/실기기 설치 성공을 뜻하지 않는다.

공식 SDK 참고: https://supabase.com/docs/reference/javascript/auth-getsession 및 https://supabase.com/docs/reference/javascript/auth-onauthstatechange . 실제 서버 계약 근거는 위 원격 브랜치다. 문자열404 구분은 현재 계약을 따른 것이며, 향후 안정적인 신규회원 오류 code 필드가 필요하다면 백엔드 팀과 합의해야 한다.

이번 인증 검증(2026-10-14): 전체101테스트(인증 연결14·SDK 세션10 포함), 웹 build, 모바일 typecheck/lint 및 iOS/Android/Expo Web 로컬 export 통과. 별도 Edge에서 모의 응답으로 기존회원/신규 닉네임/409입력 유지/연속 제출1회/네트워크 오류·재시도/로그아웃/별도ID와 로컬 기록 보존,360/390/430px 화면 확인. 실제 Google 인증·실제 서버 POST·실기기 로그인은 서버 주소 미설정으로 확인하지 않았다. 모의 캡처는 artifacts/ui-review/auth-nickname-mock-*.png 및 auth-backend-error-mock-430.png이다.
