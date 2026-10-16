import { PROTOTYPE_FRIENDS } from '../data/prototypeFriends.js';
import { BASIC_FRIEND_DRAFTS } from '../data/characterExpansion.js';
import { levelFor } from './levelProgression.js';
// Stable preview IDs become ordinary coin products, never automatic grants.
export const FINAL_FRIENDS = [
  { ...PROTOTYPE_FRIENDS[0], level: 4, price: 300, revision: 'B', faceY: 88, gesture: 'nod' },
  { ...PROTOTYPE_FRIENDS[1], level: 7, price: 350, revision: 'A', faceY: 88, gesture: 'wag' },
  { ...PROTOTYPE_FRIENDS[2], level: 10, price: 450, revision: 'A', faceY: 88, gesture: 'tilt' },
  { ...BASIC_FRIEND_DRAFTS.find(friend => friend.id === 'draft-duck'), level: 15, price: 600, revision: 'C', color: '#FFF0B5', faceY: 88, gesture: 'cheer' },
  { ...BASIC_FRIEND_DRAFTS.find(friend => friend.id === 'draft-deer'), level: 20, price: 625, revision: 'A-no-spots', feature: '잎 모양 귀·둥근 주둥이·짧은 발굽', distinction: '라니의 처진 귀와 달리 잎 귀와 작은 발굽', color: '#EAD3B6', faceY: 91, gesture: 'tilt' },
  { ...BASIC_FRIEND_DRAFTS.find(friend => friend.id === 'draft-hedgehog'), level: 25, price: 650, revision: 'B', color: '#FFF0DC', faceY: 97, gesture: 'nod' },
].map(({ stage, ...friend }) => friend);
export const finalFriend = id => FINAL_FRIENDS.find(friend => friend.id === id);
export function characterAvailability(game, item) {
  if (game.characters.includes(item.id)) return game.character === item.id ? 'active' : 'owned';
  if (item.method) return 'special';
  if (levelFor(game.xp) < item.level) return 'level';
  return game.coins < item.price ? 'coins' : 'available';
}
export const CHARACTER_STATUS = { active: '함께하는 중 ✓', owned: '보유 중', special: '보상으로 만나요', level: '레벨 미달', coins: '코인 부족', available: '구매 가능' };
