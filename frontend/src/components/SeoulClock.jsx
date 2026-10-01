import { useEffect, useState } from 'react';

const timeFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});
const dateFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
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
    <div className="seoul-clock" role="timer" aria-live="off" aria-label="대한민국 서울 현재 시간">
      <div className="seoul-clock-location"><span aria-hidden="true">◷</span> 대한민국 · 서울 <span className="seoul-clock-zone">KST</span></div>
      <time dateTime={now.toISOString()}>
        <span className="seoul-clock-time">{timeFormat.format(now)}</span>
        <span className="seoul-clock-date">{dateFormat.format(now)}</span>
      </time>
    </div>
  );
}
