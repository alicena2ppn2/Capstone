import test from 'node:test';
import assert from 'node:assert/strict';
import { roomTime } from './roomTime.js';
test('device-local day/night switches at 06:00 and 18:00',()=>{
  for(const [h,m,night] of [[5,59,true],[6,0,false],[17,59,false],[18,0,true],[0,0,true]]) assert.equal(roomTime(new Date(2026,9,11,h,m)).night,night);
});
test('calendar uses local month/day/weekday and advances at midnight',()=>{
  const before=roomTime(new Date(2026,11,31,23,59,59)), after=roomTime(new Date(2027,0,1,0,0,0));
  assert.deepEqual([before.month,before.day,before.weekday],[12,31,'목']);assert.deepEqual([after.month,after.day,after.weekday],[1,1,'금']);
});
test('clock hands include fractional minute and hour movement',()=>{
  const t=roomTime(new Date(2026,9,11,9,30,30));assert.equal(t.hourAngle,285.25);assert.equal(t.minuteAngle,183);
  assert.equal(roomTime(new Date(2026,9,11,12,0)).hourAngle,0);
});
