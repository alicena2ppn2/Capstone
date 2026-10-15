// Official URLs checked 2026-10-15. Never append diary/account/location data.
export const HELP = Object.freeze({
  title: '도움이 필요할 때',
  description: '혼자 정리하기 어려운 마음이나 생활의 고민이 있다면, 도움받을 곳을 찾아볼 수 있어요.',
  scope: 'MY MOCHI는 전문 상담이나 긴급 대응을 제공하지 않으며, 일기를 실시간으로 모니터링하지 않아요. 아래 버튼은 외부 상담·지원 서비스로 연결돼요.',
  region: '대한민국 국내 서비스 안내예요. 이용 대상과 운영 안내는 각 공식 사이트에서 확인해 주세요.',
  checked: '2026-10-15',
  services: [
    { id: 'counsel', title: '상담받을 곳 찾기', name: '국가정신건강정보포털', url: 'https://www.mentalhealth.go.kr/portal/health/fac/PotalHealthFacListTab2.do', note: '지역과 기관 정보를 확인할 수 있어요. 제공 서비스와 이용 조건은 기관마다 달라요.' },
    { id: 'welfare', title: '생활·복지 지원 알아보기', name: '보건복지상담센터', phone: '129', url: 'https://www.129.go.kr/', note: '생활·복지 지원에 관한 공식 안내를 확인해 보세요.' },
    { id: 'crisis', title: '위기 상황에서 상담하기', name: '자살예방상담전화', phone: '109', url: 'https://www.129.go.kr/109', note: '위기 상황에서 상담이 필요할 때 이용할 수 있는 전화예요.' },
  ],
});
