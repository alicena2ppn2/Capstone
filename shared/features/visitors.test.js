import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyVisitors, USERS, VISITOR_NOTES } from './visitors.js';
import { DECOR } from '../data/decor.js';
import { CLOTHES } from '../data/clothes.js';

test('추천은 하루 세 명으로 고정되고 다음 날짜에는 이전 세 명을 제외한다', () => {
  let current = dailyVisitors('2026-10-05');
  for (let day = 6; day <= 20; day++) {
    assert.equal(new Set(current.ids).size, 3);
    assert.equal(dailyVisitors(current.day, current), current);
    const next = dailyVisitors(`2026-10-${day}`, JSON.parse(JSON.stringify(current)));
    assert.ok(next.ids.every(id => !current.ids.includes(id)));
    current = next;
  }
});
test('모든 가상 이웃의 소품과 의상 및 방명록이 유효하다', () => {
  assert.equal(USERS.length, 12);
  for (const user of USERS) {
    for (const [slot, id] of Object.entries(user.decorItems)) assert.ok(DECOR.some(item => item.slot === slot && item.id === id));
    assert.ok(CLOTHES.some(item => item.id === user.outfit));
    assert.ok(VISITOR_NOTES[user.id].every(entry => entry.likes >= 0 && entry.text));
  }
});
