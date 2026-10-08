import { homeChallenges } from '../utils/homeSummary.js';

export default function HomeSummary({ game, day, onQuest }) {
  const challenges = homeChallenges(game, day);
  return <div className="home-summary">
    <section className="ui-card home-challenge-summary" aria-label="오늘의 도전 요약">
      <h2>오늘의 도전</h2>
      {challenges.length ? challenges.map(quest => <button type="button" className="pb home-summary-row" key={quest.id} onClick={() => onQuest(quest.id)}>
        <span>{quest.name}</span><span className={`ui-state is-${quest.status}`}>{quest.statusLabel}{quest.status === 'done' ? ' ✓' : ''}</span>
      </button>) : <button type="button" className="pb home-summary-row" onClick={() => onQuest()}>오늘 해볼 도전 고르기 <span aria-hidden="true">›</span></button>}
    </section>
  </div>;
}
