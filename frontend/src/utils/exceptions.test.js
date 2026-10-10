import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, ensureAttendanceWeek, claimAttendance } from './game.js';
import { ensureDailyMissions,dailyActivities,replaceDailyMission,finishDailyMission,startDailyMission,saveDiaryMission,deleteDiaryMission } from './dailyMissions.js';
import { continueJournalDraft,hasJournal } from './journal.js';
import { newAttendanceReward,rewardPresentation } from './rewardFeedback.js';
test('new plans use distinct semantic groups, stay stable, and paid slots cannot swap',()=>{
 let game=initialGame();let previous;
 for(let n=1;n<=28;n++){
  const day=`2026-10-${String(n).padStart(2,'0')}`;game=ensureDailyMissions(game,day);const quests=dailyActivities(game,day);
  assert.equal(quests.length,3);assert.equal(new Set(quests.map(q=>q.activityGroup)).size,3);assert(quests.every(q=>q.effort<=1));
  assert.deepEqual(dailyActivities(ensureDailyMissions(JSON.parse(JSON.stringify(game)),day),day),quests);
  if(previous)assert.notDeepEqual(quests.map(q=>q.activityGroup).sort(),previous);
  previous=quests.map(q=>q.activityGroup).sort();
  const q=quests.find(q=>!q.choices),now=new Date(`${day}T03:00Z`);game=finishDailyMission(startDailyMission(game,q.id,now),q.id,now);assert.equal(replaceDailyMission(game,q.id,day),game);
  for(const other of dailyActivities(game,day).filter(other=>other.id!==q.id))assert.equal(replaceDailyMission(game,other.id,day).coins,game.coins);
 }
});
test('hard feedback stays at effort zero and replacement avoids another slot or completed group',()=>{
 let game={...initialGame(),activityRecords:{r:{id:'day-door',day:'2026-10-08',input:false}},feedback:{'2026-10-08:day-door':'hard'}};
 game=ensureDailyMissions(game,'2026-10-09');assert(dailyActivities(game,'2026-10-09').every(q=>q.effort===0));
 for(const q of dailyActivities(game,'2026-10-09')){const next=replaceDailyMission(game,q.id,'2026-10-09','taste');assert.equal(new Set(dailyActivities(next,'2026-10-09').map(q=>q.activityGroup)).size,3);assert.equal(next.coins,game.coins);}
});
test('carry preserves source emotion, conflicts do not overwrite; only diary save awards',()=>{
 const old='2026-10-08',today='2026-10-09',incoming={text:'자정 전 글',emotion:'loved',prompt:2};let game={...initialGame(),journalDrafts:{[old]:incoming}};
 let moved=continueJournalDraft(game,old,today,incoming);assert(moved.ok);assert.equal(moved.game.coins,game.coins);assert(!hasJournal(moved.game,today));assert.equal(moved.game.journalDrafts[today].emotion,'loved');
 const firstSave=saveDiaryMission(moved.game,today,moved.draft.text,new Date(`${today}T03:00Z`),moved.draft.emotion);assert.equal(firstSave.coins,game.coins+25);
 const occupied={...game,journals:{[today]:'오늘 저장한 글'},journalDrafts:{...game.journalDrafts,[today]:{text:'오늘 초안',emotion:'happy'}}};
 assert.equal(continueJournalDraft(occupied,old,today,incoming).game,occupied);
 assert.equal(continueJournalDraft(occupied,old,today,incoming,'keep').game,occupied);
 moved=continueJournalDraft(occupied,old,today,incoming,'merge');assert.equal(moved.game.journals[today],'오늘 저장한 글');assert.equal(moved.game.journalDrafts[old].text,incoming.text);assert.equal(moved.draft.text,'오늘 초안\n\n자정 전 글');
 assert(!continueJournalDraft(occupied,old,today,{text:'a'.repeat(2000)},'merge').ok);
 let saved=saveDiaryMission(moved.game,today,moved.draft.text,new Date(`${today}T03:00Z`),moved.draft.emotion);assert.equal(saved.coins,game.coins);
 saved=deleteDiaryMission(saved,today,new Date('2026-10-10T03:00Z'));assert(!hasJournal(saved,today));assert.equal(saved.journalDrafts[today],undefined);assert(saved.missionReceipts[`${today}:day-diary`]);
 const again=saveDiaryMission(saved,today,'재작성',new Date(`${today}T03:00Z`));assert.equal(again.coins,saved.coins);
});
test('attendance display reads only a new receipt including duplicate substitution',()=>{
 const day='2026-10-09';let game=ensureAttendanceWeek(initialGame(),day);game={...game,attendanceClothes:['sky'],attendancePlans:{...game.attendancePlans,[Object.keys(game.attendancePlans)[0]]:{...Object.values(game.attendancePlans)[0],[day]:{type:'outfit',id:'sky'}}}};
 const paid=claimAttendance(game,day),receipt=newAttendanceReward(game,paid,day);assert.equal(receipt.type,'coins');assert.equal(receipt.amount,30);assert.equal(rewardPresentation(receipt)[0].label,'+30 코인');assert.equal(newAttendanceReward(paid,claimAttendance(paid,day),day),null);
 assert.equal(rewardPresentation([{type:'coins',amount:20},{type:'xp',amount:10}]).length,2);
});
