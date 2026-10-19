import Svg, { G, Path, Ellipse, Circle, Rect, Line, Defs, ClipPath, Text as SvgText } from 'react-native-svg';
import { DECOR } from '../../../shared/data/decor.js';
import GarmentPattern, { garmentFill } from '../../../shared/art/GarmentPattern.jsx';
import { Pattern } from 'react-native-svg';

const RUG = { Defs, Pattern, Rect, Circle, Path };

export function Scenery({ item, night: roomNight }) {
  const kind = item?.landscape ?? 'coast';
  const night = roomNight ?? kind === 'city';
  return <Svg x="124" y="160" width="120" height="170" viewBox="0 0 120 170">
    <Rect width="120" height="170" fill={night ? '#535F8F' : kind === 'sunset' ? '#F7C3AB' : '#D7ECF8'} />
    {night ? <><Path d="M100 16 C77 11 73 42 98 44 C84 36 87 23 100 16Z" fill="#F9EFCA" /><Path d="M17 18 v5 m-2.5 -2.5 h5 M51 36 v5 m-2.5 -2.5 h5 M111 59 v5 m-2.5 -2.5 h5" stroke="#F9EFCA" strokeWidth="1.3" /></> : <Circle cx="30" cy="30" r="13" fill="#FFF5CB" />}
    {kind === 'city' ? <>
      {[8, 35, 57, 79, 101].map((x, i) => <G key={x}><Rect x={x} y={54 + (i % 3) * 13} width="20" height="116" fill={i % 2 ? '#7882AC' : '#656F9D'} />{[0, 1, 2, 3, 4].map(y => <Path key={y} d={`M${x + 5} ${85 + y * 15} h3 m4 0 h3`} stroke="#FBE7AA" strokeWidth="4" />)}</G>)}
      <Path d="M65 54 V34 M58 66 L65 40 L72 66" fill="none" stroke="#7983AD" strokeWidth="4" />
    </> : kind === 'mountain' || kind === 'jeju' ? <>
      <Path d="M-10 114 L30 50 L59 101 L80 63 L131 119 V170 H0Z" fill={kind === 'jeju' ? '#8BAF9A' : '#B2A0A0'} /><Path d="M0 143 L37 101 L69 127 L100 100 L128 143 V170 H0Z" fill={kind === 'jeju' ? '#9DBD82' : '#C58C70'} />
      {[7, 26, 48, 78, 104].map((x, i) => kind === 'jeju' ? <G key={x}><Circle cx={x} cy={151 + i % 2 * 9} r="5" fill="#FADE76" /><Circle cx={x} cy={151 + i % 2 * 9} r="1.5" fill="#BD9457" /></G> : <G key={x}><Path d={`M${x} 170 v-30`} stroke="#8A705C" strokeWidth="3" /><Circle cx={x} cy="139" r="13" fill={i % 2 ? '#DDA26E' : '#BC7772'} /></G>)}
    </> : kind === 'sakura' ? <>
      <Path d="M0 118 Q60 99 120 118 V170 H0" fill="#C9D5AD" /><Path d="M48 170 L59 112 L69 112 L90 170" fill="#EADCCC" />
      <Path d="M12 143 V57 M12 77 L33 55 M103 148 V65 M103 88 L85 70" stroke="#B69991" strokeWidth="5" />
      {[[-2, 53], [20, 51], [38, 66], [98, 65], [118, 51], [85, 82]].map(([x, y]) => <Circle key={`${x}-${y}`} cx={x} cy={y} r="20" fill="#F1CBDC" />)}
      <Path d="M44 105 H86 L79 95 H51Z M51 105 V120 H79 V105" fill="#CCAAA0" />
    </> : <>
      <Path d="M0 83 Q30 73 60 84 Q90 93 120 80 V170 H0Z" fill={kind === 'island' ? '#72C9C1' : kind === 'sunset' ? '#98BFCB' : '#8CC6DF'} />
      {[97, 116, 138].map(y => <Path key={y} d={`M0 ${y} Q30 ${y - 7} 60 ${y} T120 ${y}`} fill="none" stroke="#DEF1EF" strokeWidth="2" />)}
      <Path d="M0 156 Q60 137 120 156 V170 H0Z" fill="#F0DDB3" />
      {(kind === 'island' || kind === 'sunset') && <><Path d="M22 159 Q30 117 20 78" fill="none" stroke="#AA9674" strokeWidth="5" /><Path d="M20 82 Q-4 58 -5 95 Q10 75 20 82 Q45 56 48 89 Q30 77 20 82 Q29 58 15 51 Q13 73 20 82" fill="#7EAF92" /></>}
      {kind === 'harbour' && <><Path d="M52 107 Q64 79 76 109 Q77 66 95 101 Q105 85 117 108Z" fill="#FFF7DE" stroke="#B8C4BD" strokeWidth="1.5" /><Path d="M14 130 L14 91 L40 124Z" fill="#FFF9E9" /><Path d="M9 133 H43 L35 140 H16Z" fill="#9E9DAC" /></>}
      {kind === 'coast' && <><Path d="M98 83 V52 M83 65 H112" stroke="#E6D8BA" strokeWidth="3" /><Path d="M92 83 V56 H104 V83Z" fill="#FFF7E4" /></>}
    </>}
  </Svg>;
}

// positions: {slot: {dx, dy}} 방에서 옮긴 거리 (전등·액자·인형)
export default function HouseDecor({ equipped = {}, night, positions = {} }) {
  const find = slot => DECOR.find(item => item.id === equipped[slot]);
  const at = slot => `translate(${positions[slot]?.dx ?? 0} ${positions[slot]?.dy ?? 0})`;
  const lamp = find('lamp'), carpet = find('carpet'), frame = find('frame'), doll = find('doll'), scenery = find('scenery');
  return <G>
    {scenery && <><Scenery item={scenery} night={night} /><Path d="M184 160 V330 M124 245 H244" stroke="#C9A982" strokeWidth="4" /></>}
    {carpet && <G transform={at('carpet')}><GarmentPattern outfit={carpet} id={`rug-${carpet.id}`} elements={RUG} /><Ellipse cx="184" cy="482" rx="164" ry="48" fill={garmentFill(carpet, `rug-${carpet.id}`, RUG)} stroke="#FFF5E5" strokeWidth="4" /><Ellipse cx="184" cy="482" rx="148" ry="36" fill="none" stroke="#FFFFFF88" strokeWidth="2" />{carpet.id === 'carpet-sea' ? <Path d="M65 482 Q95 457 125 482 T185 482 T245 482 T305 482" stroke="#E3F5F6" strokeWidth="4" fill="none" /> : carpet.id === 'carpet-peach' && <Path d="M171 489 C149 466 168 459 184 474 C200 459 219 466 197 489 L184 500Z" fill="#FFF0DC" />}</G>}
    {lamp && <G transform={at('lamp')}><G stroke="#AD927B" strokeWidth="2.5"><Path d="M55 374 V282 M37 374 H73" fill="none" />{lamp.id === 'lamp-moon' ? <><Circle cx="55" cy="263" r="30" fill="#FFF1B044" stroke="none" /><Path d="M64 235 C29 237 28 283 63 286 C44 277 44 247 64 235Z" fill={lamp.color} /></> : <><Path d="M55 287 V267" stroke="#8CAB80" /><Path d="M55 274 C29 275 29 253 43 253 C32 235 53 232 58 246 C73 229 86 246 73 258 C88 274 67 283 55 274Z" fill={lamp.color} /><Circle cx="57" cy="260" r="7" fill="#FFEDAC" stroke="none" /></>}</G></G>}
    {frame && <G transform={at('frame')}><G transform="translate(283 265)"><Rect width="68" height="64" rx="5" fill="#CEAD8A" stroke="#A88665" strokeWidth="2" /><Rect x="6" y="6" width="56" height="52" fill={frame.color} />{frame.id === 'frame-night' ? <><Circle cx="45" cy="19" r="8" fill="#F9EABB" /><Path d="M10 29 L15 22 L20 29 L15 36Z M24 45 L28 39 L32 45 L28 51Z" fill="#ECE6FA" /></> : <><Path d="M21 51 V31 M44 51 V25" stroke="#7DA17E" strokeWidth="3" /><Circle cx="21" cy="29" r="10" fill="#F8DE9B" /><Circle cx="44" cy="23" r="10" fill="#F4BDD0" /><Circle cx="21" cy="29" r="3" fill="#C89B65" /></>}</G></G>}
    {doll && <G transform={at('doll')}><G transform="translate(316 340)" fill={doll.color} stroke="#AD8C88" strokeWidth="1.8">{doll.id === 'doll-bunny' ? <><Ellipse cx="-9" cy="-22" rx="5" ry="15" /><Ellipse cx="9" cy="-22" rx="5" ry="15" /></> : <><Circle cx="-12" cy="-10" r="7" /><Circle cx="12" cy="-10" r="7" /></>}<Ellipse cy="18" rx="15" ry="16" /><Circle r="17" /><Ellipse cx="-12" cy="31" rx="8" ry="5" /><Ellipse cx="12" cy="31" rx="8" ry="5" /><G fill="#76616D" stroke="none"><Circle cx="-6" cy="-1" r="2" /><Circle cx="6" cy="-1" r="2" /><Circle cy="5" r="2" /></G><Ellipse cy="20" rx="8" ry="9" fill="#FFF2E3" stroke="none" /></G></G>}
  </G>;
}
