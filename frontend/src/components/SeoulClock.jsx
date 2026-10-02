import { useEffect, useState } from 'react';

const timeFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', hour: 'numeric', minute: '2-digit', hour12: true,
});
const dateFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', month: 'long', day: 'numeric',
});

export default function SeoulClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 1000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  return (
    <div className="seoul-clock" role="timer" aria-live="off" aria-label="대한민국 서울 현재 시간과 날짜">
      <time dateTime={now.toISOString()}>{timeFormat.format(now)} · {dateFormat.format(now)}</time>
    </div>
  );
}
