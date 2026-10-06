import { CHARACTERS, levelFor } from './game.js';
import { CLOTHES } from './clothes.js';
import { DECOR } from './decor.js';

export const CATALOG = [
  ...CHARACTERS.filter(item => !item.method).map(item => ({ ...item, kind: 'character' })),
  ...CLOTHES.map(item => ({ level: 1, ...item, kind: 'clothes' })),
  ...DECOR.map(item => ({ ...item, kind: 'decor' })),
];
export function targetStatus(game, clothes = []) {
  const item = CATALOG.find(item => `${item.kind}:${item.id}` === game.targetItem);
  if (!item) return null;
  const owned = item.kind === 'character' ? game.characters : item.kind === 'decor' ? game.ownedDecor ?? [] : [...clothes, ...(game.attendanceClothes ?? [])];
  return { ...item, complete: owned.includes(item.id), coinsNeeded: Math.max(0, item.price - game.coins), levelsNeeded: Math.max(0, item.level - levelFor(game.xp)) };
}
export const FRIEND_INTROS = {
  potato: { personality: '소박한 친구', introduction: '작은 하루를 함께 쌓아 갈 꼬질 감자 모찌예요.' },
  pink: { personality: '포근한 친구', introduction: '복숭아빛 귀를 가진 토끼 친구예요.' },
  mochi: { personality: '부드러운 친구', introduction: '구름처럼 둥글고 폭신한 친구예요.' },
  lavender: { personality: '차분한 친구', introduction: '달빛을 닮은 양 친구예요.' },
  mint: { personality: '느긋한 친구', introduction: '새잎을 닮은 거북 친구예요.' },
  sky: { personality: '산뜻한 친구', introduction: '하늘빛 펭귄 친구예요.' },
};
export function restoreNicknames(state, legacyName) {
  if (state.nicknames && typeof state.nicknames === 'object' && !Array.isArray(state.nicknames)) return state;
  const name = typeof legacyName === 'string' ? legacyName.trim().slice(0, 12) : '';
  return { ...state, nicknames: name ? { [state.character ?? 'potato']: name } : {} };
}
