import { useEffect, useRef, useState } from 'react';
import { calendarDays, deletedJournal, hasJournal, JOURNAL_LIMIT, shiftMonth } from '../utils/journal.js';
import { seoulDateKey } from '../utils/seoulDate.js';

function DiaryEntry({ date, day, game, onSave, onDelete, onClose }) {
  const [draft, setDraft] = useState(game.journals?.[date] ?? '');
  const [message, setMessage] = useState('');
  const editable = date === day && !deletedJournal(game, date);
  return <article className="diary-entry" aria-labelledby="diary-entry-title">
    <header><h2 id="diary-entry-title">{date}</h2><button className="pb ui-secondary" type="button" onClick={onClose}>목록으로</button></header>
    {editable ? <><label htmlFor="diary-text">오늘의 일기</label><textarea id="diary-text" maxLength={JOURNAL_LIMIT} value={draft} placeholder="오늘의 하루를 편하게 남겨보세요." onChange={event => { setDraft(event.target.value); setMessage(''); }} /><small>{draft.length} / {JOURNAL_LIMIT}</small><button className="pb diary-save" type="button" disabled={!draft.trim() || draft.trim() === game.journals?.[date]} onClick={() => { if (seoulDateKey() !== date) { setMessage('날짜가 바뀌어 수정할 수 없어요.'); return; } onSave(date, draft); setMessage('일기를 저장했어요.'); }}>{hasJournal(game, date) ? '수정 저장' : '일기 저장'}</button></> : <><p className="diary-read-text">{game.journals?.[date] ?? '삭제된 일기예요.'}</p><small>지난 날짜의 일기는 읽기만 가능해요.</small></>}
    {hasJournal(game, date) && <button className="pb ui-secondary diary-delete" type="button" onClick={() => { if (window.confirm(`${date} 일기를 삭제할까요? 삭제한 글은 복구할 수 없어요.`)) { onDelete(date); onClose(); } }}>일기 삭제</button>}
    <p role="status">{message}</p>
  </article>;
}
export default function Diary({ game, day, onSave, onDelete, onHome }) {
  const root = useRef(null);
  const [mode, setMode] = useState('list'), [month, setMonth] = useState(day.slice(0, 7)), [selected, setSelected] = useState(null);
  useEffect(() => { root.current?.closest('.phone-content')?.scrollTo({ top: 0 }); }, [selected]);
  useEffect(() => { const handler = event => { if (event.key === 'Escape') setSelected(null); }; document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler); }, []);
  const entries = Object.entries(game.journals ?? {}).filter(([, text]) => typeof text === 'string' && text.trim()).sort(([a], [b]) => b.localeCompare(a));
  return <section ref={root} className="diary-screen"><header className="diary-header"><button className="pb ui-secondary" type="button" onClick={onHome} aria-label="홈 화면으로 돌아가기">{'<'}</button><h1>일기</h1></header>
    {selected ? <DiaryEntry key={selected} date={selected} day={day} game={game} onSave={onSave} onDelete={onDelete} onClose={() => setSelected(null)} /> : <><article className="diary-today"><h2>{day} · 오늘</h2><p>{hasJournal(game, day) ? '오늘 남긴 일기를 다시 볼까요?' : deletedJournal(game, day) ? '오늘의 일기는 삭제했어요. 새 일기는 내일 쓸 수 있어요.' : '나의 하루를 한 편의 일기로 남겨요.'}</p><button className="pb diary-save" type="button" disabled={deletedJournal(game, day)} onClick={() => setSelected(day)}>{hasJournal(game, day) ? '오늘의 일기 보기' : '오늘 일기 쓰기'}</button></article>
      <nav className="diary-tabs" aria-label="일기 보기 방식"><button className="pb ui-secondary" aria-pressed={mode === 'list'} onClick={() => setMode('list')}>날짜별 목록</button><button className="pb ui-secondary" aria-pressed={mode === 'calendar'} onClick={() => setMode('calendar')}>월별 달력</button></nav>
      {mode === 'calendar' && <section className="diary-calendar"><header><button className="pb ui-secondary" onClick={() => setMonth(value => shiftMonth(value, -1))} aria-label="이전 달">{'<'}</button><h2>{month.slice(0, 4)}년 {Number(month.slice(5))}월</h2><button className="pb ui-secondary" onClick={() => setMonth(value => shiftMonth(value, 1))} aria-label="다음 달">{'>'}</button></header><div className="diary-calendar-grid">{['일', '월', '화', '수', '목', '금', '토'].map(label => <span className="diary-weekday" key={label}>{label}</span>)}{calendarDays(month).map((date, index) => date ? <button key={date} type="button" className={`pb diary-calendar-day${hasJournal(game, date) ? ' is-written' : ''}`} disabled={!hasJournal(game, date)} aria-label={`${date}${hasJournal(game, date) ? ', 일기 읽기' : ', 일기 없음'}`} aria-current={date === day ? 'date' : undefined} onClick={() => setSelected(date)}><span>{Number(date.slice(8))}</span><span className="diary-stamp" aria-hidden="true">{hasJournal(game, date) ? '✿' : ''}</span></button> : <span key={`empty-${index}`} />)}</div></section>}
      <div className="diary-list">{entries.length ? entries.filter(([date]) => mode === 'list' || date.startsWith(month)).map(([date, text]) => <button className="pb diary-list-entry" key={date} onClick={() => setSelected(date)}><strong>{date}</strong><span>{text.slice(0, 90)}{text.length > 90 ? '…' : ''}</span></button>) : <p>아직 남긴 일기가 없어요.</p>}</div>
    </>}
  </section>;
}
