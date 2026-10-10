// Each silhouette supplies its own body/arm outlines. Clothing never reshapes it.
export default function FriendGarment({ outfit, bodyPath, arms, prefix, sleeves = false, elements = {} }) {
  const { G = 'g', Path = 'path', Defs = 'defs', ClipPath = 'clipPath' } = elements;
  if (!outfit) return null;
  const clip = `${prefix}-${sleeves ? 'arms' : 'body'}-clothes`;
  return <><Defs><ClipPath id={clip}>{sleeves ? arms.map((d, i) => <Path key={i} d={d} />) : <Path d={bodyPath} />}</ClipPath></Defs>
    <G data-part={sleeves ? 'sleeves' : 'outfit'} clipPath={`url(#${clip})`} fill={outfit.color} stroke={outfit.trim} strokeWidth="1.8" strokeLinejoin="round">
      {sleeves ? <Path d="M47 124 H86 L80 151 Q68 161 49 149Z M114 124 H155 L153 148 Q135 160 120 148Z" /> : <>
        <Path d="M53 124 Q100 145 147 124 L149 181 Q100 196 51 181Z" />
        <Path d="M78 132 Q100 148 122 132 M65 175 Q100 189 135 175" fill="none" />
        {outfit.motif === 'heart' && <Path d="M100 171 C84 161 86 150 94 154 L100 159 L106 154 C114 150 116 161 100 171Z" fill="#FFF5F8" stroke="none" />}
        {outfit.motif === 'cloud' && <Path d="M87 168 Q81 159 91 158 Q94 148 102 154 Q112 151 114 160 Q123 169 111 171 H91Z" fill="#FFFDF8" stroke="none" />}
        {outfit.motif === 'star' && <Path d="M100 150 L104 158 L113 159 L107 165 L109 174 L100 169 L91 174 L93 165 L87 159 L96 158Z" fill="#FFF0AE" stroke="none" />}
        {outfit.motif === 'leaf' && <Path d="M100 173 V159 M100 162 Q83 160 89 152 Q101 152 100 162 M100 165 Q117 165 113 156 Q102 156 100 165" fill="#EDF9E4" />}
      </>}
    </G></>;
}
