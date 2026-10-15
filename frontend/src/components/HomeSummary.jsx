import { useEffect, useState } from 'react';
import { homeChallenges } from '../../../shared/features/homeSummary.js';
import { todayMissions, useServerUserId } from '../api/missions.js';

const ORDER = { started: 0, ready: 1, done: 2 };

export default function HomeSummary({ game, day, onQuest, refreshKey }) {
  const serverUserId = useServerUserId();
  const [server, setServer] = useState(null);
  useEffect(() => {
    if (!serverUserId) return undefined;
    let live = true;
    todayMissions(serverUserId).then(data => { if (live) setServer(data.missions.filter(m => m.category !== 'daily')); }).catch(() => { if (live) setServer(null); });
    return () => { live = false; };
  }, [serverUserId, day, refreshKey]);
  const local = homeChallenges(game, day);
  // 서버 미션을 불러왔으면 매일 하는 3가지는 그대로, 오늘의 활동 3가지만 서버 것으로
  const challenges = server ? [...local.filter(q => q.kind), ...server.map(m => ({ id: m.id, name: m.title, status: m.done ? 'done' : 'ready', statusLabel: m.done ? '완료' : '시작 전' }))].sort((a, b) => ORDER[a.status] - ORDER[b.status]) : local;
  return <div className="home-summary">
    <section className="ui-card home-challenge-summary" aria-label="오늘의 도전 요약">
      <h2>오늘의 도전</h2>
      {challenges.length ? challenges.map(quest => <button type="button" className="pb home-summary-row" key={quest.id} onClick={() => onQuest(quest.id)}>
        <span>{quest.name}</span><span className={`ui-state is-${quest.status}`}>{quest.statusLabel}{quest.status === 'done' ? ' ✓' : ''}</span>
      </button>) : <button type="button" className="pb home-summary-row" onClick={() => onQuest()}>오늘 해볼 도전 고르기 <span aria-hidden="true">›</span></button>}
    </section>
  </div>;
}
