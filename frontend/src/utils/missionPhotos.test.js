import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame } from './game.js';
import { ensureDailyMissions, dailyActivities, startDailyMission, finishDailyMission, replaceDailyMission } from './dailyMissions.js';
import { completePhotoMission, albumPhotos, PHOTO_MAX_BYTES } from './missionPhotos.js';

const photo = { id:'test-photo',uri:'test-photo',storage:'indexeddb',mime:'image/jpeg',size:1000 };
function fixture() {
  for(let i=1;i<=28;i++) {
    const day=`2026-11-${String(i).padStart(2,'0')}`,now=new Date(`${day}T12:00:00+09:00`);
    const game=ensureDailyMissions(initialGame(),day),q=dailyActivities(game,day).find(q=>q.photo);
    if(q)return {game,q,day,now};
  }
  throw new Error('Photo mission should occur in the rotating pool');
}
test('photo missions are occasional, at most one per day; saved lists remain stable',()=>{
  let photos=0;
  for(let i=1;i<=28;i++) {
    const day=`2026-11-${String(i).padStart(2,'0')}`;
    const game=ensureDailyMissions(initialGame(),day),list=dailyActivities(game,day);
    assert.equal(list.length,3);assert.ok(list.filter(q=>q.photo).length<=1);photos+=list.filter(q=>q.photo).length;
    assert.deepEqual(ensureDailyMissions(JSON.parse(JSON.stringify(game)),day).dailyMissions[day],game.dailyMissions[day]);
  }
  assert.ok(photos>0&&photos<28);
});
test('start and ordinary completion cannot award a photo mission; valid saved photo pays once',()=>{
  const f=fixture(); const started=startDailyMission(f.game,f.q.id,f.now);
  assert.equal(started.coins,f.game.coins);assert.equal(finishDailyMission(started,f.q.id,f.now),started);
  const done=completePhotoMission(started,f.q.id,f.day,photo,f.now);
  assert.equal(done.coins,started.coins+25);assert.equal(done.xp,started.xp+20);
  assert.equal(albumPhotos(done)[0].title,f.q.name);assert.equal(albumPhotos(done)[0].date,f.day);
  assert.equal(completePhotoMission(done,f.q.id,f.day,photo,f.now),done);
  assert.equal(replaceDailyMission(done,f.q.id,f.day),done);
  const restored=JSON.parse(JSON.stringify(done));assert.equal(completePhotoMission(restored,f.q.id,f.day,photo,f.now),restored);
});
test('missing/invalid/oversize photo, unstarted and midnight submissions never complete',()=>{
  const f=fixture();assert.equal(completePhotoMission(f.game,f.q.id,f.day,photo,f.now),f.game);
  const started=startDailyMission(f.game,f.q.id,f.now);
  for(const invalid of [null,{}, {...photo,size:0},{...photo,size:PHOTO_MAX_BYTES+1},{...photo,mime:'text/plain'}]) assert.equal(completePhotoMission(started,f.q.id,f.day,invalid,f.now),started);
  assert.equal(completePhotoMission(started,f.q.id,f.day,photo,new Date(`${f.day}T15:00:00Z`)),started);
});
test('new field does not reset assets, diaries or old completed records; empty album works',()=>{
  const f=fixture(),game={...f.game,journals:{'2026-10-01':'kept'},coins:321,xp:456};
  const done=completePhotoMission(startDailyMission(game,f.q.id,f.now),f.q.id,f.day,photo,f.now);
  assert.deepEqual(done.journals,game.journals);assert.ok(game.characters.every(id=>done.characters.includes(id)));
  assert.deepEqual(albumPhotos({}),[]);
});
