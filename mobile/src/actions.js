import { levelFor } from '../../frontend/src/utils/game.js';
export function buyOutfit(state, item) {
  const owned = [...state.wardrobe.owned, ...(state.game.attendanceClothes ?? [])];
  if (owned.includes(item.id) || state.game.coins < item.price || levelFor(state.game.xp) < (item.level ?? 1)) return state;
  return { ...state, game: { ...state.game, coins: state.game.coins - item.price }, wardrobe: { ...state.wardrobe, owned: [...state.wardrobe.owned, item.id] } };
}
export function wearOutfit(state, id) {
  return id === null || [...state.wardrobe.owned, ...(state.game.attendanceClothes ?? [])].includes(id) ? { ...state, wardrobe: { ...state.wardrobe, outfit: id } } : state;
}
export const eventSnapshot = state => ({ reward: state.game.questReward?.sequence ?? 0, outfit: state.wardrobe.outfit, character: state.game.character });
export function reactionEvent(previous, state) {
  const current = eventSnapshot(state);
  const rewardChanged = !!previous && current.reward !== previous.reward;
  const outfitChanged = !!previous && current.outfit !== null && current.outfit !== previous.outfit;
  return { current, rewardChanged, characterChanged: !!previous && current.character !== previous.character, celebrate: outfitChanged || rewardChanged && !!(state.game.questReward?.xp || state.game.questReward?.coins) };
}
