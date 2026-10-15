import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, CHARACTERS, buyCharacter, equipCharacter, grantMilestone, levelFor, migrateQuestProgress } from './game.js';
import { FINAL_FRIENDS, characterAvailability } from './finalFriends.js';
import { FRIEND_INTROS } from '../data/catalog.js';
import { ensureDailyMissions, dailyActivities, startDailyMission, finishDailyMission, saveDiaryMission, recordRoutine } from './dailyMissions.js';
test('12 unique products, only six new products, approved revisions and level order', () => {
  assert.equal(CHARACTERS.length,12); assert.equal(new Set(CHARACTERS.map(f=>f.id)).size,12);
  assert.deepEqual(FINAL_FRIENDS.map(f=>[f.level,f.price,f.revision]),[[4,300,'B'],[7,350,'A'],[10,450,'A'],[15,600,'C'],[20,625,'A-no-spots'],[25,650,'B']]);
  assert(CHARACTERS.every((f,i)=>i===0||CHARACTERS[i-1].level<=f.level));
  assert(FINAL_FRIENDS.every(f=>!f.method&&FRIEND_INTROS[f.id].personality));
  assert.equal(levelFor(10000),101);
});
for(const friend of FINAL_FRIENDS) test(`${friend.name}: boundary, insufficient funds, one deduction, no auto equip, JSON restore`,()=>{
  const original={...initialGame(),xp:(friend.level-1)*100,coins:friend.price,nicknames:{potato:'내 감자'},characters:['potato','mochi'],character:'mochi',decor:{lamp:'lamp-moon'},completed:['2026-10-01:day-walk'],custom:'preserve'};
  assert.equal(buyCharacter({...original,xp:original.xp-1},friend.id).characters.length,2);
  assert.equal(buyCharacter({...original,coins:friend.price-1},friend.id).coins,friend.price-1);
  assert.equal(characterAvailability({...original,xp:original.xp-1},friend),'level');
  assert.equal(characterAvailability({...original,coins:friend.price-1},friend),'coins');
  const bought=buyCharacter(original,friend.id);assert.equal(bought.coins,0);assert.equal(bought.character,'mochi');assert.equal(buyCharacter(bought,friend.id),bought);
  const equipped=equipCharacter(bought,friend.id), restored=migrateQuestProgress(JSON.parse(JSON.stringify(equipped)));
  assert.equal(restored.character,friend.id);assert.equal(restored.xp,original.xp);assert.deepEqual(restored.nicknames,original.nicknames);assert.deepEqual(restored.decor,original.decor);assert(restored.completed.includes(original.completed[0]));assert.equal(restored.custom,'preserve');
  assert.equal(characterAvailability(restored,friend),'active');assert.equal(characterAvailability(bought,friend),'owned');
});
test('level does not automatically grant the new six; old free pink remains',()=>{
  const game=grantMilestone({...initialGame(),xp:10000});assert.deepEqual(game.characters,['potato','pink']);
});
test('current daily economy is 3 activity slots plus three routines, not an old global reward cap',()=>{
  const day='2026-10-08',now=new Date(`${day}T12:00:00+09:00`);
  let game=ensureDailyMissions(initialGame(),day); const before=game;
  for(const quest of dailyActivities(game,day)) {
    if(quest.choices)game={...game,challengeChoices:{...game.challengeChoices,[`${day}:${quest.id}`]:quest.choices[0]}};
    game=finishDailyMission(startDailyMission(game,quest.id,now),quest.id,now);
    const repeat=finishDailyMission(game,quest.id,now);assert.equal(repeat.coins,game.coins);assert.equal(repeat.xp,game.xp);
  }
  assert.equal(game.coins-before.coins,75);assert.equal(game.xp-before.xp,60); // 45 base + three first-time +5 XP.
  const diary=saveDiaryMission(game,day,'한 줄',now);assert.equal(diary.coins-game.coins,25);assert.equal(diary.xp-game.xp,15);
  const guest=recordRoutine(diary,'day-guestbook',day);assert.equal(guest.coins,diary.coins);
});
