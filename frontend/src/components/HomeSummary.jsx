import Mochi from './Mochi.jsx';
import { RoomBackdrop } from '../screens/Home.jsx';
import { homeChallenges } from '../utils/homeSummary.js';
import { levelFor } from '../utils/game.js';

export default function HomeSummary({ game, day, target, onQuest, onShop }) {
  const challenges = homeChallenges(game, day);
  return <div className="home-summary">
    <section className="ui-card home-challenge-summary" aria-label="오늘의 도전 요약">
      <h2>오늘의 도전</h2>
      {challenges.length ? challenges.map(quest => <button type="button" className="pb home-summary-row" key={quest.id} onClick={() => onQuest(quest.id)}>
        <span>{quest.name}</span><span className={`ui-state is-${quest.status}`}>{quest.statusLabel}{quest.status === 'done' ? ' ✓' : ''}</span>
      </button>) : <button type="button" className="pb home-summary-row" onClick={() => onQuest()}>오늘 해볼 도전 고르기 <span aria-hidden="true">›</span></button>}
    </section>
    {target ? <button type="button" className="pb ui-card home-target-summary" onClick={onShop} aria-label={`목표 상품 ${target.name}, 상점에서 보기`}>
      <span className="home-target-art" aria-hidden="true">{target.kind === 'decor' ? <RoomBackdrop homeScene decor={{ [target.slot]: target.id }} /> : <Mochi variant={target.kind === 'character' ? target.id : game.character} full width={64} height={64} outfit={target.kind === 'clothes' ? target : undefined} />}</span>
      <span className="home-target-copy"><span className="home-summary-caption">갖고 싶은 아이템</span><strong>{target.name}</strong>
        {target.complete ? <span className="ui-state is-done">획득 완료 ✓</span> : <><span className={`home-target-condition${!target.coinsNeeded ? ' is-met' : ''}`}>코인 {game.coins.toLocaleString('ko-KR')} / {target.price.toLocaleString('ko-KR')}{!target.coinsNeeded ? ' · 충족 ✓' : ''}</span><span className={`home-target-condition${!target.levelsNeeded ? ' is-met' : ''}`}>레벨 {levelFor(game.xp)} / {target.level}{!target.levelsNeeded ? ' · 충족 ✓' : ''}</span></>}
      </span><span aria-hidden="true">›</span>
    </button> : <button type="button" className="pb ui-secondary home-no-target" onClick={onShop}>갖고 싶은 아이템 골라보기 <span aria-hidden="true">›</span></button>}
  </div>;
}
