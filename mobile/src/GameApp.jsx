import useGameState from './hooks/useGameState';
import HomeScreen from './screens/home/HomeScreen';
import MissionReplacement from './screens/quests/MissionReplacement';
import { saveMissionPreferences } from '../../shared/features/missionGuidance.js';
import BottomNav from './components/BottomNav';
import { cancelComeback, notificationsAllowed, scheduleComeback } from './notify/comeback';
import { completePhotoMission } from '../../shared/features/missionPhotos.js';
import { continueJournalDraft, deletedJournal } from '../../shared/features/journal.js';
import RewardPanel from './components/RewardPanel';
import AttendanceCards from './components/AttendanceCards';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
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
import Explore from './screens/Explore';
import { CHARACTERS, buyCharacter, levelProgress } from '../../shared/features/game.js';
import { CLOTHES } from '../../shared/data/clothes.js';
import { seoulDateKey, attendanceWeek } from '../../shared/utils/seoulDate.js';
import { replaceDailyMission, saveDiaryMission, deleteDiaryMission, DIARY_DELETED_MESSAGE } from '../../shared/features/dailyMissions.js';
import { useServerUserId, useServerGame, shopAsGame, buyItem, equip, placeDecor, moveDecor, checkIn, saveDiary as saveServerDiary, removeDiary as removeServerDiary } from './api/server';

export default function App({ children }) { return <SafeAreaProvider><GameApp>{children}</GameApp></SafeAreaProvider>; }
function GameApp({ children }) {
  const router = useRouter(), pathname = usePathname();
  const scrollRef = useRef(null);
  const [questFocus, setQuestFocus] = useState(null);
  const [diaryDate,setDiaryDate]=useState(null);
  const [sentenceHeight,setSentenceHeight]=useState(0);
  const screen = ['quest', 'shop', 'settings', 'visit', 'guest', 'diary', 'explore'].includes(pathname.slice(1)) ? pathname.slice(1) : 'home';
  const [fontsLoaded, fontError] = useFonts({ 'A2z-400': require('../assets/fonts/A2z-400.ttf'), 'A2z-500': require('../assets/fonts/A2z-500.ttf'), 'A2z-600': require('../assets/fonts/A2z-600.ttf') });
  const serverUserId = useServerUserId();   // 휴대폰 기록도 이 계정 칸에 (10/19)
  const { state, setState, error, now, day, sheet, setSheet, toast, setToast, reaction, attendanceAward, restore, claimDailyAttendance, commitState, load, consumeReaction } = useGameState(serverUserId);
  // 서버가 있으면 코인·레벨·장착·방·출석·상점은 서버 (웹과 같은 규칙, 10/15). 없으면 지금처럼 휴대폰 안 기록
  const server = useServerGame(serverUserId), sv = server.state;
  const [serverAward, setServerAward] = useState(null);
  // 다시 부르기 알림: 앱을 열거나 다시 돌아올 때마다 2·4·7일 뒤 알림을 새로 잡는다 (계속 오면 안 울림). 처음 한 번 알림 권한을 묻는다
  const remindersOn = state ? state.settings?.reminders !== false : null;
  const friendId = sv?.shop?.equipped?.character ?? state?.game?.character;
  const friendName = state ? state.game.nicknames?.[friendId] || CHARACTERS.find(item => item.id === friendId)?.name : null;
  useEffect(() => {
    if (remindersOn === null || !friendName) return undefined;
    const plan = () => (remindersOn ? notificationsAllowed(true).then(() => scheduleComeback(friendName)) : cancelComeback()).catch(() => {});
    void plan();
    const sub = AppState.addEventListener('change', next => { if (next === 'active') void plan(); });
    return () => sub.remove();
  }, [remindersOn, friendName]);
  useEffect(() => { if (!serverAward) return undefined; const timer = setTimeout(() => setServerAward(null), 1200); return () => clearTimeout(timer); }, [serverAward]);
  if (!state || !fontsLoaded && !fontError) return <SafeAreaView style={styles.safe}>{children}<Label style={{ padding: 24 }}>{error || '친구의 방을 준비하고 있어요…'}</Label>{!!error && <Button onPress={load}>다시 읽기</Button>}</SafeAreaView>;
  // 서버 사용자인데 서버 값을 아직 못 받았으면 휴대폰 기록(로컬 코인·레벨)으로 조용히 바꾸지 않고 알린다 (10/19)
  if (serverUserId && !sv) return <SafeAreaView style={styles.safe}>{children}<View style={{ padding: 24, gap: 12 }}>
    <Label accessibilityRole="header" style={styles.heading}>{server.error ? '서버에 연결하지 못했어요' : '모찌의 방을 불러오는 중…'}</Label>
    {!!server.error && <><Label style={styles.body}>{server.error}</Label><Label style={styles.small}>코인·미션·꾸미기는 서버 기록을 써요. 연결되면 그대로 이어져요.</Label><Button primary onPress={server.refresh}>다시 시도</Button></>}
  </View></SafeAreaView>;
  const { wardrobe } = state;
  const game = sv ? { ...state.game, ...shopAsGame(sv.shop), decorPositions: sv.home.room.positions ?? {} } : state.game;
  const levelInfo = sv ? sv.home.level : levelProgress(state.game.xp);
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
  // 일기: 기기에 저장 → 서버에 저장(서버 일기 미션도 완료). 서버 결과를 화면에 알린다 (synced: true·false). 조용히 실패하지 않게 (10/19)
  const saveDiary=async(date,text,emotion)=>{
    if(date!==seoulDateKey()||!text.trim())return {ok:false,message:'당일의 공백 아닌 일기만 저장할 수 있어요.'};
    if(deletedJournal(state.game,date))return {ok:false,message:DIARY_DELETED_MESSAGE};
    const saved=await commitState(old=>({...old,game:saveDiaryMission(old.game,date,text,new Date(),emotion)}));
    if(!saved.ok)return saved;
    if(!serverUserId)return {...saved,message:'이 기기에 저장했어요.'};
    try{await saveServerDiary(serverUserId,date,text.trim());void server.refresh();return {...saved,synced:true,message:'저장했어요. 다른 기기에서도 볼 수 있어요.'};}
    catch(e){return {...saved,synced:false,message:`이 기기에는 저장했지만 서버에 저장하지 못했어요. '다시 저장'을 눌러 주세요. (${e.message})`};}
  };
  // 지우기: 서버에서 먼저 지우고 성공하면 기기에서도 (서버 실패 때 기기에만 지워져 어긋나지 않게)
  const deleteDiary=async date=>{
    if(serverUserId){try{await removeServerDiary(serverUserId,date);}catch(e){return {ok:false,message:`서버에서 지우지 못했어요. 다시 시도해 주세요. (${e.message})`};}}
    return commitState(old=>({...old,game:deleteDiaryMission(old.game,date)}));
  };
  const continueDraft=async(source,target,draft,choice)=>{let moved;const result=await commitState(old=>{moved=continueJournalDraft(old.game,source,target,draft,choice);return moved.game===old.game?old:{...old,game:moved.game};});return {...moved,...result,ok:result.ok&&moved?.ok};};
  const saveDraft=(date,draft)=>commitState(old=>({...old,game:{...old.game,journalDrafts:{...old.game.journalDrafts,[date]:draft}}}));
  return <FontReadyContext.Provider value={fontsLoaded}><SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>{children}<StatusBar style="dark" /><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.header}><Label style={styles.coin}>🪙 {game.coins.toLocaleString('ko-KR')}</Label><AttendanceButton onPress={() => setSheet({ kind: 'attendance' })}>출석표</AttendanceButton></View>
    {screen !== 'home' && <View style={[styles.level, { paddingHorizontal: 16, paddingBottom: 4 }]}><Label style={styles.small}>LV.{level}</Label><View style={{ width: 80 }}><Progress value={levelInfo.xp_in_level} max={levelInfo.xp_for_level} /></View><Label style={styles.small}>{levelInfo.xp_in_level} / {levelInfo.xp_for_level} XP</Label></View>}
    {error ? <Label accessibilityRole="alert" style={styles.error}>{error}</Label> : null}
    {sv && !!server.error && <View style={[styles.row, { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#FCECE3' }]}><Label style={[styles.small, styles.flex, { color: '#8A3B2F' }]}>서버와 연결이 잠시 끊겼어요. 마지막으로 받은 기록을 보여 주고 있어요.</Label><Button onPress={server.refresh}>다시 연결</Button></View>}
    {/* 홈: 방 그림은 고정, 아래 '오늘의 도전' 시트를 끌어올린다 (웹 홈과 같게, 10/19). 다른 화면은 스크롤 */}
    {screen === 'home' ? <View style={styles.flex}><HomeScreen serverUserId={sv ? serverUserId : null} onMoveDecor={sv ? (slot, pos) => serverAct(() => moveDecor(serverUserId, slot, pos)) : undefined} levelInfo={levelInfo} game={game} level={level} name={name} outfit={outfit} now={now} day={day} reaction={reaction} consumeReaction={consumeReaction} go={go} openDiary={openDiary} setSheet={setSheet} setQuestFocus={setQuestFocus} sentenceHeight={sentenceHeight} setSentenceHeight={setSentenceHeight} /></View>
    : <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {screen === 'diary' ? <Diary onBack={() => go('home')} game={game} day={day} initialDate={diaryDate} onContinue={continueDraft} onDraft={saveDraft} onSave={saveDiary} onDelete={deleteDiary} scrollTop={() => scrollRef.current?.scrollTo({ y: 0, animated: false })} /> : screen === 'quest' ? <Quests onServerChanged={server.refresh} onPreferences={answers=>commitState(old=>({...old,game:saveMissionPreferences(old.game,answers)}))} onPhotoSave={(id,date,photo)=>commitState(old=>{const next=completePhotoMission(old.game,id,date,photo);return next===old.game?old:{...old,game:next};})} onBack={() => go('home')} onDiary={openDiary} onVisit={() => go('visit')} onAttendance={() => setSheet({kind:'attendance'})} focusId={questFocus} scrollTo={y => scrollRef.current?.scrollTo({ y, animated: false })} game={game} day={day} update={updateGame} openSheet={setSheet} /> : screen === 'shop' ? <Shop onBuyCharacter={sv ? id => serverAct(() => buyItem(serverUserId, 'character', id)) : buyFriend} onBack={() => go('home')} game={game} level={level} ownedClothes={ownedClothes} outfit={sv ? game.outfit : wardrobe.outfit} update={sv ? serverUpdate : updateGame} buyClothes={sv ? item => serverAct(() => buyItem(serverUserId, 'outfit', item.id)) : buyClothes} wear={sv ? id => serverAct(() => equip(serverUserId, { outfit_id: id })) : wear} /> : screen === 'settings' ? <Settings serverUserId={sv ? serverUserId : null} onProfileSaved={server.refresh} onPreferences={answers=>commitState(old=>({...old,game:saveMissionPreferences(old.game,answers)}))} onBack={() => go('home')} state={state} name={name} update={updateGame} setState={setState} openSheet={setSheet} /> : screen === 'explore' ? <Explore onBack={() => go('home')} /> : sv && (screen === 'visit' || screen === 'guest') ? <Neighbors key={screen} userId={serverUserId} myName={sv.home.nickname ?? name} initialTab={screen === 'guest' ? 'mine' : 'rooms'} onBack={() => go('home')} onChanged={server.refresh} /> : screen === 'visit' ? <Visit onBack={() => go('home')} commitState={commitState} state={state} setState={setState} name={name} day={day} /> : <Guestbook onBack={() => go('home')} state={state} setState={setState} name={name} day={day} />}
    </ScrollView>}
    <BottomNav screen={screen} onNavigate={destination=>{if(destination==='quest')setQuestFocus(null);go(destination);}}/>
    {!!toast && <View pointerEvents="none" style={styles.toast} accessibilityLiveRegion="polite"><Label>{toast}</Label></View>}
    {sheet && <Sheet title={sheet.kind === 'attendance' ? '출석 체크' : sheet.kind === 'swap' ? '다른 활동으로' : sheet.title ?? '안내'} close={() => setSheet(null)}>
      {sheet.kind === 'attendance' && sv ? <><AttendanceCards days={sv.week.days.map(d => ({ date: d.date, today: d.today, claimed: d.claimed ?? null, reward: d.reward }))} streak={{ streak: sv.week.streak ?? 0, reset: !!sv.week.reset, claimedToday: sv.week.claimed_today }} /><Button primary disabled={sv.week.claimed_today} onPress={async () => { try { const r = await checkIn(serverUserId); await server.refresh(); setSheet(null); if (r.gift) setServerAward(r.gift); } catch (e) { setToast(e.message); } }}>{sv.week.claimed_today ? '오늘 출석 완료 ✓' : '🎁 출석하고 선물 받기'}</Button></>
      : sheet.kind === 'attendance' ? <><AttendanceCards days={attendanceWeek(day).map(date => ({ date, today: date === day, claimed: game.attendance?.[date] ?? null, reward: game.attendancePlans?.[attendanceWeek(day)[0]]?.[date] }))} /><Button primary disabled={!!game.attendance?.[day]} onPress={() => claimDailyAttendance(ownedClothes)}>{game.attendance?.[day] ? '오늘 출석 완료 ✓' : '🎁 출석하고 선물 받기'}</Button></>
      : sheet.kind === 'swap' ? <MissionReplacement game={game} id={sheet.id} day={day} onClose={()=>setSheet(null)} onNotice={setToast} onReplace={(id,date,options)=>commitState(old=>{if(date!==seoulDateKey())return old;const next=replaceDailyMission(old.game,id,date,options);return next===old.game?old:{...old,game:next};})}/>
      : sheet.kind === 'feedback' ? ['가벼웠어요', '적당했어요', '부담됐어요'].map((text, index) => <Button key={text} selected={game.feedback?.[sheet.key] === ['easy', 'okay', 'hard'][index]} onPress={() => { updateGame(value => ({ ...value, feedback: { ...value.feedback, [sheet.key]: ['easy', 'okay', 'hard'][index] } })); setSheet(null); }}>{text}</Button>)
      : sheet.kind === 'backup' ? <Backup state={state} onRestore={restore} close={() => setSheet(null)} /> : <Label style={styles.body}>{sheet.text}</Label>}
    </Sheet>}
  {(attendanceAward || serverAward) && <RewardPanel receipt={serverAward ?? attendanceAward} />}
  </KeyboardAvoidingView></SafeAreaView></FontReadyContext.Provider>;
}
