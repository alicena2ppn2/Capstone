import PrototypeFriendDrawing from '../../../shared/art/FinalPrototypeFriendDrawing.jsx';
import useFriendReaction from './useFriendReaction.js';
import FriendEffects from './FriendEffects.jsx';
export default function PrototypeFriends({ variant, width, height, label, outfit, interactive, active, reactionId, onReactionConsumed }) {
  const { blink, reaction, props } = useFriendReaction({ interactive, active, reactionId, onReactionConsumed });
  const kind = reaction?.kind;
  const motion = {
    bodyProps: { className: `friend-body${kind ? ` is-${kind}` : ''}` },
    eyeProps: { className: `friend-eye${blink ? ' is-blinking' : ''}` },
    headProps: { className: kind ? (variant === 'proto-pebble' ? 'prototype-nod' : variant === 'proto-quilt' ? 'prototype-tilt' : '') : '' },
    tailProps: { className: kind && variant === 'proto-pear' ? 'prototype-wag' : '' },
  };
  return <svg width={width} height={height} viewBox="0 0 200 210" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} {...props} style={{ '--friend-bounce': '8px', '--friend-tilt': '3deg' }} className="prototype-svg friend-svg"><PrototypeFriendDrawing variant={variant} outfit={outfit} motion={motion} /><FriendEffects reaction={reaction} /></svg>;
}
