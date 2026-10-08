// Six independent eye silhouettes/reflections. Static development review only.
export default function IdentityFaceDrawing({ variant, elements = {}, motion = {} }) {
  const { G = 'g', Path = 'path', Ellipse = 'ellipse', Circle = 'circle' } = elements;
  const bear = variant === 'proto-pebble', dog = variant === 'proto-pear', cat = variant === 'proto-quilt', deer = variant === 'draft-deer', hedgehog = variant === 'draft-hedgehog';
  const iris = bear ? '#69513F' : dog ? '#695164' : cat ? '#495E7D' : deer ? '#67523F' : hedgehog ? '#64516C' : '#4E6478';
  const xs = bear ? [74,126] : dog ? [72,128] : cat ? [74,126] : deer ? [76,124] : hedgehog ? [73,127] : [70,130];
  return <G data-part="face" stroke="none">
    {bear && <Ellipse cx="100" cy="111" rx="21" ry="14" fill="#FFF9ED" />}
    {dog && <Path d="M83 93 Q99 85 117 94 Q127 105 119 121 Q101 132 82 121 Q73 106 83 93Z" fill="#FFF9F1" />}
    {deer && <><Path d="M85 101 Q100 94 115 101 Q128 114 117 126 Q100 139 83 126 Q72 114 85 101Z" fill="#FFF7EA" /><G fill="#FFF7EA"><Ellipse cx="67" cy="64" rx="4" ry="3" /><Ellipse cx="77" cy="57" rx="3.5" ry="3" /><Ellipse cx="133" cy="64" rx="4" ry="3" /><Ellipse cx="123" cy="57" rx="3.5" ry="3" /></G></>}
    {hedgehog && <Path d="M86 109 Q100 100 114 109 Q123 121 111 130 Q100 138 89 130 Q77 121 86 109Z" fill="#FFFAEF" />}
    <G data-part="eyes">{xs.map((x,i) => <G key={x} data-part={i ? 'eye-right' : 'eye-left'} {...motion.eyeProps}>
      {bear ? <><Circle cx={x} cy="88" r="11.5" fill={iris} /><Path d={`M${x-9} 93 Q${x} 98 ${x+9} 93 Q${x+7} 99 ${x-7} 97Z`} fill="#BB9778" /><Circle cx={x-3} cy="84" r="3.7" fill="#FFFDFA" /><Ellipse cx={x+4} cy="91" rx="1.5" ry="1.2" fill="white" /></> :
      dog ? <><Path d={`M${x-10.5} 88 C${x-11} 71 ${x+10.5} 70 ${x+11} 87 Q${x+11} 104 ${x} 103 Q${x-11} 104 ${x-10.5} 88Z`} fill={iris} /><Path d={`M${x-8} 97 Q${x} 101 ${x+8} 96`} fill="none" stroke="#B896A8" strokeWidth="3" strokeLinecap="round" /><Ellipse cx={x-3} cy="81" rx="2.8" ry="5.2" fill="#FFFDFA" /><Circle cx={x+5} cy="89" r="1.8" fill="white" /></> :
      cat ? <><Path d={i ? 'M114 89 Q115 83 124 82 Q137 77 138 88 Q138 100 127 99 Q116 100 114 89Z' : 'M62 88 Q63 77 76 82 Q85 83 86 89 Q84 100 73 99 Q62 100 62 88Z'} fill={iris} /><Ellipse cx={x} cy="95" rx="8.5" ry="3" fill="#8FAACC" /><Path d={`M${x-7} 89 Q${x-7} 84 ${x-2} 84`} fill="none" stroke="#FFFDFA" strokeWidth="3" strokeLinecap="round" /><Circle cx={x+5} cy="91" r="1.6" fill="white" /></> :
      deer ? <G transform={`rotate(${i ? 7 : -7} ${x} 91)`}><Ellipse cx={x} cy="91" rx="9" ry="14.5" fill={iris} /><Ellipse cx={x} cy="100" rx="6.2" ry="3.5" fill="#B89C7B" /><Ellipse cx={x-2} cy="84" rx="2.3" ry="5.8" fill="#FFFDFA" /><Circle cx={x+3} cy="96" r="1.3" fill="white" /></G> :
      hedgehog ? <><Circle cx={x} cy="97" r="8.3" fill={iris} /><Path d={`M${x-5} 102 Q${x} 104 ${x+5} 102`} fill="none" stroke="#AA91B2" strokeWidth="2" strokeLinecap="round" /><Circle cx={x-2.2} cy="94" r="2.6" fill="#FFFDFA" /><Circle cx={x+3} cy="100" r=".9" fill="white" /></> :
      <><Path d={i ? 'M118 84 Q122 78 131 78 Q145 78 144 88 Q143 97 131 97 Q118 96 118 84Z' : 'M56 88 Q55 78 69 78 Q78 78 82 84 Q82 96 69 97 Q57 97 56 88Z'} fill={iris} /><Ellipse cx={x} cy="92" rx="9.5" ry="2.7" fill="#88B1C8" /><Ellipse cx={x-3} cy="83" rx="4.6" ry="2.8" fill="#FFFDFA" /><Path d={`M${x+5} 87 L${x+6} 89 L${x+8} 90 L${x+6} 91 L${x+5} 93 L${x+4} 91 L${x+2} 90 L${x+4} 89Z`} fill="white" /></>}
    </G>)}</G>
    <G data-part="brows" fill="none" stroke={iris} strokeWidth="1.4" strokeLinecap="round" opacity=".4">
      {bear ? <Path d="M68 72 Q74 70 80 72 M120 72 Q126 70 132 72" /> : dog ? <Path d="M65 68 Q72 64 79 68 M121 68 Q128 65 135 68" /> : cat ? <Path d="M68 69 Q75 69 81 72 M119 72 Q125 69 132 69" /> : deer ? <Path d="M69 70 Q75 68 81 72 M119 72 Q125 68 131 70" /> : hedgehog ? <Path d="M68 81 Q73 78 78 81 M122 83 H131" /> : <Path d="M62 67 Q70 63 77 66 M123 66 Q130 63 138 67" />}
    </G>
    <G data-part="cheeks" fill="#EEAEBB" opacity=".28"><Ellipse cx={hedgehog ? 58 : deer ? 55 : cat ? 55 : dog ? 54 : bear ? 55 : 51} cy={hedgehog ? 114 : deer ? 109 : cat ? 108 : dog ? 109 : bear ? 107 : 103} rx={hedgehog ? 8 : 11} ry="5.5" /><Ellipse cx={hedgehog ? 142 : deer ? 145 : cat ? 145 : dog ? 146 : bear ? 145 : 149} cy={hedgehog ? 114 : deer ? 109 : cat ? 108 : dog ? 109 : bear ? 107 : 103} rx={hedgehog ? 8 : 11} ry="5.5" /></G>
    <G data-part="mouth" stroke="#90767C" strokeWidth="1.8" strokeLinecap="round" fill="none">
      {bear ? <><Path d="M96 102 Q100 99 104 102 Q102 107 98 107Z" fill="#B99887" stroke="none" /><Path d="M100 107 V111 M93 113 Q100 119 107 113" /></> : dog ? <><Ellipse cx="100" cy="104" rx="4" ry="3" fill="#AA8590" stroke="none" /><Path d="M100 107 V111" /><Path d="M94 113 Q100 116 106 113 Q107 121 100 122 Q93 121 94 113Z" fill="#9A7885" strokeWidth="1.2" /></> : cat ? <><Path d="M97 106 Q100 109 103 106" /><Path d="M95 112 Q100 116 105 111" /></> : deer ? <><Ellipse cx="100" cy="109" rx="4.2" ry="3" fill="#A38A77" stroke="none" /><Path d="M100 113 V116 M96 118 Q100 121 104 118" stroke="#9C7C72" /></> : hedgehog ? <><Path d="M96 115 Q100 112 104 115 Q102 119 98 119Z" fill="#967D78" stroke="none" /><Ellipse cx="100" cy="125" rx="2" ry="2.6" fill="#A18686" stroke="none" /></> : <><Path d="M89 104 Q100 97 111 104 Q120 111 110 118 Q100 123 90 118 Q80 111 89 104Z" fill="#F0BE92" stroke="#C4A181" /><Path d="M91 110 Q100 116 109 110" stroke="#B5927D" /></>}
    </G>
  </G>;
}
