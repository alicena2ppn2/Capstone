import { darken } from '../utils/color.js';

// 떡 캐릭터. full = 홈 화면용(발·팔·하이라이트·잠자는 얼굴), 아니면 아바타용 얼굴만.
export default function Mochi({ color, width, height, full = false, asleep = false, label }) {
  const stroke = darken(color);
  const sw = full ? 4 : 6;
  const leafSw = full ? 3 : 4;
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };

  return (
    <svg width={width} height={height} viewBox="0 0 200 190" {...a11y}>
      {full && <ellipse cx="100" cy="180" rx="64" ry="9" fill="#000000" opacity="0.08" />}
      <line x1="100" y1="38" x2="100" y2="20" stroke="#4E9A63" strokeWidth={full ? 3 : 5} strokeLinecap="round" />
      <path d="M100 24 C88 10 74 14 72 22 C84 30 94 30 100 24Z" fill="#8CCB8F" stroke="#4E9A63" strokeWidth={leafSw} strokeLinejoin="round" />
      <path d="M100 20 C112 4 128 8 130 16 C118 26 106 26 100 20Z" fill="#8CCB8F" stroke="#4E9A63" strokeWidth={leafSw} strokeLinejoin="round" />
      {full && (
        <>
          <ellipse cx="72" cy="174" rx="17" ry="9" fill={color} stroke={stroke} strokeWidth="4" />
          <ellipse cx="128" cy="174" rx="17" ry="9" fill={color} stroke={stroke} strokeWidth="4" />
        </>
      )}
      <path d="M100 36 C150 36 176 80 176 122 C176 160 146 174 100 174 C54 174 24 160 24 122 C24 80 50 36 100 36Z" fill={color} stroke={stroke} strokeWidth={sw} />
      {full && (
        <>
          <ellipse cx="34" cy="128" rx="13" ry="9" fill={color} stroke={stroke} strokeWidth="4" transform="rotate(-25 34 128)" />
          <ellipse cx="166" cy="128" rx="13" ry="9" fill={color} stroke={stroke} strokeWidth="4" transform="rotate(25 166 128)" />
          <path d="M58 70 C66 58 82 52 96 52" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
        </>
      )}
      <ellipse cx="62" cy="120" rx="13" ry="8" fill="#F59AA8" opacity="0.65" />
      <ellipse cx="138" cy="120" rx="13" ry="8" fill="#F59AA8" opacity="0.65" />
      {asleep ? (
        <g>
          <path d="M67 102 Q76 109 85 102" fill="none" stroke="#3B2A2A" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M115 102 Q124 109 133 102" fill="none" stroke="#3B2A2A" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M95 118 Q100 121 105 118" fill="none" stroke="#3B2A2A" strokeWidth="3" strokeLinecap="round" />
          <text x="150" y="58" fontFamily="Jua, sans-serif" fontSize="22" fill="#4B6E96">z</text>
          <text x="164" y="40" fontFamily="Jua, sans-serif" fontSize="16" fill="#4B6E96">z</text>
        </g>
      ) : full ? (
        <g>
          <ellipse cx="76" cy="100" rx="7" ry="9" fill="#3B2A2A" />
          <circle cx="78.5" cy="96" r="2.6" fill="#FFFFFF" />
          <ellipse cx="124" cy="100" rx="7" ry="9" fill="#3B2A2A" />
          <circle cx="126.5" cy="96" r="2.6" fill="#FFFFFF" />
          <path d="M90 114 Q100 126 110 114" fill="#E8707E" stroke="#3B2A2A" strokeWidth="3" strokeLinejoin="round" />
        </g>
      ) : (
        <g>
          <ellipse cx="76" cy="100" rx="8" ry="10" fill="#3B2A2A" />
          <circle cx="79" cy="95" r="3" fill="#FFFFFF" />
          <ellipse cx="124" cy="100" rx="8" ry="10" fill="#3B2A2A" />
          <circle cx="127" cy="95" r="3" fill="#FFFFFF" />
          <path d="M90 114 Q100 126 110 114" fill="#E8707E" stroke="#3B2A2A" strokeWidth="4" strokeLinejoin="round" />
        </g>
      )}
    </svg>
  );
}
