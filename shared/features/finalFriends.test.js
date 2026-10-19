import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, CHARACTERS, buyCharacter, equipCharacter, grantMilestone, levelFor, xpThresholdForLevel, migrateQuestProgress } from './game.js';
import { FINAL_FRIENDS, characterAvailability } from './finalFriends.js';
import { FRIEND_INTROS } from '../data/catalog.js';
import { CHARACTER_PROFILES } from '../data/characterProfiles.js';
import { CHARACTER_VOICE_DRAFTS } from '../data/characterVoiceDrafts.js';
import { ensureDailyMissions, dailyActivities, startDailyMission, finishDailyMission, saveDiaryMission, recordRoutine } from './dailyMissions.js';
test('12 unique products, only six new products, approved revisions and level order', () => {
  assert.equal(CHARACTERS.length,12); assert.equal(new Set(CHARACTERS.map(f=>f.id)).size,12);
  assert.deepEqual(FINAL_FRIENDS.map(f=>[f.level,f.price,f.revision]),[[4,300,'B'],[7,350,'A'],[10,450,'A'],[15,600,'C'],[20,625,'A-no-spots'],[25,650,'B']]);
  assert(CHARACTERS.every((f,i)=>i===0||CHARACTERS[i-1].level<=f.level));
  assert(FINAL_FRIENDS.every(f=>!f.method&&FRIEND_INTROS[f.id].personality));
  assert.equal(levelFor(10000),102);
});
test('표시 이름과 세 친구 소개를 갱신하되 ID·상점 상품 수는 유지한다', () => {
  const expected = {
    potato: '꼬질이', sky: '팽이', pink: '복숭이', 'proto-pebble': '곰댕이', mochi: '구르미',
    'proto-pear': '라니', lavender: '양양이', 'proto-quilt': '루루', mint: '북북이',
    'draft-duck': '포포', 'draft-deer': '메루', 'draft-hedgehog': '도토',
  };
  assert.deepEqual(Object.fromEntries(CHARACTERS.map(friend => [friend.id, friend.name])), expected);
  assert.equal(CHARACTERS.length, 12);
  assert.equal(CHARACTERS.find(friend => friend.id === 'sky').method, 'quest');
  assert.equal(CHARACTERS.some(friend => ['draft-red-panda', 'draft-dragon', 'draft-squirrel', 'draft-pony', 'draft-elephant'].includes(friend.id)), false);
  assert.equal(FRIEND_INTROS.potato.introduction, '꼬질이는 놀고 나면 꼭 뭔가를 두고 와요. 찾으러 가는 길에도 딴짓 중!');
  assert.equal(FRIEND_INTROS.potato.likes, '친구들과 놀기, 처음 해 보는 놀이');
  assert.equal(FRIEND_INTROS.potato.habit, '주머니에 뭘 넣었는지 까먹고 뒤늦게 꺼내 봐요.');
  assert.equal(FRIEND_INTROS.pink.introduction, '복숭이는 리본 하나도 아무거나 고르지 않아요. 마음에 든 건 오래 아껴요.');
  assert.equal(FRIEND_INTROS.pink.likes, '마음에 쏙 드는 리본과 소품');
  assert.equal(FRIEND_INTROS.pink.habit, '거울 앞에서 리본 각도를 조금씩 고쳐요.');
  assert.equal(FRIEND_INTROS['proto-pebble'].introduction, '곰댕이는 낮잠이 제일 좋은 순둥이. 베개 높이만큼은 양보 못 해요.');
  assert.equal(FRIEND_INTROS['proto-pebble'].likes, '낮잠, 폭신한 베개와 이불');
  assert.equal(FRIEND_INTROS['proto-pebble'].habit, '눕기 전에 베개를 톡톡 두드려요.');
});
test('eight requested profiles and short shop copy are stored separately from appearance and purchase data', () => {
  const ids = ['mochi','proto-pear','lavender','proto-quilt','mint','draft-duck','draft-deer','draft-hedgehog'];
  assert.deepEqual(Object.keys(CHARACTER_VOICE_DRAFTS).sort(), ['draft-deer','draft-duck','draft-hedgehog','lavender','mint','mochi','pink','potato','proto-pear','proto-pebble','proto-quilt','sky'].sort());
  for(const id of ids) {
    assert(CHARACTER_PROFILES[id]?.personality);
    assert.equal(CHARACTER_VOICE_DRAFTS[id].length,12)   // 10/17: 캐릭터마다 오늘의 한마디 12개;
    assert(FRIEND_INTROS[id]?.introduction);
  }
  assert.equal(FRIEND_INTROS.mochi.introduction,'친구들 몫까지 챙기다 가방이 빵빵해져요. 같이 나누면 더 좋으니까요!');
  assert.equal(FRIEND_INTROS['proto-pear'].introduction,'좋은 냄새를 따라 구경하다 햇볕 아래서 꾸벅. 마음에 드는 순간엔 오래 머물러요.');
  assert.equal(FRIEND_INTROS.lavender.introduction,'가장 폭신한 구름을 찾으려고 관찰표를 만들었어요. 꽤 진지한 연구래요.');
  assert.equal(FRIEND_INTROS['proto-quilt'].introduction,'궁금한 건 못 지나치지만 정답에는 느긋해요. 딴생각하다 재밌는 걸 발견하거든요.');
  assert.equal(FRIEND_INTROS.mint.introduction,'해 주고 싶은 말을 오래 고르다 타이밍을 놓쳐요. 돌아가는 길에도 네 이야기를 생각해요.');
  assert.equal(FRIEND_INTROS['draft-duck'].introduction,'작은 웅덩이도 포포에겐 대모험! 신나는 일은 꼭 친구를 불러 같이 해요.');
  assert.equal(FRIEND_INTROS['draft-deer'].introduction,'필요한 걸 챙기고 먼저 한 발 내딛어요. 가끔 너무 앞서가서 친구 의견을 뒤늦게 물어요.');
  assert.equal(FRIEND_INTROS['draft-hedgehog'].introduction,'주운 단추 하나에도 이야기를 붙여요. 소중해서 숨겨 놓고, 어디 뒀는지 또 잊었대요.');
  assert.equal(CHARACTERS.find(friend=>friend.id==='sky').name,'팽이');
  assert.equal(FRIEND_INTROS.sky.introduction,'하고 싶은 일을 적다가 종이가 모자랐어요. 다 못 해도 다음 상상이 기다리는 팽이!');
  assert.equal(CHARACTER_PROFILES.sky.name,'팽이');
  assert.equal(CHARACTER_VOICE_DRAFTS.sky.length,12);
});
for(const friend of FINAL_FRIENDS) test(`${friend.name}: boundary, insufficient funds, one deduction, no auto equip, JSON restore`,()=>{
  const original={...initialGame(),xp:xpThresholdForLevel(friend.level),coins:friend.price,nicknames:{potato:'내 감자'},characters:['potato','mochi'],character:'mochi',decor:{lamp:'lamp-moon'},completed:['2026-10-01:day-walk'],custom:'preserve'};
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
  const guest=recordRoutine(diary,'day-visit',day);assert.equal(guest.coins,diary.coins);
});
