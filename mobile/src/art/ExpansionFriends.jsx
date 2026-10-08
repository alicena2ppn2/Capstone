import Svg, { G, Path, Ellipse, Circle, Defs, ClipPath } from 'react-native-svg';
import FinalExpansionFriendDrawing from '../../../frontend/src/components/FinalExpansionFriendDrawing.jsx';
import useFriendReaction from './useFriendReaction.js';
import FriendEffects from './FriendEffects.jsx';
import { useEffect, useState } from 'react';
const elements = { G, Path, Ellipse, Circle, Defs, ClipPath };
export default function ExpansionFriends({ variant, width, height, label, outfit }) {
  const { reaction, blink, bodyTransform } = useFriendReaction();
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!reaction) return;
    let frame;
    const start = Date.now();
    const tick = () => { const t = Math.min(1, (Date.now() - start) / 1000); setPhase(t); if (t < 1) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); setPhase(0); };
  }, [reaction]);
  const wave = reaction && bodyTransform ? Math.sin(phase * Math.PI * 2) * Math.sin(phase * Math.PI) : 0;
  const y = variant === 'draft-deer' ? 91 : variant === 'draft-hedgehog' ? 97 : 88;
  const motion = { bodyProps: { transform: bodyTransform }, eyeProps: { transform: blink ? `translate(0 ${y}) scale(1 .08) translate(0 -${y})` : '' }, headProps: { transform: `rotate(${wave * (variant === 'draft-deer' ? -3 : 2)} 100 130)` } };
  return <Svg width={width} height={height} viewBox="0 0 200 210" accessibilityLabel={label}><FinalExpansionFriendDrawing variant={variant} elements={elements} outfit={outfit} motion={motion} /><FriendEffects reaction={reaction} /></Svg>;
}
