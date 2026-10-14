import { completePhotoMission } from './missionPhotos.js';
import { DAILY_CHALLENGES } from '../data/missions.js';
import { recommendMissions, eligibleMission } from './missionGuidance.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, ensureAttendanceWeek, claimAttendance } from './game.js';
import { ensureDailyMissions,dailyActivities,replaceDailyMission,finishDailyMission,startDailyMission,saveDiaryMission,deleteDiaryMission } from './dailyMissions.js';
import { continueJournalDraft,hasJournal } from './journal.js';
import { newAttendanceReward,rewardPresentation } from './rewardFeedback.js';
// Current rules: photos require a successful photo save; repeated days are allowed.
// Keep the paid-slot lock assertion, but complete each mission through its real path.
test('daily plans stay distinct and stable; self-confirmed and photo paid slots stay locked',()=>{
 let game=initialGame(),photoCount=0,selfCount=0;
 for(let n=1;n<=28;n++){
  const day=`2026-10-${String(n).padStart(2,'0')}`,now=new Date(`${day}T03:00Z`);
  game=ensureDailyMissions(game,day);const quests=dailyActivities(game,day);
  assert.equal(quests.length,3);assert.equal(new Set(quests.map(q=>q.activityGroup)).size,3);assert(quests.every(q=>q.effort<=1));
  assert.deepEqual(dailyActivities(ensureDailyMissions(JSON.parse(JSON.stringify(game)),day),day),quests);
  for(const q of quests){
   const before=game,started=startDailyMission(game,q.id,now);
   assert.equal(started.coins,before.coins);assert.equal(started.xp,before.xp);
   let done;
   if(q.photo){
    photoCount++;assert.equal(finishDailyMission(started,q.id,now),started);
    done=completePhotoMission(started,q.id,day,{id:`photo-${day}-${q.id}`,uri:'test-photo',storage:'indexeddb',mime:'image/jpeg',size:1000},now);
   }else{selfCount++;done=finishDailyMission(started,q.id,now);}
   assert(done.completed.includes(`${day}:${q.id}`));assert.equal(done.coins,before.coins+25);assert(done.xp>before.xp);
   assert.equal(replaceDailyMission(done,q.id,day),done);
   assert.equal(finishDailyMission(done,q.id,now),done);
   const restored=JSON.parse(JSON.stringify(done));assert.equal(replaceDailyMission(restored,q.id,day),restored);
   game=done;
   for(const other of dailyActivities(game,day).filter(other=>other.id!==q.id))assert.equal(replaceDailyMission(game,other.id,day).coins,game.coins);
  }
 }
 assert(photoCount>0);assert(selfCount>0);
});

// Hard feedback changes future ranking, not every mission's effort or today's frozen plan.
test('hard feedback prioritizes other eligible activities without escalation or rewriting today',()=>{
 const day='2026-10-09',base={...initialGame(),preferences:{...initialGame().preferences,missions:{activities:['contact']}},activityRecords:{'2026-10-08:day-door':{id:'day-door',day:'2026-10-08',input:false}}};
 const pool=['day-door','day-cup','day-photo-leaf','day-nod'].map(id=>DAILY_CHALLENGES.find(q=>q.id===id));
 assert(pool.every(Boolean));
 const before=recommendMissions(base,pool,day,0);assert(before.some(q=>q.id==='day-door'));
 const hard={...base,feedback:{'2026-10-08:day-door':'hard'}};
 const after=recommendMissions(hard,pool,day,0);
 assert.equal(after.length,3);assert(!after.some(q=>q.activityGroup==='short-outing'));
 assert(after.every(q=>q.effort<=1&&eligibleMission(q,hard.preferences)));
 assert.equal(new Set(after.map(q=>q.activityGroup)).size,3);
 const frozen=ensureDailyMissions(base,day),updated={...frozen,feedback:hard.feedback};
 assert.deepEqual(ensureDailyMissions(updated,day).dailyMissions[day],frozen.dailyMissions[day]);
 for(const q of dailyActivities(updated,day)){
  const next=replaceDailyMission(updated,q.id,day);
  const list=dailyActivities(next,day);assert.equal(new Set(list.map(q=>q.activityGroup)).size,3);
  assert(list.every(q=>eligibleMission(q,next.preferences)));assert.equal(next.coins,updated.coins);assert.equal(next.xp,updated.xp);
 }
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
