export default function FriendEffects({ reaction }) {
  return reaction && <g aria-hidden="true" className="friend-particles" key={reaction.id}>{[55, 100, 145].map((x, i) => <g key={x} transform={`translate(${x} ${28 + (i % 2) * 7})`}><g className="friend-particle">{reaction.kind === 'tap' ? <path d="M0 5 C-15 -5 -8 -13 0 -7 C8 -13 15 -5 0 5Z" fill="#E7A7BC" /> : <path d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3Z" fill="#EDCD7E" />}</g></g>)}</g>;
}
