import useGameState from './hooks/useGameState';
import HomeScreen from './screens/home/HomeScreen';
import MissionReplacement from './screens/quests/MissionReplacement';
import { saveMissionPreferences } from '../../shared/features/missionGuidance.js';
import BottomNav from './components/BottomNav';
import { completePhotoMission } from '../../shared/features/missionPhotos.js';
import { continueJournalDraft } from '../../shared/features/journal.js';
import RewardPanel from './components/RewardPanel';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { usePathname, useRouter } from 'expo-router';
import { buyOutfit, wearOutfit } from '../../shared/features/wardrobeActions';
import { AttendanceButton, Label, Button, Progress, Sheet, styles, FontReadyContext } from './components/ui';
import Diary from './screens/Diary';
import Quests from './screens/quests/Quests';
import Shop from './screens/Shop';
import Settings, { Backup } from './screens/Settings';
import Visit, { Guestbook } from './screens/Visit';
import Neighbors from './screens/Neighbors';
import { CHARACTERS, buyCharacter, levelFor } from '../../shared/features/game.js';
import { CLOTHES } from '../../shared/data/clothes.js';
import { DECOR } from '../../shared/data/decor.js';
import { seoulDateKey, attendanceWeek } from '../../shared/utils/seoulDate.js';
import { replaceDailyMission, saveDiaryMission, deleteDiaryMission } from '../../shared/features/dailyMissions.js';
import { useServerUserId, useServerGame, shopAsGame, buyItem, equip, placeDecor, moveDecor, checkIn, saveDiary as saveServerDiary, removeDiary as removeServerDiary } from './api/server';

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
  const [sentenceHeight,setSentenceHeight]=useState(0);
  const screen = ['quest', 'shop', 'settings', 'visit', 'guest', 'diary'].includes(pathname.slice(1)) ? pathname.slice(1) : 'home';
  const [fontsLoaded, fontError] = useFonts({ 'A2z-400': require('../assets/fonts/A2z-400.ttf'), 'A2z-500': require('../assets/fonts/A2z-500.ttf'), 'A2z-600': require('../assets/fonts/A2z-600.ttf') });
  const { state, setState, error, now, day, sheet, setSheet, toast, setToast, reaction, attendanceAward, restore, claimDailyAttendance, commitState, load, consumeReaction } = useGameState();
  // 서버가 있으면 코인·레벨·장착·방·출석·상점은 서버 (웹과 같은 규칙, 10/15). 없으면 지금처럼 휴대폰 안 기록
  const serverUserId = useServerUserId(), server = useServerGame(serverUserId), sv = server.state;
  const [serverAward, setServerAward] = useState(null);
  useEffect(() => { if (!serverAward) return undefined; const timer = setTimeout(() => setServerAward(null), 1200); return () => clearTimeout(timer); }, [serverAward]);
  if (!state || !fontsLoaded && !fontError) return <SafeAreaView style={styles.safe}>{children}<Label style={{ padding: 24 }}>{error || '친구의 방을 준비하고 있어요…'}</Label>{!!error && <Button onPress={load}>다시 읽기</Button>}</SafeAreaView>;
  const { wardrobe } = state;
  const game = sv ? { ...state.game, ...shopAsGame(sv.shop), decorPositions: sv.home.room.positions ?? {} } : state.game;
  const levelInfo = sv ? sv.home.level : { level: levelFor(state.game.xp), xp_in_level: state.game.xp % 100, xp_for_level: 100 };
  const level = levelInfo.level;
  const serverAct = async job => { try { await job(); await server.refresh(); return { ok: true, changed: true }; } catch (e) { setToast(e.message); return { ok: false, message: e.message }; } };
  // 상점 화면은 '게임 상태를 바꾸는 함수'로 행동을 알린다 → 서버면 바뀐 부분을 보고 같은 서버 요청을 보낸다
  const serverUpdate = transform => {
    const before = game, after = transform(before);
    if (after === before) return;
    const jobs = [];
    for (const id of after.characters.filter(id => !before.characters.includes(id))) jobs.push(() => buyItem(serverUserId, 'character', id));
    if (after.character !== before.character) jobs.push(() => equip(serverUserId, { character_id: after.character }));
    for (const id of (after.ownedDecor ?? []).filter(id => !(before.ownedDecor ?? []).includes(id))) jobs.push(() => buyItem(serverUserId, 'decor', id));
    for (const slot of new Set([...Object.keys(after.decor ?? {}), ...Object.keys(before.decor ?? {})])) if ((after.decor?.[slot] ?? null) !== (before.decor?.[slot] ?? null)) jobs.push(() => placeDecor(serverUserId, slot, after.decor?.[slot] ?? null));
    return serverAct(async () => { for (const job of jobs) await job(); });
  };
  const name = game.nicknames?.[game.character] || CHARACTERS.find(item => item.id === game.character)?.name;
  const ownedClothes = sv ? game.ownedClothes : [...new Set([...wardrobe.owned, ...(game.attendanceClothes ?? [])])];
  const outfit = CLOTHES.find(item => item.id === (sv ? game.outfit : wardrobe.outfit));
  const updateGame = transform => setState(old => ({ ...old, game: transform(old.game) }));
  const buyFriend = id => commitState(old => { const next = buyCharacter(old.game, id); return next === old.game ? old : { ...old, game: next }; });
  const buyClothes = item => setState(old => buyOutfit(old, item));
  const wear = id => setState(old => wearOutfit(old, id));
  const go = destination => { setSheet(null); router.replace(destination === 'home' ? '/' : `/${destination}`); };
  const openDiary=date=>{setDiaryDate(date??null);go('diary');};
  const saveDiary=async(date,text,emotion)=>{if(date!==seoulDateKey()||!text.trim())return {ok:false,message:'당일의 공백 아닌 일기만 저장할 수 있어요.'};const saved=await commitState(old=>({...old,game:saveDiaryMission(old.game,date,text,new Date(),emotion)}));if(saved.ok&&serverUserId)saveServerDiary(serverUserId,date,text.trim()).then(()=>server.refresh()).catch(()=>{});return saved;};   // 서버 일기 미션도 완료
  const deleteDiary=async date=>{const done=await commitState(old=>({...old,game:deleteDiaryMission(old.game,date)}));if(done.ok&&serverUserId)removeServerDiary(serverUserId,date).catch(()=>{});return done;};
  const continueDraft=async(source,target,draft,choice)=>{let moved;const result=await commitState(old=>{moved=continueJournalDraft(old.game,source,target,draft,choice);return moved.game===old.game?old:{...old,game:moved.game};});return {...moved,...result,ok:result.ok&&moved?.ok};};
  const saveDraft=(date,draft)=>commitState(old=>({...old,game:{...old.game,journalDrafts:{...old.game.journalDrafts,[date]:draft}}}));
  return <FontReadyContext.Provider value={fontsLoaded}><SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>{children}<StatusBar style="dark" /><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.header}><Label style={styles.coin}>🪙 {game.coins.toLocaleString('ko-KR')}</Label><AttendanceButton onPress={() => setSheet({ kind: 'attendance' })}>출석표</AttendanceButton></View>
    {screen !== 'home' && <View style={[styles.level, { paddingHorizontal: 16, paddingBottom: 4 }]}><Label style={styles.small}>LV.{level}</Label><View style={{ width: 80 }}><Progress value={levelInfo.xp_in_level} max={levelInfo.xp_for_level} /></View><Label style={styles.small}>{levelInfo.xp_in_level} / {levelInfo.xp_for_level} XP</Label></View>}
    {error ? <Label accessibilityRole="alert" style={styles.error}>{error}</Label> : null}
    <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {screen === 'home' ? <HomeScreen serverUserId={sv ? serverUserId : null} onMoveDecor={sv ? (slot, pos) => serverAct(() => moveDecor(serverUserId, slot, pos)) : undefined} levelInfo={levelInfo} game={game} level={level} name={name} outfit={outfit} now={now} day={day} reaction={reaction} consumeReaction={consumeReaction} go={go} openDiary={openDiary} setSheet={setSheet} setQuestFocus={setQuestFocus} sentenceHeight={sentenceHeight} setSentenceHeight={setSentenceHeight} /> : screen === 'diary' ? <Diary onBack={() => go('home')} game={game} day={day} initialDate={diaryDate} onContinue={continueDraft} onDraft={saveDraft} onSave={saveDiary} onDelete={deleteDiary} scrollTop={() => scrollRef.current?.scrollTo({ y: 0, animated: false })} /> : screen === 'quest' ? <Quests onServerChanged={server.refresh} onPreferences={answers=>commitState(old=>({...old,game:saveMissionPreferences(old.game,answers)}))} onPhotoSave={(id,date,photo)=>commitState(old=>{const next=completePhotoMission(old.game,id,date,photo);return next===old.game?old:{...old,game:next};})} onBack={() => go('home')} onDiary={openDiary} onVisit={() => go('visit')} onAttendance={() => setSheet({kind:'attendance'})} focusId={questFocus} scrollTo={y => scrollRef.current?.scrollTo({ y, animated: false })} game={game} day={day} update={updateGame} openSheet={setSheet} /> : screen === 'shop' ? <Shop onBuyCharacter={sv ? id => serverAct(() => buyItem(serverUserId, 'character', id)) : buyFriend} onBack={() => go('home')} game={game} level={level} ownedClothes={ownedClothes} outfit={sv ? game.outfit : wardrobe.outfit} update={sv ? serverUpdate : updateGame} buyClothes={sv ? item => serverAct(() => buyItem(serverUserId, 'outfit', item.id)) : buyClothes} wear={sv ? id => serverAct(() => equip(serverUserId, { outfit_id: id })) : wear} /> : screen === 'settings' ? <Settings serverUserId={sv ? serverUserId : null} onProfileSaved={server.refresh} onPreferences={answers=>commitState(old=>({...old,game:saveMissionPreferences(old.game,answers)}))} onBack={() => go('home')} state={state} name={name} update={updateGame} setState={setState} openSheet={setSheet} /> : sv && (screen === 'visit' || screen === 'guest') ? <Neighbors key={screen} userId={serverUserId} myName={sv.home.nickname ?? name} initialTab={screen === 'guest' ? 'mine' : 'rooms'} onBack={() => go('home')} onChanged={server.refresh} /> : screen === 'visit' ? <Visit onBack={() => go('home')} commitState={commitState} state={state} setState={setState} name={name} day={day} /> : <Guestbook onBack={() => go('home')} state={state} setState={setState} name={name} day={day} />}
    </ScrollView>
    <BottomNav screen={screen} onNavigate={destination=>{if(destination==='quest')setQuestFocus(null);go(destination);}}/>
    {!!toast && <View pointerEvents="none" style={styles.toast} accessibilityLiveRegion="polite"><Label>{toast}</Label></View>}
    {sheet && <Sheet title={sheet.kind === 'attendance' ? '이번 주의 출석표' : sheet.kind === 'swap' ? '다른 활동으로' : sheet.title ?? '안내'} close={() => setSheet(null)}>
      {sheet.kind === 'attendance' && sv ? <><Label style={styles.body}>이번 주 {sv.week.count}일 함께했어요. 언제든 반가워요.</Label>{sv.week.days.map(d => <View style={[styles.attendanceRow, d.claimed && { opacity: .45 }]} key={d.date}><Label>{d.today ? '오늘 ' : ''}{d.date.slice(5)} {d.claimed ? '✓' : ''}</Label><Label style={{ flexShrink: 1 }}>{rewardText(d.claimed ?? d.reward)}</Label></View>)}<Button primary disabled={sv.week.claimed_today} onPress={async () => { try { const r = await checkIn(serverUserId); await server.refresh(); setSheet(null); if (r.gift) setServerAward(r.gift); } catch (e) { setToast(e.message); } }}>{sv.week.claimed_today ? '오늘 출석 완료 ✓' : '오늘 출석하기'}</Button></>
      : sheet.kind === 'attendance' ? <><Label style={styles.body}>이번 주 {attendanceWeek(day).filter(date => game.attendance?.[date]).length}일 함께했어요. 언제든 반가워요.</Label>{attendanceWeek(day).map(date => <View style={styles.attendanceRow} key={date}><Label>{date.slice(5)} {game.attendance?.[date] ? '✓' : ''}</Label><Label style={{ flexShrink: 1 }}>{rewardText(game.attendance?.[date] ?? game.attendancePlans?.[attendanceWeek(day)[0]]?.[date])}</Label></View>)}<Button primary disabled={!!game.attendance?.[day]} onPress={() => claimDailyAttendance(ownedClothes)}>{game.attendance?.[day] ? '오늘 출석 완료 ✓' : '오늘 출석하기'}</Button></>
      : sheet.kind === 'swap' ? <MissionReplacement game={game} id={sheet.id} day={day} onClose={()=>setSheet(null)} onNotice={setToast} onReplace={(id,date,options)=>commitState(old=>{if(date!==seoulDateKey())return old;const next=replaceDailyMission(old.game,id,date,options);return next===old.game?old:{...old,game:next};})}/>
      : sheet.kind === 'feedback' ? ['가벼웠어요', '적당했어요', '부담됐어요'].map((text, index) => <Button key={text} selected={game.feedback?.[sheet.key] === ['easy', 'okay', 'hard'][index]} onPress={() => { updateGame(value => ({ ...value, feedback: { ...value.feedback, [sheet.key]: ['easy', 'okay', 'hard'][index] } })); setSheet(null); }}>{text}</Button>)
      : sheet.kind === 'backup' ? <Backup state={state} onRestore={restore} close={() => setSheet(null)} /> : <Label style={styles.body}>{sheet.text}</Label>}
    </Sheet>}
  {(attendanceAward || serverAward) && <RewardPanel receipt={serverAward ?? attendanceAward} />}
  </KeyboardAvoidingView></SafeAreaView></FontReadyContext.Provider>;
}
