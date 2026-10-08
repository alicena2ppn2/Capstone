import Svg, { Path } from 'react-native-svg';
export default function MenuIcon({ kind }) {
  const visit = kind === 'visit';
  if (kind === 'diary') return <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}><Path d="M6 3 H20 V21 H6Z M3 6 H8 M3 11 H8 M3 16 H8 M11 8 H17 M11 12 H17" fill="#E5DFF8" stroke="#9480BB" strokeWidth={1.7} /></Svg>;
  return <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}><Path d={visit ? 'M3 11 L12 3 L21 11 M6 9 V21 H18 V9 M10 21 V14 H14 V21' : 'M5 3 H19 V16 L14 21 H5Z M14 21 V16 H19 M8 8 H16 M8 12 H15'} fill={visit ? '#FFE6A1' : '#FAD3E3'} stroke={visit ? '#BD8E16' : '#C87699'} strokeWidth={1.7} strokeLinejoin="round" /></Svg>;
}
