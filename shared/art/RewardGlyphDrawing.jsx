export default function RewardGlyphDrawing({reward,elements={}}) {
  const {Path='path',Circle='circle',Ellipse='ellipse'}=elements;
  if(reward.type==='coins')return <><Circle cx="32" cy="32" r="27" fill="#F5D36B" stroke="#C6A146" strokeWidth="2"/><Circle cx="32" cy="32" r="20" fill="none" stroke="#FFEBA8" strokeWidth="2"/><Path d="M32 15 L37 26 L49 28 L40 36 L42 49 L32 43 L22 49 L24 36 L15 28 L27 26Z" fill="#FFF5C6"/></>;
  if(reward.type==='xp')return <Path d="M32 4 L40 22 L60 26 L45 40 L48 60 L32 50 L16 60 L19 40 L4 26 L24 22Z" fill="#C6B2E9" stroke="#927AB8" strokeWidth="2"/>;
  const item=reward.item;
  return <><Path d="M20 8 L5 17 L12 32 L19 28 V57 H45 V28 L52 32 L59 17 L44 8 Q32 18 20 8Z" fill={item.color} stroke={item.trim} strokeWidth="2"/>{item.motif==='cloud'?<><Circle cx="27" cy="36" r="5" fill="#FFF9EF"/><Circle cx="34" cy="34" r="7" fill="#FFF9EF"/><Circle cx="41" cy="37" r="4" fill="#FFF9EF"/></>:item.motif==='heart'?<Path d="M32 44 C17 35 25 27 32 33 C39 27 47 35 32 44Z" fill="#FFF9EF"/>:item.motif==='leaf'?<><Ellipse cx="32" cy="37" rx="6" ry="9" fill="#FFF9EF"/><Path d="M32 31 V45" stroke={item.trim} strokeWidth="1.5"/></>:<Path d="M32 27 L36 34 L44 35 L38 40 L39 48 L32 44 L25 48 L26 40 L20 35 L28 34Z" fill="#FFF9EF"/>}</>;
}
