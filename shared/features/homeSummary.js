import { ROUTINES, dailyActivities, routineDone } from './dailyMissions.js';

// Presentation order only: never reorder or mutate the saved daily selection.
export function homeChallenges(game, day) {
  return [...ROUTINES, ...dailyActivities(game,day)].map(quest => {
    const key = `${day}:${quest.id}`;
    const status = (quest.kind ? routineDone(game,quest.id,day) : game.completed?.includes(key)) ? 'done' : !game.dailyMissions?.[day]?.paused.includes(quest.id) && game.started?.includes(key) ? 'started' : 'ready';
    return { ...quest, status, statusLabel: { done: '완료', started: '도전 중', ready: '시작 전' }[status] };
  }).filter(Boolean).sort((a, b) => ({ started: 0, ready: 1, done: 2 }[a.status] - { started: 0, ready: 1, done: 2 }[b.status]));
}
