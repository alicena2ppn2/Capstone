import { useEffect, useState } from 'react';

export default function useFriendReaction({ interactive, active, reactionId, onReactionConsumed }) {
  const enabled = !!interactive && !!active;
  const [blink, setBlink] = useState(false);
  const [reaction, setReaction] = useState(null);
  useEffect(() => {
    if (!enabled) return;
    let blinkTimer;
    let timer;
    const schedule = () => { timer = setTimeout(() => { setBlink(true); blinkTimer = setTimeout(() => { setBlink(false); schedule(); }, 180); }, 3000 + Math.random() * 3500); };
    schedule();
    return () => { clearTimeout(timer); clearTimeout(blinkTimer); setBlink(false); };
  }, [enabled]);
  useEffect(() => {
    if (!enabled) { setReaction(null); return; }
    if (reactionId != null) { setReaction({ kind: 'joy', id: reactionId }); onReactionConsumed?.(reactionId); }
  }, [enabled, reactionId, onReactionConsumed]);
  useEffect(() => { if (!reaction) return; const timer = setTimeout(() => setReaction(null), 1050); return () => clearTimeout(timer); }, [reaction]);
  const respond = () => { if (enabled && !reaction) setReaction({ kind: 'tap', id: 'tap' }); };
  return { blink, reaction, props: interactive ? { role: 'button', tabIndex: enabled ? 0 : -1, onClick: respond, onKeyDown: event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); respond(); } } } : {} };
}
