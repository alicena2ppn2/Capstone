import ScreenHeader from '../components/ScreenHeader.jsx';
import { useEffect, useState } from 'react';
import Mochi from '../components/Mochi.jsx';
import { USERS, dailyVisitors, VISITOR_NOTES } from '../utils/visitors.js';
import { CLOTHES } from '../utils/clothes.js';
import { RoomBackdrop } from './Home.jsx';
import { seoulDateKey } from '../utils/seoulDate.js';
import { initialConnections, visitNeighbor, favoriteNeighbor, isSampleNote } from '../utils/neighbors.js';
import { useGuestModeration, SafetyPanel, ModerationActions, writingMessage } from '../components/GuestbookSafety.jsx';
import { SELF_AUTHOR, visibleNote, violation, suspensionUntil } from '../utils/guestModeration.js';

function loadNotes() {
  try {
    const value = JSON.parse(localStorage.getItem('mochi.visitNotes.v1'));
    if (value && typeof value === 'object' && !Array.isArray(value)) return { ...VISITOR_NOTES, ...value };
  } catch { /* 처음 방문 */ }
  return VISITOR_NOTES;
}

export default function Visit({ visitorName, visitorVariant, onBack, onPosted }) {
  const safety = useGuestModeration();
  const suspended = !!suspensionUntil(safety.state, SELF_AUTHOR, safety.now);
  const [connections, setConnections] = useState(() => { try { const value = JSON.parse(localStorage.getItem('mochi.visitConnections.v1')); return { ...initialConnections(), ...value, recent: Array.isArray(value?.recent) ? value.recent : [], favorites: Array.isArray(value?.favorites) ? value.favorites : [] }; } catch { return initialConnections(); } });
  const [list, setList] = useState('recommended');
  useEffect(() => { try { localStorage.setItem('mochi.visitConnections.v1', JSON.stringify(connections)); } catch { /* 현재 화면 유지 */ } }, [connections]);
  const open = user => { if (!user) return; setSelected(user); setConnections(value => visitNeighbor(value, user.id)); setDraft(''); setMessage(''); };
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
    const error = safety.validate(text);
    if (error) { safety.setMessage(writingMessage(error)); return; }
    const entry = { source: 'local', authorId: SELF_AUTHOR, name: visitorName, variant: visitorVariant, text, likes: 0, date: seoulDateKey(), id: `${Date.now()}-${Math.random()}` };
    const next = { ...notes, [selected.id]: [entry, ...(Array.isArray(notes[selected.id]) ? notes[selected.id] : [])] };
    try { localStorage.setItem('mochi.visitNotes.v1', JSON.stringify(next)); }
    catch { setMessage('저장하지 못했어요. 작성한 글은 유지돼요. 다시 시도해 주세요.'); return; }
    setNotes(next);
    onPosted?.(entry.date);
    setDraft('');
    setMessage('이 브라우저에 기록했어요. 실제 상대에게 전달되지 않아요.');
  };
  return <section className="visit-screen">
    <ScreenHeader title={selected ? `${selected.nickname}의 집` : '방문하기'} backLabel={selected ? '추천 목록으로 돌아가기' : '내 집으로 돌아가기'} onBack={() => { if (selected) setSelected(null); else onBack(); setDraft(''); setMessage(''); }} />
    {selected ? <>
      <p className="visit-intro">{selected.icon} {selected.name} · {selected.nickname}</p>
      <div className="visit-neighbor-actions">
      <button type="button" className="pb ui-secondary" aria-label={connections.favorites.includes(selected.id) ? '저장한 이웃 해제' : '이웃 저장'} aria-pressed={connections.favorites.includes(selected.id)} onClick={() => setConnections(value => favoriteNeighbor(value, selected.id))}>{connections.favorites.includes(selected.id) ? '저장됨 ✓' : '이웃 저장'}</button>
      {['응원해요', '고마워요'].map(label => <button type="button" className="pb ui-secondary" key={label} aria-pressed={connections.reactions?.[selected.id] === label} onClick={() => { setConnections(value => ({ ...value, reactions: { ...value.reactions, [selected.id]: label } })); setMessage('내 반응을 이 브라우저에 저장했어요.'); }}>{connections.reactions?.[selected.id] === label ? `${label === '응원해요' ? '응원' : '감사'} 선택됨 ✓` : label}</button>)}
      </div>
      <div className="visitor-room" style={{ '--wall': selected.wall, '--floor': selected.floor }}>
        <span className="visitor-room-theme">{selected.theme}</span>
        <RoomBackdrop decor={selected.decorItems} wallColor={selected.wall} floorColor={selected.floor} />


        <div className="visitor-pet"><Mochi variant={selected.variant} outfit={CLOTHES.find(item => item.id === selected.outfit)} full width={180} height={190} label={`${selected.nickname}의 캐릭터`} /></div>
      </div>
      <p className="visit-intro">{selected.detail}</p>
      <section className="visit-guestbook" aria-labelledby="visit-notes-title">
        <h2 id="visit-notes-title">방명록</h2>
        <SafetyPanel safety={safety} />
        <form onSubmit={submit}>
          <label htmlFor="visit-note">{visitorName}의 안부</label>
          <textarea id="visit-note" maxLength={120} disabled={suspended} value={draft} onChange={event => setDraft(event.target.value)} placeholder="다정한 한마디를 남겨보세요." />
          <div><small>{draft.length}/120</small><button type="submit" className="pb" disabled={suspended || !draft.trim()}>남기기</button></div>
        </form>
        <p role="status" className="visit-status">{message}</p>
        <div className="visit-notes">
          {(Array.isArray(notes[selected.id]) ? notes[selected.id] : []).filter(entry => visibleNote(safety.state, `visit:${selected.id}`, entry)).map(entry => <article key={entry.id}><Mochi variant={entry.variant} width={40} height={40} /><div><strong>{entry.name}</strong><small>{entry.date} · {isSampleNote(entry) ? '시연 글' : '내 브라우저 작성 글'}</small><p>{violation(entry.text) ? '혐오·욕설 필터로 내용을 가렸어요.' : entry.text}</p><div className="guest-safety-actions"><button type="button" className="pb visit-like" aria-pressed={!!liked[entry.id]} aria-label={`${entry.name}의 글 좋아요 ${(entry.likes ?? 0) + (liked[entry.id] ? 1 : 0)}개`} onClick={() => setLiked(value => ({ ...value, [entry.id]: !value[entry.id] }))}><span aria-hidden="true">{liked[entry.id] ? '♥' : '♡'}</span> {(entry.likes ?? 0) + (liked[entry.id] ? 1 : 0)}</button><ModerationActions entry={entry} scope={`visit:${selected.id}`} safety={safety} onRemove={id => setNotes(value => ({ ...value, [selected.id]: value[selected.id].filter(note => note.id !== id) }))} /></div></div></article>)}
          {!(notes[selected.id] ?? []).some(entry => visibleNote(safety.state, `visit:${selected.id}`, entry)) && <p className="visit-empty">표시할 방명록이 없어요.</p>}
        </div>
      </section>
    </> : <>
      <p className="visit-intro">샘플 이웃 · 실제 사용자 추천이 아니에요.</p>
      <div className="shop-tabs">{[['recommended', '오늘 추천'], ['recent', '최근 방문'], ['favorites', '저장한 이웃'], ['notes', '내가 남긴 글']].map(([id, label]) => <button type="button" className="pb" key={id} aria-pressed={list === id} onClick={() => setList(id)}>{label}</button>)}</div>
      {list === 'notes' ? Object.entries(notes).flatMap(([id, entries]) => entries.filter(entry => !isSampleNote(entry) && visibleNote(safety.state, `visit:${id}`, entry)).map(entry => <article className="growth-quest" key={entry.id}><strong>{USERS.find(user => user.id === id)?.nickname}에게 · {entry.date}</strong><p>{violation(entry.text) ? '혐오·욕설 필터로 내용을 가렸어요.' : entry.text}</p><button type="button" className="pb" onClick={() => open(USERS.find(user => user.id === id))}>그 집 방명록 보기</button></article>)) : <div className="visit-recommendations">{(list === 'recommended' ? recommendation.ids : connections[list]).map(id => USERS.find(user => user.id === id)).filter(Boolean).map(user => <button type="button" className="pb visit-card" key={user.id} onClick={() => open(user)}>
        <span className="visit-avatar" style={{ background: user.wall }}><Mochi variant={user.variant} width={80} height={80} /><span>{user.icon}</span></span>
        <span className="visit-profile"><strong>{user.nickname}</strong><span>{user.name}</span><small>{user.theme}</small></span><span aria-hidden="true">→</span>
      </button>)}</div>}
      <p className="visit-intro">서울 시간 자정에 새로운 이웃을 추천해요.</p>
    </>}
    <p className="visit-mock-note">가상 이웃 목업 · 방명록은 이 브라우저에만 저장돼요.</p>
  </section>;
}
