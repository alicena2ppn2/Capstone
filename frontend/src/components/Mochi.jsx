import { useContext } from 'react';
import { CharacterContext } from './CharacterContext.jsx';
import Potato from './Potato.jsx';

function Flower() {
  return <g transform="translate(151 65)" stroke="#8EA9CD" strokeWidth="1.8">
    <path d="M0 -5 C-9 -17 -17 -7 -10 0 C-22 7 -11 17 -4 10 C0 22 12 15 9 7 C22 5 17 -9 8 -7 C7 -20 -6 -19 0 -5Z" fill="#C9DFF6" />
    <path d="M0 -4 C-5 -10 -10 -4 -6 1 C-11 6 -5 10 0 6 C5 12 11 5 6 1 C12 -5 5 -10 0 -4Z" fill="#FFFAF0" stroke="none" />
    <circle cx="1" cy="1" r="2.3" fill="#EBCB8B" stroke="none" />
  </g>;
}

// cha1의 둥근 윤곽, 하늘색 귀와 꼬리, 꽃 장식을 표현한다.
export default function Mochi({ color = '#FFF5E6', width, height, full = false, asleep = false, label, outfit, variant }) {
  const active = useContext(CharacterContext);
  if ((variant ?? active) === 'potato') return <Potato width={width} height={height} full={full} asleep={asleep} label={label} outfit={outfit} />;
  if ((variant ?? active) === 'lavender') color = '#E3D9F7';
  if ((variant ?? active) === 'mint') color = '#CDEFE0';
  if ((variant ?? active) === 'pink') color = '#F9D4E2';
  if ((variant ?? active) === 'sky') color = '#D3E8FA';
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  const line = '#91A6C5';
  return (
    <svg width={width} height={height} viewBox={full ? '0 0 200 210' : '15 0 170 146'} {...a11y}>
      {full && <>
        <ellipse cx="102" cy="200" rx="67" ry="6" fill="#AFC9E6" opacity=".22" />
        <path d="M137 159 C150 138 179 138 176 155 C197 157 190 179 180 179 C193 196 169 204 163 195 C146 206 133 190 140 182Z" fill="#D8E8F8" stroke={line} strokeWidth="2.5" />
        <path d="M153 162 Q171 150 174 166 Q184 166 179 178 Q172 181 170 189" fill="none" stroke="#F9FCFF" strokeWidth="7" strokeLinecap="round" />
        <path d="M70 120 Q55 143 64 169 Q58 178 72 183 Q84 192 100 183 Q118 193 130 180 Q143 176 136 166 Q145 140 131 120Z" fill={color} stroke={line} strokeWidth="2.5" />
        <ellipse cx="100" cy="159" rx="26" ry="23" fill="#FFFCF5" opacity=".85" />
        {outfit ? <g stroke={outfit.trim} strokeWidth="2" strokeLinejoin="round">
          <path d="M71 125 L53 141 L62 153 L69 148 L65 175 Q100 187 135 175 L131 148 L139 153 L148 141 L130 125 Q100 137 71 125Z" fill={outfit.color} />
          <path d="M83 130 Q100 143 117 130" fill="none" />
          {outfit.motif === 'heart' && <path d="M100 169 C82 159 85 146 94 150 L100 155 L106 150 C115 146 118 159 100 169Z" fill="#FFF5F8" />}
          {outfit.motif === 'cloud' && <path d="M85 166 Q79 156 89 155 Q92 143 101 149 Q112 146 114 156 Q124 166 112 168 H90Z" fill="white" />}
          {outfit.motif === 'star' && <path d="M100 146 L105 154 L114 156 L108 162 L110 171 L100 166 L90 171 L92 162 L86 156 L95 154Z" fill="#FFF0AE" />}
          {outfit.motif === 'leaf' && <path d="M100 171 V156 M100 159 Q81 158 86 148 Q101 147 100 159 M100 161 Q117 160 115 150 Q101 150 100 161" fill="#EDF9E4" />}
        </g> : <g stroke={line} strokeWidth="2" strokeLinejoin="round">
          <path d="M67 124 Q100 141 133 124 L134 136 Q100 152 66 136Z" fill="#C8E0F7" />
          <path d="M94 137 Q73 120 75 139 Q71 159 95 144 L86 165 L101 153 L112 166 L108 144 Q133 159 126 137 Q125 122 106 137Z" fill="#B8D4EF" />
          <ellipse cx="100" cy="140" rx="7" ry="6" fill="#EDF5FE" />
        </g>}
        <path d="M62 142 Q45 142 47 157 Q44 167 55 168 Q71 169 73 155Z" fill={color} stroke={line} strokeWidth="2.5" />
        <path d="M138 142 Q155 142 153 157 Q156 167 145 168 Q129 169 127 155Z" fill={color} stroke={line} strokeWidth="2.5" />
        <ellipse cx="77" cy="184" rx="21" ry="17" transform="rotate(-13 77 184)" fill={color} stroke={line} strokeWidth="2.5" />
        <ellipse cx="124" cy="184" rx="21" ry="17" transform="rotate(13 124 184)" fill={color} stroke={line} strokeWidth="2.5" />
        <g fill="#F7C5D1" opacity=".55"><ellipse cx="77" cy="189" rx="8" ry="7" /><circle cx="67" cy="180" r="3" /><circle cx="77" cy="176" r="3" /><circle cx="87" cy="180" r="3" /><ellipse cx="124" cy="189" rx="8" ry="7" /><circle cx="114" cy="180" r="3" /><circle cx="124" cy="176" r="3" /><circle cx="134" cy="180" r="3" /></g>
      </>}
      <g stroke={line} strokeWidth="2.5" strokeLinejoin="round">
        <path d="M43 56 Q25 33 37 14 Q48 7 68 26 L68 55Z" fill="#D4E5F7" />
        <path d="M135 26 Q157 6 166 17 Q176 38 155 58 L132 54Z" fill="#D4E5F7" />
        <path d="M42 40 Q38 24 46 23 Q58 26 59 42" fill="#EED9E6" stroke="none" />
        <path d="M143 40 Q154 23 160 27 Q165 38 157 46" fill="#EDF4FC" stroke="none" />
        <path d="M49 98 Q22 82 24 102 Q14 118 31 125 Q39 143 62 128Z" fill="#D4E5F7" />
        <path d="M151 98 Q178 82 176 102 Q186 118 169 125 Q161 143 138 128Z" fill="#D4E5F7" />
        <path d="M99 22 Q125 19 144 38 Q162 54 160 78 Q169 91 158 99 Q170 117 149 126 Q128 137 100 134 Q69 139 48 126 Q30 117 41 102 Q30 93 39 80 Q37 52 58 36 Q75 24 99 22Z" fill={color} />
        <path d="M99 23 Q90 7 104 9 Q121 14 105 30" fill={color} strokeLinecap="round" />
        <path d="M96 47 Q111 44 108 59 Q105 74 95 77" fill="none" stroke="#D2DCEF" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M56 71 Q52 77 53 84 M146 78 Q151 85 149 90" fill="none" stroke="#FFFDF8" strokeWidth="4" strokeLinecap="round" opacity=".8" />
      </g>
      <g fill="#F5B9CC" opacity=".28"><ellipse cx="53" cy="111" rx="14" ry="8" /><ellipse cx="147" cy="111" rx="14" ry="8" /></g>
      {asleep ? <g fill="none" stroke="#758AAB" strokeWidth="3" strokeLinecap="round">
        <path d="M59 94 Q68 100 77 94 M123 94 Q132 100 141 94" />
        <text x="156" y="12" fill="#91ACD4" stroke="none" fontSize="17">z</text>
      </g> : <g>
        {[68, 132].map((x) => <g key={x}>
          <ellipse cx={x} cy="94" rx="10" ry="14" fill="#637EA9" stroke="#7189AD" strokeWidth="1.5" />
          <ellipse cx={x} cy="101" rx="8" ry="7" fill="#B8D7F4" />
          <ellipse cx={x + 2} cy="104" rx="5" ry="4" fill="#E5F4FF" opacity=".85" />
          <circle cx={x - 3} cy="87" r="3.5" fill="#FFFFFF" />
          <circle cx={x + 4} cy="96" r="2" fill="#F8FCFF" />
        </g>)}
      </g>}
      <path d="M95 112 Q98 117 101 112 Q104 117 107 112" fill="none" stroke="#9D8296" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M156 79 Q171 83 168 95 L156 90 L149 98 L146 82" fill="#C7DFF6" stroke={line} strokeWidth="1.8" strokeLinejoin="round" />
      <Flower />
    </svg>
  );
}
