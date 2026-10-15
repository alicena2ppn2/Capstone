import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame } from './game.js';
import { DAILY_CHALLENGES } from './challenges.js';
import { dailyActivities, ensureDailyMissions, startDailyMission, finishDailyMission, replaceDailyMission } from './dailyMissions.js';
import { missionCriterion, missionTitle } from './missionGuidance.js';
import { legacyMissionCriterion } from '../data/legacyMissionConditions.js';
const day='2026-10-15',now=new Date(`${day}T03:00:00Z`);
const fixture=()=>({...initialGame(),dailyMissions:{[day]:{activities:[{id:'day-tidy',slot:0},{id:'day-listen',slot:1},{id:'day-local',slot:2}],paused:[],replacements:[]}}});
test('new card copy is complete without a detail screen; same IDs, pool, prices and rewards',()=>{
 const pool=DAILY_CHALLENGES.filter(q=>!q.input);assert.equal(pool.length,24);
 assert(pool.every(q=>q.description.trim()&&q.description.length<100&&q.xp===15&&q.coins===25));
 const q=pool.find(q=>q.id==='day-tidy');assert.equal(missionCriterion(fixture(),q,day),q.description);
 assert(pool.find(q=>q.id==='day-checkin').description.includes('잘 지내?'));
});
test('old started base and saved light/extend conditions migrate once without payment or resets',()=>{
 for(const mode of ['base','light','extend']){
  let g=fixture();g.started=[`${day}:day-tidy`];g.missionModes={[`${day}:day-tidy`]:mode};g.coins=700;g.xp=500;
  const old=legacyMissionCriterion(dailyActivities(g,day)[0],mode),next=ensureDailyMissions(g,day);
  assert.equal(missionCriterion(next,dailyActivities(next,day)[0],day),old);
  assert.equal(next.coins,700);assert.equal(next.xp,500);assert.deepEqual(next.started,g.started);assert.deepEqual(next.missionModes,g.missionModes);
  assert.equal(ensureDailyMissions(next,day),next);
 }
});
test('new starts snapshot new short condition and repeat completion pays only once',()=>{
 let g=fixture();const q=dailyActivities(g,day)[0],copy=q.description;
 g=startDailyMission(g,q.id,now);assert.equal(dailyActivities(g,day)[0].criterion,copy);
 const changedCatalogueView={...dailyActivities(g,day)[0],description:'changed display'};
 assert.equal(missionCriterion(g,changedCatalogueView,day),copy);
 g=finishDailyMission(g,q.id,now);assert.equal(g.activityRecords[`${day}:${q.id}`].criterion,copy);assert.equal(g.coins,115);
 assert.equal(finishDailyMission(g,q.id,now),g);
});
test('stored lighter title agrees with its condition, and explicit replacement retains choice history',()=>{
 let g=fixture();g.missionModes={[`${day}:day-tidy`]:'light'};g=ensureDailyMissions(g,day);
 const q=dailyActivities(g,day)[0];assert.equal(missionTitle(g,q,day),'물건 하나 제자리로');assert(missionCriterion(g,q,day).includes('하나'));
 const next=replaceDailyMission(g,q.id,day);assert.deepEqual(next.missionModes,g.missionModes);
 assert.equal(next.coins,g.coins);assert.equal(next.xp,g.xp);
});
test('new day keeps historical selected modes and records, without writing new level choices',()=>{
 let g=fixture();g.missionModes={[`${day}:day-tidy`]:'extend'};g=ensureDailyMissions(g,day);
 const next=ensureDailyMissions(g,'2026-10-16');assert.deepEqual(next.missionModes,g.missionModes);
 assert.equal(next.dailyMissions[day].activities[0].criterion,g.dailyMissions[day].activities[0].criterion);
});
