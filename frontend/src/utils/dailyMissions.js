import { DAILY_CHALLENGES, ensureChallenges } from './challenges.js';
import { grantMilestone } from './game.js';
import { seoulDateKey } from './seoulDate.js';
import { hasJournal, journalDates, saveJournal, deleteJournal, JOURNAL_EMOTIONS } from './journal.js';

export const ROUTINES = [
  { id: 'day-attendance', name: '출석하기', kind: 'attendance', icon: '☀', action: '출석하기' },
  { id: 'day-diary', name: '오늘의 일기 쓰기', kind: 'diary', icon: '✎', action: '일기 쓰기' },
  { id: 'day-guestbook', name: '방명록 남기기', kind: 'guestbook', icon: '♡', action: '이웃 둘러보기' },
];
const pool = DAILY_CHALLENGES.filter(q => !q.input);
const keyFor = (day, id) => `${day}:${id}`;
export const routineDone = (game, id, day) => game.completed?.includes(keyFor(day, id)) || (id === 'day-attendance' && !!game.attendance?.[day]);

// Local demo policy only: existing activity/diary values, attendance paid once by
// its existing path; guestbook payment is intentionally pending team agreement.
export function recordRoutine(game, id, day, { legacy = false } = {}) {
  if (!ROUTINES.some(q=>q.id===id)) return game;
  const key = keyFor(day, id);
  if (game.missionReceipts?.[key]) return game;
  const already = game.completed?.includes(key);
  const reward = !legacy && !already && id === 'day-diary' ? { xp: 15, coins: 25 } : { xp: 0, coins: 0 };
  const next = { ...game, completed: [...new Set([...(game.completed ?? []), key])],
    xp: game.xp + reward.xp, coins: game.coins + reward.coins,
    missionReceipts: { ...game.missionReceipts, [key]: { ...reward, source: id, status: legacy || already ? 'preserved' : id === 'day-guestbook' ? 'pending-policy' : id === 'day-attendance' ? 'attendance-path' : 'local-demo' } } };
  if (reward.xp || reward.coins) next.questReward = { key, ...reward, sequence: (game.questReward?.sequence ?? 0) + 1 };
  return grantMilestone(next);
}
export function ensureDailyMissions(game, day = seoulDateKey(), savedVisitNotes) {
  game = ensureChallenges(game, day);
  if (!game.dailyMissions?.[day]) {
    const old = game.challengeDays?.[day];
    const legacyPaid = Object.values(game.activityRecords ?? {}).filter(r => r.day === day && r.rewarded && !r.input);
    const preferred = [...legacyPaid.map(r => r.id), ...(old?.selected ?? []), ...(old?.candidates ?? []).map(c => c.id)];
    const ids = [...new Set(preferred)].filter(id => pool.some(q => q.id === id)).slice(0, 3);
    const seed = [...day].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 0) >>> 0;
    const fallback = [...pool.slice(seed % pool.length), ...pool.slice(0, seed % pool.length)].filter(q => q.effort <= 1);
    for (const quest of fallback) if (ids.length < 3 && !ids.includes(quest.id)) ids.push(quest.id);
    const activities = ids.map((id, slot) => ({ id, slot, reason: old?.candidates?.find(c => c.id === id)?.reason ?? '부담 적은 작은 행동을 권해요.' }));
    // Carry legacy payments to slot receipts without changing balances or records.
    const used = new Set();
    const slots = Object.fromEntries(legacyPaid.slice(0,3).map(r => {
      const matched = activities.find(a => a.id === r.id)?.slot;
      const slot = matched !== undefined && !used.has(matched) ? matched : [0,1,2].find(value => !used.has(value));
      used.add(slot); return [`${day}:slot:${slot}`, { id:r.id, status:'preserved' }];
    }));
    game = { ...game, dailyMissions: { ...game.dailyMissions, [day]: { version: 1, activities, paused: [], replacements: [] } }, missionSlots: { ...game.missionSlots, ...slots } };
  }
  if (game.attendance?.[day]) game = recordRoutine(game, 'day-attendance', day, { legacy: true });
  if (journalDates(game).includes(day) || game.completed?.includes(keyFor(day,'day-diary'))) game = recordRoutine(game, 'day-diary', day, { legacy: true });
  if (savedVisitNotes && Object.values(savedVisitNotes).some(entries => Array.isArray(entries) && entries.some(e => e.source === 'local' && e.date === day && typeof e.text === 'string' && e.text.trim()))) game = recordRoutine(game, 'day-guestbook', day, { legacy: true });
  return game;
}
export function dailyActivities(game, day) {
  return (game.dailyMissions?.[day]?.activities ?? []).map(a => ({ ...pool.find(q => q.id === a.id), ...a })).filter(q=>q.name);
}
export function dailyReward(game, quest, day) {
  if (game.completed?.includes(keyFor(day,quest.id)) || game.missionSlots?.[`${day}:slot:${quest.slot}`]) return { xp:0, coins:0 };
  const novel = !Object.values(game.activityRecords ?? {}).some(r => r.id === quest.id);
  return { xp: quest.xp + (novel ? 5 : 0), coins: quest.coins };
}
export function startDailyMission(game, id, now = new Date()) {
  const day = seoulDateKey(now); game = ensureDailyMissions(game,day);
  const quest = dailyActivities(game,day).find(q=>q.id===id), key=keyFor(day,id);
  if (!quest || game.completed.includes(key) || (quest.choices && !quest.choices.includes(game.challengeChoices?.[key]))) return game;
  return { ...game, started:[...new Set([...game.started,key])], dailyMissions:{...game.dailyMissions,[day]:{...game.dailyMissions[day],paused:game.dailyMissions[day].paused.filter(q=>q!==id)}} };
}
export function finishDailyMission(game,id,now=new Date()) {
  const day=seoulDateKey(now); game=ensureDailyMissions(game,day);
  const quest=dailyActivities(game,day).find(q=>q.id===id),key=keyFor(day,id);
  if (!quest || game.completed.includes(key) || !game.started.includes(key) || game.dailyMissions[day].paused.includes(id) || (quest.choices && !quest.choices.includes(game.challengeChoices?.[key]))) return game;
  const reward=dailyReward(game,quest,day);
  const next={...game,xp:game.xp+reward.xp,coins:game.coins+reward.coins,completed:[...game.completed,key],
    activityRecords:{...game.activityRecords,[key]:{id,day,category:quest.category,input:false,rewarded:!!reward.xp}},
    missionReceipts:{...game.missionReceipts,[key]:{...reward,status:'local-demo'}},missionSlots:{...game.missionSlots,[`${day}:slot:${quest.slot}`]:{id,status:'local-demo'}},
    questReward:{key,...reward,sequence:(game.questReward?.sequence??0)+1}};
  if(Object.values(next.activityRecords).filter(r=>!r.input&&r.category!==undefined).length>=10&&!next.characters.includes('sky'))next.characters=[...next.characters,'sky'];
  return grantMilestone(next);
}
export function pauseDailyMission(game,id,day=seoulDateKey()) {
  const plan=game.dailyMissions?.[day];
  if(!plan?.activities.some(a=>a.id===id)||game.completed.includes(keyFor(day,id))||plan.paused.includes(id))return game;
  return {...game,dailyMissions:{...game.dailyMissions,[day]:{...plan,paused:[...plan.paused,id]}}};
}
export function replaceDailyMission(game,id,day=seoulDateKey(),reason='') {
  const plan=game.dailyMissions?.[day], current=dailyActivities(game,day).find(q=>q.id===id);
  if(!current||game.completed.includes(keyFor(day,id)))return game;
  const alternatives=pool.filter(q=>q.id!==id&&!plan.activities.some(a=>a.id===q.id)&&!game.completed.includes(keyFor(day,q.id))&&q.category===current.category);
  const next=alternatives.sort((a,b)=>reason==='time'?a.minutes-b.minutes:a.effort-b.effort||a.minutes-b.minutes).find(q=>reason==='hard'?q.effort<=current.effort&&q.minutes<=current.minutes:reason==='time'?q.minutes<current.minutes:true);
  if(!next)return game;
  return {...game,dailyMissions:{...game.dailyMissions,[day]:{...plan,activities:plan.activities.map(a=>a.id===id?{...a,id:next.id,reason:'같은 목적을 다른 작은 행동으로 시도해요.'}:a),paused:plan.paused.filter(q=>q!==id),replacements:[...plan.replacements,{id,replacement:next.id,reason}]}}};
}
export function saveDiaryMission(game,date,text,now=new Date(),emotion) {
  if (date !== seoulDateKey(now) || typeof text !== 'string' || !text.trim() || (emotion !== undefined && !JOURNAL_EMOTIONS.some(e=>e.id===emotion))) return game;
  if (journalDates(game).includes(date)) game = recordRoutine(game,'day-diary',date,{legacy:true});
  const saved=saveJournal(game,date,text,now,emotion);
  if(date!==seoulDateKey(now)||!hasJournal(saved,date)||!text?.trim())return game;
  const journalDrafts={...saved.journalDrafts};delete journalDrafts[date];
  return recordRoutine({...saved,journalDrafts},'day-diary',date);
}
export function deleteDiaryMission(game,date,now=new Date()) {
  const next=deleteJournal(game,date,now);if(next===game)return game;
  const journalDrafts={...next.journalDrafts};delete journalDrafts[date];return {...next,journalDrafts};
}
