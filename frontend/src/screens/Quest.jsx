import { useState } from 'react';
import SubScreen from '../components/SubScreen.jsx';
import { CHARACTERS, QUESTS, levelFor } from '../utils/game.js';

export default function Quest({ game, onComplete, petColor, onShop, onSettings }) {
  const [tab, setTab] = useState('day');
  const [message, setMessage] = useState('');
  const level = levelFor(game.xp);
  return <SubScreen title="성장 퀘스트" petColor={petColor} onShop={onShop} onSettings={onSettings} level={level}>
    <div className="quest-loop">퀘스트 → XP · 코인 → 레벨업 → 새로운 선택지</div>
    <div className="shop-tabs">
      {[['day', '오늘'], ['week', '이번 주'], ['month', '이번 달']].map(([id, name]) => <button type="button" className="pb" key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{name}</button>)}
    </div>
    <div className="growth-quests">
      {QUESTS.filter((quest) => quest.period === tab).map((quest) => {
        const done = game.completed.includes(quest.id);
        return <article className="growth-quest" key={quest.id}>
          <strong>{quest.name}</strong><p>{quest.description}</p>
          <div><span>+{quest.xp} XP · +{quest.coins} 코인</span>
            <button type="button" className="pb shop-buy" disabled={done} onClick={() => {
              onComplete(quest.id);
              const nextLevel = levelFor(game.xp + quest.xp);
              const newRewards = CHARACTERS.filter((item) => item.level > level && item.level <= nextLevel && item.method !== 'quest');
              setMessage(`+${quest.xp} XP · +${quest.coins} 코인!${nextLevel > level ? ` LV.${nextLevel}로 성장했어요.` : ''}${newRewards.length ? ' 새로운 캐릭터 선택지가 열렸어요. 상점에서 확인해보세요!' : ''}`);
            }}>{done ? '보상 받음 ✓' : '완료하고 보상 받기'}</button>
          </div>
        </article>;
      })}
    </div>
    <p role="status" className="shop-message">{message}</p>
    <div className="quest-reward-note">오늘의 퀘스트 3개를 모두 완료하면 특별 캐릭터를 받아요.<br />LV.3 성장 보상은 무료 지급 · LV.5에서 새 캐릭터 구매가 열려요.</div>
    <p className="shop-disclaimer">목업에서는 완료 버튼으로 수행을 확인해요. 각 보상은 한 번만 받을 수 있어요.</p>
  </SubScreen>;
}
