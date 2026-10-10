import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, completeQuest, startQuest, migrateQuestProgress, buyCharacter, equipCharacter, levelFor, questCompletionKey, QUESTS, ensureChallenges, selectChallenge, pauseChallenge, replaceChallenge, goalProgress, claimGoal, previewReward } from './game.js';
import { restoreNicknames } from './catalog.js';
import { initialConnections, visitNeighbor, favoriteNeighbor } from './neighbors.js';
const time = day => new Date(`${day}T03:00:00Z`);
function finish(state, id, day = '2026-10-05', answer = '') {
  state = selectChallenge(state, id, day);
  return completeQuest(startQuest(state, id, time(day)), id, time(day), answer);
}

test('신규 자금과 시연 자금은 구분하고 레벨 공식은 유지한다', () => {
  assert.equal(initialGame().coins, 90);
  assert.equal(initialGame({ demo: true }).coins, 540);
  assert.equal(levelFor(700), 8);
});
test('시작은 무보상, 실제 완료만 1회 지급하고 JSON 복원 후 중복 차단', () => {
  let state = selectChallenge(initialGame(), 'day-walk', '2026-10-05');
  assert.equal(completeQuest(state, 'day-walk', time('2026-10-05')), state);
  state = startQuest(state, 'day-walk', time('2026-10-05'));
  assert.equal(state.xp, 0);
  const done = completeQuest(JSON.parse(JSON.stringify(state)), 'day-walk', time('2026-10-05'));
  assert.equal(done.xp, 20);
  assert.equal(done.coins, 115);
  assert.equal(done.activityRecords['2026-10-05:day-walk'].category, 'outside');
  assert.equal(completeQuest(done, 'day-walk', time('2026-10-05')), done);
});
test('입력 공백 거절, 프로필 퀘스트 제외, 하루 기록은 1일 1개', () => {
  const state = selectChallenge(initialGame(), 'day-diary', '2026-10-05');
  assert.equal(completeQuest(state, 'day-diary', time('2026-10-05'), '   '), state);
  const done = completeQuest(state, 'day-diary', time('2026-10-05'), ' 좋은 하루 ');
  assert.equal(done.journals['2026-10-05'], '좋은 하루');
  assert.equal(done.xp, 15);
  assert.equal(completeQuest(done, 'day-music', time('2026-10-05'), '재즈'), done);
  assert.equal(completeQuest(done, 'day-diary', time('2026-10-05'), '수정'), done);
  const edited = { ...done, journals: { ...done.journals, '2026-10-05': '수정' } };
  assert.equal(goalProgress(edited, QUESTS.find(q => q.id === 'week-diary'), '2026-10-05'), 1);
});
test('보류·교체·재선택은 보상 이력을 지우지 않고 최대 선택은 3개', () => {
  let state = ensureChallenges(initialGame(), '2026-10-05');
  const candidates = state.challengeDays['2026-10-05'].candidates;
  assert.deepEqual(ensureChallenges(JSON.parse(JSON.stringify(state)), '2026-10-05').challengeDays['2026-10-05'].candidates, candidates);
  state = selectChallenge(state, 'day-walk', '2026-10-05');
  state = startQuest(state, 'day-walk', time('2026-10-05'));
  state = pauseChallenge(state, 'day-walk', '2026-10-05', 'time');
  assert.equal(state.xp, 0);
  assert.equal(state.challengeDays['2026-10-05'].selected.length, 0);
  state = finish(state, 'day-walk');
  const done = pauseChallenge(state, 'day-walk', '2026-10-05');
  assert.equal(done.xp, state.xp);
  state = selectChallenge(selectChallenge(state, 'day-greet', '2026-10-05'), 'day-diary', '2026-10-05');
  assert.equal(selectChallenge(state, 'day-drink', '2026-10-05').challengeDays['2026-10-05'].selected.length, 3);
  const forged = { ...state, rewardDays: { '2026-10-05': 3 } };
  assert.deepEqual(previewReward(forged, QUESTS.find(q => q.id === 'day-greet'), '2026-10-05'), { xp: 0, coins: 0 });
  const capped = finish(finish(finish(initialGame(), 'day-walk'), 'day-wake'), 'day-greet');
  assert.deepEqual(previewReward({ ...capped, rewardDays: {} }, QUESTS.find(q => q.id === 'day-drink'), '2026-10-05'), { xp: 0, coins: 0 });
});
test('준비와 외출은 교류 집계에 포함하지 않는다', () => {
  let state = finish(initialGame(), 'day-wake');
  state = finish(state, 'day-walk');
  const goal = QUESTS.find(q => q.id === 'week-connect');
  assert.equal(goalProgress(state, goal, '2026-10-05'), 0);
  state = finish(state, 'day-greet');
  assert.equal(goalProgress(state, goal, '2026-10-05'), 1);
});
test('서울 일·주·월 경계, 집계 보상 중복 차단, 과거 기록 보존', () => {
  let state = finish(initialGame(), 'day-walk', '2026-10-04');
  state = finish(state, 'day-walk', '2026-10-05');
  state = finish(state, 'day-drink', '2026-10-05');
  const goal = QUESTS.find(q => q.id === 'week-walk');
  assert.equal(goalProgress(state, goal, '2026-10-05'), 2);
  const next = claimGoal(state, goal.id, time('2026-10-05'));
  assert.equal(next.xp, state.xp + 30);
  assert.equal(claimGoal(next, goal.id, time('2026-10-05')).xp, next.xp);
  assert.equal(goalProgress(next, goal, '2026-10-12'), 0);
  assert.equal(goalProgress(next, QUESTS.find(q => q.id === 'month-place'), '2026-11-01'), 0);
  assert.equal(questCompletionKey(goal, '2026-10-05'), '2026-10-05:week-walk');
  assert.ok(next.completed.includes('2026-10-04:day-walk'));
});
test('누적 현실 행동 10회는 날짜가 달라도 유지, 입력으로는 채울 수 없다', () => {
  let state = initialGame();
  for (let i = 1; i <= 9; i++) state = finish(state, 'day-walk', `2026-10-${String(i).padStart(2, '0')}`);
  state = finish(state, 'day-diary', '2026-10-09', '일기');
  assert.ok(!state.characters.includes('sky'));
  state = finish(state, 'day-greet', '2026-10-10');
  assert.ok(state.characters.includes('sky'));
  assert.equal(state.character, 'potato');
});
test('구형 이관은 최신 취향·기록·레벨·자산·원본을 보존하고 재보상을 하지 않는다', () => {
  const old = { xp: 700, coins: 900, characters: ['potato', 'mochi'], character: 'mochi', completed: ['week-walk', '2026-10-01:day-walk'], questAnswers: { '2026-10-01:day-music': '재즈', '2026-10-02:day-music': '팝', '2026-10-01:day-diary': '기록' }, decor: { lamp: 'lamp-moon' } };
  const state = migrateQuestProgress(old, '2026-10-05');
  assert.equal(state.xp, 700); assert.equal(state.coins, 900);
  assert.deepEqual(state.characters, old.characters);
  assert.equal(state.preferences.music, '팝');
  assert.equal(state.journals['2026-10-01'], '기록');
  assert.equal(state.activityRecords['2026-10-01:day-walk'].category, 'outside');
  assert.ok(state.completed.includes('week-walk'));
  assert.ok(state.completed.includes('2026-10-05:week-walk'));
  const again = migrateQuestProgress(JSON.parse(JSON.stringify(state)), '2026-11-02');
  assert.deepEqual(again, state);
});
test('빈 부담 응답과 반복 횟수만으로 난이도를 올리지 않는다', () => {
  let state = initialGame();
  for (let i = 1; i <= 5; i++) state = finish(state, 'day-walk', `2026-10-0${i}`);
  const next = ensureChallenges(state, '2026-10-06');
  assert.ok(next.challengeDays['2026-10-06'].candidates.every(item => QUESTS.find(q => q.id === item.id).effort <= 1));
  const hard = ensureChallenges({ ...state, feedback: { '2026-10-05:day-walk': 'hard' } }, '2026-10-06');
  assert.ok(hard.challengeDays['2026-10-06'].candidates.every(item => QUESTS.find(q => q.id === item.id).effort <= 1));
});
test('걸음 목표 선택은 실제 완료 로직에서도 검사한다', () => {
  const state = selectChallenge(initialGame(), 'day-more-steps', '2026-10-05');
  assert.equal(startQuest(state, 'day-more-steps', time('2026-10-05')), state);
  const chosen = { ...state, challengeChoices: { '2026-10-05:day-more-steps': '1분' } };
  assert.equal(finish(chosen, 'day-more-steps').xp, 20);
});
test('구매와 장착은 별개이며 중복 구매는 차감하지 않고 이전 저장 필드를 보존한다', () => {
  const state = { ...initialGame(), xp: 400, coins: 600, targetItem: 'character:mochi' };
  const bought = buyCharacter(state, 'mochi');
  assert.equal(bought.coins, 300);
  assert.equal(bought.character, 'potato');
  assert.equal(buyCharacter(bought, 'mochi'), bought);
  assert.equal(equipCharacter(bought, 'mochi').character, 'mochi');
  assert.equal(bought.targetItem, state.targetItem);
});
test('저장한 샘플 이웃은 날짜 추천과 무관하게 재방문하고 최근 목록은 중복하지 않는다', () => {
  let state = favoriteNeighbor(initialConnections(), 'yuna');
  state = visitNeighbor(visitNeighbor(state, 'yuna'), 'yuna');
  assert.deepEqual(state.recent, ['yuna']);
  assert.deepEqual(JSON.parse(JSON.stringify(state)).favorites, ['yuna']);
  assert.deepEqual(favoriteNeighbor(state, 'yuna').favorites, []);
});
test('구형 애칭은 장착 친구 하나에만 이관하고 반복 복원으로 복제하지 않는다', () => {
  const restored = restoreNicknames({ ...initialGame(), character: 'mochi' }, ' 솜이 ');
  assert.deepEqual(restored.nicknames, { mochi: '솜이' });
  const switched = { ...restored, character: 'pink' };
  assert.equal(restoreNicknames(switched, '솜이'), switched);
  assert.equal(switched.nicknames.pink, undefined);
});
test('하루 3회 한도를 교체 데이터가 변경되어도 완료 로직에서 막는다', () => {
  let state = initialGame();
  for (const id of ['day-walk', 'day-wake', 'day-greet']) state = finish(state, id);
  const before = { xp: state.xp, coins: state.coins };
  // Simulate stale UI or imported selection data: completion still enforces the cap.
  state = { ...state, challengeDays: { ...state.challengeDays, '2026-10-05': { ...state.challengeDays['2026-10-05'], selected: ['day-drink'] } } };
  state = finish(state, 'day-drink');
  assert.equal(state.xp, before.xp); assert.equal(state.coins, before.coins);
  assert.equal(state.questReward.xp, 0);
  assert.equal(completeQuest(state, 'day-drink', time('2026-10-05')), state);
});
test('새 날짜는 다시 선택/완료 가능하며 주·월 지급 키는 경계에서 분리한다', () => {
  let state = finish(initialGame(), 'day-walk', '2026-10-31');
  state = finish(state, 'day-walk', '2026-11-01');
  assert.equal(state.xp, 35); // One-time novelty bonus never repeats.
  assert.equal(state.completed.length, 2);
  const week = QUESTS.find(q => q.id === 'week-walk');
  const month = QUESTS.find(q => q.id === 'month-place');
  assert.notEqual(questCompletionKey(week, '2026-11-01'), questCompletionKey(week, '2026-11-02'));
  assert.notEqual(questCompletionKey(month, '2026-10-31'), questCompletionKey(month, '2026-11-01'));
});
test('교체 이유에 따라 같은 갈래의 작은/짧은 대안을 제안한다', () => {
  const selected = selectChallenge(initialGame(), 'day-place', '2026-10-05');
  for (const reason of ['hard', 'time']) {
    const state = pauseChallenge(selected, 'day-place', '2026-10-05', reason);
    const replacement = QUESTS.find(q => q.id === state.challengeDays['2026-10-05'].replacements[0].replacement);
    assert.equal(replacement.category, 'outside');
    assert.ok(replacement.minutes < 10);
    assert.ok(replacement.effort < 2);
    assert.equal(state.xp, 0);
  }
});
test('명시적인 편함 응답이 있는 경우에만 작은 확장 후보를 사용한다', () => {
  const completed = finish(initialGame(), 'day-walk');
  const state = ensureChallenges({ ...completed, feedback: { '2026-10-05:day-walk': 'easy' } }, '2026-10-06');
  const stretch = state.challengeDays['2026-10-06'].candidates.find(q => q.role === '한 걸음 도전');
  assert.equal(QUESTS.find(q => q.id === stretch.id).effort, 2);
});
test('부분적인 새 저장 데이터에도 필드 기본값을 제공한다', () => {
  const state = { ...initialGame(), challengeVersion: 2 };
  delete state.challengeDays; delete state.feedback;
  const migrated = migrateQuestProgress(state);
  assert.deepEqual(migrated.challengeDays, {});
  assert.deepEqual(migrated.feedback, {});
  assert.equal(migrated.coins, state.coins);
});
test('교체는 기존 대안을 선택만 하고 보상/완료/시작을 변경하지 않는다', () => {
  const state = startQuest(selectChallenge(initialGame(), 'day-place', '2026-10-05'), 'day-place', time('2026-10-05'));
  const next = replaceChallenge(state, 'day-place', '2026-10-05', 'hard');
  assert.equal(next.xp, state.xp); assert.equal(next.coins, state.coins);
  assert.deepEqual(next.completed, state.completed); assert.deepEqual(next.started, state.started);
  assert.ok(!next.challengeDays['2026-10-05'].selected.includes('day-place'));
  assert.equal(next.challengeDays['2026-10-05'].selected.length, 1);
  assert.equal(next.challengeDays['2026-10-05'].replacements.at(-1).reason, 'hard');
});
test('적절한 대안이 없으면 현재 도전과 모든 기록을 그대로 유지한다', () => {
  let state = selectChallenge(initialGame(), 'day-place', '2026-10-05');
  state = { ...state, completed: QUESTS.filter(q => q.period === 'day' && q.id !== 'day-place').map(q => `2026-10-05:${q.id}`) };
  assert.equal(replaceChallenge(state, 'day-place', '2026-10-05', 'hard'), state);
});
