// 서버 미션 API (backend/FRONTEND_GUIDE.md). 게임 API는 아직 토큰 확인이 없어 서버 사용자 id만 쓴다.
// 로그인으로 받은 backendUserId, 없으면 개발 환경에서만 VITE_DEV_USER_ID(예: 시연 데이터의 demo-mochi).
import { useAuthActions } from '../../../shared/auth/AuthContext.js';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const serverConfigured = !!BASE;
export const devUserId = import.meta.env.DEV ? import.meta.env.VITE_DEV_USER_ID || null : null;

// 서버 미션을 쓸 사용자: 로그인으로 연결된 서버 사용자, 개발에서는 VITE_DEV_USER_ID. 서버 주소가 없으면 null (로컬 미션 그대로)
export function useServerUserId() {
  const auth = useAuthActions();
  return serverConfigured ? auth?.backendUserId || devUserId : null;
}

export async function call(path, { method = 'GET', body, form, token } = {}) {
  if (!BASE) throw new Error('서버 주소(VITE_API_URL)가 설정되지 않았어요.');
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
  } catch { throw new Error('서버에 연결하지 못했어요. 서버가 켜져 있는지 확인해 주세요.'); }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : '요청을 처리하지 못했어요. 다시 시도해 주세요.');
  return data;
}

// 사진 파일의 촬영 일시를 서버가 EXIF로 먼저 확인한다. EXIF가 없을 때 쓰도록 파일 수정 시각(카메라로 바로 찍으면 촬영 시각)을 함께 보낸다.
function localIso(ms) {
  const d = new Date(ms), pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export const todayMissions = userId => call(`/users/${encodeURIComponent(userId)}/missions/today`);

export function completeWithPhoto(userId, missionId, file) {
  const form = new FormData();
  form.append('file', file);
  if (file.lastModified) form.append('taken_at', localIso(file.lastModified));
  return call(`/users/${encodeURIComponent(userId)}/missions/${encodeURIComponent(missionId)}/photo`, { method: 'POST', form });
}

export const completeSteps = (userId, missionId) => call(`/users/${encodeURIComponent(userId)}/missions/${encodeURIComponent(missionId)}/complete`, { method: 'POST', body: {} });

export const rerollMission = (userId, missionId) => call(`/users/${encodeURIComponent(userId)}/missions/${encodeURIComponent(missionId)}/reroll`, { method: 'POST' });

export const sendFeedback = (userId, missionId, mood) => call(`/users/${encodeURIComponent(userId)}/missions/${encodeURIComponent(missionId)}/feedback`, { method: 'PUT', body: { mood } });
