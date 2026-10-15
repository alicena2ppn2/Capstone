export const DECOR = [
  { id: 'lamp-moon', name: '달빛 전등', slot: 'lamp', level: 1, price: 90, color: '#EDD58D', icon: '🌙' },
  { id: 'lamp-flower', name: '꽃잎 전등', slot: 'lamp', level: 4, price: 180, color: '#F3BDD0', icon: '🌷' },
  { id: 'carpet-peach', name: '복숭아 카페트', slot: 'carpet', level: 1, price: 100, color: '#F1BAC6', icon: '🍑' },
  { id: 'carpet-sea', name: '파도 카페트', slot: 'carpet', level: 5, price: 220, color: '#98CEDC', icon: '🌊' },
  { id: 'frame-flower', name: '꽃밭 액자', slot: 'frame', level: 2, price: 120, color: '#C2D8AD', icon: '🌼' },
  { id: 'frame-night', name: '별밤 액자', slot: 'frame', level: 6, price: 250, color: '#9A9DC6', icon: '🌌' },
  { id: 'doll-bear', name: '포근 곰 인형', slot: 'doll', level: 2, price: 140, color: '#D6B18B', icon: '🧸' },
  { id: 'doll-bunny', name: '낮잠 토끼 인형', slot: 'doll', level: 7, price: 280, color: '#EAC4D1', icon: '🐰' },
  { id: 'view-gangneung', name: '강릉 바다', slot: 'scenery', level: 1, price: 150, color: '#A8DAEC', icon: '🌊', landscape: 'coast' },
  { id: 'view-jeju', name: '제주도 유채밭', slot: 'scenery', level: 3, price: 200, color: '#A5CFB3', icon: '🌼', landscape: 'jeju' },
  { id: 'view-japan', name: '일본 벚꽃 거리', slot: 'scenery', level: 4, price: 240, color: '#F0C5DA', icon: '🌸', landscape: 'sakura' },
  { id: 'view-seorak', name: '설악산 단풍', slot: 'scenery', level: 5, price: 280, color: '#D7AF8C', icon: '🍁', landscape: 'mountain' },
  { id: 'view-guam', name: '괌 에메랄드 해변', slot: 'scenery', level: 6, price: 320, color: '#8EDBCF', icon: '🏝️', landscape: 'island' },
  { id: 'view-hawaii', name: '하와이 노을', slot: 'scenery', level: 8, price: 380, color: '#F3BBA7', icon: '🌺', landscape: 'sunset' },
  { id: 'view-australia', name: '호주 시드니 항구', slot: 'scenery', level: 10, price: 450, color: '#B7D7EA', icon: '⛵', landscape: 'harbour' },
  { id: 'view-newyork', name: '뉴욕 야경', slot: 'scenery', level: 12, price: 520, color: '#8B93BD', icon: '🌃', landscape: 'city' },
  // 벽지·바닥 (10/15): 색 + 무늬. 방 그림의 벽·바닥 전체를 바꾼다
  { id: 'wall-cream-dot', name: '크림 땡땡이 벽지', slot: 'wallpaper', level: 1, price: 80, color: '#FFF4DE', pattern: 'dots', ink: '#F2D8A7', icon: '🟡' },
  { id: 'wall-mint-stripe', name: '민트 줄무늬 벽지', slot: 'wallpaper', level: 1, price: 100, color: '#DDF1EA', pattern: 'stripes', ink: '#BFE3D6', icon: '🟢' },
  { id: 'wall-peach-check', name: '복숭아 체크 벽지', slot: 'wallpaper', level: 2, price: 140, color: '#FFE7DD', pattern: 'gingham', ink: '#F6BFA9', icon: '🍑' },
  { id: 'wall-lavender-dot', name: '라벤더 땡땡이 벽지', slot: 'wallpaper', level: 3, price: 160, color: '#ECE6FA', pattern: 'dots', ink: '#CFC3F0', icon: '💜' },
  { id: 'wall-lemon-stripe', name: '레몬 세로줄 벽지', slot: 'wallpaper', level: 4, price: 180, color: '#FFF7D1', pattern: 'pinstripe', ink: '#F1DD86', icon: '🍋' },
  { id: 'wall-night-star', name: '밤하늘 별 벽지', slot: 'wallpaper', level: 6, price: 240, color: '#3F4B78', pattern: 'sprinkle', ink: '#FFE38A', icon: '🌙' },
  { id: 'floor-walnut', name: '진한 원목 바닥', slot: 'floor', level: 1, price: 100, color: '#B98A5E', pattern: 'planks', ink: '#9C7049', icon: '🪵' },
  { id: 'floor-pink-wood', name: '벚꽃 마루', slot: 'floor', level: 2, price: 140, color: '#F1C9C2', pattern: 'planks', ink: '#E0A9A0', icon: '🌸' },
  { id: 'floor-mint-tile', name: '민트 타일 바닥', slot: 'floor', level: 3, price: 160, color: '#D4EEE6', pattern: 'gingham', ink: '#A9D9CB', icon: '🟩' },
  { id: 'floor-checker', name: '체커보드 바닥', slot: 'floor', level: 5, price: 200, color: '#F6EEDF', pattern: 'checker', ink: '#D9C3A0', icon: '🏁' },
];
export const DECOR_SLOTS = { wallpaper: '벽지', floor: '바닥', lamp: '전등', carpet: '카페트', frame: '액자', doll: '인형', scenery: '창밖 풍경' };
// 손가락으로 끌어서 옮길 수 있는 소품 (카페트·창밖·벽지·바닥은 자리가 정해져 있음)
export const MOVABLE_SLOTS = ['lamp', 'frame', 'doll'];
