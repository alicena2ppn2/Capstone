import GarmentPattern, { garmentFill } from './GarmentPattern.jsx';
import { useId } from 'react';
// Approved geometry stays intact; outfit and motion are separate layers.
export default function PrototypeFriendDrawing({ variant, outfit, motion = {}, elements = {} }) {
  const { G = 'g', Path = 'path', Ellipse = 'ellipse', Circle = 'circle', Defs = 'defs', ClipPath = 'clipPath' } = elements;
  const prefix = useId();
  const bear = variant === 'proto-pebble', puppy = variant === 'proto-pear';
  const fur = bear ? '#FFF0D5' : puppy ? '#FFE9DF' : '#E4EDF8';
  const line = bear ? '#B6A087' : puppy ? '#BC9B97' : '#99A8BD';
  const inner = bear ? '#EECBB6' : puppy ? '#F4C9C2' : '#EDCFDC';
  const iris = bear ? '#69513F' : puppy ? '#695164' : '#495E7D';
  const bodyPath = bear ? 'M74 125 Q100 113 126 125 Q144 145 134 170 Q130 185 100 185 Q70 185 66 170 Q56 145 74 125Z' : puppy ? 'M76 121 Q100 114 124 121 Q136 137 136 163 Q136 184 100 186 Q64 184 64 163 Q64 137 76 121Z' : 'M78 123 Q100 116 122 123 Q137 143 131 169 Q126 183 100 184 Q74 183 69 169 Q63 143 78 123Z';
  return <>
    <Ellipse cx="100" cy="199" rx="52" ry="5" fill={line} opacity=".15" />
    <Defs><ClipPath id={`${prefix}-shirt-clip`}><Path d={bodyPath} /></ClipPath></Defs>
    <G {...motion.bodyProps} stroke={line} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <G id={`${prefix}-tail`} {...motion.tailProps} fill={fur}>{bear ? <Circle cx="139" cy="169" r="12" /> : puppy ? <Path d="M135 163 Q161 139 166 158 Q170 176 145 181Z" /> : <Path d="M137 163 Q162 162 160 146 Q156 135 164 137 Q184 145 171 165 Q162 180 140 180Z" />}</G>
      <G id={`${prefix}-body`} fill={fur}><Path d={bodyPath} /><Ellipse cx="100" cy="160" rx="22" ry="22" fill="#FFFDF4" stroke="none" /></G>
      {outfit && <GarmentPattern outfit={outfit} id={`${prefix}-pattern`} elements={elements} />}
      {outfit && <G id={`${prefix}-outfit`} clipPath={`url(#${prefix}-shirt-clip)`} stroke={outfit.trim} strokeWidth="1.8" fill={garmentFill(outfit, `${prefix}-pattern`, elements)}>
        <Path d="M58 128 Q100 143 142 128 L144 177 Q100 192 56 177Z" />
        <Path d="M77 136 Q100 148 123 136 M68 174 Q100 184 132 174" fill="none" />
        {outfit.motif === 'heart' && <Path d="M100 172 C84 162 86 151 94 155 L100 160 L106 155 C114 151 116 162 100 172Z" fill="#FFF5F8" stroke="none" />}
        {outfit.motif === 'cloud' && <Path d="M87 169 Q81 160 91 159 Q94 149 102 155 Q112 152 114 161 Q123 170 111 172 H91Z" fill="#FFFDF8" stroke="none" />}
        {outfit.motif === 'star' && <Path d="M100 151 L104 159 L113 160 L107 166 L109 175 L100 170 L91 175 L93 166 L87 160 L96 159Z" fill="#FFF0AE" stroke="none" />}
        {outfit.motif === 'leaf' && <Path d="M100 174 V160 M100 163 Q83 161 89 153 Q101 153 100 163 M100 166 Q117 166 113 157 Q102 157 100 166" fill="#EDF9E4" />}
      </G>}
      <G id={`${prefix}-feet`} fill={fur}><Ellipse cx="78" cy="185" rx={bear ? 18 : 17} ry="11" /><Ellipse cx="122" cy="185" rx={bear ? 18 : 17} ry="11" /><Path d="M73 188 H82 M118 188 H127" stroke={inner} strokeWidth="2" /></G>
      <G id={`${prefix}-arms`} fill={fur}>{bear ? <><Path d="M69 137 Q51 131 50 148 Q48 164 60 166 Q71 166 75 151Z" /><Path d="M131 137 Q149 131 150 148 Q152 164 140 166 Q129 166 125 151Z" /></> : puppy ? <><Path d="M68 140 Q50 141 51 155 Q52 171 64 167 Q76 162 76 148Z" /><Path d="M132 140 Q150 141 149 155 Q148 171 136 167 Q124 162 124 148Z" /></> : <><Path d="M73 137 Q61 130 57 143 Q54 155 66 163 Q75 165 80 153Z" /><Path d="M127 137 Q139 130 143 143 Q146 155 134 163 Q125 165 120 153Z" /></>}</G>
      {outfit && <><Defs><ClipPath id={`${prefix}-sleeves-clip`}>{bear ? <><Path d="M69 137 Q51 131 50 148 Q48 164 60 166 Q71 166 75 151Z" /><Path d="M131 137 Q149 131 150 148 Q152 164 140 166 Q129 166 125 151Z" /></> : puppy ? <><Path d="M68 140 Q50 141 51 155 Q52 171 64 167 Q76 162 76 148Z" /><Path d="M132 140 Q150 141 149 155 Q148 171 136 167 Q124 162 124 148Z" /></> : <><Path d="M73 137 Q61 130 57 143 Q54 155 66 163 Q75 165 80 153Z" /><Path d="M127 137 Q139 130 143 143 Q146 155 134 163 Q125 165 120 153Z" /></>}</ClipPath></Defs><G clipPath={`url(#${prefix}-sleeves-clip)`} stroke={outfit.trim} strokeWidth="1.8" fill={garmentFill(outfit, `${prefix}-pattern`, elements)}><Path d="M46 129 H82 L77 152 Q62 160 48 151Z M118 129 H154 L152 151 Q138 160 123 152Z" /></G></>}
      <G {...motion.headProps}>
      <G id={`${prefix}-ears`} fill={fur}>{bear ? <><Circle cx="57" cy="40" r="20" /><Circle cx="143" cy="40" r="20" /><Circle cx="57" cy="40" r="11" fill={inner} stroke="none" /><Circle cx="143" cy="40" r="11" fill={inner} stroke="none" /></> : puppy ? <><Path d="M58 39 Q34 30 30 57 Q22 90 39 106 Q54 111 61 78Z" fill="#EAD0C5" /><Path d="M141 39 Q166 36 170 62 Q180 88 163 105 Q149 110 139 77Z" fill="#EAD0C5" /><Path d="M39 57 Q30 79 41 91 M161 60 Q170 82 161 92" fill="none" stroke="#F9E7DC" strokeWidth="4" /></> : <><Path d="M49 61 Q41 21 51 20 Q69 22 83 46Z" /><Path d="M117 46 Q134 20 147 22 Q156 25 152 62Z" /><Path d="M53 45 L54 30 Q64 32 69 42Z M132 42 Q138 32 145 31 L145 47Z" fill={inner} stroke="none" /></>}</G>
      <G id={`${prefix}-head`} fill={fur}>{bear ? <Path d="M100 34 C67 28 40 50 40 83 C33 116 57 139 100 137 C143 139 167 116 160 83 C160 50 133 28 100 34Z" /> : puppy ? <><Path d="M100 31 C66 27 42 47 43 79 Q32 93 42 103 Q38 133 72 138 Q99 148 128 137 Q162 133 158 104 Q168 93 157 80 C158 48 134 27 100 31Z" /><Path d="M92 36 Q87 21 101 26 Q115 24 112 35" fill={fur} /></> : <Path d="M100 40 Q65 29 44 57 Q35 72 42 90 L37 99 L44 105 Q37 131 68 134 Q98 145 130 134 Q163 132 156 105 L163 99 L158 89 Q168 67 152 53 Q129 29 100 40Z" />}</G>
      <G id={`${prefix}-face`} stroke="none">
        {bear && <Ellipse cx="100" cy="111" rx="21" ry="14" fill="#FFF9ED" />}
        {puppy && <Path d="M83 93 Q99 85 117 94 Q127 105 119 121 Q101 132 82 121 Q73 106 83 93Z" fill="#FFF9F1" />}
        <G id={`${prefix}-eyes`}>{[73, 127].map((x, index) => <G key={x} id={`${prefix}-${index ? 'eye-right' : 'eye-left'}`} {...motion.eyeProps}>
          {bear ? <Ellipse cx={x} cy="87" rx="10.5" ry="13" fill={iris} /> : puppy ? <Path d={`M${x - 11} 88 Q${x - 12} 73 ${x} 73 Q${x + 12} 74 ${x + 11} 89 Q${x + 10} 103 ${x} 102 Q${x - 10} 102 ${x - 11} 88Z`} fill={iris} /> : <Path d={`M${x - 11} 88 Q${x - 10} 74 ${x} 77 Q${x + 12} 78 ${x + 11} 90 Q${x + 9} 104 ${x - 1} 101 Q${x - 12} 99 ${x - 11} 88Z`} fill={iris} />}
          <Ellipse cx={x} cy={bear ? 93 : 96} rx="8" ry="5" fill={bear ? '#BB9778' : puppy ? '#B896A8' : '#8FAACC'} /><Ellipse cx={x - 3} cy={bear ? 82 : puppy ? 81 : 83} rx="4" ry="4.7" fill="#FFFDF8" /><Circle cx={x + 4} cy="89" r="2.3" fill="white" />{!bear && <Circle cx={x - 2} cy="98" r="1.3" fill="#FFEFF8" />}{!bear && !puppy && <Path d={`M${x - 9} 79 L${x - 12} 76`} fill="none" stroke={iris} strokeWidth="1.8" strokeLinecap="round" />}
        </G>)}</G>
        <G id={`${prefix}-cheeks`} fill="#EEAEBB" opacity=".3"><Ellipse cx="55" cy="107" rx="11" ry="6" /><Ellipse cx="145" cy="107" rx="11" ry="6" /></G>
        <G id={`${prefix}-mouth`} stroke="#90767C" strokeWidth="1.8" strokeLinecap="round" fill="none">{bear ? <><Path d="M96 102 Q100 99 104 102 Q102 107 98 107Z" fill="#B99887" stroke="none" /><Path d="M100 107 V111 M94 112 Q100 118 106 112" /></> : puppy ? <><Ellipse cx="100" cy="103" rx="4" ry="3" fill="#AA8590" stroke="none" /><Path d="M100 106 V110 M93 111 Q96 116 100 111 Q104 116 107 111" /></> : <><Path d="M97 105 Q100 108 103 105" /><Path d="M95 112 Q100 116 105 112" /></>}</G>
      </G>
      </G>
      <G id={`${prefix}-accessory`}>{bear && !outfit ? <><Path d="M83 136 Q100 142 117 136" fill="none" stroke="#ABC7BF" strokeWidth="5" /><Path d="M109 139 L112 150 L121 146 L117 137" fill="#BED9D1" stroke="#98B5AD" strokeWidth="1.8" /></> : puppy ? <Path d="M58 61 Q55 57 58 54 Q61 51 64 55 Q68 52 70 56 Q72 60 68 63Z" fill="#C9DCDD" stroke="#9FBBC1" strokeWidth="1.6" /> : !bear && !outfit ? <><Ellipse cx="100" cy="151" rx="5" ry="4" fill="#D9C6E8" stroke="#B6A2C7" strokeWidth="1.6" /><Path d="M98 151 H102" stroke="#FFFDF4" strokeWidth="1.5" /></> : null}</G>
    </G>
  </>;
}
