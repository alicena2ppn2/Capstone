import { useEffect, useRef } from 'react';
import { dailySentence } from '../utils/dailySentence.js';

export default function DailySentence({ now }) {
  const sentence = dailySentence(now), ref = useRef(null);
  useEffect(() => {
    const bubble = ref.current, room = bubble?.closest('.home-room');
    if (!room) return;
    // Reserve more wall space only when enlarged text needs it. Do not shrink the friend.
    const measure = () => {
      const base = room.clientWidth * 500 / 368;
      const extra = Math.max(0, base * .868 + bubble.offsetHeight + 36 - base);
      room.style.setProperty('--sentence-width', `${Math.min(340,room.clientWidth-24)}px`);
      room.style.setProperty('--sentence-base-height', `${base}px`);
      room.style.setProperty('--sentence-extra', `${Math.ceil(extra)}px`);
    };
    const observer = new ResizeObserver(measure); observer.observe(bubble); observer.observe(room);
    measure();
    return () => { observer.disconnect(); room.style.removeProperty('--sentence-base-height'); room.style.removeProperty('--sentence-extra'); room.style.removeProperty('--sentence-width'); };
  }, []);
  return <aside ref={ref} className="daily-sentence" data-sentence-id={sentence.id} data-seoul-day={sentence.day} aria-label={`오늘의 한 문장. ${sentence.text}`}>
    <p key={sentence.day}>{sentence.text}</p>
  </aside>;
}
