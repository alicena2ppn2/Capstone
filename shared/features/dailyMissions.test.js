import { completePhotoMission } from './missionPhotos.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, claimAttendance, ensureAttendanceWeek, goalProgress, QUESTS } from './game.js';
import { ensureDailyMissions, ROUTINES, dailyActivities, dailyReward, startDailyMission, finishDailyMission, replaceDailyMission, saveDiaryMission, deleteDiaryMission, recordRoutine, routineDone } from './dailyMissions.js';
const day='2026-10-08',now=new Date('2026-10-08T03:00:00Z');
const ready=()=>ensureDailyMissions(initialGame(),day);
test('3 routines + 3 stable activities, diary excluded, legacy 3-reward cap does not suppress fourth mission',()=>{
  let game=ready();assert.equal(ROUTINES.length,3);assert.equal(dailyActivities(game,day).length,3);assert(!dailyActivities(game,day).some(q=>q.input));
  const ids=dailyActivities(game,day).map(q=>q.id),initialCoins=game.coins;game.rewardDays={[day]:3};
  game=saveDiaryMission(game,day,'한 줄만',now);assert.equal(game.coins,initialCoins+25);
  for(const q of dailyActivities(game,day)){const key=`${day}:${q.id}`;if(q.choices)game={...game,challengeChoices:{...game.challengeChoices,[key]:q.choices[0]}};const old=game.coins;game=startDailyMission(game,q.id,now);assert.equal(game.coins,old);game=q.photo?completePhotoMission(game,q.id,day,{id:'test',uri:'test',storage:'indexeddb',mime:'image/jpeg',size:100},now):finishDailyMission(game,q.id,now);assert.equal(game.coins,old+25);const paid=game;game=finishDailyMission(game,q.id,now);assert.equal(game,paid);}
  assert.equal(game.coins,initialCoins+100);assert.deepEqual(dailyActivities(ensureDailyMissions(JSON.parse(JSON.stringify(game)),day),day).map(q=>q.id),ids);
});
test('diary blank rejected, optional mood, drafts not stamps; deleted day cannot be rewritten (server rule) and keeps balances',()=>{
  let game={...ready(),journalDrafts:{[day]:{text:'초안'}}};assert.equal(routineDone(game,'day-diary',day),false);assert.equal(game.journalDates?.includes(day)??false,false);
  assert.equal(saveDiaryMission(game,day,'   ',now),game);game=saveDiaryMission(game,day,'첫 일기',now);assert.equal(game.journalDrafts[day],undefined);assert(routineDone(game,'day-diary',day));const coins=game.coins,xp=game.xp;
  game={...game,journalDrafts:{[day]:{text:'수정 초안'}}};game=deleteDiaryMission(game,day,now);assert.equal(game.journals[day],undefined);assert.equal(game.journalDrafts[day],undefined);assert(game.journalDates.includes(day));
  // 10/19: 지운 날은 다시 쓸 수 없다 (서버와 같은 규칙) → 저장해도 그대로, 코인·XP도 그대로
  assert.equal(saveDiaryMission(game,day,'재작성',now,'happy'),game);assert.equal(game.journals[day],undefined);assert.equal(game.coins,coins);assert.equal(game.xp,xp);assert.equal(goalProgress(game,QUESTS.find(q=>q.id==='week-diary'),day),1);
  assert.equal(saveDiaryMission(game,day,'invalid',now,'fake'),game);
});
test('legacy current-day rewards/assets/raw records preserved, migration idempotent and no re-award',()=>{
  let old={...initialGame(),xp:340,coins:765,characters:['potato','mochi'],completed:[`${day}:day-walk`,`${day}:day-diary`],activityRecords:{[`${day}:day-walk`]:{id:'day-walk',day,rewarded:true,category:'outside'}},journals:{[day]:'기존 일기'},attendance:{[day]:{type:'coins',amount:20}}};
  const raw=JSON.stringify(old);let game=ensureDailyMissions(old,day,{neighbor:[{source:'local',date:day,text:'안녕'}]});assert.equal(JSON.stringify(old),raw);assert.equal(game.coins,765);assert.equal(game.xp,340);assert(routineDone(game,'day-guestbook',day));assert.equal(dailyReward(game,dailyActivities(game,day).find(q=>q.id==='day-walk'),day).xp,0);
  game=saveDiaryMission(game,day,'수정',now);game=ensureDailyMissions(game,day);assert.equal(game.coins,765);assert.equal(game.xp,340);assert.deepEqual(ensureDailyMissions(game,day),game);
});
test('attendance one existing payment, guestbook pending has no invented bonus, date rollover allows new diary only',()=>{
  let game=ensureAttendanceWeek(ready(),day);game=recordRoutine(claimAttendance(game,day),'day-attendance',day);const paid=game;assert.equal(recordRoutine(claimAttendance(game,day),'day-attendance',day),paid);
  game=recordRoutine(game,'day-guestbook',day);assert.equal(game.coins,paid.coins);assert.equal(game.xp,paid.xp);
  const nextDay='2026-10-09',nextNow=new Date('2026-10-08T15:00:00Z');assert.equal(saveDiaryMission(game,day,'자정 이후',nextNow),game);game=ensureDailyMissions(game,nextDay);assert(!routineDone(game,'day-diary',nextDay));game=saveDiaryMission(game,nextDay,'다음날',nextNow);assert.equal(game.coins,paid.coins+25);
});
test('replacement/pause cannot grant payment and current-day slots stay limited to three paid activities',()=>{
  let game=ready();const q=dailyActivities(game,day)[0],coins=game.coins;game=replaceDailyMission(game,q.id,day,'taste');assert.equal(game.coins,coins);assert.equal(dailyActivities(game,day).length,3);
  assert.equal(finishDailyMission(game,dailyActivities(game,day)[0].id,now),game);
});
