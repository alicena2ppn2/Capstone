import { useId } from 'react';
import useFriendReaction from './useFriendReaction.js';
import FriendEffects from './FriendEffects.jsx';
import { PROTOTYPE_FRIENDS } from '../utils/prototypeFriends.js';

function Motif({ outfit }) {
  return <g stroke="none">{outfit.motif === 'heart' ? <path d="M0 9 C-18 -2 -10 -15 0 -6 C10 -15 18 -2 0 9Z" fill="#FFF5F8" /> : outfit.motif === 'star' ? <path d="M0 -12 L4 -4 L13 -3 L6 3 L8 12 L0 7 L-8 12 L-6 3 L-13 -3 L-4 -4Z" fill="#FFF0AE" /> : outfit.motif === 'leaf' ? <g stroke="#EDF9E4" strokeWidth="2" fill="#EDF9E4"><path d="M0 10 V-8 M0 0 Q-18 0 -12 -10 Q0 -10 0 0 M0 3 Q18 3 12 -7 Q0 -7 0 3" /></g> : <path d="M-13 6 Q-20 -5 -10 -6 Q-5 -19 4 -11 Q16 -13 16 -3 Q25 9 9 9 H-9Z" fill="white" />}</g>;
}

export default function PrototypeFriends({ variant, width, height, label, outfit, interactive, active, reactionId, onReactionConsumed }) {
  const motion = useFriendReaction({ interactive, active, reactionId, onReactionConsumed });
  const clip = useId();
  const friend = PROTOTYPE_FRIENDS.find(item => item.id === variant) ?? PROTOTYPE_FRIENDS[0];
  const pebble = variant === 'proto-pebble', pear = variant === 'proto-pear';
  const body = pebble ? 'M39 126 C30 94 60 72 98 79 C139 65 174 105 163 143 C160 176 134 187 98 184 C59 188 37 164 39 126Z' : pear ? 'M82 46 C76 23 119 23 118 48 C113 74 144 101 145 146 C149 176 130 187 100 187 C65 189 49 171 55 143 C59 104 88 74 82 46Z' : 'M55 54 Q72 39 92 49 Q111 37 134 52 Q152 48 156 68 Q169 84 155 102 Q166 122 154 137 Q161 160 141 169 Q122 187 102 178 Q77 192 63 175 Q39 176 43 154 Q28 133 42 113 Q29 91 43 76 Q37 59 55 54Z';
  const neck = pebble ? 137 : pear ? 117 : 124;
  const left = pebble ? 43 : pear ? 58 : 44, right = 200 - left;
  const armY = pebble ? 155 : pear ? 143 : 146;
  const eyeY = friend.faceY;
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return <svg width={width} height={height} viewBox="0 0 200 210" {...a11y} {...motion.props} className="friend-svg prototype-svg" style={{ '--friend-bounce': `${friend.bounce}px`, '--friend-tilt': `${friend.tilt}deg` }}>
    <defs><clipPath id={clip}><path d={body} /></clipPath></defs>
    <ellipse cx="100" cy="199" rx={pebble ? 63 : 48} ry="5" fill={friend.line} opacity=".16" />
    <g key={motion.reaction?.id ?? 'idle'} className={`friend-body${motion.reaction ? ` is-${motion.reaction.kind}` : ''}`}>
      <g stroke={friend.line} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx={pebble ? 70 : 79} cy="190" rx={pebble ? 19 : 12} ry="7" fill={friend.color} />
        <ellipse cx={pebble ? 130 : 121} cy="190" rx={pebble ? 19 : 12} ry="7" fill={friend.color} />
        <path d={body} fill={friend.color} />
        {pebble ? <><path d="M55 107 Q62 95 75 96 M128 93 L137 96" fill="none" stroke="#EEF2F8" strokeWidth="4" /><circle cx="61" cy="132" r="2" fill={friend.line} stroke="none" /><circle cx="140" cy="121" r="2" fill={friend.line} stroke="none" /></> : pear ? <><path d="M91 57 Q97 51 108 57" fill="none" stroke="#F9FBEA" strokeWidth="5" /><ellipse cx="100" cy="149" rx="29" ry="25" fill="#F8F9E8" stroke="none" /><circle cx="77" cy="127" r="1.5" fill={friend.line} /><circle cx="124" cy="129" r="1.5" fill={friend.line} /></> : <><path d="M53 76 Q69 54 83 62 M126 66 Q140 67 145 80" fill="none" stroke="#FFF2F3" strokeWidth="4" /><path d="M54 155 L63 159 M58 164 L65 155" fill="none" stroke="#D3B5C3" /></>}
        {outfit && <g clipPath={`url(#${clip})`} stroke={outfit.trim}><path d={`M20 ${neck} Q100 ${neck + 20} 180 ${neck} V210 H20Z`} fill={outfit.color} /><path d={`M82 ${neck + 6} Q100 ${neck + 22} 118 ${neck + 6}`} fill="none" /><g transform={`translate(100 ${pebble ? 162 : 155}) scale(${pebble ? .72 : .85})`}><Motif outfit={outfit} /></g></g>}
        {[left, right].map((x, index) => <g key={index} transform={pebble && motion.reaction ? `translate(${index ? -30 : 30} 0)` : undefined}><ellipse cx={x} cy={armY} rx={pebble ? 9 : 8} ry={pebble ? 13 : 17} fill={friend.color} />{outfit && <path d={`M${x - 8} ${armY} V${armY - 7} Q${x} ${armY - 20} ${x + 8} ${armY - 7} V${armY}Z`} fill={outfit.color} stroke={outfit.trim} />}<ellipse cx={x} cy={armY + 8} rx="6" ry="6" fill={friend.color} /></g>)}
        {[pebble ? 77 : 78, pebble ? 123 : 122].map((x, index) => <g key={x} className={motion.blink ? 'friend-eye is-blinking' : 'friend-eye'}>
          {pebble ? <><path d={`M${x - 8} ${eyeY - 8} Q${x} ${eyeY - 13} ${x + 8} ${eyeY - 8}`} fill="none" strokeWidth="1.8" /><ellipse cx={x} cy={eyeY} rx="7" ry="6" fill="#65748D" stroke="none" /><circle cx={x - 2} cy={eyeY - 2} r="2" fill="white" stroke="none" /></> : pear ? <><ellipse cx={x} cy={eyeY} rx="10" ry="13" fill="#FFFEF3" strokeWidth="1.5" /><ellipse cx={x + (index ? -1 : 1)} cy={eyeY + 2} rx="6" ry="9" fill="#74845C" stroke="none" /><ellipse cx={x - 3} cy={eyeY - 4} rx="3" ry="4" fill="white" stroke="none" /></> : <><ellipse cx={x} cy={eyeY} rx="9" ry="8" fill="#FFF8F7" strokeWidth="1.5" /><ellipse cx={x} cy={eyeY + 1} rx="5" ry="6" fill="#8D718D" stroke="none" /><circle cx={x - 2} cy={eyeY - 2} r="2.5" fill="white" stroke="none" /><path d={`M${x - 8} ${eyeY - 7} L${x - 11} ${eyeY - 10}`} fill="none" strokeWidth="1.5" /></>}
        </g>)}
        <ellipse cx="61" cy={eyeY + 14} rx="8" ry="4" fill="#EFC1C2" opacity=".4" stroke="none" /><ellipse cx="139" cy={eyeY + 14} rx="8" ry="4" fill="#EFC1C2" opacity=".4" stroke="none" />
        {pear ? <ellipse cx="100" cy={eyeY + 20} rx="3" ry="4" fill="#B19886" stroke="none" /> : <path d={`M94 ${eyeY + 18} Q100 ${eyeY + (motion.reaction ? 28 : 23)} 106 ${eyeY + 18}`} fill="none" stroke="#987D83" strokeWidth="1.8" />}
        {motion.reaction && pebble && <path d="M86 177 Q100 169 114 177" fill="none" />}
        {motion.reaction && pear && <path d="M69 65 L78 61 M122 61 L131 65" fill="none" />}
      </g>
    </g>
    <FriendEffects reaction={motion.reaction} />
  </svg>;
}
