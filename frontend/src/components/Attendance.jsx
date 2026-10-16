import { useEffect, useRef, useState } from 'react';
import { attendanceWeek, seoulDateKey } from '../../../shared/utils/seoulDate.js';
import { CLOTHES } from '../../../shared/data/clothes.js';
import { DECOR } from '../../../shared/data/decor.js';

const shortDate = (key) => `${Number(key.slice(5, 7))}월 ${Number(key.slice(8, 10))}일`;
// 날짜의 요일 (연속 출석표는 1일차가 월요일이 아닐 수 있어서 날짜로 계산)
const weekday = (key) => '일월화수목금토'[new Date(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10))).getUTCDay()];

const rewardLabel = reward => !reward ? '…' : reward.type === 'outfit' ? CLOTHES.find(item => item.id === reward.id)?.name ?? '의상' : reward.type === 'decor' ? DECOR.find(item => item.id === reward.id)?.name ?? '소품' : `${reward.amount} ${reward.type === 'coins' ? '코인' : 'XP'}`;
function RewardIcon({ reward }) {
  if (!reward) return <span aria-hidden="true">·</span>;
  const clothing = CLOTHES.find(item => item.id === reward.id);
  if (reward.type === 'decor') return <span aria-hidden="true" style={{ fontSize: 22 }}>{DECOR.find(item => item.id === reward.id)?.icon ?? '🎁'}</span>;
  return <svg width="26" height="26" viewBox="0 0 28 28" aria-hidden="true">
    {reward.type === 'coins' ? <><circle cx="14" cy="14" r="11" fill="#F5D36B" stroke="#C6A146" strokeWidth="2" /><circle cx="14" cy="14" r="7.5" fill="none" stroke="#FFEBA8" strokeWidth="1.5" /><path d="M14 8 L16 12 L20 13 L17 16 L18 20 L14 18 L10 20 L11 16 L8 13 L12 12Z" fill="#FFF5C6" /></> : reward.type === 'xp' ? <><path d="M14 2 L18 9 L26 11 L20 17 L21 25 L14 21 L7 25 L8 17 L2 11 L10 9Z" fill="#C6B2E9" stroke="#927AB8" strokeWidth="1.5" /><text x="14" y="17" textAnchor="middle" fontSize="8" fontWeight="600" fill="#FFFFFF">XP</text></> : <><path d="M9 4 L2 9 L5 15 L9 13 V25 H23 V13 L26 15 L28 9 L21 4 Q16 9 9 4Z" transform="translate(-2 0)" fill={clothing?.color ?? '#F7B8CC'} stroke={clothing?.trim ?? '#C46C89'} strokeWidth="1.5" /><circle cx="14" cy="17" r="3" fill="#FFFAEE" /></>}
  </svg>;
}

// cycle: 서버 연속 출석표 (10/16, 1~7일차 사다리 · 하루라도 빠지면 1일차부터). 없으면 휴대폰 기록의 월~일 주간 출석표
export default function Attendance({ records, plans, onPrepare, onClaim, cycle }) {
  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const [error,setError]=useState('');
  const lastPrompt = useRef(null);
  const dialog = useRef(null);
  const today = seoulDateKey(now);
  const week = cycle ? cycle.days.map(d => d.date) : attendanceWeek(today);
  const plan = cycle ? Object.fromEntries(cycle.days.map(d => [d.date, d.reward])) : plans[week[0]] ?? {};
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
    <button type="button" className="pb ui-secondary attendance-entry attendance-open" onClick={() => { setNow(new Date()); setOpen(true); }}>출석표 <span>{count}/7</span></button>
    <dialog ref={dialog} className="attendance-dialog" aria-labelledby="attendance-title" aria-describedby="attendance-description" onCancel={() => setOpen(false)} onClose={() => setOpen(false)}>
      <button type="button" className="pb attendance-close" aria-label="출석표 닫기" onClick={() => setOpen(false)}>×</button>
      {/* 모바일 게임 출석부처럼: 위에 선물 배너, 날짜마다 'n일차' 카드. 받은 날 = '출석' 도장, 오늘 = 빛나는 테두리 + 꼬리표, 일요일 = 큰 카드 */}
      <div className="attendance-head">
        <span className="attendance-head-gift" aria-hidden="true">🎁</span>
        <div><h2 id="attendance-title">출석 체크</h2><small>{shortDate(week[0])} — {shortDate(week[6])}</small></div>
      </div>
      <div className="attendance-progress-row" aria-hidden="true"><div className="attendance-progress"><span style={{ width: `${count / 7 * 100}%` }} /></div><b>{count}/7</b></div>
      <ol className="attendance-cards" aria-label="이번 주 출석표">
        {week.map((key, index) => {
          const reward = records[key] ?? plan[key], state = records[key] ? 'done' : key === today ? 'today' : key < today ? 'missed' : 'later';
          const label = reward?.type === 'outfit' ? '의상' : reward?.type === 'decor' ? '소품' : rewardLabel(reward);
          return <li key={key} className={`attendance-card is-${state}`} aria-label={`${index + 1}일차 ${weekday(key)}요일 ${shortDate(key)}, ${rewardLabel(reward)}, ${{ done: '출석 완료', today: '오늘', missed: '쉬어간 날', later: '예정' }[state]}`}>
            {state === 'today' ? <span className="attendance-card-tag" aria-hidden="true">오늘</span> : cycle && index === 6 && state === 'later' && <span className="attendance-card-tag is-special" aria-hidden="true">특별 선물</span>}
            <span className="attendance-card-day">{index + 1}일차 <em>{weekday(key)}</em></span>
            <span className="attendance-card-icon"><RewardIcon reward={reward} /></span>
            <span className="attendance-card-reward" title={rewardLabel(reward)}>{label}</span>
            {state === 'done' && <span className="attendance-card-stamp" aria-hidden="true"><span>출석</span></span>}
            {state === 'missed' && <span className="attendance-card-note" aria-hidden="true">쉬어감</span>}
          </li>;
        })}
      </ol>
      <p id="attendance-description" className="attendance-count">{cycle
        ? cycle.reset && !cycle.claimed_today ? <>연속 출석이 끊겨 <strong>1일차</strong>부터 다시 시작해요. 괜찮아요!</>
          : <>연속 <strong>{Math.max(cycle.streak, cycle.claimed_today ? 1 : 0)}일째</strong> 출석 중이에요. 하루라도 빠지면 1일차부터 다시 시작해요.</>
        : <>이번 주 <strong>{count}일</strong> 함께했어요. 언제든 반가워요.</>}</p>
      {!receipt && plan[today] && <div className="attendance-today-gift"><span>오늘 받을 선물</span><RewardIcon reward={plan[today]} /><strong>{rewardLabel(plan[today])}</strong></div>}
      {receipt && <div className="attendance-receipt" role="status">{receipt.type === 'outfit' ? '옷장에 추가 · ' : receipt.type === 'decor' ? '소품함에 추가 · ' : '+'}{rewardLabel(receipt)}{receipt.duplicateOutfit ? ' (보유 의상 대신)' : receipt.duplicateDecor ? ' (보유 소품 대신)' : ''}</div>}
      <button type="button" className="pb ui-primary attendance-claim" disabled={!!receipt} onClick={() => {
        const current = new Date();
        setNow(current);
        Promise.resolve(onClaim(seoulDateKey(current))).then(result => {   // 서버 출석이면 응답을 기다린다
          setError(result?.ok===false?(result.message||'출석을 저장하지 못했어요. 다시 시도해 주세요.'):'');
          if (result?.ok && result.receipt) setOpen(false);
        });
      }}>{receipt ? '오늘 출석 완료 ✓' : '🎁 출석하고 선물 받기'}</button>
      {error&&<p role="alert">{error}</p>}
      <button type="button" className="pb ui-secondary attendance-later" onClick={() => setOpen(false)}>닫기</button>
    </dialog>
  </>;
}
