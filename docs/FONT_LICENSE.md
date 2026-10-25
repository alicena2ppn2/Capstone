# 에이투지체(A2Z) 사용

확인일: 2026-10-07

- 공식 배포처: https://freesentation.blog/a2z
- 제작사: https://autoa2z.co.kr/typeface
- 공식 다운로드: https://github.com/Freesentation/A2Z/tree/main/v1.001
- 눈누 안내: https://noonnu.cc/font_page/1778
- SIL OFL 원문: https://openfontlicense.org/open-font-license-official-text/

공식 배포처는 9개 굵기(100~900), TTF/OTF/WOFF2와 SIL OFL 1.1을 명시한다. 상업적 사용·웹/앱 임베딩·재배포가 가능하며 폰트만 별도로 판매할 수 없다. 배포 시 저작권 표시와 라이선스를 포함한다. 원본 메타데이터의 Copyright © 2026 PT&와 OFL 전문을 웹·앱 폰트 폴더의 LICENSE.txt에 제공한다.

현재는 공식 v1.001 ZIP의 수정하지 않은 400 Regular, 500 Medium, 600 SemiBold만 사용한다. 파일명만 ASCII 경로로 저장하며 바이너리 변환/수정/서브셋 생성은 하지 않았다. TTF OS/2 굵기도 확인했다. 웹은 public/fonts 원본 WOFF2를 같은 출처에서 제공하고 preload·font-display:swap을 적용한다. 앱은 assets/fonts 원본 TTF를 expo-font로 로딩한다. 본문/입력/placeholder 400, 메뉴/버튼/보조 강조 500, 제목/친구 이름 600. IM혜민체·이전 Pretendard 자산 및 700 이상 파일/등록은 제거한다. 아이콘 전용 자원은 유지한다.

웹 로딩 실패 시 -apple-system/BlinkMacSystemFont/Segoe UI/Noto Sans KR/sans-serif, 앱은 OS 기본 글꼴을 사용한다. 합성 굵기·글자 그림자·외곽선으로 강조하지 않는다. 상점/프레임의 축소 scale/zoom은 코드상 없다. 캐릭터 눈 깜빡임 scale과 버튼 translate는 별개다. 작은 설명/보조 글씨는 충분한 크기와 대비로 표시한다.

확인: 원본 TTF 굵기, 로컬 WOFF2 HTTP 200/font/woff2 응답, 번들 파일 포함 여부. 실제 브라우저 FontFaceSet·계산 스타일·기기 확대율/DPR·픽셀 선명도 및 캡처는 브라우저 연결이 없어 미수행이다. 폰트 자체 해상도 결함으로 판단하지 않는다.
