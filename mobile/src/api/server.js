// 앱 ↔ 서버 게임 API (웹 frontend/src/api/*.js와 같은 계약, backend/FRONTEND_GUIDE.md).
// 서버 사용자: 로그인으로 받은 backendUserId, 없으면 개발 빌드에서만 EXPO_PUBLIC_DEV_USER_ID (예: 시연 데이터의 demo-mochi).
// 서버 주소(EXPO_PUBLIC_API_URL)가 없으면 null → 앱은 지금처럼 휴대폰 안 기록으로 동작.
import { Platform } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthActions } from '../../../shared/auth/AuthContext.js';

const BASE = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
export const serverConfigured = !!BASE;
export const devUserId = __DEV__ ? process.env.EXPO_PUBLIC_DEV_USER_ID || null : null;

export function useServerUserId() {
  const auth = useAuthActions();
  return serverConfigured ? auth?.backendUserId || devUserId : null;
}

// 로그인 토큰을 주는 함수 (useMobileAuthEntry가 로그인 컨트롤러를 만들 때 한 번 등록). 서버는 토큰 주인 = 주소의 {id}일 때만 허용
let tokenSource = null;
export function setTokenSource(source) { tokenSource = source; }

export async function call(path, { method = 'GET', body, form } = {}) {
  if (!BASE) throw new Error('서버 주소(EXPO_PUBLIC_API_URL)가 설정되지 않았어요.');
  const token = await tokenSource?.().catch(() => null);
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
  } catch { throw new Error('서버에 연결하지 못했어요. 와이파이와 서버가 켜져 있는지 확인해 주세요.'); }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : '요청을 처리하지 못했어요. 다시 시도해 주세요.');
  return data;
}

const u = id => encodeURIComponent(id);
const pad = n => String(n).padStart(2, '0');
const localIso = ms => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };

// ImagePicker 결과(asset) → 업로드 폼. 서버는 파일 EXIF 촬영 일시를 먼저 보고, 없으면 taken_at을 쓴다.
// iOS는 고른 사진 파일에 EXIF가 빠질 수 있어 exif:true로 받은 DateTimeOriginal을 같이 보낸다.
// 카메라로 막 찍은 사진에 촬영 일시가 없으면(일부 Android) 앱이 찍은 시각(capturedAt)을 보낸다.
export async function photoForm(asset) {
  const form = new FormData();
  const name = asset.fileName || 'photo.jpg', type = asset.mimeType || 'image/jpeg';
  if (Platform.OS === 'web') {
    const file = asset.file ?? await (await fetch(asset.uri)).blob();
    form.append('file', file, name);
  } else {
    form.append('file', { uri: asset.uri, name, type });
  }
  const taken = asset.exif?.DateTimeOriginal || asset.exif?.DateTimeDigitized || asset.exif?.DateTime || (asset.capturedAt ? localIso(asset.capturedAt.getTime()) : null) || (asset.file?.lastModified ? localIso(asset.file.lastModified) : null);
  if (taken) form.append('taken_at', String(taken));
  return form;
}

// 미션
export const todayMissions = me => call(`/users/${u(me)}/missions/today`);
export const completeWithPhoto = async (me, missionId, asset) => call(`/users/${u(me)}/missions/${u(missionId)}/photo`, { method: 'POST', form: await photoForm(asset) });
export const completeSteps = (me, missionId) => call(`/users/${u(me)}/missions/${u(missionId)}/complete`, { method: 'POST', body: {} });
export const rerollMission = (me, missionId) => call(`/users/${u(me)}/missions/${u(missionId)}/reroll`, { method: 'POST' });
export const sendFeedback = (me, missionId, mood) => call(`/users/${u(me)}/missions/${u(missionId)}/feedback`, { method: 'PUT', body: { mood } });
export const weeklyQuests = me => call(`/users/${u(me)}/weekly`);
export async function completeWeekly(me, questId, asset) {
  const photo = await call(`/users/${u(me)}/photos`, { method: 'POST', form: await photoForm(asset) });
  return call(`/users/${u(me)}/weekly/${u(questId)}/complete`, { method: 'POST', body: { photos: [photo.photo_id] } });
}

// 지갑·상점·출석·방
export const homeOf = me => call(`/users/${u(me)}/home`);
export const shopOf = me => call(`/users/${u(me)}/shop`);
export const buyItem = (me, type, itemId) => call(`/users/${u(me)}/shop/buy`, { method: 'POST', body: { type, item_id: itemId } });
export const equip = (me, change) => call(`/users/${u(me)}/equipped`, { method: 'PUT', body: change });
export const placeDecor = (me, slot, itemId) => call(`/users/${u(me)}/decor`, { method: 'PUT', body: { slot, item_id: itemId } });
export const moveDecor = (me, slot, { dx, dy }) => call(`/users/${u(me)}/decor/${slot}/position`, { method: 'PUT', body: { dx, dy } });
export const attendanceWeek = me => call(`/users/${u(me)}/attendance/week`);
export const checkIn = me => call(`/users/${u(me)}/attendance`, { method: 'POST' });
export const saveDiary = (me, date, text) => call(`/users/${u(me)}/diary/${date}`, { method: 'PUT', body: { text } });
export const removeDiary = (me, date) => call(`/users/${u(me)}/diary/${date}`, { method: 'DELETE' });

// 이웃·방명록
// refresh: 새로고침 횟수 (0 = 레벨 가까운 순, 1부터 비슷한 레벨 후보 중 다른 조합)
export const recommendedRooms = (me, refresh = 0) => call(`/users/${u(me)}/rooms/recommended?refresh=${refresh}`);
export const roomOf = owner => call(`/users/${u(owner)}/room`);
export const visitRoom = (owner, me) => call(`/users/${u(owner)}/visits`, { method: 'POST', body: { visitor_id: me } });
export const todayVisitors = owner => call(`/users/${u(owner)}/visits`);
export const guestbook = (owner, me) => call(`/users/${u(owner)}/guestbook?per_page=30&viewer_id=${u(me)}`);
export const writeGuestbook = (owner, me, text) => call(`/users/${u(owner)}/guestbook`, { method: 'POST', body: { text, author_id: me } });
export const likeEntry = (owner, entryId, me, liked) => liked
  ? call(`/users/${u(owner)}/guestbook/${entryId}/like?by=${u(me)}`, { method: 'DELETE' })
  : call(`/users/${u(owner)}/guestbook/${entryId}/like`, { method: 'POST', body: { user_id: me } });
export const deleteEntry = (owner, entryId, me) => call(`/users/${u(owner)}/guestbook/${entryId}?by=${u(me)}`, { method: 'DELETE' });
export const reportEntry = (me, entryId, reason) => call('/reports', { method: 'POST', body: { reporter_id: me, target_type: 'guestbook', target_id: String(entryId), reason } });
export const friendshipWith = (me, other) => call(`/users/${u(me)}/friendship/${u(other)}`);
// 친구 (10/16): 친구 코드(6자리)로 찾고 신청 → 상대가 수락
export const friendsOf = me => call(`/users/${u(me)}/friends`);
export const searchFriend = (me, code) => call(`/users/${u(me)}/friends/search?code=${encodeURIComponent(code)}`);
export const requestFriend = (me, code) => call(`/users/${u(me)}/friends`, { method: 'POST', body: { code } });
export const acceptFriend = (me, other) => call(`/users/${u(me)}/friends/${u(other)}/accept`, { method: 'POST' });
export const removeFriend = (me, other) => call(`/users/${u(me)}/friends/${u(other)}`, { method: 'DELETE' });

// 동네 탐험 (backend/app/places.py): 장소 목록(내 위치를 보내면 거리), 장소 쪽지
export const placesNear = coords => call(`/places${coords ? `?lat=${coords.latitude}&lng=${coords.longitude}` : ''}`);
export const placeNotes = (placeId, me) => call(`/places/${u(placeId)}/notes${me ? `?viewer_id=${u(me)}` : ''}`);
export const writePlaceNote = (placeId, me, note) => call(`/places/${u(placeId)}/notes`, { method: 'POST', body: { ...note, author_id: me } });
export const deletePlaceNote = (placeId, noteId, me) => call(`/places/${u(placeId)}/notes/${noteId}?by=${u(me)}`, { method: 'DELETE' });
export const reportPlaceNote = (me, noteId, reason) => call('/reports', { method: 'POST', body: { reporter_id: me, target_type: 'place_note', target_id: String(noteId), reason } });

// 프로필
export const profileOf = me => call(`/users/${u(me)}`);
export const saveProfile = (me, change) => call(`/users/${u(me)}`, { method: 'PATCH', body: change });
export const surveyOf = me => call(`/users/${u(me)}/survey`);
export const saveSurvey = (me, answers) => call(`/users/${u(me)}/survey`, { method: 'PUT', body: { answers } });
export const surveyQuestions = () => call('/survey/questions');

// 서버 상점 응답 → 앱 화면이 쓰는 모양
export function shopAsGame(shop) {
  const owned = list => list.filter(item => item.status === 'owned').map(item => item.id);
  return {
    coins: shop.coins,
    xp: (shop.level.level - 1) * 100,   // 앱 화면의 레벨 계산(1 + XP÷100)이 서버 레벨과 같게 맞춘 숫자
    characters: owned(shop.characters),
    character: shop.equipped.character ?? 'potato',
    ownedDecor: owned(shop.decor),
    decor: shop.placed ?? {},
    ownedClothes: owned(shop.outfits),
    outfit: shop.equipped.outfit ?? null,
  };
}

// 앱 전체가 같이 쓰는 서버 상태 (홈·상점·출석). 행동 뒤에 refresh()
export function useServerGame(userId) {
  const [state, setState] = useState(null), [error, setError] = useState('');
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const refresh = useCallback(async () => {
    if (!userId) return null;
    try {
      const [home, shop, week] = await Promise.all([homeOf(userId), shopOf(userId), attendanceWeek(userId)]);
      const next = { home, shop, week };
      if (live.current) { setState(next); setError(''); }
      return next;
    } catch (e) { if (live.current) setError(e.message); return null; }
  }, [userId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh(); }, [refresh]);
  return { state, error, refresh };
}
