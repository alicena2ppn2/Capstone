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
    todayMissions(serverUserId).then(data => { if (live) setServer(data.missions); }).catch(() => { if (live) setServer(null); });
    return () => { live = false; };
  }, [serverUserId, day, refreshKey]);
  const local = homeChallenges(game, day);
  // 서버 미션을 불러왔으면 데일리 미션까지 모두 서버 것으로 (10/19: 기기 안 목록과 섞여 '방명록 남기기'가 보이던 것)
  const challenges = server ? [...server.map(m => ({ id: m.id, name: m.title, status: m.done ? 'done' : 'ready', statusLabel: m.done ? '완료' : '시작 전' }))].sort((a, b) => ORDER[a.status] - ORDER[b.status]) : local;
  return <div className="home-summary">
    <section className="ui-card home-challenge-summary" aria-label="오늘의 도전 요약">
      <h2>오늘의 도전</h2>
      {challenges.length ? challenges.map(quest => <button type="button" className="pb home-summary-row" key={quest.id} onClick={() => onQuest(quest.id)}>
        <span>{quest.name}</span><span className={`ui-state is-${quest.status}`}>{quest.statusLabel}{quest.status === 'done' ? ' ✓' : ''}</span>
      </button>) : <button type="button" className="pb home-summary-row" onClick={() => onQuest()}>오늘 해볼 도전 고르기 <span aria-hidden="true">›</span></button>}
    </section>
  </div>;
}
