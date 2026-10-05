import { useEffect, useRef, useState } from 'react';
import SubScreen from '../components/SubScreen.jsx';
import { QUESTS, levelFor, questCompletionKey } from '../utils/game.js';
import { seoulDateKey } from '../utils/seoulDate.js';

const ACTIONS = {
  'day-walk': '공기 맡아 보기', 'day-wake': '하루 시작', 'day-diary': '한 줄 쓰기',
  'day-music': '취향 적기', 'day-food': '음식 적기', 'day-more-steps': '더 걸어 보기',
  'day-seasonal': '제철 맛보기', 'day-drink': '음료 사오기', 'week-walk': '산책 다녀오기',
  'week-wake': '리듬 지키기', 'week-diary': '기록 남기기', 'month-place': '새 장소 가기',
  'month-rhythm': '꾸준히 살기', 'month-diary': '일상 돌아보기',
};

export default function Quest({ game, onStart, onComplete, petColor, onShop, onSettings, onHome }) {
  const [tab, setTab] = useState('day');
  const [message, setMessage] = useState(null);
  const [today, setToday] = useState(() => seoulDateKey());
  const [drafts, setDrafts] = useState({});
  const lastReward = useRef(game.questReward?.sequence ?? 0);
  useEffect(() => {
    const reward = game.questReward;
    if (!reward || reward.sequence === lastReward.current) return;
    lastReward.current = reward.sequence;
    setMessage({ text: `+${reward.xp} XP · +${reward.coins} 코인`, id: reward.sequence });
  }, [game.questReward]);
  useEffect(() => {
    const refresh = () => setToday(seoulDateKey());
    const timer = window.setInterval(refresh, 1000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  useEffect(() => { setMessage(''); setDrafts({}); }, [today]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 1500);
    return () => window.clearTimeout(timer);
  }, [message]);
  const level = levelFor(game.xp);
  return <SubScreen title="성장 퀘스트" plainTitle petColor={petColor} onShop={onShop} onSettings={onSettings} onHome={onHome} level={level}>
    <div className="shop-tabs">
      {[['day', '오늘'], ['week', '이번 주'], ['month', '이번 달']].map(([id, name]) => {
        const remaining = QUESTS.filter(quest => quest.period === id && !game.completed.includes(questCompletionKey(quest, today))).length;
        return <button type="button" className="pb" key={id} aria-pressed={tab === id} aria-label={`${name}, ${remaining ? `남은 퀘스트 ${remaining}개` : '모두 완료'}`} onClick={() => setTab(id)}>{name}{remaining > 0 && <span className="quest-remaining" aria-hidden="true">{remaining}</span>}</button>;
      })}
    </div>
    {tab === 'day' && <div className="quest-day-label">{Number(today.slice(5, 7))}월 {Number(today.slice(8, 10))}일 · 오늘의 퀘스트</div>}
    <div className="growth-quests" aria-label="퀘스트 목록">
      {QUESTS.filter((quest) => quest.period === tab).map((quest) => {
        const completionKey = questCompletionKey(quest, today);
        const done = game.completed.includes(completionKey);
        const started = !done && !quest.input && game.started?.includes(completionKey);
        const answer = drafts[completionKey] ?? '';
        return <article className={`growth-quest${started ? ' is-started' : ''}`} key={completionKey}>
          <strong>{quest.name}</strong>{started && <span className="quest-started-badge">도전 중</span>}<p>{quest.description}</p>
          {quest.input && <input className="inp quest-answer" type="text" maxLength={80} aria-label={quest.name} placeholder="여기에 적어주세요" disabled={done} value={done ? game.questAnswers?.[completionKey] ?? '' : answer} onChange={(event) => setDrafts((value) => ({ ...value, [completionKey]: event.target.value }))} />}
          <div>
            <button type="button" className="pb shop-buy" disabled={done || (quest.input && !answer.trim())} onClick={() => {
              if (quest.input || started) onComplete(quest.id, answer);
              else onStart(quest.id);
            }}>{done ? '완료 ✓' : quest.input ? '저장하기' : started ? '해냈어요!' : ACTIONS[quest.id] ?? '도전하기'}</button>
          </div>
        </article>;
      })}
    </div>
    <div className="quest-toast-region" role="status" aria-live="polite" aria-atomic="true">
      {message && <div className="quest-reward-toast" key={message.id}><strong>보상을 받았어요!</strong><span>{message.text}</span></div>}
    </div>
  </SubScreen>;
}
