import { FINAL_FRIENDS } from '../features/finalFriends.js';
export const FRIEND_INTROS = {
  potato: { personality: '소박한 친구', introduction: '작은 하루를 함께 쌓아 갈 꼬질 감자예요.' },
  pink: { personality: '포근한 친구', introduction: '복숭아빛 귀를 가진 토끼 친구예요.' },
  mochi: { personality: '부드러운 친구', introduction: '구름처럼 둥글고 폭신한 친구예요.' },
  lavender: { personality: '차분한 친구', introduction: '달빛을 닮은 양 친구예요.' },
  mint: { personality: '느긋한 친구', introduction: '새잎을 닮은 거북 친구예요.' },
  sky: { personality: '산뜻한 친구', introduction: '하늘빛 펭귄 친구예요.' },
  ...Object.fromEntries(FINAL_FRIENDS.map(friend => [friend.id, { ...friend, introduction: friend.introduction ?? friend.background }])),
};
export function restoreNicknames(state, legacyName) {
  if (state.nicknames && typeof state.nicknames === 'object' && !Array.isArray(state.nicknames)) return state;
  const name = typeof legacyName === 'string' ? legacyName.trim().slice(0, 12) : '';
  return { ...state, nicknames: name ? { [state.character ?? 'potato']: name } : {} };
}
