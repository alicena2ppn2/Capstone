import { newAttendanceReward } from '../../../shared/features/rewardFeedback.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS, loadStorage, saveStorage } from '../storage/storage';
import { claimLegacyAsync, scopedStorage } from '../../../shared/storage/accountKeys.js';
import { eventSnapshot, reactionEvent } from '../../../shared/features/wardrobeActions.js';
import { ensureAttendanceWeek, claimAttendance } from '../../../shared/features/game.js';
import { ensureDailyMissions, recordRoutine } from '../../../shared/features/dailyMissions.js';
import { dailyVisitors } from '../../../shared/features/visitors.js';
import { seoulDateKey } from '../../../shared/utils/seoulDate.js';

// One mounted owner for hydration, persistence, rollover and reaction events.
// accountId: 로그인한 계정(서버 사용자 id). 휴대폰 기록을 계정마다 따로 저장한다 (10/19). 없으면 기본 칸(미리보기)
export default function useGameState(accountId) {
  const [state, setState] = useState(null), [error, setError] = useState('');
  const [now, setNow] = useState(new Date()), [sheet, setSheet] = useState(null), [toast, setToast] = useState(''), [reaction, setReaction] = useState(null);
  const [attendanceAward,setAttendanceAward]=useState(null);
  useEffect(()=>{if(!attendanceAward)return;const timer=setTimeout(()=>setAttendanceAward(null),1000);return()=>clearTimeout(timer);},[attendanceAward]);
  const attendanceBusy=useRef(false);
  const reactionSerial = useRef(0), observed = useRef(null), saveQueue = useRef(Promise.resolve());
  const owner = useRef(accountId);   // 지금 화면 기록이 어느 계정 것인지 — 저장은 늘 그 계정 칸에만 (계정이 바뀌는 순간에도 섞이지 않게)
  const day = seoulDateKey(now);
  const ready = state !== null;
  const stateRef=useRef(state);
  useEffect(()=>{stateRef.current=state;},[state]);
  const commitState=transform=>{
    const job=saveQueue.current.catch(()=>{}).then(async()=>{
      try { const previous=stateRef.current; const next=transform(previous); await saveStorage(scopedStorage(AsyncStorage,owner.current),next); stateRef.current=next; setState(next); return {ok:true,changed:next!==previous}; }
      catch { return {ok:false,message:'저장하지 못했어요. 작성한 글은 유지돼요. 다시 시도해 주세요.'}; }
    }); saveQueue.current=job; return job;
  };
  const load = useCallback(async () => {
    setState(null);   // 계정이 바뀌면 다른 계정 기록을 잠깐도 보여 주거나 덮어쓰지 않게 비우고 다시 읽는다
    try { await claimLegacyAsync(AsyncStorage, accountId, KEYS); const loaded = await loadStorage(scopedStorage(AsyncStorage, accountId)); observed.current = eventSnapshot(loaded); owner.current = accountId; setState(loaded); setError(''); }
    catch { setError('저장 데이터를 읽지 못했어요. 기존 데이터는 덮어쓰지 않았습니다. 다시 시도해 주세요.'); }
  }, [accountId]);
  // load awaits AsyncStorage; this is asynchronous hydration, not a synchronous render cascade.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const refresh = () => setNow(new Date()); const timer = setInterval(refresh, 1000); const listener = AppState.addEventListener('change', status => { if (status === 'active') refresh(); }); return () => { clearInterval(timer); listener.remove(); }; }, []);
  // Calendar initialization/rollover is an intentional one-shot migration, not render-derived UI state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (ready) setState(old => ({ ...old, game: ensureAttendanceWeek(ensureDailyMissions(old.game, day,old.visitNotes), day), visitors: dailyVisitors(day, old.visitors) })); }, [ready, day]);
  useEffect(() => {
    if (!state) return;
    saveQueue.current = saveQueue.current.catch(() => {}).then(() => saveStorage(scopedStorage(AsyncStorage, owner.current), stateRef.current)).catch(() => setError('저장 공간에 기록하지 못했어요. 앱을 닫기 전에 저장 상태를 확인해 주세요.'));
    const event = reactionEvent(observed.current, state);
    // A receipt sequence is an event: queue it once even while Home is unmounted.
    if (event.characterChanged) setReaction(null);
    if (event.celebrate) setReaction(++reactionSerial.current);
    if (event.rewardChanged) { const receipt = state.game.questReward; setToast(receipt.xp || receipt.coins ? `+${receipt.xp} XP · +${receipt.coins} 코인` : '오늘의 기록을 남겼어요.'); }
    observed.current = event.current;
  }, [state]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 1500); return () => clearTimeout(timer); }, [toast]);
  const consumeReaction = useCallback(id => setReaction(value => value === id ? null : value), []);
  const lastAttendance = useRef(null);
  const attendance = state?.game.attendance;
  // Opening once for an external date transition is intentional; dismissing does not reopen it.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (ready && lastAttendance.current !== day) { lastAttendance.current = day; if (!attendance?.[day]) setSheet({ kind: 'attendance' }); } }, [ready, day, attendance]);
  // A replacement dialog cannot mutate yesterday's selection after the clock rolls over.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSheet(value => value?.kind === 'swap' ? null : value); }, [day]);
  const restore = loaded => {
    observed.current = eventSnapshot(loaded);
    setReaction(null);
    setState({ ...loaded, game: ensureAttendanceWeek(ensureDailyMissions(loaded.game, day,loaded.visitNotes), day), visitors: dailyVisitors(day, loaded.visitors) });
  };
  const claimDailyAttendance = async ownedClothes => { if(attendanceBusy.current)return;attendanceBusy.current=true;const date=seoulDateKey();let paid=null;try { const result=await commitState(old=>{if(date!==seoulDateKey())return old;const game=recordRoutine(claimAttendance({...ensureAttendanceWeek(old.game,date),attendanceClothes:ownedClothes},date),'day-attendance',date);paid=newAttendanceReward(old.game,game,date);return {...old,game};});if(!result.ok)setError(result.message);else if(paid){setSheet(null);setAttendanceAward(paid);setError('');}}finally{attendanceBusy.current=false;} };
  return { state, setState, error, setError, now, day, sheet, setSheet, toast, setToast, reaction, attendanceAward, restore, claimDailyAttendance, commitState, load, consumeReaction };
}
