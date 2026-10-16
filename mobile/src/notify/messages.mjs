// 다시 부르기 알림 문구 (며칠째에 무엇을 보낼지). 친구 이름에 받침이 있으면 '이', 없으면 '가'
export const ga = name => { const c = name.charCodeAt(name.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? `${name}이` : `${name}가`; };
export const comebackMessages = name => [
  { days: 2, title: `${ga(name)} 기다리고 있어요 🥺`, body: '오늘 미션 하나만 같이 해 볼까요?' },
  { days: 4, title: `${ga(name)} 창밖만 보고 있어요`, body: '잠깐 들러서 출석 선물 받아 가요 🎁' },
  { days: 7, title: `${ga(name)} 보고 싶어해요`, body: '오랜만이어도 괜찮아요. 천천히 다시 시작해요.' },
];
