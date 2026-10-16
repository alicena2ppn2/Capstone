// 건강 앱 걸음 수 → 서버. 오늘과 지난 7일을 하루씩 올린다
// (서버가 '어제보다 더 걷기'·'지난주보다 더 걷기' 목표를 이 값으로 정하고 확인한다).
// 사용자가 '건강 앱 연결'을 한 번 누르면 기억해 두고, 다음부터는 화면을 열 때 조용히 올린다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { stepsAvailable, stepsBetween, requestStepsPermission, stepsSource } from './steps';
import { call } from '../api/server';

const KEY = 'mochi.steps.connected.v1';
const DAYS = 8;
const pad = n => String(n).padStart(2, '0');
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export { stepsSource };
export async function stepsConnected() {
  try { return await AsyncStorage.getItem(KEY) === '1'; } catch { return false; }
}

// 오늘부터 거꾸로 DAYS일: [{ date, steps }]
export async function readRecentSteps(now = new Date()) {
  const days = [];
  for (let i = 0; i < DAYS; i++) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const end = i === 0 ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
    days.push({ date: dayKey(start), steps: await stepsBetween(start, end) });
  }
  return days;
}

export async function uploadSteps(userId, days) {
  for (const { date, steps } of days) await call(`/users/${encodeURIComponent(userId)}/steps`, { method: 'POST', body: { date, steps } });
}

// '건강 앱 연결' 버튼: 권한을 묻고, 허락하면 바로 올린다. 반환 { ok, today?, message? }
export async function connectSteps(userId) {
  if (!await stepsAvailable()) return { ok: false, message: '이 기기에서는 건강 앱 걸음 수를 쓸 수 없어요.' };
  if (!await requestStepsPermission()) return { ok: false, message: '걸음 수 읽기를 허용해야 걸음 미션을 확인할 수 있어요.' };
  try { await AsyncStorage.setItem(KEY, '1'); } catch { /* 다음에 다시 묻는다 */ }
  return syncSteps(userId);
}

// 연결한 뒤에는 화면을 열 때·'걸음 확인' 전에 부른다
export async function syncSteps(userId) {
  try {
    const days = await readRecentSteps();
    await uploadSteps(userId, days);
    return { ok: true, today: days[0].steps };
  } catch (e) { return { ok: false, message: e?.message || '걸음 수를 가져오지 못했어요.' }; }
}
