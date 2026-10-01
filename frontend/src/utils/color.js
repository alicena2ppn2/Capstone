// 떡 몸통 테두리처럼, 바탕색을 60% 밝기로 어둡게 만든다.
export function darken(hex) {
  let h = String(hex || '#FFD9C4').replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return '#9A7A66';
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgb(${Math.round(r * 0.6)}, ${Math.round(g * 0.6)}, ${Math.round(b * 0.6)})`;
}

// 텍스트 외곽선 효과 (시안의 text-shadow 8방향 + 아래 그림자)
export function outline(color, w, drop = 0) {
  const s = [
    `${w}px 0 0 ${color}`, `-${w}px 0 0 ${color}`, `0 ${w}px 0 ${color}`, `0 -${w}px 0 ${color}`,
    `${w}px ${w}px 0 ${color}`, `-${w}px -${w}px 0 ${color}`, `${w}px -${w}px 0 ${color}`, `-${w}px ${w}px 0 ${color}`,
  ];
  if (drop) s.push(`0 ${drop}px 0 ${color}`);
  return s.join(', ');
}

export const PET_COLORS = [
  { name: '복숭아', hex: '#FFD9C4' },
  { name: '민트', hex: '#CDEFE0' },
  { name: '라벤더', hex: '#E3D9F7' },
  { name: '바나나', hex: '#FFF1B8' },
  { name: '하늘', hex: '#D3E8FA' },
  { name: '딸기', hex: '#F9D4E2' },
  { name: '흰떡', hex: '#FFFFFF' },
];
