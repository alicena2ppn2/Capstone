import { FINAL_FRIENDS } from '../features/finalFriends.js';
export const CHARACTERS = [
  { id: 'potato', name: '꼬질 감자 모찌', level: 1, price: 0, color: '#D6AE7F', method: 'starter' },
  { id: 'pink', name: '복숭아 토끼 모찌', level: 3, price: 0, color: '#FFE4D9', method: 'milestone' },
  { id: 'mochi', name: '구름 모찌', level: 5, price: 300, color: '#FFF5E6' },
  { id: 'lavender', name: '달빛 양 모찌', level: 8, price: 450, color: '#F3EDFF' },
  { id: 'mint', name: '새잎 거북 모찌', level: 12, price: 600, color: '#D9EDBC' },
  { id: 'sky', name: '하루 펭귄 모찌', level: 1, price: 0, color: '#D9EAF5', method: 'quest' },
  ...FINAL_FRIENDS,
].sort((a, b) => a.level - b.level);
