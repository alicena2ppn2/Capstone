import FinalExpansionFriendDrawing from '../../../shared/art/FinalExpansionFriendDrawing.jsx';
import useFriendReaction from './useFriendReaction.js';
import FriendEffects from './FriendEffects.jsx';
import { finalFriend } from '../../../shared/features/finalFriends.js';
export default function ExpansionFriends({ variant, width, height, label, outfit, interactive, active, reactionId, onReactionConsumed }) {
  const { blink, reaction, props } = useFriendReaction({ interactive, active, reactionId, onReactionConsumed });
  const gesture = finalFriend(variant)?.gesture;
  const motion = { bodyProps: { className: `friend-body${reaction ? ` is-${reaction.kind}` : ''}` }, eyeProps: { className: `friend-eye${blink ? ' is-blinking' : ''}` }, headProps: { className: reaction ? gesture === 'tilt' ? 'prototype-tilt' : 'prototype-nod' : '' } };
  return <svg className="expansion-friend-svg prototype-svg friend-svg" width={width} height={height} viewBox="0 0 200 210" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} {...props} style={{ '--friend-bounce': '8px', '--friend-tilt': '3deg' }}><FinalExpansionFriendDrawing variant={variant} outfit={outfit} motion={motion} /><FriendEffects reaction={reaction} /></svg>;
}
