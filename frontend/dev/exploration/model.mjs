// Fictional public places and planar metres. These are NOT geographical coordinates.
export const POLICY = Object.freeze({ radius: 35, maxAccuracy: 20, maxAge: 15000, noteLimit: 140 });
export const PLACES = Object.freeze([
  { id: 'park', name: '햇살 공원', kind: '공원', x: 180, y: 320, intro: '나무 그늘과 작은 벤치가 있는 가상의 공공 공원.', reward: { coins: 20, xp: 10, item: '산책 스티커' }, notes: ['그늘에 앉으니 바람 소리가 들렸어요.', '오늘 이곳에서 잠깐 쉬어 갔어요.'] },
  { id: 'library', name: '모퉁이 도서관', kind: '공공 도서관', x: 360, y: 210, intro: '책과 조용한 마당이 있는 가상의 공공 도서관.', reward: { coins: 20, xp: 10, item: '책갈피 스티커' }, notes: ['마음에 드는 책 제목 하나를 발견했어요.', '책장을 천천히 둘러봐도 좋더라고요.'] },
  { id: 'square', name: '바람 광장', kind: '공공 광장', x: 480, y: 370, intro: '넓은 하늘을 볼 수 있는 가상의 열린 광장.', reward: { coins: 20, xp: 10, item: '바람 스티커' }, notes: ['저녁 하늘 색이 예뻤어요.', '아무것도 사지 않고 잠깐 머물렀어요.'] },
]);
export const ROUTE = Object.freeze([{ x: 70, y: 450 }, PLACES[0], { x: 250, y: 300 }, PLACES[1], { x: 420, y: 290 }, PLACES[2]]);
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function pointAt(progress) {
  const index = Math.min(ROUTE.length - 2, Math.floor(progress));
  const t = Math.min(1, progress - index), a = ROUTE[index], b = ROUTE[index + 1];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
export function arrival(place, fixes, now = Date.now()) {
  if (!place) return { ok: false, text: '장소를 선택해 주세요.' };
  if (fixes.length < 2) return { ok: false, text: '최근 위치를 한 번 더 확인해 주세요.' };
  if (fixes.some(f => !Number.isFinite(f.x) || !Number.isFinite(f.y)) || fixes[0].timestamp >= fixes.at(-1).timestamp) return { ok: false, text: '서로 다른 최근 측정값이 필요해요. 다시 확인해 주세요.' };
  if (fixes.some(f => !Number.isFinite(f.timestamp) || now - f.timestamp > POLICY.maxAge || now < f.timestamp)) return { ok: false, text: '오래된 위치예요. 위치를 다시 확인해 주세요.' };
  if (fixes.some(f => !Number.isFinite(f.accuracy) || f.accuracy > POLICY.maxAccuracy || f.accuracy < 0)) return { ok: false, text: '정확도가 부족해요. 위치를 다시 확인해 주세요.' };
  if (fixes.some(f => distance(f, place) > POLICY.radius)) return { ok: false, text: '이동 중 · 아직 도착 반경 밖이에요.' };
  return { ok: true, text: '도착 확인 가능 · 직접 확인해 주세요.' };
}
export function confirmVisit(state, place, fixes, now) {
  if (state.visits[place.id] || !arrival(place, fixes, now).ok) return state;
  return { ...state, visits: { ...state.visits, [place.id]: true } };
}
export function claimExample(state, place) {
  if (!state.visits[place.id] || state.claims[place.id]) return state;
  return { ...state, claims: { ...state.claims, [place.id]: true } };
}
export const emptyState = () => ({ visits: {}, claims: {}, notes: [] });
