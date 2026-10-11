// Room display follows the device timezone; reward dates continue to use seoulDateKey.
export function roomTime(date = new Date()) {
  const hours = date.getHours(), minutes = date.getMinutes(), seconds = date.getSeconds();
  return { month: date.getMonth() + 1, day: date.getDate(), weekday: ['일','월','화','수','목','금','토'][date.getDay()], night: hours < 6 || hours >= 18, hourAngle: (hours % 12) * 30 + minutes * .5 + seconds / 120, minuteAngle: minutes * 6 + seconds * .1, label: new Intl.DateTimeFormat('ko-KR', {month:'long',day:'numeric',weekday:'long',hour:'numeric',minute:'2-digit'}).format(date) };
}
