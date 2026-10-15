import MissionReplacement from '../components/MissionReplacement.jsx';
import MissionPreferences from '../components/MissionPreferences.jsx';
import { missionCriterion, missionTitle } from '../../../shared/features/missionGuidance.js';
import PhotoMission from '../components/PhotoMission.jsx';
import UiIcon from '../components/UiIcon.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import QuestSheet from '../components/QuestSheet.jsx';
import SubScreen from '../components/SubScreen.jsx';
import { QUESTS, levelFor, questCompletionKey, goalProgress } from '../../../shared/features/game.js';
import { CATEGORIES } from '../../../shared/features/challenges.js';
import { ROUTINES, routineDone, dailyActivities, dailyReward } from '../../../shared/features/dailyMissions.js';
import { seoulDateKey } from '../../../shared/utils/seoulDate.js';

export default function Quest({ onPreferences, game, focusId, onStart, onComplete, onPhotoSave, onPrepare, onPause, onReplace, onFeedback, onProfile, onDiary, onAttendance, onVisit, onGoal, petColor, onShop, onSettings, onHome }) {
  const [tab, setTab] = useState('day');
  const [today, setToday] = useState(seoulDateKey);
  const [message, setMessage] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [notice, setNotice] = useState('');
  const closeSheet = useCallback(() => setSheet(null), []);
  const openSheet = (event, data) => setSheet({ ...data, day: today, trigger: event.currentTarget, frame: event.currentTarget.closest('.phone-shell') });
  const lastReward = useRef(game.questReward?.sequence ?? 0);
  useEffect(() => {
    if (!focusId) return;
    const timer = setTimeout(() => {
      const card = document.querySelector(`[data-quest-id="${focusId}"]`);
      card?.scrollIntoView({ block: 'nearest' });
      card?.focus({ preventScroll: true });
    }, 0);
    return () => clearTimeout(timer);
  }, [focusId]);
  useEffect(() => {
    const refresh = () => setToday(seoulDateKey());
    const timer = setInterval(refresh, 1000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  useEffect(() => { onPrepare(today); setSheet(null); setNotice(''); }, [today, onPrepare]);
  useEffect(() => {
    const reward = game.questReward;
    if (!reward || reward.sequence === lastReward.current) return;
    lastReward.current = reward.sequence;
    setMessage(reward);
  }, [game.questReward]);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(null), 1500); return () => clearTimeout(timer); }, [message]);
  const plan = game.dailyMissions?.[today];
  const card = (quest, candidate, selected = false) => {
    const key = questCompletionKey(quest, today);
    const done = game.completed.includes(key);
    const paused = plan?.paused.includes(quest.id);
    const started = !done && !paused && game.started?.includes(key);
    const reward = done && game.questReward?.key === key ? game.questReward : dailyReward(game, quest, today);
    const justCompleted = done && game.questReward?.key === key && (game.questReward.sequence !== lastReward.current || message?.key === key);
    return <article data-quest-id={quest.id} tabIndex={-1} className={`growth-quest quest-compact${started ? ' is-started' : ''}${done ? ' is-completed' : ''}`} key={key}>
      <small className="quest-category"><UiIcon kind={quest.photo?'camera':quest.category==='outside'?'discover':quest.category==='connect'?'envelope':'routine'} size={17}/>{CATEGORIES[quest.category]}</small>
      <div className="quest-card-heading"><strong>{missionTitle(game,quest,today)}</strong><span className="quest-state">{done ? '완료 ✓' : started ? '도전 중' : paused ? '보류 중' : '시작 전'}</span></div>
      {(!done || justCompleted) && <>
        <p>{missionCriterion(game,quest,today)}</p>
        <div className="quest-card-reward"><small>{quest.minutes}분 안팎 · </small><small>{reward.xp ? `${reward.xp} XP · ${reward.coins} 코인` : '추가 보상 없음 · 완료하면 기록만 남아요'}</small>{candidate && <button type="button" className="pb quest-info" aria-label="추천 이유" onClick={event => openSheet(event, { kind: 'info', reason: `${candidate.role} · ${candidate.reason}` })}>i</button>}</div>
        {selected && quest.choices && <label>내 목표 <select disabled={done} value={game.challengeChoices?.[key] ?? ''} onChange={event => onProfile('choice', event.target.value, key)}><option value="">선택하기</option>{quest.choices.map(value => <option key={value}>{value}</option>)}</select></label>}
        <div className="quest-card-actions">{started && quest.photo ? <PhotoMission onSave={photo => onPhotoSave(quest.id, today, photo)}/> : <button type="button" className="pb shop-buy" disabled={done || (!!quest.choices && !game.challengeChoices?.[key])} onClick={() => {
          if (started) onComplete(quest.id);
          else onStart(quest.id);
        }}>{done ? '완료 ✓' : started ? '해냈어요!' : paused ? '다시 도전' : '도전하기'}</button>}
        {selected && <div className="quest-card-secondary"><button type="button" className="pb" disabled={done} onClick={event => openSheet(event, { kind: 'swap', id: quest.id })}>다른 활동으로</button><button type="button" className="pb" disabled={done} onClick={() => onPause(quest.id, today, '')}>나중에 하기</button></div>}</div>
      </>}
      {done && selected && <button type="button" className="pb quest-feedback-link" onClick={event => openSheet(event, { kind: 'feedback', key })}>어땠나요? (선택)</button>}
    </article>;
  };
  return <SubScreen backOnly title="오늘의 도전" plainTitle level={levelFor(game.xp)} petColor={petColor} onShop={onShop} onSettings={onSettings} onHome={onHome}>
    <div className="quest-ui">
    {tab==='day' && !game.preferences?.missions?.reviewed && <details className="ui-disclosure" open><summary>활동 선호 선택 (선택 사항)</summary><MissionPreferences preferences={game.preferences} onSave={onPreferences}/></details>}
    <nav className="ui-period-tabs shop-tabs" aria-label="도전 기간">{[['day', '오늘'], ['week', '이번 주'], ['month', '이번 달']].map(([id, label]) => <button type="button" className="pb" key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav>
    <div className="quest-utility"><button type="button" className="pb ui-secondary" aria-pressed={tab === 'records'} onClick={() => setTab('records')}>기록·취향</button><button type="button" className="pb quest-text-button" onClick={event => openSheet(event, { kind: 'rewards' })}>보상 안내</button></div>
    {tab === 'day' ? <>
      <div className="daily-overview"><div><strong>오늘의 작은 도전</strong><span>{ROUTINES.filter(q=>routineDone(game,q.id,today)).length+dailyActivities(game,today).filter(q=>game.completed.includes(`${today}:${q.id}`)).length}/6 완료</span></div><progress max={6} value={ROUTINES.filter(q=>routineDone(game,q.id,today)).length+dailyActivities(game,today).filter(q=>game.completed.includes(`${today}:${q.id}`)).length} aria-label="오늘 미션 완료 수"/></div>
      <p className="quest-inline-notice" role="status">{notice}</p>
      <section className="daily-routines"><h2><UiIcon kind="routine" /> 매일 하는 3가지 <small>{ROUTINES.filter(q=>routineDone(game,q.id,today)).length}/3 완료</small></h2>{ROUTINES.map(q=>{ const done=routineDone(game,q.id,today); return <article key={q.id} data-quest-id={q.id} tabIndex={-1} className={`routine-row${done?' is-completed':''}`}><div><strong>{q.name}</strong><small>{done?'완료 ✓':q.kind==='diary'?'15 XP · 25 코인 (로컬 시연)':q.kind==='attendance'?'출석표의 오늘 보상':'글 등록 시 완료 · 보상 정책 확인 중'}</small></div><button type="button" className={`pb ui-secondary${q.kind==='attendance'?' attendance-entry':''}`} onClick={()=>q.kind==='diary'?onDiary(today):q.kind==='attendance'?onAttendance():onVisit()}>{q.kind==='diary'&&done?'일기 보기':q.kind==='attendance'&&done?'출석표 보기':q.action}</button></article>;})}</section>
      <section className="daily-discoveries"><h2 className="quest-selection-heading" tabIndex={-1}><UiIcon kind="discover" /> 오늘의 활동 3가지 <small>{dailyActivities(game,today).filter(q=>game.completed.includes(`${today}:${q.id}`)).length}/3 완료</small></h2><div className="growth-quests">{dailyActivities(game,today).map(q=>card(q,{reason:q.reason,role:'오늘의 제안'},true))}</div></section>
    </> : tab === 'records' ? <>
      <MissionPreferences preferences={game.preferences} onSave={onPreferences}/><h2>취향 프로필</h2>{[['music', '좋아하는 음악'], ['food', '좋아하는 음식']].map(([id, label]) => <label className="profile-field" key={id}>{label}<input className="inp" maxLength={80} value={game.preferences?.[id] ?? ''} onChange={event => onProfile(id, event.target.value)} /></label>)}
      <h2>하루 기록</h2><button type="button" className="pb ui-secondary" onClick={()=>onDiary(today)}>오늘의 일기 쓰기</button>{Object.entries(game.journals ?? {}).sort(([a], [b]) => b.localeCompare(a)).map(([date, text]) => <article className="growth-quest" key={date}><strong>{date}</strong><p>{text.slice(0,100)}</p><button type="button" className="pb ui-secondary" onClick={()=>onDiary(date)}>일기 보기</button></article>)}
      <h2>활동 기록</h2>{Object.entries(CATEGORIES).map(([id, label]) => <details className="ui-disclosure" key={id}><summary>{label}</summary>{Object.values(game.activityRecords ?? {}).filter(r => r.category === id).sort((a, b) => b.day.localeCompare(a.day)).map(r => <p key={`${r.day}:${r.id}`}>{r.day} · {QUESTS.find(q => q.id === r.id)?.name ?? r.id}{r.mode && ` · ${r.mode==='light'?'더 가볍게':r.mode==='extend'?'조금 더':'기본 행동'}`}{r.criterion&&` · ${r.criterion}`}</p>)}</details>)}
    </> : <div className="growth-quests">{QUESTS.filter(q => q.period === tab).map(q => { const count = goalProgress(game, q, today); const done = game.completed.includes(questCompletionKey(q, today)); return <article className="growth-quest" key={q.id}><strong>{q.name}</strong><p>{q.description} · 사용자 확인 기록 집계</p><progress value={Math.min(count, q.target)} max={q.target} aria-label={q.name} /><small>{count} / {q.target} · {q.xp} XP · {q.coins} 코인</small><button type="button" className="pb shop-buy" disabled={done || count < q.target} onClick={() => onGoal(q.id)}>{done ? '보상 받음 ✓' : '집계 보상 받기'}</button></article>; })}</div>}
    <div className="quest-toast-region" role="status" aria-live="polite">{message && <div className="quest-reward-toast"><strong>{message.xp ? '보상을 받았어요!' : '활동을 기록했어요!'}</strong>{message.xp > 0 && <span>+{message.xp} XP · +{message.coins} 코인</span>}</div>}</div>
    </div>
    {sheet && <QuestSheet frame={sheet.frame} trigger={sheet.trigger} onClose={closeSheet} title={sheet.kind === 'swap' ? '다른 활동으로' : sheet.kind === 'rewards' ? '보상 안내' : sheet.kind === 'feedback' ? '어땠나요?' : '추천 이유'}>
      {sheet.kind === 'swap' ? <MissionReplacement game={game} id={sheet.id} day={sheet.day} onReplace={onReplace} onClose={closeSheet} onNotice={setNotice}/> : sheet.kind === 'rewards' ? <p>매일 작은 루틴 3개와 새로운 발견 3개를 제공해요. 하나만 완료해도 개별 기록이 남아요. 출석은 출석표의 보상만 받아요. 일기와 활동은 기존 로컬 시연 보상이며, 방명록 추가 보상은 정책 확인 중이에요. 교체·수정은 보상을 다시 지급하지 않아요. 실제 서버 저장·인증은 아직 연결되지 않았어요.</p> : sheet.kind === 'feedback' ? <label className="profile-field">응답은 선택이에요.<select value={game.feedback?.[sheet.key] ?? ''} onChange={event => { onFeedback(sheet.key, event.target.value); closeSheet(); }}><option value="">응답하지 않기</option><option value="easy">가벼웠어요</option><option value="okay">적당했어요</option><option value="hard">부담됐어요</option></select></label> : <p>{sheet.reason}</p>}
    </QuestSheet>}
  </SubScreen>;
}
