// 걸음 수 — iPhone: Apple 건강(HealthKit)의 하루 걸음 합계. 읽기만 하고 쓰지 않는다.
// 개발 빌드(EAS)에서만 동작 (Expo Go 불가). 권한 문구는 app.json의 healthkit 플러그인.
import { isHealthDataAvailable, queryStatisticsForQuantity, requestAuthorization } from '@kingstinct/react-native-healthkit';

const STEPS = 'HKQuantityTypeIdentifierStepCount';
export const stepsSource = 'Apple 건강';

export async function stepsAvailable() {
  try { return await isHealthDataAvailable(); } catch { return false; }
}

// HealthKit은 읽기 권한을 허락했는지 앱에 알려 주지 않는다 (거절하면 0걸음으로 보임). 창을 띄웠으면 true
export async function requestStepsPermission() {
  return requestAuthorization({ toRead: [STEPS] });
}

// start ≤ 시간 < end 사이 걸음 합계
export async function stepsBetween(start, end) {
  const result = await queryStatisticsForQuantity(STEPS, ['cumulativeSum'], { filter: { date: { startDate: start, endDate: end } }, unit: 'count' });
  return Math.round(result?.sumQuantity?.quantity ?? 0);
}
