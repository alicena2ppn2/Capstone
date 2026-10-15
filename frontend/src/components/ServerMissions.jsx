import { useCallback, useEffect, useRef, useState } from 'react';
import UiIcon from './UiIcon.jsx';
import { todayMissions, completeWithPhoto, completeSteps, rerollMission, sendFeedback } from '../api/missions.js';

// 서버가 정한 오늘의 미션 3개 (움직이기 · 집 · 이어지기). 걸음 미션 말고는 오늘 찍은 사진을 올리면 서버가 날짜를 확인해 완료한다.
const SLOT = { outdoor: ['움직이기', 'discover'], home: ['집에서', 'routine'], connect: ['이어지기', 'envelope'] };
const STAGE = { 1: '1단계 혼자', 2: '2단계 한 명', 3: '3단계 여럿' };
const MOODS = [[1, '힘들었어'], [2, '조금 힘들었어'], [3, '보통'], [4, '괜찮았어'], [5, '좋았어']];

function ServerPhoto({ busy, onUpload }) {
  const [file, setFile] = useState(null), [preview, setPreview] = useState('');
  useEffect(() => { if (!file) return; const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  const choose = event => { const picked = event.target.files?.[0]; if (picked) setFile(picked); event.target.value = ''; };
  return <div className="photo-mission"><div className="photo-source-actions"><label className={`pb ui-secondary${busy?' is-disabled':''}`}>사진 선택<input type="file" accept="image/*" disabled={busy} onChange={choose}/></label><label className={`pb ui-secondary${busy?' is-disabled':''}`}>사진 찍기<input type="file" accept="image/*" capture="environment" disabled={busy} onChange={choose}/></label></div>{file&&<><img className="photo-preview" src={preview} alt="올릴 사진 미리보기"/><button type="button" className="pb shop-buy" disabled={busy} onClick={() => onUpload(file)}>{busy?'확인 중…':'사진 올리고 완료'}</button></>}<small>오늘 찍은 사진만 인정돼요. 서버가 찍은 날짜를 확인해요.</small></div>;
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
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 1800); return () => clearTimeout(timer); }, [toast]);
  const run = async (id, job) => {
    if (busy) return; setBusy(id); setNotes(value => ({ ...value, [id]: '' }));
    try { const result = await job(); if (result?.earned_total !== undefined) setToast(result); await load(); }
    catch (e) { if (mounted.current) setNotes(value => ({ ...value, [id]: e.message })); }
    finally { if (mounted.current) setBusy(null); }
  };
  if (error && !data) return <section className="daily-discoveries"><h2><UiIcon kind="discover" /> 서버 미션</h2><p role="alert">{error}</p><button type="button" className="pb ui-secondary" onClick={load}>다시 불러오기</button></section>;
  if (!data) return <section className="daily-discoveries"><h2><UiIcon kind="discover" /> 서버 미션</h2><p role="status">오늘의 미션을 불러오는 중…</p></section>;
  const missions = data.missions.filter(m => m.category !== 'daily');
  return <section className="daily-discoveries">
    <h2 className="quest-selection-heading" tabIndex={-1}><UiIcon kind="discover" /> 오늘의 활동 3가지 <small>{missions.filter(m => m.done).length}/3 완료 · 서버</small></h2>
    <div className="growth-quests">{missions.map(m => { const [slot, icon] = SLOT[m.category] ?? ['오늘의 활동', 'discover']; return <article data-quest-id={m.id} tabIndex={-1} key={m.id} className={`growth-quest quest-compact${m.done ? ' is-completed' : ''}`}>
      <small className="quest-category"><UiIcon kind={m.kind === 'photo' ? 'camera' : icon} size={17}/>{slot}{m.stage ? ` · ${STAGE[m.stage]}` : ''}</small>
      <div className="quest-card-heading"><strong>{m.title}</strong><span className="quest-state">{m.done ? '완료 ✓' : '시작 전'}</span></div>
      {!m.done && <>
        <p>{m.desc}</p>
        {m.tip && <p className="quest-tip"><small>이렇게 해 보세요 · {m.tip}</small></p>}
        <div className="quest-card-reward"><small>{m.xp} XP · {m.coins} 코인</small></div>
        <div className="quest-card-actions">{m.kind === 'photo' ? <ServerPhoto busy={busy === m.id} onUpload={file => run(m.id, () => completeWithPhoto(userId, m.id, file))}/> : m.kind === 'steps' ? <button type="button" className="pb shop-buy" disabled={!!busy} onClick={() => run(m.id, () => completeSteps(userId, m.id))}>오늘 걸음으로 확인 ({m.min_count.toLocaleString('ko-KR')}보)</button> : <small>앱에서 아직 지원하지 않는 미션이에요.</small>}
          {m.rerollable && <div className="quest-card-secondary"><button type="button" className="pb" disabled={!!busy || data.rerolls_left < 1} onClick={() => run(m.id, () => rerollMission(userId, m.id))}>다른 미션으로 ({data.rerolls_left}번 남음)</button></div>}
        </div>
        <p role="status">{notes[m.id]}</p>
      </>}
      {m.done && !m.feedback && <label className="profile-field">어땠나요? (선택)<select defaultValue="" disabled={!!busy} onChange={event => event.target.value && run(m.id, () => sendFeedback(userId, m.id, Number(event.target.value)))}><option value="">고르기</option>{MOODS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>}
      {m.done && m.feedback && <small>소감을 남겼어요.</small>}
    </article>; })}</div>
    <div className="quest-toast-region" role="status" aria-live="polite">{toast && <div className="quest-reward-toast"><strong>{toast.earned_total || toast.earned_xp ? '서버에서 보상을 받았어요!' : '완료했어요!'}</strong>{(toast.earned_total > 0 || toast.earned_xp > 0) && <span>+{toast.earned_xp} XP · +{toast.earned_total} 코인 (서버 기록)</span>}</div>}</div>
  </section>;
}
