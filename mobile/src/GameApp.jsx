import { colors } from '../../frontend/src/design/tokens.js';
import UiIcon from './UiIcon';
import { continueJournalDraft } from '../../frontend/src/utils/journal.js';
import RewardPanel from './RewardPanel';
import { newAttendanceReward } from '../../frontend/src/utils/rewardFeedback.js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { usePathname, useRouter } from 'expo-router';
import Character from './Character';
import MenuIcon from './MenuIcon';
import RoomBackdrop from './art/RoomBackdrop';
import { loadStorage, saveStorage } from './storage';
import { buyOutfit, wearOutfit, eventSnapshot, reactionEvent } from './actions';
import { Label, Button, Progress, Sheet, styles, FontReadyContext } from './ui';
import Diary from './screens/Diary';
import HomeSummary from './HomeSummary';
import Quests from './screens/Quests';
import Shop from './screens/Shop';
import Settings, { Backup } from './screens/Settings';
import Visit, { Guestbook } from './screens/Visit';
import { CHARACTERS, buyCharacter, levelFor, ensureAttendanceWeek, claimAttendance } from '../../frontend/src/utils/game.js';
import { CLOTHES } from '../../frontend/src/utils/clothes.js';
import { DECOR } from '../../frontend/src/utils/decor.js';
import { seoulDateKey, attendanceWeek } from '../../frontend/src/utils/seoulDate.js';
import { dailyVisitors } from '../../frontend/src/utils/visitors.js';
import { ensureDailyMissions, replaceDailyMission, recordRoutine, saveDiaryMission, deleteDiaryMission } from '../../frontend/src/utils/dailyMissions.js';

function rewardText(reward) {
  if (!reward) return '';
  return reward.type === 'coins' ? `🪙 ${reward.amount} 코인` : reward.type === 'xp' ? `⭐ ${reward.amount} XP` : reward.type === 'outfit' ? `👕 ${CLOTHES.find(item => item.id === reward.id)?.name}` : `🏡 ${DECOR.find(item => item.id === reward.id)?.name}`;
}
export default function App({ children }) { return <SafeAreaProvider><GameApp>{children}</GameApp></SafeAreaProvider>; }
function GameApp({ children }) {
  const router = useRouter(), pathname = usePathname();
  const scrollRef = useRef(null);
  const [questFocus, setQuestFocus] = useState(null);
  const [diaryDate,setDiaryDate]=useState(null);
  const screen = ['quest', 'shop', 'settings', 'visit', 'guest', 'diary'].includes(pathname.slice(1)) ? pathname.slice(1) : 'home';
  const [fontsLoaded, fontError] = useFonts({ 'A2z-400': require('../assets/fonts/A2z-400.ttf'), 'A2z-500': require('../assets/fonts/A2z-500.ttf'), 'A2z-600': require('../assets/fonts/A2z-600.ttf') });
  const [state, setState] = useState(null), [error, setError] = useState('');
  const [now, setNow] = useState(new Date()), [sheet, setSheet] = useState(null), [toast, setToast] = useState(''), [reaction, setReaction] = useState(null);
  const [attendanceAward,setAttendanceAward]=useState(null);
  useEffect(()=>{if(!attendanceAward)return;const timer=setTimeout(()=>setAttendanceAward(null),1000);return()=>clearTimeout(timer);},[attendanceAward]);
  const attendanceBusy=useRef(false);
  const reactionSerial = useRef(0), observed = useRef(null), saveQueue = useRef(Promise.resolve());
  const { width } = useWindowDimensions();
  const day = seoulDateKey(now);
  const ready = state !== null;
  const stateRef=useRef(state);
  useEffect(()=>{stateRef.current=state;},[state]);
  const commitState=transform=>{
    const job=saveQueue.current.catch(()=>{}).then(async()=>{
      try { const previous=stateRef.current; const next=transform(previous); await saveStorage(AsyncStorage,next); stateRef.current=next; setState(next); return {ok:true,changed:next!==previous}; }
      catch { return {ok:false,message:'저장하지 못했어요. 작성한 글은 유지돼요. 다시 시도해 주세요.'}; }
    }); saveQueue.current=job; return job;
  };
  const load = useCallback(async () => {
    try { const loaded = await loadStorage(AsyncStorage); observed.current = eventSnapshot(loaded); setState(loaded); setError(''); }
    catch { setError('저장 데이터를 읽지 못했어요. 기존 데이터는 덮어쓰지 않았습니다. 다시 시도해 주세요.'); }
  }, []);
  // load awaits AsyncStorage; this is asynchronous hydration, not a synchronous render cascade.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const refresh = () => setNow(new Date()); const timer = setInterval(refresh, 1000); const listener = AppState.addEventListener('change', status => { if (status === 'active') refresh(); }); return () => { clearInterval(timer); listener.remove(); }; }, []);
  // Calendar initialization/rollover is an intentional one-shot migration, not render-derived UI state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (ready) setState(old => ({ ...old, game: ensureAttendanceWeek(ensureDailyMissions(old.game, day,old.visitNotes), day), visitors: dailyVisitors(day, old.visitors) })); }, [ready, day]);
  useEffect(() => {
    if (!state) return;
    saveQueue.current = saveQueue.current.catch(() => {}).then(() => saveStorage(AsyncStorage, stateRef.current)).catch(() => setError('저장 공간에 기록하지 못했어요. 앱을 닫기 전에 저장 상태를 확인해 주세요.'));
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
  if (!state || !fontsLoaded && !fontError) return <SafeAreaView style={styles.safe}>{children}<Label style={{ padding: 24 }}>{error || '친구의 방을 준비하고 있어요…'}</Label>{!!error && <Button onPress={load}>다시 읽기</Button>}</SafeAreaView>;
  const { game, wardrobe } = state, level = levelFor(state.game.xp);
  const name = game.nicknames?.[game.character] || CHARACTERS.find(item => item.id === game.character)?.name;
  const ownedClothes = [...new Set([...wardrobe.owned, ...(game.attendanceClothes ?? [])])];
  const outfit = CLOTHES.find(item => item.id === wardrobe.outfit);
  const updateGame = transform => setState(old => ({ ...old, game: transform(old.game) }));
  const buyFriend = id => commitState(old => { const next = buyCharacter(old.game, id); return next === old.game ? old : { ...old, game: next }; });
  const buyClothes = item => setState(old => buyOutfit(old, item));
  const wear = id => setState(old => wearOutfit(old, id));
  const go = destination => { setSheet(null); router.replace(destination === 'home' ? '/' : `/${destination}`); };
  const openDiary=date=>{setDiaryDate(date??null);go('diary');};
  const saveDiary=(date,text,emotion)=>date!==seoulDateKey()||!text.trim()?Promise.resolve({ok:false,message:'당일의 공백 아닌 일기만 저장할 수 있어요.'}):commitState(old=>({...old,game:saveDiaryMission(old.game,date,text,new Date(),emotion)}));
  const deleteDiary=date=>commitState(old=>({...old,game:deleteDiaryMission(old.game,date)}));
  const continueDraft=async(source,target,draft,choice)=>{let moved;const result=await commitState(old=>{moved=continueJournalDraft(old.game,source,target,draft,choice);return moved.game===old.game?old:{...old,game:moved.game};});return {...moved,...result,ok:result.ok&&moved?.ok};};
  const saveDraft=(date,draft)=>commitState(old=>({...old,game:{...old.game,journalDrafts:{...old.game.journalDrafts,[date]:draft}}}));
  const restore = loaded => {
    observed.current = eventSnapshot(loaded);
    setReaction(null);
    setState({ ...loaded, game: ensureAttendanceWeek(ensureDailyMissions(loaded.game, day,loaded.visitNotes), day), visitors: dailyVisitors(day, loaded.visitors) });
  };
  const roomWidth = Math.min(width - 24, 430);
  return <FontReadyContext.Provider value={fontsLoaded}><SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>{children}<StatusBar style="dark" /><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.header}><Label style={styles.coin}>🪙 {game.coins.toLocaleString('ko-KR')}</Label><Button onPress={() => setSheet({ kind: 'attendance' })}>출석표</Button></View>
    {screen !== 'home' && <View style={[styles.level, { paddingHorizontal: 16, paddingBottom: 4 }]}><Label style={styles.small}>LV.{level}</Label><View style={{ width: 80 }}><Progress value={game.xp % 100} /></View><Label style={styles.small}>{game.xp % 100} / 100 XP</Label></View>}
    {error ? <Label accessibilityRole="alert" style={styles.error}>{error}</Label> : null}
    <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {screen === 'home' ? <>
        <View style={[styles.room, { width: roomWidth, height: roomWidth * 500 / 368 }]}><View style={StyleSheet.absoluteFill}><RoomBackdrop decor={game.decor ?? {}} homeScene /></View>
          <View style={styles.settingsCorner}><Button onPress={() => go('settings')} accessibilityLabel="설정" icon={<UiIcon kind="gear" />} /></View>
          <Label style={styles.clock}>{new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: 'numeric', minute: '2-digit', hour12: true }).format(now)} · {new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric' }).format(now)}</Label>
          <View style={styles.roomMenus}><Button textStyle={{ fontSize: 13 }} style={{ paddingHorizontal: 7 }} onPress={() => go('visit')} icon={<MenuIcon kind="visit" />}>방문하기</Button><Button textStyle={{ fontSize: 13 }} style={{ paddingHorizontal: 7 }} onPress={() => go('guest')} icon={<MenuIcon kind="guest" />}>방명록</Button><Button textStyle={{ fontSize: 13 }} style={{ paddingHorizontal: 7 }} onPress={() => openDiary()} icon={<MenuIcon kind="diary" />}>일기</Button></View>
          <View style={styles.friendPosition}><Character variant={game.character} outfit={outfit} size={Math.min(roomWidth * .66, 248)} label={name} interactive reactionId={reaction} onConsumed={consumeReaction} /></View>
          <View style={styles.identity}><Button textStyle={{ fontFamily: 'A2z-600' }} onPress={() => go('settings')} style={styles.nameButton}>{name}</Button><View style={styles.level}><Label style={styles.small}>LV.{level}</Label><View style={{ width: 60 }}><Progress value={game.xp % 100} /></View><Label style={styles.small}>{game.xp % 100} / 100 XP</Label></View></View>
        </View><View style={styles.row}><Button primary onPress={() => { setQuestFocus(null); go('quest'); }} style={styles.flex} icon={<UiIcon kind="routine" color={colors.surface} />}>오늘의 도전</Button><Button onPress={() => go('shop')} style={styles.flex} icon={<UiIcon kind="wardrobe" />}>꾸미기</Button></View>
        <HomeSummary game={game} day={day} onQuest={id => { setQuestFocus(id ?? null); go('quest'); }} />
      </> : screen === 'diary' ? <Diary onBack={() => go('home')} game={game} day={day} initialDate={diaryDate} onContinue={continueDraft} onDraft={saveDraft} onSave={saveDiary} onDelete={deleteDiary} scrollTop={() => scrollRef.current?.scrollTo({ y: 0, animated: false })} /> : screen === 'quest' ? <Quests onBack={() => go('home')} onDiary={openDiary} onVisit={() => go('visit')} onAttendance={() => setSheet({kind:'attendance'})} focusId={questFocus} scrollTo={y => scrollRef.current?.scrollTo({ y, animated: false })} game={game} day={day} update={updateGame} openSheet={setSheet} /> : screen === 'shop' ? <Shop onBuyCharacter={buyFriend} onBack={() => go('home')} game={game} level={level} ownedClothes={ownedClothes} outfit={wardrobe.outfit} update={updateGame} buyClothes={buyClothes} wear={wear} /> : screen === 'settings' ? <Settings onBack={() => go('home')} state={state} name={name} update={updateGame} setState={setState} openSheet={setSheet} /> : screen === 'visit' ? <Visit onBack={() => go('home')} commitState={commitState} state={state} setState={setState} name={name} day={day} /> : <Guestbook onBack={() => go('home')} state={state} setState={setState} name={name} day={day} />}
    </ScrollView>
    {!!toast && <View pointerEvents="none" style={styles.toast} accessibilityLiveRegion="polite"><Label>{toast}</Label></View>}
    {sheet && <Sheet title={sheet.kind === 'attendance' ? '이번 주의 출석표' : sheet.kind === 'swap' ? '어떤 도전으로 바꿀까요?' : sheet.title ?? '안내'} close={() => setSheet(null)}>
      {sheet.kind === 'attendance' ? <><Label style={styles.body}>이번 주 {attendanceWeek(day).filter(date => game.attendance?.[date]).length}일 함께했어요. 언제든 반가워요.</Label>{attendanceWeek(day).map(date => <View style={styles.attendanceRow} key={date}><Label>{date.slice(5)} {game.attendance?.[date] ? '✓' : ''}</Label><Label style={{ flexShrink: 1 }}>{rewardText(game.attendance?.[date] ?? game.attendancePlans?.[attendanceWeek(day)[0]]?.[date])}</Label></View>)}<Button primary disabled={!!game.attendance?.[day]} onPress={async () => { if(attendanceBusy.current)return;attendanceBusy.current=true;const date=seoulDateKey();let paid=null;try { const result=await commitState(old=>{if(date!==seoulDateKey())return old;const game=recordRoutine(claimAttendance({...ensureAttendanceWeek(old.game,date),attendanceClothes:ownedClothes},date),'day-attendance',date);paid=newAttendanceReward(old.game,game,date);return {...old,game};});if(!result.ok)setError(result.message);else if(paid){setSheet(null);setAttendanceAward(paid);setError('');}}finally{attendanceBusy.current=false;} }}>{game.attendance?.[day] ? '오늘 출석 완료 ✓' : '오늘 출석하기'}</Button></>
      : sheet.kind === 'swap' ? [['hard', '더 가볍게'], ['time', '더 짧게'], ['taste', '다른 활동으로']].map(([reason, text]) => <Button key={reason} onPress={() => { const next = replaceDailyMission(game, sheet.id, day, reason); updateGame(value => replaceDailyMission(value, sheet.id, day, reason)); setSheet(null); if (next === game) setToast('지금은 적절한 대안이 없어요. 현재 도전을 유지해요.'); }}>{text}</Button>)
      : sheet.kind === 'feedback' ? ['편했어요', '적당했어요', '버거웠어요'].map((text, index) => <Button key={text} selected={game.feedback?.[sheet.key] === ['easy', 'okay', 'hard'][index]} onPress={() => { updateGame(value => ({ ...value, feedback: { ...value.feedback, [sheet.key]: ['easy', 'okay', 'hard'][index] } })); setSheet(null); }}>{text}</Button>)
      : sheet.kind === 'backup' ? <Backup state={state} onRestore={restore} close={() => setSheet(null)} /> : <Label style={styles.body}>{sheet.text}</Label>}
    </Sheet>}
  {attendanceAward && <RewardPanel receipt={attendanceAward} />}
  </KeyboardAvoidingView></SafeAreaView></FontReadyContext.Provider>;
}
