import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame } from './game.js';
import { DAILY_CHALLENGES } from './challenges.js';
import { dailyActivities, ensureDailyMissions, replacementCandidates, replaceDailyMission, startDailyMission, finishDailyMission } from './dailyMissions.js';
import { saveMissionPreferences } from './missionGuidance.js';
const day='2026-10-15',now=new Date(`${day}T03:00:00Z`);
function fixture(ids=['day-hobby','day-local','day-checkin']) {
 const g=saveMissionPreferences(initialGame(),{activities:['hobby','music','reading','outside','contact'],minutes:'5',exclude:[]});
 return {...g,dailyMissions:{[day]:{activities:ids.map((id,slot)=>({id,slot})),paused:[],replacements:[]}}};
}
test('similar burden preferred, category unlocked, current/related/other slots excluded',()=>{
 const g=fixture();const candidates=replacementCandidates(g,'day-hobby',day);
 assert(candidates.length);assert.equal(candidates[0].effort,1);assert.equal(candidates[0].minutes,5);
 assert(!candidates.some(q=>['day-hobby','day-local','day-checkin'].includes(q.id)));
 const walk=fixture(['day-walk','day-listen','day-checkin']);walk.preferences.missions.exclude=['photo'];
 assert(replacementCandidates(walk,'day-walk',day).length);
 assert(replacementCandidates(walk,'day-walk',day).every(q=>q.category!=='outside'));
});
test('normal continuous swaps never repeat IDs/groups or ping-pong, even after JSON reload',()=>{
 let g=fixture(),id='day-hobby';const seen=new Set([id]),groups=new Set(['day-hobby']);
 for(let i=0;i<30;i++){
  const before=g,next=replaceDailyMission(g,id,day);if(next===g)break;
  g=JSON.parse(JSON.stringify(next));const q=dailyActivities(g,day).find(q=>q.slot===0);
  assert(!seen.has(q.id));assert(!groups.has(q.activityGroup));seen.add(q.id);groups.add(q.activityGroup);id=q.id;
  assert.equal(g.coins,before.coins);assert.equal(g.xp,before.xp);assert.deepEqual(g.completed,before.completed);
 }
 assert(seen.size>2);assert.equal(replacementCandidates(g,id,day).length,0);
});
test('passed activity groups excluded across slots and legacy history respected',()=>{
 let g=fixture(['day-tidy','day-listen','day-checkin']);g=replaceDailyMission(g,'day-tidy',day);
 assert(g.dailyMissions[day].passed.includes('day-tidy'));
 assert(replacementCandidates(g,'day-listen',day).every(q=>q.activityGroup!=='tidy'));
 const legacy=fixture();legacy.dailyMissions[day].replacements=[{id:'day-read',replacement:'day-hobby'}];
 assert(!replacementCandidates(legacy,'day-hobby',day).some(q=>q.id==='day-read'));
});
test('exhaustion preserves current; explicit revisit allows passed only without clearing history',()=>{
 let g=fixture(['day-water','day-cup','day-local']);g.preferences.missions.exclude=['contact'];g=replaceDailyMission(g,'day-water',day);
 assert.equal(dailyActivities(g,day)[0].id,'day-door');
 assert.equal(replaceDailyMission(g,'day-door',day),g);
 const reloaded=JSON.parse(JSON.stringify(g));assert.equal(replacementCandidates(reloaded,'day-door',day).length,0);
 assert.equal(replacementCandidates(reloaded,'day-door',day,{revisit:true})[0].id,'day-water');
 const again=replaceDailyMission(reloaded,'day-door',day,{revisit:true});
 assert.equal(dailyActivities(again,day)[0].id,'day-water');assert(again.dailyMissions[day].passed.includes('day-door'));
 assert(again.dailyMissions[day].passed.includes('day-water'));assert.equal(again.coins,g.coins);
});
test('revisit still rejects completed groups, other slots, time/exclusions and higher burden',()=>{
 const g=fixture(['day-door','day-cup','day-local']);g.preferences.missions.exclude=['contact'];g.dailyMissions[day].passed=['day-water'];
 g.completed=[`${day}:day-water`];assert.equal(replacementCandidates(g,'day-door',day,{revisit:true}).length,0);
 const x=fixture(['day-water','day-cup','day-local']);x.preferences.missions.exclude=['movement','contact','photo'];
 assert.equal(replacementCandidates(x,'day-water',day,{revisit:true}).length,0);
});
test('next Seoul date does not inherit passed history; old plan/history/assets remain',()=>{
 let g=fixture();g.dailyMissions[day].passed=['day-tidy','day-cup'];
 const nextDay='2026-10-16',next=ensureDailyMissions(JSON.parse(JSON.stringify(g)),nextDay);
 assert.deepEqual(next.dailyMissions[day],g.dailyMissions[day]);assert.equal(next.dailyMissions[nextDay].passed,undefined);
 assert.equal(next.coins,g.coins);assert.equal(next.xp,g.xp);
 // History is scoped to the requested date, not a lifetime ban.
 next.dailyMissions[nextDay]={activities:[{id:'day-local',slot:0},{id:'day-listen',slot:1},{id:'day-checkin',slot:2}],paused:[],replacements:[]};
 assert(replacementCandidates(next,'day-local',nextDay).some(q=>q.id==='day-tidy'));
});
test('replacement resets start, same slot pays once and paid/completed slots lock including revisit',()=>{
 let g=fixture();g=startDailyMission(g,'day-hobby',now);g=replaceDailyMission(g,'day-hobby',day);
 const q=dailyActivities(g,day)[0],before=g.coins;assert(!g.started.includes(`${day}:${q.id}`));
 assert.equal(finishDailyMission(g,q.id,now),g);g=startDailyMission(g,q.id,now);g=finishDailyMission(g,q.id,now);
 assert.equal(g.coins,before+25);assert.equal(replaceDailyMission(g,q.id,day,{revisit:true}),g);
 assert.equal(finishDailyMission(g,q.id,now),g);
 const paid={...g,completed:[]};assert.equal(replacementCandidates(paid,q.id,day).length,0);
});
test('legacy light record stays the same activity with no payment',()=>{
 const g=fixture(['day-tidy','day-listen','day-checkin']);const light={...g,missionModes:{[`${day}:day-tidy`]:'light'}};
 assert.equal(light.coins,g.coins);assert.deepEqual(light.dailyMissions,g.dailyMissions);

 assert(replacementCandidates(light,'day-tidy',day).every(q=>q.effort===0&&q.minutes<=1));
});
test('only existing 24 variable missions used; no extra synthetic candidates',()=>{
 assert.equal(DAILY_CHALLENGES.filter(q=>!q.input).length,24);
 const g=fixture();assert(replacementCandidates(g,'day-hobby',day).every(q=>DAILY_CHALLENGES.some(x=>x.id===q.id)));
});
