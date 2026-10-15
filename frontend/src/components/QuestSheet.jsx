import { useLayoutEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';

export default function QuestSheet({ frame, trigger, title, children, onClose }) {
  const overlay = useRef(null);
  const titleId = useId();
  useLayoutEffect(() => {
    const node = overlay.current;
    const buttons = () => [...node.querySelectorAll('button:not(:disabled), select, input, textarea, [tabindex="0"]')];
    buttons()[0]?.focus();
    const siblings = [...frame.children].filter(child => child !== node).map(child => ({ child, inert: child.inert }));
    siblings.forEach(({ child }) => { child.inert = true; });
    const scroll = frame.querySelector('.phone-content') ?? frame.querySelector('.sub-screen-content');
    const overflow = scroll?.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    if (scroll) scroll.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
      if (event.key !== 'Tab') return;
      const focusable = buttons();
      const first = focusable[0]; const last = focusable.at(-1);
      if (!node.contains(document.activeElement) || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault(); (event.shiftKey ? last : first)?.focus();
      }
    };
    document.addEventListener('keydown', keydown, true);
    return () => {
      siblings.forEach(({ child, inert }) => { child.inert = inert; });
      if (scroll) scroll.style.overflow = overflow;
      document.body.style.overflow = bodyOverflow;
      document.removeEventListener('keydown', keydown, true);
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      else frame.querySelector('.quest-selection-heading')?.focus();
    };
  }, [frame, trigger, onClose]);
  return createPortal(<div className="quest-sheet-overlay" ref={overlay} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="quest-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header><h2 id={titleId}>{title}</h2><button type="button" className="pb quest-sheet-close" aria-label="닫기" onClick={onClose}>×</button></header>
      {children}
    </section>
  </div>, frame);
}
