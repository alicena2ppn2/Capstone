import { FINAL_FRIENDS } from '../features/finalFriends.js';
export const CHARACTERS = [
  { id: 'potato', name: '꼬질이', level: 1, price: 0, color: '#D6AE7F', method: 'starter' },
  { id: 'pink', name: '복숭이', level: 3, price: 0, color: '#FFE4D9', method: 'milestone' },
  { id: 'mochi', name: '구르미', level: 5, price: 300, color: '#FFF5E6' },
  { id: 'lavender', name: '양양이', level: 8, price: 450, color: '#F3EDFF' },
  { id: 'mint', name: '북북이', level: 12, price: 600, color: '#D9EDBC' },
  { id: 'sky', name: '팽이', level: 1, price: 0, color: '#D9EAF5', method: 'quest' },
  ...FINAL_FRIENDS,
].sort((a, b) => a.level - b.level);
