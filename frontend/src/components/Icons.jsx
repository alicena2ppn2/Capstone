import { colors } from '../../../shared/theme/tokens.js';
// 여러 화면에서 같이 쓰는 아이콘

const GEAR = 'M12 2.5l1.6 2.3 2.7-.6.6 2.7 2.3 1.6-1.2 2.5 1.2 2.5-2.3 1.6-.6 2.7-2.7-.6L12 21.5l-1.6-2.3-2.7.6-.6-2.7-2.3-1.6L6 12 4.8 9.5l2.3-1.6.6-2.7 2.7.6z';
export const HEART = 'M8 13 C3 9 1 7 1 4.5 C1 2.5 2.6 1 4.4 1 C6 1 7.2 2 8 3.2 C8.8 2 10 1 11.6 1 C13.4 1 15 2.5 15 4.5 C15 7 13 9 8 13Z';
const STAR = 'M10 1 l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L1.4 7.3l6-.7Z';

export function GearIcon({ size = 30, fill = colors.primarySoft }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={colors.primary} strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d={GEAR} />
      <circle cx="12" cy="12" r="3.2" fill={colors.surface} />
    </svg>
  );
}

export function ShopIcon({ width = 32, height = 30 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 32 30" aria-hidden="true">
      <path d="M3 11 H29 L26 27 H6 Z" fill={colors.primarySoft} stroke={colors.primary} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10 11 L14 3 M22 11 L18 3" stroke={colors.primary} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M10 16 V23 M16 16 V23 M22 16 V23" stroke={colors.primary} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function HeartIcon({ width = 16, height = 14, fill, stroke, strokeWidth = 1.6, style }) {
  return (
    <svg width={width} height={height} viewBox="0 0 16 14" aria-hidden="true" style={style}>
      <path d={HEART} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    </svg>
  );
}

export function StarIcon({ size = 22, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" style={style}>
      <path d={STAR} fill="#F7D35C" stroke="#3A3A55" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
