const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function seoulDateKey(now = new Date()) {
  const parts = Object.fromEntries(dayFormatter.formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// 서울 달력 날짜를 UTC 자정 값으로 변환해 기기 시간대/DST와 무관하게 날짜를 계산한다.
export function attendanceWeek(dayKey) {
  const date = new Date(`${dayKey}T00:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(date);
    day.setUTCDate(day.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}
