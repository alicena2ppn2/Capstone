import { useEffect, useState } from 'react';

// Desktop device decoration, not live network or battery telemetry.
export default function IPhoneChrome() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const time = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: 'numeric', minute: '2-digit', hour12: false }).format(now);
  return <div className="iphone-chrome" aria-hidden="true">
    <span className="iphone-time">{time}</span>
    <span className="iphone-island"><span /></span>
    <svg className="iphone-indicators" width="66" height="16" viewBox="0 0 66 16">
      <g fill="currentColor"><rect x="0" y="10" width="3" height="4" rx="1" /><rect x="5" y="7" width="3" height="7" rx="1" /><rect x="10" y="4" width="3" height="10" rx="1" /><rect x="15" y="1" width="3" height="13" rx="1" /></g>
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M23 5 Q29 -1 35 5 M25 8 Q29 4 33 8 M28 11 L30 11" /><rect x="41" y="2" width="21" height="12" rx="3" /></g>
      <rect x="44" y="5" width="15" height="6" rx="1" fill="currentColor" /><path d="M64 6 V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  </div>;
}
