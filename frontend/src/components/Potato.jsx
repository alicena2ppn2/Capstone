export default function Potato({ width, height, label, asleep, outfit, full }) {
  return <svg width={width} height={height} viewBox="0 0 200 210" {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
    <ellipse cx="100" cy="199" rx="58" ry="6" fill="#8B6745" opacity=".12" />
    <g fill="#D6AE7F" stroke="#95734F" strokeWidth="3" strokeLinejoin="round">
      <path d="M52 127 Q22 111 26 131 Q28 145 51 149 M149 126 Q179 110 176 130 Q173 143 151 148" />
      <ellipse cx="77" cy="190" rx="10" ry="13" /><ellipse cx="124" cy="190" rx="10" ry="13" />
      <path d="M103 17 C139 15 154 53 151 90 Q150 119 163 148 Q172 184 126 194 Q75 207 46 177 Q31 157 42 125 Q50 105 47 73 Q47 28 103 17Z" />
    </g>
    <path d="M60 66 Q66 33 96 29" fill="none" stroke="#F8DAB0" strokeWidth="9" strokeLinecap="round" opacity=".6" />
    <g fill="#AC8459" opacity=".55"><ellipse cx="126" cy="55" rx="5" ry="3" /><ellipse cx="60" cy="137" rx="8" ry="4" /><ellipse cx="133" cy="157" rx="10" ry="5" /><ellipse cx="90" cy="177" rx="6" ry="3" /><circle cx="136" cy="94" r="3" /><circle cx="78" cy="52" r="2" /></g>
    {full && outfit && <g fill={outfit.color} stroke={outfit.trim} strokeWidth="2"><path d="M49 123 L37 133 L44 146 L52 141 L47 169 Q100 190 153 169 L148 141 L155 146 L164 133 L151 123 Q101 143 49 123Z" /><path d="M84 137 Q101 148 118 137" fill="none" /><path d="M100 151 L104 158 L113 159 L107 165 L109 173 L100 169 L91 173 L93 165 L87 159 L96 158Z" fill="#FFF7E7" /></g>}
    <g fill="#EDAFB9" opacity=".25"><ellipse cx="59" cy="117" rx="12" ry="6" /><ellipse cx="139" cy="116" rx="12" ry="6" /></g>
    <path d="M63 81 Q70 76 77 79 M120 79 Q129 77 135 83" fill="none" stroke="#95734F" strokeWidth="2" strokeLinecap="round" />
    {asleep ? <path d="M62 99 Q72 106 82 99 M117 99 Q127 106 137 99" fill="none" stroke="#544338" strokeWidth="3" strokeLinecap="round" /> : <g>
      {[72, 127].map((x) => <g key={x}><ellipse cx={x} cy="102" rx="10" ry="13" fill="#544338" /><ellipse cx={x} cy="109" rx="7" ry="5" fill="#A69B89" /><circle cx={x + 2} cy="96" r="4" fill="white" /><circle cx={x - 3} cy="105" r="2" fill="white" /></g>)}
    </g>}
    <path d="M91 118 Q96 124 101 118 Q106 124 111 118" fill="none" stroke="#544338" strokeWidth="2" strokeLinecap="round" />
    <path d="M52 158 l5 -3 M133 174 l6 -2 M116 39 l4 1" stroke="#96734E" strokeWidth="2" opacity=".5" strokeLinecap="round" />
  </svg>;
}
