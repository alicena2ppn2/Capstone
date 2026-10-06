import { useEffect, useId, useState } from 'react';

export default function Potato({ width, height, label, asleep, outfit, full, interactive = false, active = false, reactionId, onReactionConsumed }) {
  const clipId = useId();
  const [reaction, setReaction] = useState(null);
  const [blinking, setBlinking] = useState(false);
  const enabled = interactive && active;
  useEffect(() => {
    if (!enabled || asleep) { setBlinking(false); return; }
    let timer;
    const schedule = () => { timer = window.setTimeout(() => {
      setBlinking(true);
      timer = window.setTimeout(() => { setBlinking(false); schedule(); }, 180);
    }, 3000 + Math.random() * 3500); };
    schedule();
    return () => window.clearTimeout(timer);
  }, [enabled, asleep]);
  useEffect(() => {
    if (!enabled) { setReaction(null); return; }
    if (reactionId) {
      setReaction({ kind: 'joy', id: reactionId });
      onReactionConsumed?.(reactionId);
    }
  }, [enabled, reactionId, onReactionConsumed]);
  useEffect(() => {
    if (!reaction) return;
    const timer = window.setTimeout(() => setReaction(null), 1050);
    return () => window.clearTimeout(timer);
  }, [reaction]);
  const react = () => { if (enabled && !reaction) setReaction({ kind: 'tap', id: 'tap' }); };
  const bodyPath = 'M103 17 C139 15 154 53 151 90 Q150 119 163 148 Q172 184 126 194 Q75 207 46 177 Q31 157 42 125 Q50 105 47 73 Q47 28 103 17Z';
  return <svg width={width} height={height} viewBox="0 0 200 210" className={interactive ? 'potato-interactive' : undefined} {...(interactive ? { role: 'button', tabIndex: active ? 0 : -1, 'aria-label': `${label || '감자 모찌'}, 반응 보기`, onClick: react, onKeyDown: event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); react(); } } } : label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
    <defs><clipPath id={clipId}><path d={bodyPath} /></clipPath></defs>
    <ellipse cx="100" cy="199" rx="58" ry="6" fill="#8B6745" opacity=".12" />
    <g key={reaction?.id ?? 'idle'} className={`potato-body${reaction ? ` potato-${reaction.kind}` : ''}`}>
    <g fill="#D6AE7F" stroke="#95734F" strokeWidth="3" strokeLinejoin="round">
      <path d="M52 127 Q22 111 26 131 Q28 145 51 149 M149 126 Q179 110 176 130 Q173 143 151 148" />
      <ellipse cx="77" cy="190" rx="10" ry="13" /><ellipse cx="124" cy="190" rx="10" ry="13" />
      <path d={bodyPath} />
    </g>
    <path d="M60 66 Q66 33 96 29" fill="none" stroke="#F8DAB0" strokeWidth="9" strokeLinecap="round" opacity=".6" />
    <g fill="#AC8459" opacity=".55"><ellipse cx="126" cy="55" rx="5" ry="3" /><ellipse cx="60" cy="137" rx="8" ry="4" /><ellipse cx="133" cy="157" rx="10" ry="5" /><ellipse cx="90" cy="177" rx="6" ry="3" /><circle cx="136" cy="94" r="3" /><circle cx="78" cy="52" r="2" /></g>
    {full && outfit && <>
      <g fill={outfit.color} stroke={outfit.trim} strokeWidth="2.3" strokeLinejoin="round">
        <path d="M46 128 L29 123 Q20 131 28 141 L48 150 M151 128 L171 122 Q180 130 173 140 L152 149" />
        <g clipPath={`url(#${clipId})`}>
          <path d="M15 125 Q100 150 185 125 V210 H15Z" />
          <path d="M78 138 Q101 153 125 138 M42 181 Q100 210 161 183" fill="none" />
          <path d="M50 151 Q47 165 52 171 M147 150 Q154 164 147 171" fill="none" opacity=".35" />
        </g>
      </g>
      <g transform="translate(0 7)" fill="#FFF7E7">
        {outfit.motif === 'cloud' && <path d="M85 166 Q79 156 89 155 Q92 143 101 149 Q112 146 114 156 Q124 166 112 168 H90Z" />}
        {outfit.motif === 'heart' && <path d="M100 169 C82 159 85 146 94 150 L100 155 L106 150 C115 146 118 159 100 169Z" />}
        {outfit.motif === 'star' && <path d="M100 146 L105 154 L114 156 L108 162 L110 171 L100 166 L90 171 L92 162 L86 156 L95 154Z" fill="#FFF0AE" />}
        {outfit.motif === 'leaf' && <path d="M100 171 V156 M100 159 Q81 158 86 148 Q101 147 100 159 M100 161 Q117 160 115 150 Q101 150 100 161" fill="#EDF9E4" stroke="#EDF9E4" strokeWidth="2" />}
      </g>
      <g fill="#D6AE7F" stroke="#95734F" strokeWidth="2.3"><ellipse cx="27" cy="134" rx="7" ry="8" transform="rotate(-22 27 134)" /><ellipse cx="174" cy="133" rx="7" ry="8" transform="rotate(22 174 133)" /></g>
    </>}
    <g fill="#EDAFB9" opacity=".25"><ellipse cx="59" cy="117" rx="12" ry="6" /><ellipse cx="139" cy="116" rx="12" ry="6" /></g>
    <path d="M63 81 Q70 76 77 79 M120 79 Q129 77 135 83" fill="none" stroke="#95734F" strokeWidth="2" strokeLinecap="round" />
    {asleep ? <path d="M62 99 Q72 106 82 99 M117 99 Q127 106 137 99" fill="none" stroke="#544338" strokeWidth="3" strokeLinecap="round" /> : <g>
      {[72, 127].map((x) => <g key={x} className={blinking ? 'potato-eye is-blinking' : 'potato-eye'}><ellipse cx={x} cy="102" rx="10" ry="13" fill="#544338" /><ellipse cx={x} cy="109" rx="7" ry="5" fill="#A69B89" /><circle cx={x + 2} cy="96" r="4" fill="white" /><circle cx={x - 3} cy="105" r="2" fill="white" /></g>)}
    </g>}
    <path d="M91 118 Q96 124 101 118 Q106 124 111 118" fill="none" stroke="#544338" strokeWidth="2" strokeLinecap="round" />
    <path d={full && outfit ? 'M116 39 l4 1' : 'M52 158 l5 -3 M133 174 l6 -2 M116 39 l4 1'} stroke="#96734E" strokeWidth="2" opacity=".5" strokeLinecap="round" />
    </g>
    {reaction && <g className="potato-effects" key={`effect-${reaction.id}`} aria-hidden="true">
      {[{ x: 33, y: 41 }, { x: 167, y: 32 }, { x: 152, y: 65 }].map(({ x, y }, i) => <g key={i} transform={`translate(${x} ${y})`}>
        <g className="potato-particle" style={{ animationDelay: `${i * 70}ms` }}>
          {reaction.kind === 'tap' ? <path d="M0 5 C-15 -3 -9 -14 0 -7 C9 -14 15 -3 0 5Z" fill="#EBA2B5" /> : <path d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3Z" fill="#F1C763" stroke="#D5A947" strokeWidth="1" />}
        </g>
      </g>)}
    </g>}
  </svg>;
}
