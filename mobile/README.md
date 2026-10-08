# 모찌와 친구들 — React Native

현재 모바일 프론트는 Expo SDK 57, React Native 0.86.3, React 19.2.3이다. `View`, `Text`, `Pressable`, `TextInput`, `ScrollView`, `Modal`과 StyleSheet로 화면을 구현한다. WebView로 Vite 화면을 감싼 앱이 아니다. 기존 웹은 `../frontend`에 보존하며, 게임 데이터/계산은 `../frontend/src/utils`를 공유한다.

## 실행

Node.js 22.13 이상이 필요하다. 설치된 잠금 파일을 기준으로 실행한다.

```powershell
cd mobile
npm.cmd ci
npm.cmd start -- --lan --port 8081
```

SDK 57을 지원하는 Expo Go에서 QR을 스캔한다. PC와 휴대폰은 같은 네트워크를 사용해야 한다. 기기/Expo Go 버전에 맞는 개발 빌드가 필요한 경우 EAS 개발 설정을 별도로 추가한다. 이 작업은 Dev Tunnel 공개 설정을 변경하지 않는다.

```powershell
npm.cmd run web -- --port 8081
npm.cmd run test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run export
```

`export`는 iOS/Android/웹 JS·Hermes 번들 생성이며, 서명된 IPA/APK 빌드나 실기기 테스트는 아니다. TypeScript 검사는 기존 JavaScript를 허용하는 `allowJs/checkJs:false` 구성이다. 엄격한 TypeScript 전환까지 완료한 것은 아니다.

## 현재 기능 (2026-10-08)

홈 방·친구/의상·가구·서울 시각·이름 밑 LV/XP·상단 코인/출석 유지. 둥근 도전 요약은 진행 중/시작 전/완료 순서와 해당 미션 이동, 목표 상품 미리보기/코인·레벨 조건을 표시한다. 공통 ScreenHeader와 44px 버튼, 파랑 주요 행동·연보라 선택·노랑 보상·크림 카드. 에이투지체 실제 400/500/600 번들·OS 폴백. 모든 목록은 부모 ScrollView 하나, KeyboardAvoidingView를 유지한다.

일일 루틴3(출석/일기/다른 샘플 이웃 방명록)+변경 활동3. 기능 저장 성공으로 루틴 완료, 활동 시작/해냈어요·보류/교체·선택 부담 응답. 기존 최대3개 선택·전역3회 제한은 새 화면에 사용하지 않는다. 날짜/슬롯 원장으로 중복 방지. 주간/월간 집계·성장·가격/해금은 공유 utils 사용. 로컬 보상 정책과 서버 충돌은 [기능 명세서](../frontend/FEATURE_SPEC.md)의 합의 표 참고.

일기 /diary: 모든 진입이 같은2000자 편집기. 질문과 감정5종 선택, 공백 거절, 초안 저장/복귀와 저장 중·성공·실패/재시도. 당일 수정/삭제/재작성·과거 읽기, 날짜목록/달력 유지. 삭제는 본문/초안 정리하고 완료/지급 원장은 보존. AsyncStorage 성공 뒤 완료/보상 반영. 샘플 이웃 글 등록도 글/루틴 저장 성공 뒤 반영하며 필터·실패 안내. 실제 상대 전달 없음.

상점 캐릭터/옷/집 구매·장착·해제/배치·목표, 출석 계획/보상, 설정 애칭/백업·가져오기/계정 삭제 안내 유지. 기존 정식6종의 SVG와 반응·모션 줄이기 유지. 실제 알림/오디오/원격 계정 삭제/서버/센서 인증 미연결.

## 저장과 웹 데이터 이관

기존 mochi.* 키와 자산/이름/옷장/배치/출석/글/과거 기록 보존. 새 dailyMissions/missionReceipts/missionSlots/journalDrafts는 같은 game에 저장한다. 이전 기록은 지급 없이 연결, 반복 이관 안전. 비동기 저장 직렬화, 실패 시 초기화하지 않고 안내. 브라우저와 앱 저장소는 별개다.

웹 설정의 현재 기록 백업 JSON을 앱 설정 백업·가져오기에서 확인 후 가져온다. 가져오기는 현재 앱 상태를 교체하므로 먼저 앱 기록을 복사할 수 있다. 개인 일기/글을 포함하므로 백업은 사용자가 관리하고 서버로 보내지 않는다.

## 정면 시안 미리보기

개발 /friend-preview는 GameApp·AsyncStorage·출석을 우회한다. 버터 곰 밀루/살구 강아지 라니/솜귀 고양이 루루 기본 SVG를 구름/달빛 양과200/110/64/40px·같은 방에서 비교. 웹 ?preview=friends와 같은 PrototypeFriendDrawing 도형을 react-native-svg 어댑터로 표시한다. 정식 소유·상점 추가/지급·새 의상 맞춤·모션 연결 없음. 이름/서사는 가칭이다.

## 검증과 남은 범위

공유 로직/모바일 저장 포함51개 테스트 통과. 웹 자동 렌더링 캡처는 ../artifacts/ui-review/. 모바일 타입 검사는 allowJs/checkJs:false이고 엄격한 타입 전환은 아니다. 린트와 iOS/Android/웹 번들을 확인하며 실제 기기 키보드·터치·모션·접근성은 미확인이다. export는 서명 IPA/APK나 TestFlight 테스트가 아니다.

서버 실제 계정·동기화·보상 권한·일기 삭제·주제 교체·인증·신고/차단·계정 삭제·알림·배포·스토어 제출은 별도 연결 필요. backend/는 이번 작업에서 읽기만 했다. 가격/XP/교체 정책의 충돌은 명세서의 현재 프론트/서버/추천안을 기준으로 팀과 결정한다.

코드: GameApp.jsx 상태·저장·날짜·연결, screens 네이티브 UI, ui.jsx 공통 규칙, storage.js 백업/복원, actions.js 의상·반응, frontend/src/utils/dailyMissions.js 공유6개 미션/원장. 폰트/라이선스 [FONT_LICENSE.md](../frontend/FONT_LICENSE.md).

## 변경 이력

- 2026-10-07: Expo/RN 전환, 원래6종 SVG/저장 이관·반응·일기/달력/계정 안내 구현.
- 2026-10-08: 공통 헤더/버튼·홈 요약·도전 밀도, 정면 디자인3종 비교, 일일6개/공통 일기/초안/실패 재시도/실제 로컬 성공 연결·무보상 기존기록 이관. 새3종 의상/모션/구매는 보류.


## 승인된 신규 친구 의상·반응 미리보기
개발 /friend-preview에서 밀루·라니·루루의 기존 의상 4종과 반응을 비교한다. 기본 승인 SVG 원본과 현재 기본을 함께 표시하며 홈 배경·상점·프로필 크기를 제공한다. 기존 Character 성공 이벤트와 키보드/터치·깜빡임·모션 줄이기를 재사용한다. 지급·구매·해금·저장 구조는 변경하지 않는다. 번들/lint/typecheck 확인, 실제 iOS/Android 화면·터치는 미확인.
