// 이웃·방명록 서버 API (backend/FRONTEND_GUIDE.md "이웃 방문 · 방명록")
import { call } from './missions.js';

const u = id => encodeURIComponent(id);

export const recommendedRooms = me => call(`/users/${u(me)}/rooms/recommended`);
export const roomOf = owner => call(`/users/${u(owner)}/room`);
// 놀러 가기: 방문 기록 + 내 '친구 방 놀러 가기' 미션 자동 완료
export const visitRoom = (owner, me) => call(`/users/${u(owner)}/visits`, { method: 'POST', body: { visitor_id: me } });
export const todayVisitors = owner => call(`/users/${u(owner)}/visits`);
export const guestbook = (owner, me) => call(`/users/${u(owner)}/guestbook?per_page=30&viewer_id=${u(me)}`);
// 다른 사람 방에 쓰면 내 '방명록 남기기' 미션 자동 완료. 서버가 욕설·혐오 표현을 막는다 (60자까지)
export const writeGuestbook = (owner, me, text) => call(`/users/${u(owner)}/guestbook`, { method: 'POST', body: { text, author_id: me } });
export const likeEntry = (owner, entryId, me, liked) => liked
  ? call(`/users/${u(owner)}/guestbook/${entryId}/like?by=${u(me)}`, { method: 'DELETE' })
  : call(`/users/${u(owner)}/guestbook/${entryId}/like`, { method: 'POST', body: { user_id: me } });
export const deleteEntry = (owner, entryId, me) => call(`/users/${u(owner)}/guestbook/${entryId}?by=${u(me)}`, { method: 'DELETE' });
// 친밀도: 서로 한 방문·방명록·좋아요로 쌓인 관계 레벨 (친구가 아니어도)
export const friendshipWith = (me, other) => call(`/users/${u(me)}/friendship/${u(other)}`);
export const reportEntry = (me, entryId, reason) => call('/reports', { method: 'POST', body: { reporter_id: me, target_type: 'guestbook', target_id: String(entryId), reason } });
