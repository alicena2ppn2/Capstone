> 과거 작업 기록: 2026-10-12 Supabase Auth로 전환했다. 아래 Firebase 명령은 현재 앱에 적용하지 않는다. 현재 절차는 SUPABASE_IOS_SETUP.md를 따른다. 원격 Firebase 프로젝트와 서명 키는 보존한다.

# Android Firebase Authentication 준비

최종 수정: 2026-10-11

앱: MY MOCHI / 모찌와 친구들. Android의 영구 식별자는 `io.github.alicena2ppn2.mymochi`이다. 저장소 소유자 alicena2ppn2의 GitHub 네임스페이스와 게임명을 사용했으며 별도 공식 팀 도메인은 저장소에 없다. 테스트용 접미사를 붙이지 않으며 Firebase·EAS·Play에서 같은 이름을 사용한다. Firebase 프로젝트 ID와 앱 닉네임은 이 패키지명과 별개다.

## 구현 범위

Expo57 / React Native0.86의 Android development build 사전 설정. React Native Firebase app/auth와 Credential Manager 기반 Nitro Google Sign-In, Nitro Modules, Expo dev-client를 준비한다. 설치된 정확한 버전은 package.json/package-lock.json을 기준으로 한다. Firebase 설정 파일은 제공됐고 Android 패키지는 일치한다. 갱신 파일에는 Android/Web OAuth 클라이언트가 있어 firebase:check가 통과했다. Android Google/Firebase 로그인 어댑터를 기존 화면에 연결했다. 실제 기기 인증과 서버 동기화는 별도 검증이 필요하다. 게임 데이터나 웹 인증·백엔드를 변경하지 않는다. Expo Go에서는 네이티브 인증을 실행할 수 없다. iOS 앱 등록과 plist·framework 설정은 다음 작업으로 남겨 둔다.

## 콘솔과 빌드 순서

1. 새 Firebase 프로젝트 생성 → Android 앱 추가 → 패키지 이름 `io.github.alicena2ppn2.mymochi`. 앱 닉네임은 MY MOCHI Android로 구분할 수 있다. 실제 SHA-1을 아직 모르면 최초 등록 시 생략하고 아래 서명 확보 후 추가한다.
2. Authentication → 로그인 방법 → Google 활성화, 실제 지원 이메일 선택. Firebase/Google Cloud OAuth 동의 화면이 필요하면 실제 앱 정보와 테스트 사용자를 등록한다.
3. google-services.json을 다운로드해 `mobile/google-services.json`에 둔다. 직접 `android/app`에 넣지 않는다. Expo config plugin이 native prebuild 때 복사한다. 키스토어·서비스 계정 개인키 파일과 혼동하지 않는다.
4. mobile에서 `npx eas-cli@latest login`, `npx eas-cli@latest init`으로 팀이 사용할 실제 Expo 계정/프로젝트에 연결한다. 2026-10-11 sungshin 조직에 capstone-mochi 프로젝트를 생성·연결했다. 실제 projectId는 694b8d60-d14d-442e-b2ff-15c31d5450b7이며 app.json에 기록됐다.
5. `npx eas-cli@latest credentials --platform android` → development 프로필 → Android keystore 생성/선택. 실제 서명 인증서 SHA-1을 복사한다. 필요하면 Expo dashboard Credentials에서 확인하거나 키스토어 다운로드 후 실제 파일/alias를 사용해 `keytool -list -v -keystore <실제 키스토어 경로> -alias <실제 alias>`로 확인한다. 비밀번호는 명령줄에 적지 말고 프롬프트에 입력한다.
6. Firebase 프로젝트 설정 → Android 앱 → SHA 인증서 지문에 위 SHA-1 추가(필요 시 SHA-256도 같은 실제 인증서에서 추가). Google 활성화 후 갱신된 google-services.json을 다시 내려받아 교체한다. 실제 Web 유형 OAuth 클라이언트 ID가 포함되어야 한다. Android client ID나 Firebase appId를 webClientId로 사용하지 않는다.
7. `npm run firebase:check`로 패키지와 Google OAuth 설정 존재 확인. 이 검사는 인증서/콘솔/실기기 성공을 대신하지 않는다.
8. 파일은 .gitignore로 제외한다. EAS에는 `npx eas-cli@latest env:create --environment development --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret`로 실제 파일을 제공한다. app.config.js가 빌드 작업자의 파일 경로를 사용한다. 다른 빌드 환경에도 같은 방식으로 해당 환경의 실제 파일을 제공한다.
9. 실제 로그인 코드 연결 후 `npx eas-cli@latest build --platform android --profile development`로 개발 APK 생성·설치, `npm run start:dev`로 Metro 연결. 프로젝트 파일 누락 상태에서는 빌드하지 않는다. development 프로필은 인증 연결 전에도 네이티브 설정 점검에 사용할 수 있으나 로그인 성공을 의미하지 않는다.

EAS와 로컬 Android 빌드의 서명이 다르면 각각의 SHA-1을 등록한다. 로컬 생성 native 프로젝트에서는 `cd android` 후 `.\gradlew.bat signingReport`로 실제 variant의 서명을 확인한다. Play 배포 시에는 Play Console의 앱 무결성에서 **앱 서명 키** SHA-1을 추가한다. EAS 업로드 키와 Play 앱 서명 키는 다를 수 있다. 지문/Google 설정을 바꾼 뒤 갱신 파일을 사용해 native 앱을 다시 빌드한다.

## 백엔드 팀 전환 합의

기존 FRONTEND_GUIDE/DATABASE의 Supabase Auth 계획은 아직 서버에 구현되지 않았다. Firebase 전환 시 Firebase Admin SDK로 Firebase ID 토큰의 서명·만료·issuer·audience를 검증하고, 검증된 UID와 기존 사용자 ID를 매핑해야 한다. API의 URL/body user_id를 인증 근거로 신뢰하지 않도록 권한 검사를 연결한다. Google ID 토큰과 Firebase ID 토큰을 구분한다. 기존 로컬/서버 기록 병합 정책, 계정 삭제 시 Firebase 계정과 게임 데이터 정리, 로그아웃/토큰 만료 처리는 함께 합의한다. 인증만 Firebase로 바꾼다고 기존 DB를 Firestore로 옮길 필요는 없다. 서버 코드·API 계약은 이번 작업에서 변경하지 않았다.

## 공식 자료

- https://docs.expo.dev/guides/using-firebase/
- https://docs.expo.dev/guides/google-authentication/
- https://rnfirebase.io/
- https://react-native-nitro-google-sign-in.github.io/docs/setup/expo/
- https://firebase.google.com/docs/auth/android/google-signin
- https://docs.expo.dev/app-signing/app-credentials/

## 현재 미확인

EAS 연결과 Firebase 파일의 패키지 일치는 확인했다. 서명 설정은 development 프로필에서 새 Android Keystore 생성 질문까지 진행했으나 실행 환경의 대화형 stdin 제한으로 중단됐다. 키스토어·SHA-1·Android 네이티브 빌드/실기기 Google 로그인은 미확인이다. 앱 식별자의 Play 등록 가능 여부는 해당 콘솔에서 확인한다. 미리보기 데이터를 계정에 자동 병합하지 않는다.

## 설치 및 사전 검증 결과
React Native Firebase app/auth26.4.0, Nitro Google Sign-In2.3.0, Nitro Modules0.37.1, Expo dev-client57.0.19를 설치하고 lockfile에 기록했다. Expo install --check는 Dependencies are up to date, npm ls는 오류 없이 설치 버전을 확인했다. Expo public config가 정확한 패키지/파일 경로/플러그인을 해석했다. firebase:check는 미제공 설정 파일을 명확하게 거절했다. 실제 native 빌드·Google 로그인이 검증됐다는 의미는 아니다.

타입검사 tsc --noEmit 및 app.config.js ESLint는 통과했다. 설정 파일 검사 스크립트는 기존 ESLint ignore 대상이며 Node로 직접 실행해 구문과 미제공 파일 오류 경로를 확인했다.

## EAS 연결 확인 (2026-10-11)

소유 조직: sungshin. 프로젝트: https://expo.dev/accounts/sungshin/projects/capstone-mochi . EAS init가 생성 성공과 연결 성공을 반환했고 app.json의 owner 및 extra.eas.projectId를 확인했다.

사용자 터미널에서 mobile 디렉터리의 `npx eas-cli@latest credentials:configure-build --platform android --profile development`를 실행하고 새 Android Keystore 생성 질문에 동의한다. 이어 `npx eas-cli@latest credentials --platform android`에서 development를 선택해 실제 SHA-1을 확인한다. 임의의 로컬 debug 키나 예시 지문으로 대체하지 않는다. firebase:check 재실행은 현재 파일의 Web OAuth 클라이언트 누락으로 실패했다. Firebase에 실제 SHA-1 추가 후 갱신 파일로 교체해야 한다.

## 인증 연결 진행 (2026-10-11)

실제 파일 mobile/google-services.json의 projectId my-mochi-f9a81, 수정 시각 2026-10-11T12:01:38.018Z(서울 21:01:38), OAuth 유형 1/3을 확인했다. 파일·키·토큰은 출력하거나 Git에 포함하지 않았다. EAS development의 GOOGLE_SERVICES_JSON 비밀 파일 변수를 새 설정으로 등록했다. Android 전용 authClient.android.js가 실제 native Web OAuth ID를 autoDetect하고 Google ID 토큰을 Firebase credential로 교환한다. Firebase 초기 세션 복원과 ID 토큰 강제 갱신 후 기존 gate를 통과하며 로그아웃은 Firebase 세션을 종료한다. Google 취소/실패에는 재시도 안내, 진행 중 중복 네이티브 요청 방지, 취소 후 늦은 Firebase 성공에는 세션 종료를 적용했다. 게임 데이터 저장소를 삭제하거나 계정에 자동 업로드하지 않는다. 웹/iOS는 기존 미연결 어댑터를 사용하며 카카오는 명시적으로 미연결 안내를 제공한다. 개발 인증 확인 후 계정 삭제·동기화와 백엔드 UID 계약은 별도 작업으로 필요하다.

EAS 빌드 archive에서 로컬 지침, 검토 artifacts, 참고 이미지, backend와 비밀 설정 파일을 제외하도록 .easignore를 추가했다. Firebase 파일은 EAS 파일 환경 변수로만 전달한다. 빌드 제출과 빌드 성공, APK 실제 인증 성공은 각각 별도로 기록한다.

Android development EAS 빌드: https://expo.dev/accounts/sungshin/projects/capstone-mochi/builds/d07c38b1-8e68-47f6-96d9-e3413a24626e . 실제 원격 키스토어 Build Credentials JlS2DuEJ6M(default)를 사용해 제출됐으며 현재 빌드 결과 확인 중이다. 개발 APK는 설치 후 `npm run start:dev`로 최신 Metro 코드를 실행한다. 로컬 Android Hermes 번들 생성 통과. 실기기 Google 계정 선택·인증·재시작 복원은 아직 확인하지 않았다.
