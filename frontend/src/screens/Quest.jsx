import { useCallback, useEffect, useRef, useState } from 'react';
import QuestSheet from '../components/QuestSheet.jsx';
import SubScreen from '../components/SubScreen.jsx';
import { QUESTS, levelFor, questCompletionKey, previewReward, goalProgress, replaceChallenge } from '../utils/game.js';
import { CATEGORIES } from '../utils/challenges.js';
import { deletedJournal } from '../utils/journal.js';
import { seoulDateKey } from '../utils/seoulDate.js';

// Presentation copy only: preserve the quest's action and completion conditions.
const CARD_COPY = {
  'day-more-steps': '1·5·10분 중 내 목표를 골라 걸어요. 어제 기록은 넘지 않아도 돼요.',
  'day-drink': '음료를 사 오거나, 돈을 쓰지 않고 동네 풍경을 보고 돌아와요.',
  'day-checkin': '지인에게 안부를 보내요. 지인이 없다면 공개 관심사 공간에 인사 글을 남겨요. 답장은 필요 없어요.',
  'day-invite': '지인이나 커뮤니티에 함께할 활동을 제안해요. 약속 성사는 필요 없어요.',
};

function JournalEditor({ date, text, onSave, editable }) {
  const [draft, setDraft] = useState(text);
  const [saved, setSaved] = useState(false);
  return <label className="profile-field">{date}<textarea readOnly={!editable} maxLength={2000} value={draft} onChange={event => { setDraft(event.target.value); setSaved(false); }} /><button type="button" className="pb ui-secondary" disabled={!editable || !draft.trim() || draft.trim() === text} onClick={() => { onSave(date, draft.trim()); setSaved(true); }}>기록 수정 저장</button>{saved && <small role="status">수정했어요.</small>}</label>;
}

export default function Quest({ game, onStart, onComplete, onPrepare, onSelect, onPause, onReplace, onFeedback, onProfile, onJournal, onGoal, petColor, onShop, onSettings, onHome }) {
  const [tab, setTab] = useState('day');
  const [today, setToday] = useState(seoulDateKey);
  const [drafts, setDrafts] = useState({});
  const [message, setMessage] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [notice, setNotice] = useState('');
  const closeSheet = useCallback(() => setSheet(null), []);
  const openSheet = (event, data) => setSheet({ ...data, day: today, trigger: event.currentTarget, frame: event.currentTarget.closest('.phone-shell') });
  const lastReward = useRef(game.questReward?.sequence ?? 0);
  useEffect(() => {
    const refresh = () => setToday(seoulDateKey());
    const timer = setInterval(refresh, 1000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  useEffect(() => { onPrepare(today); setDrafts({}); setSheet(null); setNotice(''); }, [today, onPrepare]);
  useEffect(() => {
    const reward = game.questReward;
    if (!reward || reward.sequence === lastReward.current) return;
    lastReward.current = reward.sequence;
    setMessage(reward);
  }, [game.questReward]);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(null), 1500); return () => clearTimeout(timer); }, [message]);
  const plan = game.challengeDays?.[today];
  const card = (quest, candidate, selected = false) => {
    const key = questCompletionKey(quest, today);
    const done = game.completed.includes(key);
    const started = !done && game.started?.includes(key);
    const reward = previewReward(game, quest, today);
    return <article className={`growth-quest quest-compact${started ? ' is-started' : ''}${done ? ' is-completed' : ''}`} key={key}>
      <small>{CATEGORIES[quest.category]}</small>
      <div className="quest-card-heading"><strong>{quest.name}</strong><span className="quest-state">{done ? '완료 ✓' : started ? '도전 중' : selected ? '선택함' : '선택 전'}</span></div>
      {!done && <>
        <p>{CARD_COPY[quest.id] ?? quest.description}</p>
        <div className="quest-card-reward"><small>{reward.xp ? `${reward.xp} XP · ${reward.coins} 코인` : '추가 보상 없음 · 완료하면 기록만 남아요'}</small>{candidate && <button type="button" className="pb quest-info" aria-label="추천 이유" onClick={event => openSheet(event, { kind: 'info', reason: `${candidate.role} · ${candidate.reason}` })}>i</button>}</div>
        {selected && quest.choices && <label>내 목표 <select value={game.challengeChoices?.[key] ?? ''} onChange={event => onProfile('choice', event.target.value, key)}><option value="">선택하기</option>{quest.choices.map(value => <option key={value}>{value}</option>)}</select></label>}
        {selected && quest.input && deletedJournal(game, today) && <small>오늘 일기는 삭제했어요. 내일 다시 쓸 수 있어요.</small>}
        {selected && quest.input && <input className="inp quest-answer" maxLength={80} aria-label={quest.name} value={drafts[key] ?? ''} onChange={event => setDrafts(value => ({ ...value, [key]: event.target.value }))} />}
        <div className="quest-card-actions"><button type="button" className="pb shop-buy" disabled={selected ? (quest.input && (!drafts[key]?.trim() || deletedJournal(game, today))) || (quest.choices && !game.challengeChoices?.[key]) : plan?.selected.length >= 3} onClick={() => {
          if (!selected) onSelect(quest.id, today);
          else if (quest.input || started) onComplete(quest.id, drafts[key]);
          else onStart(quest.id);
        }}>{!selected ? '오늘 선택' : quest.input ? '한 줄 저장' : started ? '해냈어요!' : '도전하기'}</button>
        {selected && <div className="quest-card-secondary"><button type="button" className="pb" onClick={event => openSheet(event, { kind: 'swap', id: quest.id })}>바꾸기</button><button type="button" className="pb" onClick={() => onPause(quest.id, today, '')}>나중에 하기</button></div>}</div>
      </>}
      {done && selected && <button type="button" className="pb quest-feedback-link" onClick={event => openSheet(event, { kind: 'feedback', key })}>어땠나요? (선택)</button>}
    </article>;
  };
  return <SubScreen backOnly title="오늘의 도전" plainTitle level={levelFor(game.xp)} petColor={petColor} onShop={onShop} onSettings={onSettings} onHome={onHome}>
    <div className="quest-ui">
    <div className="shop-tabs">{[['day', '오늘'], ['week', '이번 주'], ['month', '이번 달'], ['records', '기록·취향']].map(([id, label]) => <button type="button" className="pb" key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</div>
    {tab === 'day' ? <>
      <div className="quest-overview"><p>내게 맞는 도전을 골라요.</p><button type="button" className="pb quest-text-button" onClick={event => openSheet(event, { kind: 'rewards' })}>보상 안내</button></div>
      <p className="quest-inline-notice" role="status">{notice}</p>
      <h2 className="quest-selection-heading" tabIndex={-1}>선택한 도전</h2><div className="growth-quests">{plan?.selected.map(id => card(QUESTS.find(q => q.id === id), null, true))}{!plan?.selected.length && <p>오늘 내게 맞는 작은 행동을 골라보세요.</p>}</div>
      <h2>오늘의 추천</h2><div className="growth-quests">{plan?.candidates.filter(item => !plan.selected.includes(item.id)).map(candidate => card(QUESTS.find(q => q.id === candidate.id), candidate))}</div>
      <details className="ui-disclosure"><summary>다른 도전 찾아보기</summary>{Object.entries(CATEGORIES).map(([id, label]) => <section key={id}><h3>{label}</h3><div className="growth-quests">{QUESTS.filter(q => q.period === 'day' && q.category === id && !plan?.selected.includes(q.id)).map(q => card(q))}</div></section>)}</details>
    </> : tab === 'records' ? <>
      <h2>취향 프로필</h2>{[['music', '좋아하는 음악'], ['food', '좋아하는 음식']].map(([id, label]) => <label className="profile-field" key={id}>{label}<input className="inp" maxLength={80} value={game.preferences?.[id] ?? ''} onChange={event => onProfile(id, event.target.value)} /></label>)}
      <h2>하루 기록</h2>{Object.entries(game.journals ?? {}).sort(([a], [b]) => b.localeCompare(a)).map(([date, text]) => <JournalEditor key={date} date={date} text={text} onSave={onJournal} editable={date === today} />)}
      <h2>활동 기록</h2>{Object.entries(CATEGORIES).map(([id, label]) => <details className="ui-disclosure" key={id}><summary>{label}</summary>{Object.values(game.activityRecords ?? {}).filter(r => r.category === id).sort((a, b) => b.day.localeCompare(a.day)).map(r => <p key={`${r.day}:${r.id}`}>{r.day} · {QUESTS.find(q => q.id === r.id)?.name ?? r.id}</p>)}</details>)}
    </> : <div className="growth-quests">{QUESTS.filter(q => q.period === tab).map(q => { const count = goalProgress(game, q, today); const done = game.completed.includes(questCompletionKey(q, today)); return <article className="growth-quest" key={q.id}><strong>{q.name}</strong><p>{q.description} · 사용자 확인 기록 집계</p><progress value={Math.min(count, q.target)} max={q.target} aria-label={q.name} /><small>{count} / {q.target} · {q.xp} XP · {q.coins} 코인</small><button type="button" className="pb shop-buy" disabled={done || count < q.target} onClick={() => onGoal(q.id)}>{done ? '보상 받음 ✓' : '집계 보상 받기'}</button></article>; })}</div>}
    <div className="quest-toast-region" role="status" aria-live="polite">{message && <div className="quest-reward-toast"><strong>{message.xp ? '보상을 받았어요!' : '활동을 기록했어요!'}</strong>{message.xp > 0 && <span>+{message.xp} XP · +{message.coins} 코인</span>}</div>}</div>
    </div>
    {sheet && <QuestSheet frame={sheet.frame} trigger={sheet.trigger} onClose={closeSheet} title={sheet.kind === 'swap' ? '어떤 도전으로 바꿀까요?' : sheet.kind === 'rewards' ? '보상 안내' : sheet.kind === 'feedback' ? '어땠나요?' : '추천 이유'}>
      {sheet.kind === 'swap' ? <div className="quest-sheet-options">{[['hard', '더 가볍게'], ['time', '더 짧게'], ['taste', '다른 활동으로']].map(([reason, label]) => <button type="button" className="pb ui-secondary" key={reason} onClick={() => {
        const proposed = replaceChallenge(game, sheet.id, sheet.day, reason);
        if (proposed === game) setNotice('지금은 맞는 대안이 없어요. 현재 도전을 유지해요.');
        else { onReplace(sheet.id, sheet.day, reason); setNotice('다른 도전으로 바꿨어요. 준비되면 시작해요.'); }
        closeSheet();
      }}>{label}<span aria-hidden="true">→</span></button>)}</div> : sheet.kind === 'rewards' ? <p>원하는 도전을 최대 3개 선택하고 하나만 완료해도 보상받아요. 일일 보상은 하루 3회까지예요. 처음 시도하는 현실 행동은 5XP가 추가돼요. 한도 이후에는 추가 보상 없이 활동만 기록해요. 세 갈래를 모두 할 필요는 없어요.</p> : sheet.kind === 'feedback' ? <label className="profile-field">응답은 선택이에요.<select value={game.feedback?.[sheet.key] ?? ''} onChange={event => { onFeedback(sheet.key, event.target.value); closeSheet(); }}><option value="">응답하지 않기</option><option value="easy">편했어요</option><option value="okay">적당했어요</option><option value="hard">버거웠어요</option></select></label> : <p>{sheet.reason}</p>}
    </QuestSheet>}
  </SubScreen>;
}
