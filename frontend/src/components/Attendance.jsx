import { useEffect, useRef, useState } from 'react';
import { attendanceWeek, seoulDateKey } from '../utils/seoulDate.js';
import { randomAttendanceReward } from '../utils/game.js';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const shortDate = (key) => `${Number(key.slice(5, 7))}월 ${Number(key.slice(8, 10))}일`;

export default function Attendance({ records, onClaim }) {
  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const lastPrompt = useRef(null);
  const dialog = useRef(null);
  const today = seoulDateKey(now);
  const week = attendanceWeek(today);
  const receipt = records[today];
  const count = week.filter((key) => records[key]).length;

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 1000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);

  useEffect(() => {
    if (lastPrompt.current !== today) {
      lastPrompt.current = today;
      if (!receipt) setOpen(true);
    }
  }, [today, receipt]);

  useEffect(() => {
    const element = dialog.current;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return <>
    <button type="button" className="pb attendance-open" onClick={() => { setNow(new Date()); setOpen(true); }}>출석표 <span>{count}/7</span></button>
    <dialog ref={dialog} className="attendance-dialog" aria-labelledby="attendance-title" aria-describedby="attendance-description" onCancel={() => setOpen(false)} onClose={() => setOpen(false)}>
      <button type="button" className="pb attendance-close" aria-label="출석표 닫기" onClick={() => setOpen(false)}>×</button>
      <h2 id="attendance-title">이번주의 출석표</h2>
      <div className="attendance-week-label">{shortDate(week[0])} — {shortDate(week[6])}</div>
      <div className="attendance-stamps" aria-label="이번 주 출석표">
        {week.map((key, index) => <div key={key} className={`attendance-day${key === today ? ' is-today' : ''}`}>
          <span>{DAYS[index]}</span>
          <div className={`attendance-stamp${records[key] ? ' is-checked' : ''}`} aria-label={`${shortDate(key)} ${records[key] ? '출석 완료' : key === today ? '오늘' : key < today ? '쉬어간 날' : '예정'}`}>
            {records[key] ? '✓' : '·'}
          </div>
          <small>{Number(key.slice(5, 7))}/{Number(key.slice(8, 10))}</small>
        </div>)}
      </div>
      <p id="attendance-description" className="attendance-count">이번 주 <strong>{count}일</strong> 함께했어요. 언제든 반가워요.</p>
      {receipt && <div className="attendance-receipt" role="status">+{receipt.amount} {receipt.type === 'coins' ? '코인' : 'XP'}</div>}
      <button type="button" className="pb attendance-claim" disabled={!!receipt} onClick={() => {
        const current = new Date();
        setNow(current);
        onClaim(seoulDateKey(current), randomAttendanceReward());
      }}>{receipt ? '출석 완료 ✓' : '출석하기'}</button>
      <button type="button" className="pb attendance-later" onClick={() => setOpen(false)}>닫기</button>
    </dialog>
  </>;
}
