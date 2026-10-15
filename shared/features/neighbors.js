import { USERS } from './visitors.js';

export const initialConnections = () => ({ recent: [], favorites: [], reactions: {} });
export function visitNeighbor(state, id) {
  if (!USERS.some(user => user.id === id)) return state;
  return { ...state, recent: [id, ...state.recent.filter(item => item !== id)].slice(0, 12) };
}
export function favoriteNeighbor(state, id) {
  if (!USERS.some(user => user.id === id)) return state;
  return { ...state, favorites: state.favorites.includes(id) ? state.favorites.filter(item => item !== id) : [...state.favorites, id] };
}
export const isSampleNote = entry => entry.source === 'sample' || /-(hello|room)$/.test(entry.id);
