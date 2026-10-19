import { recommendMissions, eligibleMission, missionMode, missionCriterion } from './missionGuidance.js';
import { DAILY_CHALLENGES, ensureChallenges } from './challenges.js';
import { grantMilestone } from './game.js';
import { seoulDateKey } from '../utils/seoulDate.js';
import { hasJournal, journalDates, saveJournal, deleteJournal, JOURNAL_EMOTIONS, deletedJournal } from './journal.js';

export const ROUTINES = [
  { id: 'day-attendance', name: '출석하기', kind: 'attendance', icon: '☀', action: '출석하기' },
  { id: 'day-diary', name: '오늘의 일기 쓰기', kind: 'diary', icon: '✎', action: '일기 쓰기' },
  { id: 'day-guestbook', name: '방명록 남기기', kind: 'guestbook', icon: '♡', action: '이웃 둘러보기' },
];
const pool = DAILY_CHALLENGES.filter(q => !q.input);
const groupFor=id=>pool.find(q=>q.id===id)?.activityGroup ?? id;
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
    missionReceipts: { ...game.missionReceipts, [key]: { ...reward, source: id, channel: id === 'day-guestbook' ? 'sample-neighbor-local' : 'local-routine', status: legacy || already ? 'preserved' : id === 'day-guestbook' ? 'pending-policy' : id === 'day-attendance' ? 'attendance-path' : 'local-demo' } } };
  if (reward.xp || reward.coins) next.questReward = { key, ...reward, sequence: (game.questReward?.sequence ?? 0) + 1 };
  return grantMilestone(next);
}
export function ensureDailyMissions(game, day = seoulDateKey(), savedVisitNotes) {
  game = ensureChallenges(game, day);
  if (!game.dailyMissions?.[day]) {
    const old = game.challengeDays?.[day];
    const legacyPaid = Object.values(game.activityRecords ?? {}).filter(r => r.day === day && r.rewarded && !r.input);
    // Preserve paid legacy activities. New suggestions avoid equivalent actions.
    const ids = [...new Set(legacyPaid.map(r=>r.id))].filter(id=>pool.some(q=>q.id===id)).slice(0,3);
    const seed = [...day].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 0) >>> 0;
    const candidates = recommendMissions(game,pool,day,seed);
    for (const quest of candidates) if (ids.length < 3 && !ids.some(id=>groupFor(id)===quest.activityGroup)) ids.push(quest.id);
    const activities = ids.map((id, slot) => ({ id, slot, reason: candidates.find(q=>q.id===id)?.reason ?? old?.candidates?.find(c => c.id === id)?.reason ?? '기존 오늘 기록을 유지해요.' }));
    // Carry legacy payments to slot receipts without changing balances or records.
    const used = new Set();
    const slots = Object.fromEntries(legacyPaid.slice(0,3).map(r => {
      const matched = activities.find(a => a.id === r.id)?.slot;
      const slot = matched !== undefined && !used.has(matched) ? matched : [0,1,2].find(value => !used.has(value));
      used.add(slot); return [`${day}:slot:${slot}`, { id:r.id, status:'preserved' }];
    }));
    game = { ...game, dailyMissions: { ...game.dailyMissions, [day]: { version: 1, activities, paused: [], replacements: [] } }, missionSlots: { ...game.missionSlots, ...slots } };
  }
  // Snapshot old running/selected conditions once; existing choice records stay untouched.
  const plan=game.dailyMissions?.[day];
  if(plan){let changed=false;const activities=plan.activities.map(a=>{
    const q=pool.find(q=>q.id===a.id),key=keyFor(day,a.id);
    if(!q||a.criterion||(!game.started?.includes(key)&&!['light','extend'].includes(game.missionModes?.[key])))return a;
    changed=true;return {...a,criterion:missionCriterion(game,{...q,...a},day)};
  });if(changed)game={...game,dailyMissions:{...game.dailyMissions,[day]:{...plan,activities}}};}
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
  return { ...game, started:[...new Set([...game.started,key])], dailyMissions:{...game.dailyMissions,[day]:{...game.dailyMissions[day],paused:game.dailyMissions[day].paused.filter(q=>q!==id),activities:game.dailyMissions[day].activities.map(a=>a.id===id?{...a,criterion:missionCriterion(game,quest,day)}:a)}} };
}
export function finishDailyMission(game,id,now=new Date()) {
  const day=seoulDateKey(now); game=ensureDailyMissions(game,day);
  const quest=dailyActivities(game,day).find(q=>q.id===id),key=keyFor(day,id);
  if (quest?.photo && !game.missionPhotos?.[key]) return game;
  if (!quest || game.completed.includes(key) || !game.started.includes(key) || game.dailyMissions[day].paused.includes(id) || (quest.choices && !quest.choices.includes(game.challengeChoices?.[key]))) return game;
  const reward=dailyReward(game,quest,day);
  const next={...game,xp:game.xp+reward.xp,coins:game.coins+reward.coins,completed:[...game.completed,key],
    activityRecords:{...game.activityRecords,[key]:{id,day,category:quest.category,input:false,rewarded:!!reward.xp,mode:missionMode(game,quest,day),criterion:missionCriterion(game,quest,day),channel:quest.photo?'local-photo-save':quest.category==='connect'?'real-world-self-report':'activity-self-report'}},
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
export function replacementCandidates(game,id,day=seoulDateKey(),options={}) {
  const plan=game.dailyMissions?.[day], current=dailyActivities(game,day).find(q=>q.id===id);
  if(!current||game.completed.includes(keyFor(day,id))||game.missionSlots?.[`${day}:slot:${current.slot}`])return [];
  // Old replacement history is honored without rewriting balances or today's plan.
  const passed=[...new Set([...(plan.passed??[]),...(plan.replacements??[]).map(r=>r.id)])];
  const completedIds=[...(game.completed??[]).filter(key=>key.startsWith(`${day}:`)).map(key=>key.slice(11)),...Object.values(game.activityRecords??{}).filter(r=>r.day===day&&!r.input).map(r=>r.id)];
  const excluded=new Set([current.activityGroup,...plan.activities.filter(a=>a.id!==id).map(a=>groupFor(a.id)),...completedIds.map(groupFor),...(options?.revisit?[]:passed.map(groupFor))]);
  const lighter=missionMode(game,current,day)==='light';
  const ceiling=lighter?0:current.effort;
  const minutes=lighter?1:current.choices&&game.challengeChoices?.[keyFor(day,id)]?parseInt(game.challengeChoices[keyFor(day,id)],10):current.minutes;
  const candidates=pool.map(q=>{
    const mode=missionMode(game,q,day),saved=[...(plan.replacements??[])].reverse().find(r=>r.id===q.id)?.criterion;
    const criterion=saved??missionCriterion(game,q,day);
    return {...q,criterion,description:criterion,...(mode==='light'?{effort:0,minutes:1}:{})};
  }).filter(q=>q.id!==id&&!excluded.has(q.activityGroup)&&!completedIds.includes(q.id)&&q.effort<=ceiling&&q.minutes<=minutes&&eligibleMission(q,game.preferences));
  // Stable tie rotation, not shortest/easiest-first or render-time randomness.
  const score=q=>[...`${day}:${current.slot}:${plan.replacements?.length??0}:${q.id}`].reduce((hash,c)=>(hash*31+c.charCodeAt(0))>>>0,0);
  return candidates.sort((a,b)=>(ceiling-a.effort)-(ceiling-b.effort)||Math.abs(a.minutes-minutes)-Math.abs(b.minutes-minutes)||score(a)-score(b));
}
export function replaceDailyMission(game,id,day=seoulDateKey(),options={}) {
  const plan=game.dailyMissions?.[day],current=dailyActivities(game,day).find(q=>q.id===id);
  const next=replacementCandidates(game,id,day,options)[0];
  if(!next)return game;
  const passed=[...new Set([...(plan.passed??[]),...(plan.replacements??[]).map(r=>r.id),id])];
  // A replaced mission returns to start-before-action, even when revisited explicitly.
  const started=(game.started??[]).filter(key=>key!==keyFor(day,id)&&key!==keyFor(day,next.id));
  return {...game,started,dailyMissions:{...game.dailyMissions,[day]:{...plan,activities:plan.activities.map(a=>a.id===id?{...a,id:next.id,criterion:next.criterion,reason:'지금 조건에 맞는 다른 활동이에요.'}:a),paused:(plan.paused??[]).filter(q=>q!==id),passed,replacements:[...(plan.replacements??[]),{id,replacement:next.id,reason:'different',revisited:!!options?.revisit,slot:current.slot,criterion:missionCriterion(game,current,day),mode:missionMode(game,current,day)}]}}};
}
// 지운 날의 일기는 다시 쓸 수 없다 (서버 규칙과 같게, 10/19)
export const DIARY_DELETED_MESSAGE = '지운 날의 일기는 다시 쓸 수 없어요.';
export function saveDiaryMission(game,date,text,now=new Date(),emotion) {
  if (deletedJournal(game, date)) return game;
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
