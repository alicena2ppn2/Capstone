import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame } from './game.js';
import { DAILY_CHALLENGES } from './challenges.js';
import { ensureDailyMissions, dailyActivities, startDailyMission, finishDailyMission, replaceDailyMission, recordRoutine } from './dailyMissions.js';
import { saveMissionPreferences, recommendMissions, activityTags, selectMissionMode, missionGuide } from './missionGuidance.js';
const day='2026-10-15', now=new Date('2026-10-15T03:00:00Z');
test('skipping preserves old tastes and assets; unknown basics never claim familiarity',()=>{
 const old={...initialGame(),preferences:{music:'재즈',food:'밥'},coins:321};
 const g=saveMissionPreferences(old,{activities:[],exclude:[]});
 assert.equal(g.coins,321);assert.equal(g.preferences.music,'재즈');assert.equal(g.preferences.food,'밥');
 const neutral=recommendMissions(initialGame(),DAILY_CHALLENGES.filter(q=>!q.input),day,42);
 assert.equal(neutral.length,3);assert(neutral.every(q=>!q.reason.includes('익숙한')));
});
test('movement/contact/photo exclusions and time limits hold; no same-day semantic duplicates',()=>{
 const g=saveMissionPreferences(initialGame(),{activities:['outside','contact','music'],exclude:['movement','contact','photo'],minutes:'3'});
 for(let seed=0;seed<80;seed++){
  const qs=recommendMissions(g,DAILY_CHALLENGES.filter(q=>!q.input),day,seed);
  assert.equal(qs.length,3);assert.equal(new Set(qs.map(q=>q.activityGroup)).size,3);
  assert(qs.every(q=>q.minutes<=3&&!activityTags(q).some(t=>['movement','contact','photo'].includes(t))));
 }
});
test('sparse candidates do not force exclusions or difficult alternatives',()=>{
 const pool=DAILY_CHALLENGES.filter(q=>q.id==='day-tidy'||q.id==='day-space');
 const qs=recommendMissions(initialGame(),pool,day,1);assert.equal(qs.length,1);
});
test('familiar activities may repeat across dates; easy feedback never escalates',()=>{
 let g=saveMissionPreferences(initialGame(),{activities:['hobby','music'],exclude:[]});
 g.activityRecords={'2026-10-14:day-hobby':{id:'day-hobby',day:'2026-10-14'}};
 g.feedback={'2026-10-14:day-hobby':'easy'};
 const qs=recommendMissions(g,DAILY_CHALLENGES.filter(q=>!q.input),day,12);
 assert(qs.some(q=>q.id==='day-hobby'));assert(qs.every(q=>q.effort<=1));assert(!g.missionModes);
});
test('today plan stable after preferences, guestbook and reload; tomorrow uses exclusions',()=>{
 let g=ensureDailyMissions(initialGame(),day);const ids=dailyActivities(g,day).map(q=>q.id);
 g=saveMissionPreferences(g,{activities:['contact'],exclude:['movement','photo']});
 g=recordRoutine(g,'day-guestbook',day);
 const reloaded=ensureDailyMissions(JSON.parse(JSON.stringify(g)),day);
 assert.deepEqual(dailyActivities(reloaded,day).map(q=>q.id),ids);
 const tomorrow=ensureDailyMissions(reloaded,'2026-10-16');
 assert(dailyActivities(tomorrow,'2026-10-16').every(q=>!activityTags(q).includes('movement')&&!q.photo));
});
test('hard feedback favors other actions or light alternative on next date, never mutates today',()=>{
 let g=initialGame();g.activityRecords={'2026-10-14:day-tidy':{id:'day-tidy',day:'2026-10-14'}};g.feedback={'2026-10-14:day-tidy':'hard'};
 const qs=recommendMissions(g,DAILY_CHALLENGES.filter(q=>q.id==='day-tidy'),day,0);
 assert.equal(qs[0].suggestLight,true);
 const alternatives=recommendMissions(g,DAILY_CHALLENGES.filter(q=>!q.input),day,0);
 assert(alternatives.every(q=>q.activityGroup!=='tidy'));
});
test('alternative and extension retain ID/slot, record condition, reward once and lock after completion',()=>{
 let g=ensureDailyMissions(initialGame(),day);
 const q=dailyActivities(g,day).find(q=>missionGuide(q).light&&!q.photo&&!q.choices);
 assert(q);const coins=g.coins;
 g=selectMissionMode(g,q.id,day,'light',dailyActivities(g,day));
 assert.equal(g.coins,coins);g=startDailyMission(g,q.id,now);g=finishDailyMission(g,q.id,now);
 assert.equal(g.coins,coins+25);assert.equal(g.activityRecords[`${day}:${q.id}`].mode,'light');
 assert(g.activityRecords[`${day}:${q.id}`].criterion);
 assert.equal(finishDailyMission(g,q.id,now),g);assert.equal(replaceDailyMission(g,q.id,day),g);
 assert.equal(selectMissionMode(g,q.id,day,'extend',dailyActivities(g,day)),g);
});
test('explicit extension alone never pays or adds a slot',()=>{
 let g=ensureDailyMissions(initialGame(),day);const q=dailyActivities(g,day).find(q=>!q.photo&&!q.choices);
 const next=selectMissionMode(g,q.id,day,'extend',dailyActivities(g,day));
 assert.equal(next.xp,g.xp);assert.equal(next.coins,g.coins);assert.equal(dailyActivities(next,day).length,3);
 assert.equal(next.missionModes[`${day}:${q.id}`],'extend');
});
