import { useEffect, useRef, useState } from 'react';
import { attendanceWeek, seoulDateKey } from '../utils/seoulDate.js';
import { CLOTHES } from '../utils/clothes.js';
import { DECOR } from '../utils/decor.js';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const shortDate = (key) => `${Number(key.slice(5, 7))}월 ${Number(key.slice(8, 10))}일`;

const rewardLabel = reward => !reward ? '…' : reward.type === 'outfit' ? CLOTHES.find(item => item.id === reward.id)?.name ?? '의상' : reward.type === 'decor' ? DECOR.find(item => item.id === reward.id)?.name ?? '소품' : `${reward.amount} ${reward.type === 'coins' ? '코인' : 'XP'}`;
function RewardIcon({ reward }) {
  if (!reward) return <span aria-hidden="true">·</span>;
  const clothing = CLOTHES.find(item => item.id === reward.id);
  if (reward.type === 'decor') return <span aria-hidden="true" style={{ fontSize: 22 }}>{DECOR.find(item => item.id === reward.id)?.icon ?? '🎁'}</span>;
  return <svg width="26" height="26" viewBox="0 0 28 28" aria-hidden="true">
    {reward.type === 'coins' ? <><circle cx="14" cy="14" r="11" fill="#F5D36B" stroke="#C6A146" strokeWidth="2" /><circle cx="14" cy="14" r="7.5" fill="none" stroke="#FFEBA8" strokeWidth="1.5" /><path d="M14 8 L16 12 L20 13 L17 16 L18 20 L14 18 L10 20 L11 16 L8 13 L12 12Z" fill="#FFF5C6" /></> : reward.type === 'xp' ? <><path d="M14 2 L18 9 L26 11 L20 17 L21 25 L14 21 L7 25 L8 17 L2 11 L10 9Z" fill="#C6B2E9" stroke="#927AB8" strokeWidth="1.5" /><text x="14" y="17" textAnchor="middle" fontSize="8" fontWeight="600" fill="#FFFFFF">XP</text></> : <><path d="M9 4 L2 9 L5 15 L9 13 V25 H23 V13 L26 15 L28 9 L21 4 Q16 9 9 4Z" transform="translate(-2 0)" fill={clothing?.color ?? '#F7B8CC'} stroke={clothing?.trim ?? '#C46C89'} strokeWidth="1.5" /><circle cx="14" cy="17" r="3" fill="#FFFAEE" /></>}
  </svg>;
}

export default function Attendance({ records, plans, onPrepare, onClaim }) {
  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const [error,setError]=useState('');
  const lastPrompt = useRef(null);
  const dialog = useRef(null);
  const today = seoulDateKey(now);
  const week = attendanceWeek(today);
  const plan = plans[week[0]] ?? {};
  useEffect(() => { onPrepare(today); }, [today, onPrepare]);
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
          <div className={`attendance-stamp${records[key] ? ' is-checked' : ''}`} aria-label={`${shortDate(key)} ${rewardLabel(records[key] ?? plan[key])} ${records[key] ? '출석 완료' : key === today ? '오늘' : key < today ? '쉬어간 날' : '예정'}`}>
            <RewardIcon reward={records[key] ?? plan[key]} />
            {records[key] && <span className="attendance-check">✓</span>}
          </div>
          <small className="attendance-reward-label" title={rewardLabel(records[key] ?? plan[key])}>{(records[key] ?? plan[key])?.type === 'outfit' ? '의상' : (records[key] ?? plan[key])?.type === 'decor' ? '소품' : rewardLabel(records[key] ?? plan[key])}</small>
          <small>{Number(key.slice(5, 7))}/{Number(key.slice(8, 10))}</small>
        </div>)}
      </div>
      <p id="attendance-description" className="attendance-count">이번 주 <strong>{count}일</strong> 함께했어요. 언제든 반가워요.</p>
      {receipt && <div className="attendance-receipt" role="status">{receipt.type === 'outfit' ? '옷장에 추가 · ' : receipt.type === 'decor' ? '소품함에 추가 · ' : '+'}{rewardLabel(receipt)}{receipt.duplicateOutfit ? ' (보유 의상 대신)' : receipt.duplicateDecor ? ' (보유 소품 대신)' : ''}</div>}
      <button type="button" className="pb attendance-claim" disabled={!!receipt} onClick={() => {
        const current = new Date();
        setNow(current);
        const result=onClaim(seoulDateKey(current));
        setError(result?.ok===false?'출석을 저장하지 못했어요. 다시 시도해 주세요.':'');
        if (result?.ok && result.receipt) setOpen(false);
      }}>{receipt ? '출석 완료 ✓' : '출석하기'}</button>
      {error&&<p role="alert">{error}</p>}
      <button type="button" className="pb attendance-later" onClick={() => setOpen(false)}>닫기</button>
    </dialog>
  </>;
}
