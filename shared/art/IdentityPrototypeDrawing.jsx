import IdentityFaceDrawing from './IdentityFaceDrawing.jsx';
import { useId } from 'react';
// Shared static SVG geometry; web/native supply their own SVG element types.
export default function IdentityPrototypeDrawing({ variant, revision, elements = {} }) {
  const { G = 'g', Path = 'path', Ellipse = 'ellipse', Circle = 'circle' } = elements;
  const prefix = useId();
  const c = revision === 'C';
  const bear = variant === 'proto-pebble', puppy = variant === 'proto-pear';
  const fur = bear ? '#FFF0D5' : puppy ? '#FFE9DF' : '#E4EDF8';
  const line = bear ? '#B6A087' : puppy ? '#BC9B97' : '#99A8BD';
  const inner = bear ? '#EECBB6' : puppy ? '#F4C9C2' : '#EDCFDC';
  return <>
    <Ellipse cx="100" cy="199" rx="52" ry="5" fill={line} opacity=".15" />
    <G stroke={line} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <G id={`${prefix}-tail`} fill={fur}>{bear ? <Circle cx="139" cy="169" r="12" /> : puppy ? <Path d="M135 163 Q161 139 166 158 Q170 176 145 181Z" /> : <Path d={c ? 'M133 172 Q146 168 151 160 Q162 149 169 161 Q181 181 155 189 Q133 193 131 183 Q132 176 142 178 Q148 183 158 179 Q163 176 160 169 Q156 165 152 170 Q144 180 133 180Z' : 'M137 163 Q162 162 160 146 Q156 135 164 137 Q184 145 171 165 Q162 180 140 180Z'} />}</G>
      <G id={`${prefix}-body`} fill={fur}><Path d={c ? bear ? 'M73 125 Q100 113 127 125 Q148 148 138 172 Q133 187 100 187 Q67 187 62 172 Q52 148 73 125Z' : puppy ? 'M77 123 Q100 116 123 123 Q135 140 135 162 Q134 185 100 186 Q66 185 65 162 Q65 140 77 123Z' : 'M80 124 Q100 117 120 124 Q135 145 129 170 Q125 184 100 185 Q75 184 71 170 Q65 145 80 124Z' : (bear ? 'M74 125 Q100 113 126 125 Q144 145 134 170 Q130 185 100 185 Q70 185 66 170 Q56 145 74 125Z' : puppy ? 'M76 121 Q100 114 124 121 Q136 137 136 163 Q136 184 100 186 Q64 184 64 163 Q64 137 76 121Z' : 'M78 123 Q100 116 122 123 Q137 143 131 169 Q126 183 100 184 Q74 183 69 169 Q63 143 78 123Z')} /><Ellipse cx="100" cy="160" rx={c && bear ? 25 : 22} ry="22" fill="#FFFDF4" stroke="none" /></G>
      <G id={`${prefix}-feet`} fill={fur}><Ellipse cx={c && !bear && !puppy ? 82 : 78} cy="185" rx={bear ? 18 : c && !puppy ? 15 : 17} ry="11" /><Ellipse cx={c && !bear && !puppy ? 118 : 122} cy="185" rx={bear ? 18 : c && !puppy ? 15 : 17} ry="11" /><Path d="M73 188 H82 M118 188 H127" stroke={inner} strokeWidth="2" /></G>
      {c ? <>
      <G id={`${prefix}-arms`} fill={fur}>{bear ? <><Path d="M69 142 Q65 143 70 155 Q74 169 86 168 Q97 165 92 157 Q88 153 79 152Z" /><Path d="M131 142 Q135 143 130 155 Q126 169 114 168 Q103 165 108 157 Q112 153 121 152Z" /></> : puppy ? <><Path d="M68 140 Q50 141 51 155 Q52 171 64 167 Q76 162 76 148Z" /><Path d="M129 143 Q140 144 146 133 Q146 123 154 120 Q163 115 166 124 Q170 138 152 151 Q138 160 128 153Z" /></> : <><Path d="M76 141 Q69 142 73 154 Q76 167 88 165 Q98 162 92 156 Q87 150 82 148Z" /><Path d="M124 141 Q131 142 127 154 Q124 167 112 165 Q102 162 108 156 Q113 150 118 148Z" /></>}</G>
      </> : <>
      <G id={`${prefix}-arms`} fill={fur}>{bear ? <><Path d="M69 137 Q51 131 50 148 Q48 164 60 166 Q71 166 75 151Z" /><Path d="M131 137 Q149 131 150 148 Q152 164 140 166 Q129 166 125 151Z" /></> : puppy ? <><Path d="M68 140 Q50 141 51 155 Q52 171 64 167 Q76 162 76 148Z" /><Path d="M132 140 Q150 141 149 155 Q148 171 136 167 Q124 162 124 148Z" /></> : <><Path d="M73 137 Q61 130 57 143 Q54 155 66 163 Q75 165 80 153Z" /><Path d="M127 137 Q139 130 143 143 Q146 155 134 163 Q125 165 120 153Z" /></>}</G>
      </>}
      <G id={`${prefix}-ears`} fill={fur}>{bear ? <><Circle cx="57" cy="40" r="20" /><Circle cx="143" cy="40" r="20" /><Circle cx="57" cy="40" r="11" fill={inner} stroke="none" /><Circle cx="143" cy="40" r="11" fill={inner} stroke="none" /></> : puppy ? <><Path d="M58 39 Q34 30 30 57 Q22 90 39 106 Q54 111 61 78Z" fill="#EAD0C5" /><Path d="M141 39 Q166 36 170 62 Q180 88 163 105 Q149 110 139 77Z" fill="#EAD0C5" /><Path d="M39 57 Q30 79 41 91 M161 60 Q170 82 161 92" fill="none" stroke="#F9E7DC" strokeWidth="4" /></> : <><Path d="M49 61 Q41 21 51 20 Q69 22 83 46Z" /><Path d="M117 46 Q134 20 147 22 Q156 25 152 62Z" /><Path d="M53 45 L54 30 Q64 32 69 42Z M132 42 Q138 32 145 31 L145 47Z" fill={inner} stroke="none" /></>}</G>
      <G id={`${prefix}-head`} fill={fur}>{bear ? <Path d="M100 34 C67 28 40 50 40 83 C33 116 57 139 100 137 C143 139 167 116 160 83 C160 50 133 28 100 34Z" /> : puppy ? <><Path d="M100 31 C66 27 42 47 43 79 Q32 93 42 103 Q38 133 72 138 Q99 148 128 137 Q162 133 158 104 Q168 93 157 80 C158 48 134 27 100 31Z" /><Path d="M92 36 Q87 21 101 26 Q115 24 112 35" fill={fur} /></> : <Path d="M100 40 Q65 29 44 57 Q35 72 42 90 L37 99 L44 105 Q37 131 68 134 Q98 145 130 134 Q163 132 156 105 L163 99 L158 89 Q168 67 152 53 Q129 29 100 40Z" />}</G>
      <IdentityFaceDrawing variant={variant} elements={elements} />
      <G id={`${prefix}-accessory`}>{bear ? <><Path d="M83 136 Q100 142 117 136" fill="none" stroke="#ABC7BF" strokeWidth="5" /><Path d="M109 139 L112 150 L121 146 L117 137" fill="#BED9D1" stroke="#98B5AD" strokeWidth="1.8" /></> : puppy ? <Path d="M58 61 Q55 57 58 54 Q61 51 64 55 Q68 52 70 56 Q72 60 68 63Z" fill="#C9DCDD" stroke="#9FBBC1" strokeWidth="1.6" /> : <><Ellipse cx="100" cy="151" rx="5" ry="4" fill="#D9C6E8" stroke="#B6A2C7" strokeWidth="1.6" /><Path d="M98 151 H102" stroke="#FFFDF4" strokeWidth="1.5" /></>}</G>
    </G>
  </>;
}
