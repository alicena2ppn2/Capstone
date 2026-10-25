> 현재 모바일 인증: 2026-10-12 Supabase Google 브라우저 OAuth/PKCE로 전환. docs/SUPABASE_IOS_SETUP.md를 따른다. Firebase는 이전 준비 이력이며 frontend 웹은 기존 미연결 상태를 유지한다.

# 로그인 연결 준비

최종 수정: 2026-10-09

웹·모바일 첫 진입은 MY MOCHI 로그인/가입 화면이다. 인증 확인 중에는 홈을 마운트하지 않는다. `auth/authClient.js`는 **미연결 어댑터**이며 세션을 만들지 않는다. 실제 인증 서비스가 검증한 세션만 홈 진입에 사용할 수 있다. 신규 가입·온보딩 경로도 서버 계약 확정 후 어댑터에 연결해야 한다.

## 연결 전에 필요한 결정

- 인증 서비스와 백엔드의 토큰 검증 계약. 현재 `/users`의 사용자 ID는 인증 수단이 아니며 소셜 로그인 API가 없다.
- Kakao 앱 등록, 로그인 활성화, 플랫폼/도메인, Redirect URI, 필요한 동의 항목. Google OAuth 클라이언트와 웹 origin/redirect, iOS bundle identifier/Android package 등록.
- Expo의 현재 scheme은 `capstone-mochi`. 실제 콜백 경로와 개발/배포 URL은 팀이 확정해 공급자 콘솔과 일치시켜야 한다. 임의 API 경로나 callback URL은 구현하지 않았다.
- 세션 복원·만료·로그아웃·계정 삭제·신규 가입 응답·온보딩·계정별 데이터 동기화 계약.
- 게스트 로컬 데이터와 계정 데이터 병합 정책은 미확정. 자동 병합·초기화하지 않는다.
- 실제 이용약관 및 개인정보처리방침 문서/HTTPS URL이 필요하다. 현재 화면에는 준비 상태만 표시하며 가짜 링크는 없다.

개발용 게임 미리보기는 웹 Vite DEV와 모바일 `__DEV__`에서만 제공한다. 웹 `?preview=game`은 기존 로컬 게임, `?preview=friends`는 캐릭터 비교다. 배포 환경에는 로그인 우회 버튼이 없다. 미리보기는 인증 성공이 아니다.

## 공식 버튼 에셋

카카오: https://developers.kakao.com/docs/ko/kakaologin/design-guide 및 공식 리소스 `https://developers.kakao.com/tool/resource/static/img/button/login/full/ko/kakao_login_medium_wide.png`

Google: https://developers.google.com/identity/branding-guidelines 및 공식 `signin-assets.zip`의 Android+Web neutral pill 4x PNG. 카카오는 공식 large wide 원본으로 교체했다. 공식 이미지의 글꼴·색·비율은 변경하지 않았다. 양쪽 버튼은 52px 터치 영역으로 맞추고 원본 이미지는 비율을 유지해 표시한다. 게임 텍스트는 기존 A2z 400~600, 공급자 버튼 텍스트는 이미지에 포함된 공식 스타일이다.

로그인은 기존 게임과 같은 `phone-shell`, IPhoneChrome, 하단 홈 표시줄을 사용한다. 데스크톱에서는 동일한 390×844px 최대 프레임, 실제 모바일에서는 전체 화면으로 표시하며 내부 세로 스크롤을 허용한다. 게임의 홈 배치나 저장 데이터는 변경하지 않는다.

OAuth 로그인·가입·리다이렉트·세션 갱신은 실제 설정과 서버 계약이 없어 미연결이다. 화면 구현/빌드 성공은 실제 인증 완료를 의미하지 않는다.

## 검증 결과 (2026-10-09)

- 공유 로직·저장 테스트 63개 통과. 웹 빌드, 모바일 lint/타입 검사, Expo iOS·Android·Web export 통과.
- 임시 Edge에서 360/390/430px와 360×480px 화면, 공식 PNG 로딩, 미연결 버튼 재시도, 로그인 화면의 게임 저장 부작용 없음, 개발용 게임 진입 확인. `artifacts/ui-review/login-*.png` 캡처.
- 기존 UI 회귀 검사 통과: 6개 미션, 일기 초안·삭제/재작성 중복 방지, 방명록 저장 실패/성공, 구매·착용·새로고침, 출석 중복 방지와 모바일 단일 스크롤.
- 배포 웹 번들에는 개발용 게임 미리보기 문구가 없다. 실제 OAuth·신규 가입·실제 계정 세션 복원은 미연결이며 실제 iPhone/Android의 안전 영역과 화면은 미확인이다.

## 2026-10-11 Android 인증 방향 확정
mobile/은 React Native Firebase + Google native 로그인으로 진행한다. Android 식별자 io.github.alicena2ppn2.mymochi와 개발용 빌드 사전 설정을 준비했고, 실제 Firebase 프로젝트/설정 파일/서명과 로그인 어댑터 연결은 대기 중이다. 웹 인증은 그대로 미연결이다. 백엔드 문서의 Supabase 계획은 Firebase ID 토큰 검증/UID 매핑 계약으로 팀과 합의해야 하며 이번 작업에서 서버를 수정하지 않았다. 자세한 단계는 ../mobile/FIREBASE_ANDROID_SETUP.md를 참고한다.
