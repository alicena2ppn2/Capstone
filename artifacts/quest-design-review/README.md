# 퀘스트 디자인 비교 시안
현재 앱 파일과 저장 데이터를 수정하지 않는 독립 HTML 미리보기다. A 보상 보드 / B 체크리스트 / C 루틴+활동 카드. A2z 폰트는 기존 localhost:5180 웹폰트를 읽는다. friend.svg는 기존 캐릭터의 실제 렌더링에서 읽어낸 정적 이미지다.
실제 완료/보상/일기/사진 저장에 연결하지 않는다. 2/6 상태와 보상 표시는 비교용 예시다.
실행: 프로젝트 루트에서 `python -m http.server 5191 --bind 127.0.0.1 --directory artifacts/quest-design-review`
주소: http://127.0.0.1:5191/ (전체), ?view=A / ?view=B / ?view=C (개별).
원래 frontend/mobile 파일, 의존성, 사용자 저장 데이터, Git 브랜치/커밋/PR은 변경하지 않는다.
