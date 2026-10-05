import { useId } from 'react';

// cha2의 포근한 비율을 참고하되, 각 친구의 실루엣과 장식을 새로 그린다.
export default function MochiFriends({ variant, width, height, full, asleep, label, outfit }) {
  const bunny = variant === 'pink';
  const sheep = variant === 'lavender';
  const turtle = variant === 'mint';
  const body = bunny ? '#FFE4D9' : sheep ? '#F3EDFF' : turtle ? '#D9EDBC' : '#D9EAF5';
  const line = bunny ? '#BE958D' : sheep ? '#A79BBE' : turtle ? '#88A17B' : '#8FA9BC';
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  const motif = outfit?.motif;
  const bodyClip = useId();
  const torso = turtle ? 'M73 123 Q57 143 65 165 Q100 190 135 165 Q143 143 127 123Z' : variant === 'sky' ? 'M71 116 Q56 140 62 170 Q66 190 100 192 Q134 190 138 170 Q144 140 129 116Z' : 'M72 120 Q58 140 65 171 Q69 189 100 187 Q131 189 135 171 Q142 140 128 120Z';
  return <svg width={width} height={height} viewBox={full ? '0 0 200 210' : '15 0 170 146'} {...a11y}>
    <defs><clipPath id={bodyClip}><path d={torso} /></clipPath></defs>
    <g stroke={line} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      {full && <>
        <ellipse cx="100" cy="200" rx="57" ry="5" fill={line} opacity=".15" stroke="none" />
        {bunny && <circle cx="146" cy="166" r="15" fill="#FFF6EE" />}
        {turtle && <><ellipse cx="100" cy="157" rx="58" ry="37" fill="#A9C997" /><path d="M100 128 L117 145 L111 169 H88 L82 145Z M82 145 L51 146 M117 145 L149 146 M88 169 L70 186 M111 169 L131 186" fill="none" stroke="#7FA879" /><path d="M147 168 L163 176 L146 181" fill={body} /></>}
        <path d={torso} fill={body} />
        <ellipse cx="100" cy="159" rx="26" ry="27" fill="#FFFDF4" stroke="none" />
        {outfit && <g stroke={outfit.trim} strokeWidth="2" clipPath={`url(#${bodyClip})`}>
          <path d="M40 125 Q100 145 160 125 V205 H40Z" fill={outfit.color} />
          <path d="M85 133 Q100 146 115 133" fill="none" />
          {motif === 'heart' && <path d="M100 170 C80 157 88 146 100 156 C112 146 120 157 100 170Z" fill="#FFF5F8" stroke="none" />}
          {motif === 'cloud' && <path d="M85 166 Q79 156 89 155 Q92 143 101 149 Q114 146 114 156 Q124 169 111 169 H90Z" fill="white" stroke="none" />}
          {motif === 'star' && <path d="M100 147 L104 155 L114 156 L107 163 L109 173 L100 168 L91 173 L93 163 L86 156 L96 155Z" fill="#FFF0AE" stroke="none" />}
          {motif === 'leaf' && <path d="M100 172 V155 M100 160 Q81 159 87 148 Q100 148 100 160 M100 162 Q119 161 113 150 Q100 150 100 162" fill="#EDF9E4" />}
        </g>}
        <ellipse cx="61" cy="151" rx={variant === 'sky' ? 11 : 9} ry={variant === 'sky' ? 22 : 14} transform="rotate(25 61 151)" fill={body} />
        <ellipse cx="139" cy="151" rx={variant === 'sky' ? 11 : 9} ry={variant === 'sky' ? 22 : 14} transform="rotate(-25 139 151)" fill={body} />
        {outfit && [61, 139].map(x => <g key={x} transform={`rotate(${x === 61 ? 25 : -25} ${x} 151)`}>
          <path d={`M${x - (variant === 'sky' ? 11 : 9)} 151 A${variant === 'sky' ? 11 : 9} ${variant === 'sky' ? 22 : 14} 0 0 1 ${x + (variant === 'sky' ? 11 : 9)} 151Z`} fill={outfit.color} stroke={outfit.trim} strokeWidth="2.6" />
        </g>)}
        <ellipse cx="77" cy="187" rx={bunny ? 19 : 15} ry="10" fill={variant === 'sky' ? '#F2D2A3' : body} />
        <ellipse cx="123" cy="187" rx={bunny ? 19 : 15} ry="10" fill={variant === 'sky' ? '#F2D2A3' : body} />
      </>}
      {bunny ? <>
        <path d="M64 57 C39 18 52 -8 66 12 C76 26 76 43 79 54 M122 53 C121 27 136 -4 146 10 C157 25 144 44 139 58" fill={body} />
        <path d="M62 22 L69 43 M140 20 L132 43" stroke="#F0BFC5" strokeWidth="7" />
        <path d="M99 45 C73 33 42 51 41 85 C33 114 57 138 100 135 C143 138 167 114 159 85 C158 51 127 33 99 45Z" fill={body} />
        <path d="M93 48 Q100 56 107 48" fill="none" stroke="#DDAAA4" />
      </> : sheep ? <>
        <path d="M52 68 Q15 57 30 90 Q34 102 53 94 M148 68 Q185 57 170 90 Q166 102 147 94" fill="#D9CBEF" />
        <path d="M48 65 Q34 48 52 37 Q52 20 74 27 Q87 10 101 24 Q121 11 130 29 Q153 24 155 44 Q176 55 158 72 Q178 89 162 103 Q170 124 148 128 Q135 146 117 135 Q98 148 84 136 Q60 146 52 128 Q28 123 40 104 Q22 86 48 65Z" fill={body} />
        <ellipse cx="100" cy="90" rx="48" ry="40" fill="#FFFAF0" stroke="none" />
        <path d="M79 43 Q72 27 62 38 Q59 51 75 52 M121 43 Q128 27 138 38 Q141 51 125 52" fill="#DCC8AC" />
        <path d="M94 37 Q86 46 98 50 Q110 50 106 39" fill="none" />
      </> : turtle ? <>
        <path d="M42 83 C35 57 59 38 82 45 Q100 28 118 45 C146 36 166 59 158 85 Q169 130 100 136 Q31 130 42 83Z" fill={body} />
        <path d="M96 46 Q78 29 86 20 Q106 19 105 42 Q115 23 129 27 Q132 42 107 49" fill="#90BB88" />
        <path d="M88 24 L101 44 M123 31 L106 45" fill="none" stroke="#ECF5D9" strokeWidth="2" />
      </> : <>
        <path d="M48 81 C48 42 69 28 100 30 C131 28 152 42 152 81 Q166 135 100 137 Q34 135 48 81Z" fill={body} />
        <path d="M68 115 C51 97 55 59 75 60 Q91 58 100 75 Q109 58 125 60 C145 59 149 97 132 115 Q100 137 68 115Z" fill="#FFFCF3" stroke="none" />
        <path d="M88 32 Q78 13 96 20 Q103 8 112 23" fill={body} />
      </>}
    </g>
    <g fill="#ECAFB8" opacity=".3"><ellipse cx="59" cy="108" rx="11" ry="6" /><ellipse cx="141" cy="108" rx="11" ry="6" /></g>
    {asleep ? <g stroke={line} strokeWidth="3" fill="none" strokeLinecap="round"><path d="M65 90 Q73 97 81 90 M119 90 Q127 97 135 90" /><text x="158" y="23" stroke="none" fill={line} fontSize="17">z</text></g> : <g fill="#5C5559">
      {[73, 127].map(x => <g key={x}>
        {bunny ? <>
          <ellipse cx={x} cy="89" rx="10" ry="15" fill="#664B60" stroke="#AA819C" strokeWidth="1.4" />
          <ellipse cx={x} cy="96" rx="8" ry="7" fill="#C293B2" />
          <path d={`M${x - 5} 98 Q${x} 103 ${x + 5} 98`} fill="none" stroke="#F8D7E8" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx={x - 3} cy="83" rx="3.8" ry="4.5" fill="#FFFDFB" />
          <circle cx={x + 4} cy="90" r="2.4" fill="white" />
          <circle cx={x - 2} cy="99" r="1.3" fill="white" />
          <path d={`M${x - 8} 79 L${x - 11} 76`} stroke="#87647D" strokeWidth="2" strokeLinecap="round" />
        </> : sheep ? <>
          <circle cx={x} cy="90" r="12.5" fill="#5D527B" stroke="#9D8ABB" strokeWidth="1.4" />
          <path d={`M${x - 10} 93 Q${x} 103 ${x + 10} 93 Q${x + 6} 104 ${x - 6} 101Z`} fill="#B5A3DA" />
          <circle cx={x - 4} cy="86" r="4" fill="#FFFDF7" />
          <path d={`M${x + 5} 88 L${x + 6} 91 L${x + 9} 92 L${x + 6} 93 L${x + 5} 96 L${x + 4} 93 L${x + 1} 92 L${x + 4} 91Z`} fill="#FFFFFF" />
          <circle cx={x - 3} cy="98" r="1.8" fill="#F5EEFF" />
          <path d={`M${x - 6} 71 Q${x} 68 ${x + 5} 72`} fill="none" stroke="#B2A2C4" strokeWidth="1.8" strokeLinecap="round" />
        </> : variant === 'sky' ? <>
          <path d={`M${x - 12} 88 C${x - 11} 76 ${x + 10} 75 ${x + 12} 88 Q${x + 12} 102 ${x} 101 Q${x - 12} 102 ${x - 12} 88Z`} fill="#395D7D" stroke="#759CB9" strokeWidth="1.4" />
          <ellipse cx={x} cy="95" rx="9" ry="5" fill="#81BADA" />
          <path d={`M${x - 5} 98 Q${x} 101 ${x + 5} 98`} fill="none" stroke="#D1F2FA" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx={x - 3} cy="85" rx="4.7" ry="3.3" transform={`rotate(-20 ${x - 3} 85)`} fill="white" />
          <circle cx={x + 5} cy="89" r="2.5" fill="#FFFFFF" />
          <circle cx={x - 4} cy="95" r="1.5" fill="#E5F9FF" />
        </> : <><ellipse cx={x} cy="91" rx="6.5" ry="7" /><circle cx={x - 2} cy="88" r="2.1" fill="white" /></>}
      </g>)}
    </g>}
    {variant === 'sky' ? <path d="M93 106 Q100 100 107 106 Q100 116 93 106Z" fill="#EFC993" stroke="#CBA976" strokeWidth="1.5" /> : <g stroke="#917B80" strokeWidth="1.8" fill="none" strokeLinecap="round"><path d="M95 109 Q100 115 105 109" />{bunny && <path d="M97 103 Q100 106 103 103" />}</g>}
  </svg>;
}
