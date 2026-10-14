export const USERS = [
  { id: 'yuna', name: '유나', nickname: '복숭아산책', icon: '🍑', variant: 'pink', wall: '#FBE5DE', floor: '#E7C8AE', theme: '햇살 가득 복숭아 방', detail: '꽃을 모으고 느긋하게 산책해요.', decor: '🌷' },
  { id: 'taeo', name: '태오', nickname: '달잠꾸러기', icon: '🌙', variant: 'lavender', wall: '#E8E0F5', floor: '#D6C5DF', theme: '포근한 달빛 방', detail: '잠들기 전 좋아하는 책 한 페이지.', decor: '⭐' },
  { id: 'harin', name: '하린', nickname: '파도한스푼', icon: '🐚', variant: 'sky', wall: '#DCEEF5', floor: '#C5DADB', theme: '시원한 바닷바람 방', detail: '파도 소리와 시원한 음료를 좋아해요.', decor: '🐚' },
  { id: 'minseo', name: '민서', nickname: '초록쉼표', icon: '🌿', variant: 'mint', wall: '#E5EFD8', floor: '#D1D7B7', theme: '새잎이 자라는 방', detail: '작은 화분과 함께 천천히 자라요.', decor: '🪴' },
  { id: 'jiho', name: '지호', nickname: '구름우체국', icon: '☁️', variant: 'mochi', wall: '#E1EBFA', floor: '#E9D6BF', theme: '구름 편지가 도착하는 방', detail: '오늘도 다정한 안부를 기다려요.', decor: '💌' },
  { id: 'sua', name: '수아', nickname: '감자일기', icon: '🥔', variant: 'potato', wall: '#F5EBCF', floor: '#DFC4A2', theme: '작고 따뜻한 다락방', detail: '소소한 하루를 차곡차곡 기록해요.', decor: '📚' },
  { id: 'seojun', name: '서준', nickname: '하와이낮잠', icon: '🌺', variant: 'lavender', wall: '#F5DED4', floor: '#DCC7B2', theme: '노을이 쉬어가는 방', detail: '여행을 꿈꾸며 오늘도 편히 쉬어요.', decor: '🌺' },
  { id: 'nari', name: '나리', nickname: '뉴욕별빛', icon: '🌃', variant: 'mochi', wall: '#E0E0EE', floor: '#CECADB', theme: '도시의 별빛 방', detail: '창밖 불빛을 보며 음악을 들어요.', decor: '⭐' },
  { id: 'doyun', name: '도윤', nickname: '괌바람', icon: '🏝️', variant: 'sky', wall: '#D4EFE7', floor: '#DCCFAE', theme: '에메랄드 휴식 방', detail: '오늘은 마음을 바다에 띄워요.', decor: '🐚' },
  { id: 'eunha', name: '은하', nickname: '벚꽃우유', icon: '🌸', variant: 'pink', wall: '#F6E1E9', floor: '#E8D3C7', theme: '벚꽃 향기 작은 방', detail: '꽃잎처럼 가벼운 하루를 보내요.', decor: '🌸' },
  { id: 'jun', name: '준', nickname: '시드니오후', icon: '⛵', variant: 'mint', wall: '#DDE9ED', floor: '#D5C9B9', theme: '항구가 보이는 방', detail: '잔잔한 오후와 느린 산책을 좋아해요.', decor: '⛵' },
  { id: 'bom', name: '봄', nickname: '단풍감자', icon: '🍁', variant: 'potato', wall: '#EDDFCC', floor: '#D9BE9E', theme: '가을 산책 다락방', detail: '책 한 권과 따뜻한 차를 준비했어요.', decor: '📚' },];
const SCENERY = ['view-jeju', 'view-newyork', 'view-gangneung', 'view-seorak', 'view-japan', 'view-guam', 'view-hawaii', 'view-newyork', 'view-guam', 'view-japan', 'view-australia', 'view-seorak'];
USERS.forEach((user, index) => {
  user.decorItems = { lamp: index % 2 ? 'lamp-moon' : 'lamp-flower', carpet: index % 3 ? 'carpet-peach' : 'carpet-sea', frame: index % 2 ? 'frame-night' : 'frame-flower', doll: index % 3 ? 'doll-bunny' : 'doll-bear', scenery: SCENERY[index] };
  user.outfit = ['berry', 'star', 'sky', 'leaf'][index % 4];
});
// 날짜 시드로 추천을 섞고, 이전 추천을 제외해 다음 방문 날짜에는 새 이웃을 보여준다.
export function recommendedUsers(day, excluded = []) {
  let seed = [...day].reduce((value, char) => (Math.imul(value, 31) + char.charCodeAt(0)) >>> 0, 2166136261);
  const pool = USERS.filter(user => !excluded.includes(user.id));
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}
export function dailyVisitors(day, previous) {
  if (previous?.day === day && Array.isArray(previous.ids) && previous.ids.length === 3 && new Set(previous.ids).size === 3 && previous.ids.every(id => USERS.some(user => user.id === id))) return previous;
  return { day, ids: recommendedUsers(day, Array.isArray(previous?.ids) ? previous.ids : []).map(user => user.id) };
}

export const VISITOR_NOTES = Object.fromEntries(USERS.map((user, index) => [user.id, [
  { id: `${user.id}-hello`, name: USERS[(index + 1) % USERS.length].nickname, variant: USERS[(index + 1) % USERS.length].variant, text: '창밖 풍경이 정말 포근해요. 오늘도 좋은 하루 보내세요!', date: '2026-10-05', likes: 2 + index % 4 },
  { id: `${user.id}-room`, name: USERS[(index + 4) % USERS.length].nickname, variant: USERS[(index + 4) % USERS.length].variant, text: '소품들이 너무 귀여워서 잠깐 쉬어가요. 다음에 또 올게요!', date: '2026-10-04', likes: 1 + index % 3 },
]]));
