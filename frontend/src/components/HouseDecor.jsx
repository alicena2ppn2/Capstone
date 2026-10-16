import { DECOR } from '../../../shared/data/decor.js';
import GarmentPattern, { garmentFill } from '../../../shared/art/GarmentPattern.jsx';

export function Scenery({ item, night: roomNight }) {
  const kind = item?.landscape ?? 'coast';
  const night = roomNight ?? kind === 'city';
  return <svg x="124" y="160" width="120" height="170" viewBox="0 0 120 170" aria-hidden="true">
    <rect width="120" height="170" fill={night ? '#535F8F' : kind === 'sunset' ? '#F7C3AB' : '#D7ECF8'} />
    {night ? <><path d="M100 16 C77 11 73 42 98 44 C84 36 87 23 100 16Z" fill="#F9EFCA" /><path d="M17 18 v5 m-2.5 -2.5 h5 M51 36 v5 m-2.5 -2.5 h5 M111 59 v5 m-2.5 -2.5 h5" stroke="#F9EFCA" strokeWidth="1.3" /></> : <circle cx="30" cy="30" r="13" fill="#FFF5CB" />}
    {kind === 'city' ? <>
      {[8, 35, 57, 79, 101].map((x, i) => <g key={x}><rect x={x} y={54 + (i % 3) * 13} width="20" height="116" fill={i % 2 ? '#7882AC' : '#656F9D'} />{[0, 1, 2, 3, 4].map(y => <path key={y} d={`M${x + 5} ${85 + y * 15} h3 m4 0 h3`} stroke="#FBE7AA" strokeWidth="4" />)}</g>)}
      <path d="M65 54 V34 M58 66 L65 40 L72 66" fill="none" stroke="#7983AD" strokeWidth="4" />
    </> : kind === 'mountain' || kind === 'jeju' ? <>
      <path d="M-10 114 L30 50 L59 101 L80 63 L131 119 V170 H0Z" fill={kind === 'jeju' ? '#8BAF9A' : '#B2A0A0'} /><path d="M0 143 L37 101 L69 127 L100 100 L128 143 V170 H0Z" fill={kind === 'jeju' ? '#9DBD82' : '#C58C70'} />
      {[7, 26, 48, 78, 104].map((x, i) => kind === 'jeju' ? <g key={x}><circle cx={x} cy={151 + i % 2 * 9} r="5" fill="#FADE76" /><circle cx={x} cy={151 + i % 2 * 9} r="1.5" fill="#BD9457" /></g> : <g key={x}><path d={`M${x} 170 v-30`} stroke="#8A705C" strokeWidth="3" /><circle cx={x} cy="139" r="13" fill={i % 2 ? '#DDA26E' : '#BC7772'} /></g>)}
    </> : kind === 'sakura' ? <>
      <path d="M0 118 Q60 99 120 118 V170 H0" fill="#C9D5AD" /><path d="M48 170 L59 112 L69 112 L90 170" fill="#EADCCC" />
      <path d="M12 143 V57 M12 77 L33 55 M103 148 V65 M103 88 L85 70" stroke="#B69991" strokeWidth="5" />
      {[[-2, 53], [20, 51], [38, 66], [98, 65], [118, 51], [85, 82]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="20" fill="#F1CBDC" />)}
      <path d="M44 105 H86 L79 95 H51Z M51 105 V120 H79 V105" fill="#CCAAA0" />
    </> : <>
      <path d="M0 83 Q30 73 60 84 Q90 93 120 80 V170 H0Z" fill={kind === 'island' ? '#72C9C1' : kind === 'sunset' ? '#98BFCB' : '#8CC6DF'} />
      {[97, 116, 138].map(y => <path key={y} d={`M0 ${y} Q30 ${y - 7} 60 ${y} T120 ${y}`} fill="none" stroke="#DEF1EF" strokeWidth="2" />)}
      <path d="M0 156 Q60 137 120 156 V170 H0Z" fill="#F0DDB3" />
      {(kind === 'island' || kind === 'sunset') && <><path d="M22 159 Q30 117 20 78" fill="none" stroke="#AA9674" strokeWidth="5" /><path d="M20 82 Q-4 58 -5 95 Q10 75 20 82 Q45 56 48 89 Q30 77 20 82 Q29 58 15 51 Q13 73 20 82" fill="#7EAF92" /></>}
      {kind === 'harbour' && <><path d="M52 107 Q64 79 76 109 Q77 66 95 101 Q105 85 117 108Z" fill="#FFF7DE" stroke="#B8C4BD" strokeWidth="1.5" /><path d="M14 130 L14 91 L40 124Z" fill="#FFF9E9" /><path d="M9 133 H43 L35 140 H16Z" fill="#9E9DAC" /></>}
      {kind === 'coast' && <><path d="M98 83 V52 M83 65 H112" stroke="#E6D8BA" strokeWidth="3" /><path d="M92 83 V56 H104 V83Z" fill="#FFF7E4" /></>}
    </>}
  </svg>;
}

// positions: {slot: {dx, dy}} 끌어서 옮긴 거리. onGrab(slot, event): 배치 모드에서 소품을 잡을 때
export default function HouseDecor({ equipped = {}, night, positions = {}, onGrab }) {
  const at = slot => ({ transform: `translate(${positions[slot]?.dx ?? 0} ${positions[slot]?.dy ?? 0})`, 'data-slot': slot,
    ...(onGrab ? { className: 'decor-movable', onPointerDown: event => onGrab(slot, event) } : {}) });
  const find = slot => DECOR.find(item => item.id === equipped[slot]);
  const lamp = find('lamp'), carpet = find('carpet'), frame = find('frame'), doll = find('doll'), scenery = find('scenery');
  return <g>
    {scenery && <><Scenery item={scenery} night={night} /><path d="M184 160 V330 M124 245 H244" stroke="#C9A982" strokeWidth="4" /></>}
    {carpet && <g transform={`translate(0 ${positions.carpet?.dy ?? 0})`}><GarmentPattern outfit={carpet} id={`rug-${carpet.id}`} /><ellipse cx="184" cy="482" rx="164" ry="48" fill={garmentFill(carpet, `rug-${carpet.id}`)} stroke="#FFF5E5" strokeWidth="4" /><ellipse cx="184" cy="482" rx="148" ry="36" fill="none" stroke="#FFFFFF88" strokeWidth="2" />{carpet.id === 'carpet-sea' ? <path d="M65 482 Q95 457 125 482 T185 482 T245 482 T305 482" stroke="#E3F5F6" strokeWidth="4" fill="none" /> : carpet.id === 'carpet-peach' && <path d="M171 489 C149 466 168 459 184 474 C200 459 219 466 197 489 L184 500Z" fill="#FFF0DC" />}</g>}
    {lamp && <g {...at('lamp')}><g stroke="#AD927B" strokeWidth="2.5"><path d="M55 374 V282 M37 374 H73" fill="none" />{lamp.id === 'lamp-moon' ? <><circle cx="55" cy="263" r="30" fill="#FFF1B044" stroke="none" /><path d="M64 235 C29 237 28 283 63 286 C44 277 44 247 64 235Z" fill={lamp.color} /></> : <><path d="M55 287 V267" stroke="#8CAB80" /><path d="M55 274 C29 275 29 253 43 253 C32 235 53 232 58 246 C73 229 86 246 73 258 C88 274 67 283 55 274Z" fill={lamp.color} /><circle cx="57" cy="260" r="7" fill="#FFEDAC" stroke="none" /></>}</g></g>}
    {frame && <g {...at('frame')}><g transform="translate(283 265)"><rect width="68" height="64" rx="5" fill="#CEAD8A" stroke="#A88665" strokeWidth="2" /><rect x="6" y="6" width="56" height="52" fill={frame.color} />{frame.id === 'frame-night' ? <><circle cx="45" cy="19" r="8" fill="#F9EABB" /><path d="M10 29 L15 22 L20 29 L15 36Z M24 45 L28 39 L32 45 L28 51Z" fill="#ECE6FA" /></> : <><path d="M21 51 V31 M44 51 V25" stroke="#7DA17E" strokeWidth="3" /><circle cx="21" cy="29" r="10" fill="#F8DE9B" /><circle cx="44" cy="23" r="10" fill="#F4BDD0" /><circle cx="21" cy="29" r="3" fill="#C89B65" /></>}</g></g>}
    {doll && <g {...at('doll')}><g transform="translate(316 340)" fill={doll.color} stroke="#AD8C88" strokeWidth="1.8">{doll.id === 'doll-bunny' ? <><ellipse cx="-9" cy="-22" rx="5" ry="15" /><ellipse cx="9" cy="-22" rx="5" ry="15" /></> : <><circle cx="-12" cy="-10" r="7" /><circle cx="12" cy="-10" r="7" /></>}<ellipse cy="18" rx="15" ry="16" /><circle r="17" /><ellipse cx="-12" cy="31" rx="8" ry="5" /><ellipse cx="12" cy="31" rx="8" ry="5" /><g fill="#76616D" stroke="none"><circle cx="-6" cy="-1" r="2" /><circle cx="6" cy="-1" r="2" /><circle cy="5" r="2" /></g><ellipse cy="20" rx="8" ry="9" fill="#FFF2E3" stroke="none" /></g></g>}
  </g>;
}
