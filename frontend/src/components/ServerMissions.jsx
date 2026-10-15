import { useCallback, useEffect, useRef, useState } from 'react';
import { todayMissions, completeWithPhoto, completeSteps, rerollMission, sendFeedback } from '../api/missions.js';

// 서버가 정한 오늘의 미션 3개 (움직이기 · 집 · 이어지기). 걸음 미션 말고는 오늘 찍은 사진을 올리면 서버가 날짜를 확인해 완료한다.
// 카드 하나에 행동 하나: 사진 올리기(또는 걸음 확인) → 완료 → 기분 고르기. Habitica 할 일 목록처럼 보상은 카드 오른쪽 위에.
const SLOT = { outdoor: ['움직이기', 'is-move'], home: ['집에서', 'is-home'], connect: ['이어지기', 'is-connect'] };
const STAGE = { 1: '1단계', 2: '2단계', 3: '3단계' };
const MOODS = [[1, '😣', '힘들었어'], [2, '😕', '조금 힘들었어'], [3, '🙂', '보통'], [4, '😊', '괜찮았어'], [5, '😄', '좋았어']];

function PhotoPick({ busy, onUpload }) {
  const [file, setFile] = useState(null), [preview, setPreview] = useState('');
  const input = useRef(null);
  useEffect(() => { if (!file) return undefined; const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  const choose = event => { const picked = event.target.files?.[0]; if (picked) setFile(picked); event.target.value = ''; };
  // accept=image/* 하나로 휴대폰은 '사진 찍기 / 앨범에서 고르기'를 함께 보여 준다
  return <div className="mission-photo">
    <input ref={input} type="file" accept="image/*" hidden disabled={busy} onChange={choose} />
    {file ? <div className="mission-photo-confirm">
      <img src={preview} alt="올릴 사진 미리보기" />
      <div>
        <button type="button" className="pb shop-buy" disabled={busy} onClick={() => onUpload(file)}>{busy ? '날짜 확인 중…' : '이 사진으로 완료'}</button>
        <button type="button" className="pb mission-link" disabled={busy} onClick={() => input.current?.click()}>다른 사진 고르기</button>
      </div>
    </div> : <button type="button" className="pb shop-buy mission-main" disabled={busy} onClick={() => input.current?.click()}><span aria-hidden="true">📷</span> 오늘 찍은 사진으로 완료</button>}
  </div>;
}

export default function ServerMissions({ userId }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(null);
  const [notes, setNotes] = useState({}), [toast, setToast] = useState(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const load = useCallback(async () => {
    try { const next = await todayMissions(userId); if (mounted.current) { setData(next); setError(''); } }
    catch (e) { if (mounted.current) setError(e.message); }
  }, [userId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(null), 2200); return () => clearTimeout(timer); }, [toast]);
  const run = async (id, job) => {
    if (busy) return; setBusy(id); setNotes(value => ({ ...value, [id]: '' }));
    try { const result = await job(); if (result?.earned_total !== undefined) setToast(result); await load(); }
    catch (e) { if (mounted.current) setNotes(value => ({ ...value, [id]: e.message })); }
    finally { if (mounted.current) setBusy(null); }
  };
  if (error && !data) return <section className="daily-discoveries"><h2>오늘의 활동</h2><p role="alert">{error}</p><button type="button" className="pb ui-secondary" onClick={load}>다시 불러오기</button></section>;
  if (!data) return <section className="daily-discoveries"><h2>오늘의 활동</h2><p role="status">오늘의 미션을 불러오는 중…</p></section>;
  const missions = data.missions.filter(m => m.category !== 'daily');
  const done = missions.filter(m => m.done).length;
  return <section className="daily-discoveries mission-list">
    <h2 className="quest-selection-heading" tabIndex={-1}>오늘의 활동 <small>{done}/{missions.length}</small></h2>
    <ol className="mission-cards">{missions.map(m => { const [slot, tone] = SLOT[m.category] ?? ['오늘의 활동', 'is-home']; return <li data-quest-id={m.id} tabIndex={-1} key={m.id} className={`mission-card ${tone}${m.done ? ' is-done' : ''}`}>
      <div className="mission-card-top">
        <span className="mission-chip">{slot}{m.stage ? ` · ${STAGE[m.stage]}` : ''}</span>
        <span className="mission-top-right">
          {!m.done && m.rerollable && <button type="button" className="pb mission-reroll" disabled={!!busy || data.rerolls_left < 1} aria-label={`다른 미션으로 바꾸기, ${data.rerolls_left}번 남음`} title={`다른 미션으로 (${data.rerolls_left}번 남음)`} onClick={() => run(m.id, () => rerollMission(userId, m.id))}>↻</button>}
          <span className="mission-reward" aria-label={`보상 ${m.coins}코인, ${m.xp} XP`}>+{m.coins} 코인</span>
        </span>
      </div>
      <div className="mission-card-title"><span className="mission-check" aria-hidden="true">{m.done ? '✓' : ''}</span><strong>{m.title}</strong></div>
      {m.done ? <div className="mission-done">
        {m.feedback ? <small>완료! 소감까지 남겼어요.</small> : <><small>완료! 해 보니 어땠어요? (선택)</small>
          <div className="mission-moods" role="group" aria-label="해 보니 어땠는지">{MOODS.map(([v, face, label]) => <button type="button" key={v} className="pb" disabled={!!busy} aria-label={label} title={label} onClick={() => run(m.id, () => sendFeedback(userId, m.id, v))}>{face}</button>)}</div></>}
      </div> : <>
        <p className="mission-desc">{m.desc}</p>
        {m.tip && <p className="mission-tip"><span aria-hidden="true">💡</span> {m.tip}</p>}
        {m.kind === 'photo' ? <PhotoPick busy={busy === m.id} onUpload={file => run(m.id, () => completeWithPhoto(userId, m.id, file))}/>
          : m.kind === 'steps' ? <button type="button" className="pb shop-buy mission-main" disabled={!!busy} onClick={() => run(m.id, () => completeSteps(userId, m.id))}><span aria-hidden="true">👟</span> 오늘 걸음으로 확인 · {m.min_count.toLocaleString('ko-KR')}보</button>
          : <small>앱에서 아직 지원하지 않는 미션이에요.</small>}
        <p role="status" className="mission-note">{notes[m.id]}</p>
      </>}
    </li>; })}</ol>
    <div className="quest-toast-region" role="status" aria-live="polite">{toast && <div className="quest-reward-toast"><strong>{toast.earned_total || toast.earned_xp ? '미션 완료!' : '완료했어요!'}</strong>{(toast.earned_total > 0 || toast.earned_xp > 0) && <span>+{toast.earned_xp} XP · +{toast.earned_total} 코인</span>}</div>}</div>
  </section>;
}
