import test from 'node:test';
import assert from 'node:assert/strict';
import { saveJournal, deleteJournal, journalDates, hasJournal, calendarDays, shiftMonth } from './journal.js';
import { completeQuest, initialGame, selectChallenge, goalProgress, QUESTS } from './game.js';
const now = new Date('2026-10-07T14:59:00Z');
test('일기는 공백을 거부하고 당일 수정만 허용하며 기존 재화를 유지한다', () => {
 const original = initialGame();
 assert.equal(saveJournal(original, '2026-10-07', ' ', now), original);
 let game = saveJournal(original, '2026-10-07', '첫 일기', now);
 game = saveJournal(game, '2026-10-07', '수정', now);
 assert.equal(game.journals['2026-10-07'], '수정');
 assert.equal(game.coins, original.coins); assert.equal(game.xp, original.xp);
 assert.equal(saveJournal(game, '2026-10-07', '자정 이후', new Date('2026-10-07T15:00:00Z')), game);
 assert.equal(journalDates(game).length, 1);
});
test('삭제는 글과 답변을 지우되 날짜·완료 기록을 보존하고 당일 재작성을 막는다', () => {
 let game = saveJournal(initialGame(), '2026-10-07', '글', now);
 game = { ...game, questAnswers: { '2026-10-07:day-diary': '글' } };
 const deleted = deleteJournal(game, '2026-10-07');
 assert.equal(hasJournal(deleted, '2026-10-07'), false);
 assert.equal(deleted.questAnswers['2026-10-07:day-diary'], undefined);
 assert.deepEqual(journalDates(deleted), ['2026-10-07']);
 assert.equal(goalProgress(deleted, QUESTS.find(q => q.id === 'week-diary'), '2026-10-07'), 1);
 assert.equal(goalProgress(deleted, QUESTS.find(q => q.id === 'month-diary'), '2026-10-07'), 1);
 assert.equal(saveJournal(deleted, '2026-10-07', '다시', now), deleted);
 const selected = selectChallenge(deleted, 'day-diary', '2026-10-07');
 assert.equal(completeQuest(selected, 'day-diary', now, '다시'), selected);
 const restored = JSON.parse(JSON.stringify(deleted));
 assert.equal(saveJournal(restored, '2026-10-07', '다시', now), restored);
 assert.ok(hasJournal(saveJournal(restored, '2026-10-08', '새 날', new Date('2026-10-08T01:00Z')), '2026-10-08'));
});
test('이전 일기는 날짜 필드 없이 복원하고 달력은 윤년과 연도 경계를 지원한다', () => {
 const old = { journals: { '2024-02-29': '윤년' } };
 assert.deepEqual(journalDates(deleteJournal(old, '2024-02-29')), ['2024-02-29']);
 assert.equal(calendarDays('2024-02').filter(Boolean).length, 29);
 assert.equal(calendarDays('2026-02').filter(Boolean).length, 28);
 assert.equal(calendarDays('2026-10').length % 7, 0);
 assert.equal(shiftMonth('2026-12', 1), '2027-01');
});
