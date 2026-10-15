// 옷 무늬 (땡땡이·스트라이프·체크·무지개 등). 모든 친구가 같은 무늬를 같은 크기로 입는다 (viewBox 200×210 기준).
// 웹은 기본 태그를, 앱(react-native-svg)은 elements로 Pattern·Rect·Circle·Path를 넘긴다.
// elements를 넘겼는데 Pattern이 없으면 무늬 없이 단색으로 그린다 (앱이 깨지지 않게).

export function canPattern(elements) {
  return !elements || !Object.keys(elements).length || !!elements.Pattern;
}

export function garmentFill(outfit, id, elements) {
  return outfit?.pattern && canPattern(elements) ? `url(#${id})` : outfit?.color;
}

export default function GarmentPattern({ outfit, id, elements }) {
  if (!outfit?.pattern || !canPattern(elements)) return null;
  const { Defs = 'defs', Pattern = 'pattern', Rect = 'rect', Circle = 'circle', Path = 'path' } = elements ?? {};
  const base = outfit.color, ink = outfit.ink ?? outfit.trim, alt = outfit.alt ?? '#FFFFFF';
  const tiles = {
    dots: [10, 10, <><Circle cx="2.5" cy="2.5" r="1.9" fill={ink} /><Circle cx="7.5" cy="7.5" r="1.9" fill={ink} /></>],
    stripes: [8, 8, <Rect x="0" y="0" width="8" height="3" fill={ink} />],
    pinstripe: [6, 6, <Rect x="0" y="0" width="1.4" height="6" fill={ink} />],
    gingham: [10, 10, <><Rect x="0" y="0" width="5" height="10" fill={ink} opacity=".45" /><Rect x="0" y="0" width="10" height="5" fill={ink} opacity=".45" /></>],
    rainbow: [24, 24, <><Rect y="0" width="24" height="4" fill="#F7A8A8" /><Rect y="4" width="24" height="4" fill="#F9C98E" /><Rect y="8" width="24" height="4" fill="#F7E58E" /><Rect y="12" width="24" height="4" fill="#B6DFA3" /><Rect y="16" width="24" height="4" fill="#A8CFF2" /><Rect y="20" width="24" height="4" fill="#C9B4EC" /></>],
    zigzag: [12, 8, <Path d="M0 6 L3 2 L6 6 L9 2 L12 6" fill="none" stroke={ink} strokeWidth="1.6" />],
    sprinkle: [14, 14, <><Rect x="2" y="3" width="4" height="1.6" rx=".8" fill={ink} transform="rotate(30 4 4)" /><Rect x="8" y="9" width="4" height="1.6" rx=".8" fill={alt} transform="rotate(-25 10 10)" /><Circle cx="11" cy="3" r="1.1" fill={alt} /><Circle cx="4" cy="11" r="1.1" fill={ink} /></>],
  };
  const tile = tiles[outfit.pattern];
  if (!tile) return null;
  const [w, h, shapes] = tile;
  // 스트라이프 계열은 살짝 기울여 옷처럼 보이게
  const tilt = outfit.pattern === 'stripes' || outfit.pattern === 'rainbow' ? 'rotate(0)' : outfit.pattern === 'pinstripe' ? 'rotate(8)' : undefined;
  return <Defs><Pattern id={id} patternUnits="userSpaceOnUse" width={w} height={h} patternTransform={tilt}>
    <Rect x="0" y="0" width={w} height={h} fill={base} />
    {shapes}
  </Pattern></Defs>;
}
