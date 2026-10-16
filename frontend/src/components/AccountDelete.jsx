import { useEffect, useRef, useState } from 'react';
import { useAuthActions } from '../../../shared/auth/AuthContext.js';
import { call, useServerUserId } from '../api/missions.js';

// 설정 > 계정 삭제 (App Store 심사 5.1.1(v): 앱 안에서 계정을 지울 수 있어야 함).
// 확인 창에서 '삭제'를 입력하면 서버의 게임 기록 전부 + Supabase 로그인 계정을 지우고,
// 이 브라우저에 남은 기록(mochi.*)도 지운 뒤 로그아웃한다.
const CONFIRM = '삭제';
const GONE = ['캐릭터·옷·집 꾸미기·코인·레벨', '미션·출석·걸음 기록', '일기와 사진', '이웃 방문·방명록·좋아요·친구', '로그인 계정 (Google·카카오 연결)'];

function clearLocal() {
  try { Object.keys(localStorage).filter(key => key.startsWith('mochi')).forEach(key => localStorage.removeItem(key)); } catch { /* 저장소를 못 쓰면 지울 것도 없음 */ }
}

export default function AccountDelete() {
  const auth = useAuthActions(), userId = useServerUserId();
  const dialog = useRef(null);
  const [open, setOpen] = useState(false), [typed, setTyped] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  useEffect(() => { const el = dialog.current; if (!el) return; if (open && !el.open) el.showModal(); if (!open && el.open) el.close(); }, [open]);
  const remove = async () => {
    if (busy || typed.trim() !== CONFIRM) return;
    setBusy(true); setMessage('');
    try {
      if (userId) await call(`/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      clearLocal();
      if (auth?.logout) await auth.logout();
      window.location.reload();                       // 메모리에 남은 게임 상태까지 비우고 처음 화면으로
    } catch (e) { setMessage(e.message); setBusy(false); }
  };
  return <section className="settings-card settings-tools">
    <h2>계정 삭제</h2>
    <p>계정과 모든 게임 기록을 지워요. 지운 기록은 되살릴 수 없어요.</p>
    <button type="button" className="pb ui-secondary account-delete-open" onClick={() => { setTyped(''); setMessage(''); setOpen(true); }}>계정 삭제</button>
    <dialog ref={dialog} className="report-dialog account-delete-dialog" aria-labelledby="account-delete-title" onCancel={() => setOpen(false)} onClose={() => setOpen(false)}>
      <h2 id="account-delete-title">정말 계정을 지울까요?</h2>
      <p className="report-hint">아래 기록이 모두 지워지고 되살릴 수 없어요.</p>
      <ul className="account-delete-list">{GONE.map(item => <li key={item}>{item}</li>)}</ul>
      <label htmlFor="account-delete-confirm" className="account-delete-label">확인을 위해 <strong>{CONFIRM}</strong>를 입력해 주세요</label>
      <input id="account-delete-confirm" className="inp" value={typed} onChange={event => setTyped(event.target.value)} autoComplete="off" disabled={busy} />
      {message && <p role="alert" className="report-hint">{message}</p>}
      <div className="report-actions"><button type="button" className="pb ui-secondary" disabled={busy} onClick={() => setOpen(false)}>취소</button>
        <button type="button" className="pb account-delete-confirm" disabled={busy || typed.trim() !== CONFIRM} onClick={remove}>{busy ? '지우는 중…' : '영구 삭제'}</button></div>
    </dialog>
  </section>;
}
