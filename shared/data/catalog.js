import { FINAL_FRIENDS } from '../features/finalFriends.js';

const finalFriendIntros = Object.fromEntries(FINAL_FRIENDS.map(friend => [
  friend.id,
  { ...friend, introduction: friend.introduction ?? friend.background },
]));

export const FRIEND_INTROS = {
  potato: { personality: '엉뚱하고 노는 것을 좋아하는 칠칠맞은 친구.', introduction: '재미있는 일이 보이면 일단 달려가는 꼬질이. 신나게 놀고 돌아오면 꼭 뭔가를 두고 와요. 찾으러 가는 길에도 새 놀이를 발견하는 게 문제예요.', likes: '친구들과 놀기, 처음 해 보는 놀이', habit: '주머니에 뭘 넣었는지 까먹고 뒤늦게 꺼내 봐요.' },
  pink: { personality: '도도하고 취향이 확실한 친구.', introduction: '좋아하는 것도, 아닌 것도 분명한 복숭이. 다들 좋다고 해도 직접 보고 골라요. 리본 하나를 고르는 데도 오래 걸리지만, 마음에 든 건 오래오래 아껴요.', likes: '마음에 쏙 드는 리본과 소품', habit: '거울 앞에서 리본 각도를 조금씩 고쳐요.' },
  mochi: { personality: '친구들을 챙기고 함께하는 시간을 좋아해요.', introduction: '친구들 몫까지 챙기다 가방이 빵빵해져요. 같이 나누면 더 좋으니까요!' },
  lavender: { personality: '차분한 표정으로 엉뚱한 연구에 진지하게 몰두해요.', introduction: '가장 폭신한 구름을 찾으려고 관찰표를 만들었어요. 꽤 진지한 연구래요.' },
  mint: { personality: '작은 일도 오래 생각하고 친구에게 해 줄 말을 신중히 골라요.', introduction: '해 주고 싶은 말을 오래 고르다 타이밍을 놓쳐요. 돌아가는 길에도 네 이야기를 생각해요.' },
  sky: { personality: '새로운 상상과 아이디어에 쉽게 신나요.', introduction: '하고 싶은 일을 적다가 종이가 모자랐어요. 다 못 해도 다음 상상이 기다리는 팽이!' },
  ...finalFriendIntros,
  'proto-pear': { ...finalFriendIntros['proto-pear'], introduction: '좋은 냄새를 따라 구경하다 햇볕 아래서 꾸벅. 마음에 드는 순간엔 오래 머물러요.' },
  'proto-quilt': { ...finalFriendIntros['proto-quilt'], introduction: '궁금한 건 못 지나치지만 정답에는 느긋해요. 딴생각하다 재밌는 걸 발견하거든요.' },
  'draft-duck': { ...finalFriendIntros['draft-duck'], introduction: '작은 웅덩이도 포포에겐 대모험! 신나는 일은 꼭 친구를 불러 같이 해요.' },
  'draft-deer': { ...finalFriendIntros['draft-deer'], introduction: '필요한 걸 챙기고 먼저 한 발 내딛어요. 가끔 너무 앞서가서 친구 의견을 뒤늦게 물어요.' },
  'draft-hedgehog': { ...finalFriendIntros['draft-hedgehog'], introduction: '주운 단추 하나에도 이야기를 붙여요. 소중해서 숨겨 놓고, 어디 뒀는지 또 잊었대요.' },
};

export function restoreNicknames(state, legacyName) {
  if (state.nicknames && typeof state.nicknames === 'object' && !Array.isArray(state.nicknames)) return state;
  const name = typeof legacyName === 'string' ? legacyName.trim().slice(0, 12) : '';
  return { ...state, nicknames: name ? { [state.character ?? 'potato']: name } : {} };
}
