import { useEffect, useState } from 'react';
import Mochi from '../components/Mochi.jsx';
import { USERS, dailyVisitors, VISITOR_NOTES } from '../utils/visitors.js';
import { CLOTHES } from '../utils/clothes.js';
import { RoomBackdrop } from './Home.jsx';
import { seoulDateKey } from '../utils/seoulDate.js';

function loadNotes() {
  try {
    const value = JSON.parse(localStorage.getItem('mochi.visitNotes.v1'));
    if (value && typeof value === 'object' && !Array.isArray(value)) return { ...VISITOR_NOTES, ...value };
  } catch { /* 처음 방문 */ }
  return VISITOR_NOTES;
}

export default function Visit({ visitorName, visitorVariant, onBack }) {
  const [day, setDay] = useState(() => seoulDateKey());
  const [selected, setSelected] = useState(null);
  const [recommendation, setRecommendation] = useState(() => {
    try { return dailyVisitors(seoulDateKey(), JSON.parse(localStorage.getItem('mochi.visitors.v1'))); }
    catch { return dailyVisitors(seoulDateKey()); }
  });
  useEffect(() => { setRecommendation(previous => dailyVisitors(day, previous)); }, [day]);
  useEffect(() => { try { localStorage.setItem('mochi.visitors.v1', JSON.stringify(recommendation)); } catch { /* 현재 추천 유지 */ } }, [recommendation]);
  const [notes, setNotes] = useState(loadNotes);
  const [liked, setLiked] = useState(() => {
    try { const value = JSON.parse(localStorage.getItem('mochi.visitLikes.v1')); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
    catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem('mochi.visitLikes.v1', JSON.stringify(liked)); } catch { /* 현재 화면 유지 */ } }, [liked]);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const refresh = () => setDay(seoulDateKey());
    const timer = setInterval(refresh, 1000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  useEffect(() => {
    try { localStorage.setItem('mochi.visitNotes.v1', JSON.stringify(notes)); }
    catch { setMessage('현재 화면에는 남겼지만 브라우저에 저장하지 못했어요.'); }
  }, [notes]);
  const submit = event => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const entry = { name: visitorName, variant: visitorVariant, text, likes: 0, date: seoulDateKey(), id: `${Date.now()}-${Math.random()}` };
    setNotes(value => ({ ...value, [selected.id]: [entry, ...(Array.isArray(value[selected.id]) ? value[selected.id] : [])] }));
    setDraft('');
    setMessage('방명록을 남겼어요!');
  };
  return <section className="visit-screen">
    <header className="visit-header">
      <button type="button" className="pb" aria-label={selected ? '추천 목록으로 돌아가기' : '내 집으로 돌아가기'} onClick={() => { if (selected) setSelected(null); else onBack(); setDraft(''); setMessage(''); }}>←</button>
      <h1>{selected ? `${selected.nickname}의 집` : '방문하기'}</h1>
    </header>
    {selected ? <>
      <p className="visit-intro">{selected.icon} {selected.name} · {selected.nickname}</p>
      <div className="visitor-room" style={{ '--wall': selected.wall, '--floor': selected.floor }}>
        <span className="visitor-room-theme">{selected.theme}</span>
        <RoomBackdrop decor={selected.decorItems} wallColor={selected.wall} floorColor={selected.floor} />


        <div className="visitor-pet"><Mochi variant={selected.variant} outfit={CLOTHES.find(item => item.id === selected.outfit)} full width={180} height={190} label={`${selected.nickname}의 캐릭터`} /></div>
      </div>
      <p className="visit-intro">{selected.detail}</p>
      <section className="visit-guestbook" aria-labelledby="visit-notes-title">
        <h2 id="visit-notes-title">방명록</h2>
        <form onSubmit={submit}>
          <label htmlFor="visit-note">{visitorName}의 안부</label>
          <textarea id="visit-note" maxLength={120} value={draft} onChange={event => setDraft(event.target.value)} placeholder="다정한 한마디를 남겨보세요." />
          <div><small>{draft.length}/120</small><button type="submit" className="pb" disabled={!draft.trim()}>남기기</button></div>
        </form>
        <p role="status" className="visit-status">{message}</p>
        <div className="visit-notes">
          {(Array.isArray(notes[selected.id]) ? notes[selected.id] : []).map(entry => <article key={entry.id}><Mochi variant={entry.variant} width={40} height={40} /><div><strong>{entry.name}</strong><small>{entry.date}</small><p>{entry.text}</p><button type="button" className="pb visit-like" aria-pressed={!!liked[entry.id]} aria-label={`${entry.name}의 글 좋아요 ${(entry.likes ?? 0) + (liked[entry.id] ? 1 : 0)}개`} onClick={() => setLiked(value => ({ ...value, [entry.id]: !value[entry.id] }))}><span aria-hidden="true">{liked[entry.id] ? '♥' : '♡'}</span> {(entry.likes ?? 0) + (liked[entry.id] ? 1 : 0)}</button></div></article>)}
          {!notes[selected.id]?.length && <p className="visit-empty">첫 번째 안부를 남겨주세요.</p>}
        </div>
      </section>
    </> : <>
      <p className="visit-intro">오늘 만나볼 세 이웃</p>
      <div className="visit-recommendations">{recommendation.ids.map(id => USERS.find(user => user.id === id)).map(user => <button type="button" className="pb visit-card" key={user.id} onClick={() => { setSelected(user); setDraft(''); setMessage(''); }}>
        <span className="visit-avatar" style={{ background: user.wall }}><Mochi variant={user.variant} width={80} height={80} /><span>{user.icon}</span></span>
        <span className="visit-profile"><strong>{user.nickname}</strong><span>{user.name}</span><small>{user.theme}</small></span><span aria-hidden="true">→</span>
      </button>)}</div>
      <p className="visit-intro">서울 시간 자정에 새로운 이웃을 추천해요.</p>
    </>}
    <p className="visit-mock-note">가상 이웃 목업 · 방명록은 이 브라우저에만 저장돼요.</p>
  </section>;
}
