// 며칠 안 들어온 사람 다시 부르기 — 휴대폰 안에서 예약하는 알림 (서버 필요 없음).
// 앱을 열 때마다 예전 예약을 지우고 2·4·7일 뒤 저녁 7시로 다시 잡는다 → 계속 들어오는 사람에게는 오지 않는다.
// 설정의 '다시 부르기 알림'이 꺼져 있거나 알림 권한이 없으면 아무것도 예약하지 않는다. 웹 미리보기는 지원 안 함.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { comebackMessages } from './messages.mjs';

export { comebackMessages };

const KIND = 'comeback';
const HOUR = 19;
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

if (supported) Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });

// ask=true면 아직 묻지 않은 경우 권한 창을 띄운다
export async function notificationsAllowed(ask = false) {
  if (!supported) return false;
  const now = await Notifications.getPermissionsAsync();
  if (now.granted || !ask || !now.canAskAgain) return now.granted;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function cancelComeback() {
  if (!supported) return;
  const list = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(list.filter(n => n.content?.data?.kind === KIND).map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

export async function scheduleComeback(name, from = new Date()) {
  if (!supported || !await notificationsAllowed(false)) return false;
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(KIND, { name: '다시 부르기 알림', importance: Notifications.AndroidImportance.DEFAULT });
  await cancelComeback();
  for (const m of comebackMessages(name || '모찌')) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + m.days, HOUR, 0, 0);
    await Notifications.scheduleNotificationAsync({
      content: { title: m.title, body: m.body, data: { kind: KIND, days: m.days } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, ...(Platform.OS === 'android' ? { channelId: KIND } : {}) },
    });
  }
  return true;
}
