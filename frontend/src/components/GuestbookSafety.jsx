import { useCallback, useEffect, useState } from 'react';
import QuestSheet from './QuestSheet.jsx';
import { MODERATION_KEY, SELF_AUTHOR, REPORT_REASONS, restoreModeration, reportNote, blockAuthor, noteKey, suspensionUntil, writingError } from '../../../shared/features/guestModeration.js';

function load() { return restoreModeration(JSON.parse(localStorage.getItem(MODERATION_KEY) ?? 'null')); }
export function useGuestModeration() {
  const [state, setState] = useState(() => { try { return load(); } catch { return restoreModeration(null); } });
  const [now, setNow] = useState(Date.now);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const refresh = () => { try { setState(load()); setNow(Date.now()); } catch { setMessage('안전 설정을 읽지 못했어요. 브라우저 저장소를 확인해 주세요.'); } };
    const storage = event => { if (event.key === MODERATION_KEY || event.key === null) refresh(); };
    window.addEventListener('storage', storage); window.addEventListener('mochi-moderation', refresh); window.addEventListener('focus', refresh);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(timer); window.removeEventListener('storage', storage); window.removeEventListener('mochi-moderation', refresh); window.removeEventListener('focus', refresh); };
  }, []);
  const update = mutation => {
    try { const before = load(), next = mutation(before); if (next !== before) localStorage.setItem(MODERATION_KEY, JSON.stringify(next)); setState(next); window.dispatchEvent(new Event('mochi-moderation')); return next; }
    catch { setMessage('저장하지 못했어요. 신고·차단을 적용하지 않았습니다. 다시 시도해 주세요.'); return null; }
  };
  const report = (scope, entry, reason) => {
    const next = update(previous => reportNote(previous, scope, entry, reason));
    if (!next) return null;
    setMessage(next.deleted[noteKey(scope, entry)] ? '혐오·욕설이 확인되어 글을 삭제하고 작성자를 7일 제한했어요. 이 브라우저에서만 적용돼요.' : '신고를 이 브라우저에 기록했어요. 자동으로 작성 정지되지는 않아요.');
    return next;
  };
  const block = (entry, enabled = true) => { if (update(previous => blockAuthor(previous, entry, enabled))) setMessage(enabled ? '이 작성자의 글을 숨겼어요.' : '차단을 해제했어요.'); };
  const validate = text => { try { return writingError(load(), text); } catch { return 'storage'; } };
  return { state, now, message, setMessage, report, block, validate };
}
export const writingMessage = error => error === 'suspended' ? '7일 작성 제한 중이라 방명록을 남길 수 없어요.' : error === 'storage' ? '안전 설정을 확인하지 못했어요. 브라우저 저장소를 확인해 주세요.' : '혐오 표현이나 욕설 없이 다시 적어 주세요.';
export function SafetyPanel({ safety, showBlockedAuthors = false }) {
  const until = suspensionUntil(safety.state, SELF_AUTHOR, safety.now);
  return <section className="guest-safety" aria-label="방명록 안전 설정">
    <p>혐오·욕설 필터가 적용돼요. 신고된 글에서 혐오·욕설이 확인되면 글 삭제 및 작성 7일 제한.</p>
    <small>현재는 이 브라우저의 목업에만 적용돼요. 실제 사용자 신고 접수·제재는 서버 연결 전이에요.</small>
    {until && <p role="alert">방명록 작성이 제한되어 있어요. 해제: {new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' }).format(until)}</p>}
    <p role="status">{safety.message}</p>
    {showBlockedAuthors && <details className="ui-disclosure"><summary>차단한 작성자 {Object.keys(safety.state.blocked).length}명</summary>{Object.entries(safety.state.blocked).map(([id, entry]) => <div className="guest-blocked" key={id}><span>{entry.name}</span><button className="pb" type="button" onClick={() => safety.block(id, false)}>차단 해제</button></div>)}{!Object.keys(safety.state.blocked).length && <p>차단한 작성자가 없어요.</p>}</details>}
  </section>;
}
export function ModerationActions({ entry, scope, safety, onRemove }) {
  const [dialog, setDialog] = useState(null);
  const close = useCallback(() => setDialog(null), []);
  if (authorIdForSelf(entry)) return null;
  return <>
    <button type="button" className="pb guest-safety-action" disabled={!!safety.state.reports[noteKey(scope, entry)]} onClick={event => setDialog({ kind: 'report', frame: event.currentTarget.closest('.phone-shell'), trigger: event.currentTarget })}>{safety.state.reports[noteKey(scope, entry)] ? '신고됨' : '신고'}</button>
    <button type="button" className="pb guest-safety-action" onClick={event => setDialog({ kind: 'block', frame: event.currentTarget.closest('.phone-shell'), trigger: event.currentTarget })}>차단</button>
    {dialog?.frame && <QuestSheet frame={dialog.frame} trigger={dialog.trigger} title={dialog.kind === 'report' ? '이 글을 신고할까요?' : '작성자를 차단할까요?'} onClose={close}>
      {dialog.kind === 'report' ? <><p>신고 이유를 골라 주세요. 확인된 혐오·욕설 글만 삭제·7일 제한돼요.</p>{Object.entries(REPORT_REASONS).map(([id, label]) => <button className="pb guest-report-choice" type="button" key={id} onClick={() => { const next = safety.report(scope, entry, id); if (next?.deleted[noteKey(scope, entry)]) onRemove?.(entry.id); close(); }}>{label}</button>)}</> : <><p>{entry.name}님의 글을 내 방명록과 방문한 집 방명록에서 숨겨요. 나중에 차단을 해제할 수 있어요.</p><button type="button" className="pb guest-report-choice" onClick={() => { safety.block(entry); close(); }}>차단하기</button></>}
      <button type="button" className="pb guest-report-choice" onClick={close}>취소</button>
    </QuestSheet>}
  </>;
}
function authorIdForSelf(entry) { return entry.authorId === SELF_AUTHOR || entry.source === 'local' || /^m\d+$/.test(entry.id ?? ''); }
