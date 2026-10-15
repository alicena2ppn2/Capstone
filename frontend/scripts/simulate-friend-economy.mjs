import { initialGame, levelFor, claimAttendance } from '../../shared/features/game.js';
import { FINAL_FRIENDS } from '../../shared/features/finalFriends.js';
import { ensureDailyMissions, dailyActivities, startDailyMission, finishDailyMission, saveDiaryMission, recordRoutine } from '../../shared/features/dailyMissions.js';
// Explainable examples, not health-effect evidence or a guaranteed progression.
const simulate = full => {
  let game = initialGame(); const unlocked = {};
  for (let n = 1; n <= 70; n++) {
    const now = new Date(Date.UTC(2026, 9, 7 + n, 3)), day = now.toISOString().slice(0,10);
    game = ensureDailyMissions(game, day);
    for (const quest of dailyActivities(game, day)) {
      if (quest.choices) game = { ...game, challengeChoices: { ...game.challengeChoices, [`${day}:${quest.id}`]: quest.choices[0] } };
      game = finishDailyMission(startDailyMission(game, quest.id, now), quest.id, now);
    }
    if (full) {
      game = saveDiaryMission(game, day, '작은 하루', now);
      game = recordRoutine(claimAttendance(game, day, { type:'coins',amount:20 }), 'day-attendance', day);
      game = recordRoutine(game, 'day-guestbook', day);
    }
    for (const friend of FINAL_FRIENDS) if (levelFor(game.xp) >= friend.level && !unlocked[friend.id]) unlocked[friend.id] = { day:n, xp:game.xp, coins:game.coins };
  }
  return unlocked;
};
console.log(JSON.stringify({ assumptions:'No spending or weekly/monthly claims. Three = all 3 activities. Six adds diary, guestbook (0), and attendance fixed at 20 coins as a valid example, not a forecast. First-time XP included; initial coins 90.', three:simulate(false),six:simulate(true) }, null, 2));
