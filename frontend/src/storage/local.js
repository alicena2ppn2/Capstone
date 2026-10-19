// 브라우저 기록(localStorage)을 로그인한 계정마다 따로 (10/19). 앱의 휴대폰 기록과 같은 규칙 — shared/storage/accountKeys.js
// 로그인하지 않은 미리보기는 기본 이름 그대로. 예전 기록은 처음 로그인한 계정 하나에게만 옮겨 준다.
import { claimLegacy, scopedKey } from '../../../shared/storage/accountKeys.js';
import { MODERATION_KEY } from '../../../shared/features/guestModeration.js';

export const LOCAL_KEYS = ['mochi.game.v1', 'mochi.wardrobe.v1', 'mochi.visitConnections.v1', 'mochi.visitors.v1', 'mochi.visitNotes.v1', 'mochi.visitLikes.v1', 'mochi.homeGuestbook.v1', 'mochi.homeGuestLikes.v1', 'mochi.petName', 'mochi.settings.v1', MODERATION_KEY];

let account = null;
// 게임 화면을 그리기 전에 한 번 (App이 계정이 바뀔 때마다 화면을 새로 그린다)
export function useAccountStorage(id) {
  if (account !== id) { account = id ?? null; try { claimLegacy(localStorage, account, LOCAL_KEYS); } catch { /* 저장소를 못 쓰면 옮길 것도 없음 */ } }
}
export const local = {
  getItem: key => localStorage.getItem(scopedKey(key, account)),
  setItem: (key, value) => localStorage.setItem(scopedKey(key, account), value),
  removeItem: key => localStorage.removeItem(scopedKey(key, account)),
};
export const accountKeys = id => LOCAL_KEYS.map(key => scopedKey(key, id));
