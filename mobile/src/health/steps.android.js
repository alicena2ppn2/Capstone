// 걸음 수 — Android: Health Connect의 하루 걸음 합계(삼성 헬스·Google Fit 등이 넣은 값). 읽기만 한다.
// 개발 빌드(EAS)에서만 동작. 권한(READ_STEPS)과 설명 화면 연결은 app.json의 react-native-health-connect 플러그인.
import { aggregateRecord, getGrantedPermissions, getSdkStatus, initialize, requestPermission, SdkAvailabilityStatus } from 'react-native-health-connect';

export const stepsSource = 'Health Connect';
let ready = null;
const init = () => (ready ??= initialize().catch(() => false));

export async function stepsAvailable() {
  try { return (await getSdkStatus()) === SdkAvailabilityStatus.SDK_AVAILABLE && await init(); } catch { return false; }
}

const hasSteps = list => list.some(p => p.recordType === 'Steps' && p.accessType === 'read');

// 허락하면 true. 이미 허락했으면 창 없이 true
export async function requestStepsPermission() {
  if (!await init()) return false;
  if (hasSteps(await getGrantedPermissions())) return true;
  return hasSteps(await requestPermission([{ accessType: 'read', recordType: 'Steps' }]));
}

export async function stepsBetween(start, end) {
  await init();
  const result = await aggregateRecord({ recordType: 'Steps', timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() } });
  return Math.round(result?.COUNT_TOTAL ?? 0);
}
