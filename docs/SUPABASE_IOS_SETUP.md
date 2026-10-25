# Supabase Google 인증 · iPhone 개발 빌드 재개 안내

최종 정리: 2026-10-14. 실제 iPhone 로그인·설치·Apple 서명 검증은 미완료다.

## 반영한 작업
- mobile iOS/Android용 Supabase 브라우저 OAuth/PKCE 어댑터, 앱 복귀 경로 capstone-mochi://auth/callback, 서버 getUser 검증, SecureStore 세션/PKCE 저장, 앱 활성 상태 자동 토큰 갱신, 로그아웃, 취소/실패/중복 콜백 처리.
- 기존 게임 AsyncStorage와 인증 저장소 분리. 기기 기록을 계정에 자동 병합하거나 업로드하지 않음. 웹 인증은 기존 미연결 상태 유지, 카카오/Apple 로그인은 후속 작업.
- Firebase/Nitro Google 의존성·플러그인 제외. 원격 Firebase/Google 프로젝트·서명 키·설정 파일은 보존.
- EAS sungshin/capstone-mochi, projectId 694b8d60-d14d-442e-b2ff-15c31d5450b7 유지. developmentClient/internal/ios.simulator=false 설정.
- iOS bundleIdentifier io.github.alicena2ppn2.mymochi 준비. 저장소에는 기존 iOS ID가 없었으며 Apple 포털 등록/소유 여부는 미확인. 다른 기존 등록 ID가 있으면 팀 확인 후 수정해야 함.

## Supabase 설정
프로젝트 URL: https://vayotfrfmokgdbquvxhg.supabase.co
환경 변수: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
사용자가 제공한 publishable key는 local .env.local과 EAS development 공개 변수로 연결했다. .env.local은 Git에서 제외한다. 팀원은 .env.example의 두 값을 채워 .env.local로 저장한다. Google Client Secret, secret/service_role 키는 앱에 넣지 않는다.
Google provider 활성화는 공개 settings 응답으로 확인했다. Google 웹 Client ID/Secret 및 Google 측 callback 등록은 사용자가 완료했다고 보고했으며 관리자 콘솔 내용 자체는 미확인이다.

Supabase Dashboard → Authentication → URL Configuration → Redirect URLs에 아래 주소를 추가/저장한다.
`capstone-mochi://auth/callback`
Google Cloud의 Authorized redirect URI는 아래 Supabase 주소이며 앱 복귀 주소와 다르다.
`https://vayotfrfmokgdbquvxhg.supabase.co/auth/v1/callback`
Site URL은 팀의 실제 서비스 주소를 사용한다. 임의의 사이트를 만들지 않는다. Google OAuth 앱이 Testing 상태라면 두 테스트 계정을 OAuth 테스트 사용자로 등록한다. 이 브라우저 방식은 Google iOS native Client ID/REVERSED_CLIENT_ID/Firebase plist를 사용하지 않는다.

## 중단 상태와 주의
OneDrive 대량 삭제 확인 때문에 모든 설치/삭제/빌드를 중단했다. 재개 전 사용자 승인이 필요하다. 의존성 제거는 node_modules 패키지 파일을 대량 정리했으며 소스 폴더 전체 삭제 명령은 실행하지 않았다.
OneDrive 중단 이후 기존 Firebase 파일이 다시 나타났다. 미추적 mobile/src/auth/authClient.android.js, googleAuthCore.mjs, googleAuthCore.test.mjs, mobile/app.config.js, mobile/scripts/check-firebase-android.mjs는 이번 커밋에서 제외한다. 삭제하지 않는다. authClient.android.js는 로컬 Android에서 native 어댑터보다 우선하고, app.config.js는 예전 GOOGLE_SERVICES_JSON을 주입하므로 로컬 실행 전 충돌 해결 승인이 필요하다. PR의 파일 구성에는 이 잔여 파일이 없다.
frontend/src/refe/WEEK6_멀티모달_심화.pdf는 작업 폴더에서 없지만 Git HEAD/index에 12,119,376바이트 원본이 남아 있다. 삭제 원인은 미확인이며 삭제 변경은 커밋에서 제외한다. 복원/삭제/동기화 변경은 별도 승인 전 실행하지 않는다.

## 직접 조작할 Apple · 두 iPhone 등록
현재 EAS device:list 결과: No Apple teams found for account sungshin. 유료 Apple 계정이 있어도 EAS Expo 조직과 자동으로 연결되는 것은 아니다.
아래 명령은 현재 실행하지 않는다. 승인 후 mobile 디렉터리의 사용자 터미널에서 실행한다.
1. Apple Developer → Account → Membership에서 올바른 Team 확인. Certificates, Identifiers & Profiles → Identifiers에서 MY MOCHI의 기존 Bundle ID 확인. Apple 계정의 유효한 멤버십/계약과 인증서·기기 관리 권한 확인.
2. `npx eas-cli@latest device:create` → 올바른 Apple 계정/Team 선택. Apple ID·비밀번호·2FA는 사용자 직접 입력. 등록 방식 Website 선택.
3. 만들어진 등록 URL/QR을 본인과 팀원의 iPhone Safari에서 각각 연다. 안내에 따라 프로파일 다운로드 → iOS 설정의 프로파일 다운로드됨(또는 일반 → VPN 및 기기 관리) → 해당 기기 등록 프로파일 설치. 기기명/UDID 등록 완료 확인.
4. `npx eas-cli@latest credentials:configure-build --platform ios --profile development` → 올바른 Apple Team 선택. 인증서가 있으면 재사용하고 없으면 생성. Ad Hoc 프로비저닝에 두 iPhone을 모두 포함. 기존 인증서/키를 폐기하지 않는다.
5. 아래 빌드는 최초 서명 설정/기기 선택을 위해 대화형으로 실행한다. 새 기기를 등록한 뒤 예전 프로비저닝으로 설치 가능하다고 가정하지 않는다.

## 승인 후 필요한 명령 (지금은 실행 중지)
mobile 디렉터리에서:
```powershell
npm run auth:check
npx eas-cli@latest device:create
npx eas-cli@latest credentials:configure-build --platform ios --profile development
npx eas-cli@latest build --platform ios --profile development --no-wait
npm run start:dev
```
빌드 상태는 사용자가 https://expo.dev/accounts/sungshin/projects/capstone-mochi 에서 확인한다. 중단 당시 iOS 제출 명령을 종료했고 새 iOS build ID/설치 URL은 확보하지 못했다. 제출 성공·IPA 생성 완료로 보고하지 않는다.
완료된 빌드의 Install 링크를 두 등록 iPhone의 Safari에서 열어 설치한다. 요청되면 설정 → 개인정보 보호 및 보안 → 개발자 모드를 활성화/재시작한다. development 앱을 열고 같은 Wi-Fi의 개발 서버 QR을 읽는다. 네트워크가 막힐 때만 승인 후 `npm run start:dev -- --tunnel`을 사용할 수 있다.

## 검증과 남은 작업
Supabase 인증 로직 8개 테스트, auth:check의 Google 활성화, 모바일 타입/수정 파일 ESLint, iOS Hermes export는 전환 당시 통과했다. 사진·저장·기존 게임 포함 현재 로직 테스트 58개 통과. 실제 iPhone Google 계정 선택·앱 복귀·재시작 복원·토큰 갱신·취소·로그아웃, 카메라 권한, Apple 서명과 설치는 미확인이다. 재개 때 OneDrive/의존성 상태를 먼저 확인하고 무조건 npm install/uninstall을 실행하지 않는다.

## 백엔드 합의 (서버 수정 없음)
Supabase access token의 서명/issuer/exp/audience를 서버에서 검증하고 검증된 auth.users.id(UUID)를 사용자 식별자로 매핑한다. Firebase UID/Google provider ID나 요청 body의 user_id를 인증 근거로 신뢰하지 않는다. 실제 JWT signing key 방식에 맞게 JWKS 또는 Supabase 서버 검증을 사용한다. 게임 사용자 매핑·RLS/권한·계정 삭제·게스트 기록 병합 정책은 별도 합의가 필요하다. publishable key는 서버 관리자 키가 아니다.

## 공식 참고
- https://supabase.com/docs/guides/auth/quickstarts/react-native
- https://supabase.com/docs/guides/auth/sessions/pkce-flow
- https://supabase.com/docs/guides/auth/redirect-urls
- https://docs.expo.dev/build/internal-distribution/
