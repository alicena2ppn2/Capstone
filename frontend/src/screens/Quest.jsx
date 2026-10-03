import { useEffect, useState } from 'react';
import SubScreen from '../components/SubScreen.jsx';
import { CHARACTERS, QUESTS, levelFor, questCompletionKey } from '../utils/game.js';
import { seoulDateKey } from '../utils/seoulDate.js';

export default function Quest({ game, onComplete, petColor, onShop, onSettings, onHome }) {
  const [tab, setTab] = useState('day');
  const [message, setMessage] = useState('');
  const [today, setToday] = useState(() => seoulDateKey());
  const [drafts, setDrafts] = useState({});
  useEffect(() => {
    const refresh = () => setToday(seoulDateKey());
    const timer = window.setInterval(refresh, 1000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  useEffect(() => { setMessage(''); setDrafts({}); }, [today]);
  const level = levelFor(game.xp);
  return <SubScreen title="성장 퀘스트" plainTitle petColor={petColor} onShop={onShop} onSettings={onSettings} onHome={onHome} level={level}>
    <div className="quest-loop">퀘스트 → XP · 코인 → 레벨업 → 새로운 선택지</div>
    <div className="shop-tabs">
      {[['day', '오늘'], ['week', '이번 주'], ['month', '이번 달']].map(([id, name]) => <button type="button" className="pb" key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{name}</button>)}
    </div>
    {tab === 'day' && <div className="quest-day-label">{Number(today.slice(5, 7))}월 {Number(today.slice(8, 10))}일 · 오늘의 퀘스트</div>}
    <div className="growth-quests" aria-label="퀘스트 목록">
      {QUESTS.filter((quest) => quest.period === tab).map((quest) => {
        const completionKey = questCompletionKey(quest, today);
        const done = game.completed.includes(completionKey);
        const answer = drafts[completionKey] ?? '';
        return <article className="growth-quest" key={completionKey}>
          <strong>{quest.name}</strong><p>{quest.description}</p>
          {quest.input && <input className="inp quest-answer" type="text" maxLength={80} aria-label={quest.name} placeholder="여기에 적어주세요" disabled={done} value={done ? game.questAnswers?.[completionKey] ?? '' : answer} onChange={(event) => setDrafts((value) => ({ ...value, [completionKey]: event.target.value }))} />}
          <div><span>+{quest.xp} XP · +{quest.coins} 코인</span>
            <button type="button" className="pb shop-buy" disabled={done || (quest.input && !answer.trim())} onClick={() => {
              onComplete(quest.id, answer);
              const nextLevel = levelFor(game.xp + quest.xp);
              const newRewards = CHARACTERS.filter((item) => item.level > level && item.level <= nextLevel && item.method !== 'quest');
              setMessage(`+${quest.xp} XP · +${quest.coins} 코인!${nextLevel > level ? ` LV.${nextLevel}로 성장했어요.` : ''}${newRewards.length ? ' 새로운 캐릭터 선택지가 열렸어요. 상점에서 확인해보세요!' : ''}`);
            }}>{done ? '보상 받음 ✓' : '완료하고 보상 받기'}</button>
          </div>
        </article>;
      })}
    </div>
    <p role="status" className="shop-message">{message}</p>
    <div className="quest-reward-note">오늘 퀘스트 중 3개를 완료하면 특별 캐릭터를 받아요.<br />LV.3 성장 보상은 무료 지급 · LV.5에서 새 캐릭터 구매가 열려요.</div>
    <p className="shop-disclaimer">오늘 퀘스트는 서울 시간 0시에 새로 시작해요. 완료 보상은 퀘스트마다 하루 한 번 받아요.</p>
  </SubScreen>;
}
