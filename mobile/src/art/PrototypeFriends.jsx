import React, { useEffect, useState } from 'react';
import Svg, { G, Path, Ellipse, Circle, Defs, ClipPath } from 'react-native-svg';
import PrototypeFriendDrawing from '../../../shared/art/FinalPrototypeFriendDrawing.jsx';
import useFriendReaction from './useFriendReaction.js';
import FriendEffects from './FriendEffects.jsx';
const elements = { G, Path, Ellipse, Circle, Defs, ClipPath };
export default function PrototypeFriends({ variant, width, height, label, outfit }) {
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
  const wave = reaction && bodyTransform ? Math.sin(phase * Math.PI * 4) * Math.sin(phase * Math.PI) : 0;
  const head = variant === 'proto-pebble' ? `rotate(${wave * 3} 100 130)` : variant === 'proto-quilt' ? `rotate(${wave * 4} 100 130)` : '';
  const motion = { bodyProps: { transform: bodyTransform }, eyeProps: { transform: blink ? 'translate(0 88) scale(1 .08) translate(0 -88)' : '' }, headProps: { transform: head }, tailProps: { transform: variant === 'proto-pear' ? `rotate(${wave * 12} 140 170)` : '' } };
  return <Svg width={width} height={height} viewBox="0 0 200 210" accessibilityLabel={label}><PrototypeFriendDrawing variant={variant} elements={elements} outfit={outfit} motion={motion} /><FriendEffects reaction={reaction} /></Svg>;
}
