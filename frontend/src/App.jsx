import { saveMissionPreferences } from '../../shared/features/missionGuidance.js';
import BottomNav from './components/BottomNav.jsx';
import { completePhotoMission } from '../../shared/features/missionPhotos.js';
import UiIcon from './components/UiIcon.jsx';
import { continueJournalDraft } from '../../shared/features/journal.js';
import RewardPanel from './components/RewardPanel.jsx';
import { newAttendanceReward } from '../../shared/features/rewardFeedback.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import Diary from './screens/Diary.jsx';
import { ensureDailyMissions, startDailyMission, finishDailyMission, pauseDailyMission, replaceDailyMission, saveDiaryMission, deleteDiaryMission, recordRoutine, DIARY_DELETED_MESSAGE } from '../../shared/features/dailyMissions.js';
import { deletedJournal } from '../../shared/features/journal.js';
import Home from './screens/Home.jsx';
import Visit from './screens/Visit.jsx';
import Neighbors from './screens/Neighbors.jsx';
import { useServerUserId } from './api/missions.js';
import { useServerGame, shopAsGame, buyItem, equip, placeDecor, moveDecor, checkIn, saveDiary as saveServerDiary, removeDiary as removeServerDiary } from './api/game.js';
import Quest from './screens/Quest.jsx';
import Guestbook from './screens/Guestbook.jsx';
import Settings from './screens/Settings.jsx';
import Shop, { CLOTHES } from './screens/Shop.jsx';
import { CharacterContext } from './components/CharacterContext.jsx';
import { CHARACTERS, initialGame, levelFor, levelProgress, migrateQuestProgress, buyCharacter, equipCharacter, claimAttendance, ensureAttendanceWeek, buyDecor, equipDecor, claimGoal } from '../../shared/features/game.js';
import Attendance from './components/Attendance.jsx';
import IPhoneChrome from './components/IPhoneChrome.jsx';
import { restoreNicknames } from '../../shared/data/catalog.js';
import { seoulDateKey } from '../../shared/utils/seoulDate.js';
import { local, useAccountStorage } from './storage/local.js';

// 계정이 바뀌면 게임 화면을 새로 그려서(key) 그 계정의 브라우저 기록만 읽는다 (10/19)
export default function App() {
  const serverUserId = useServerUserId();
  useAccountStorage(serverUserId);
  return <Game key={serverUserId ?? 'preview'} />;
}

function Game() {
  const [screen, setScreen] = useState('home');
  const serverUserId = useServerUserId();   // 있으면 이웃·방명록을 서버로
  const [attendanceAward, setAttendanceAward] = useState(null);
  useEffect(() => { if (!attendanceAward) return; const timer = setTimeout(() => setAttendanceAward(null), 1000); return () => clearTimeout(timer); }, [attendanceAward]);
  const [questFocus, setQuestFocus] = useState(null);
  const [diaryDate, setDiaryDate] = useState(null);
  const openDiary = date => { setDiaryDate(date ?? null); setScreen('diary'); };
  const openQuest = id => { setQuestFocus(id ?? null); setScreen('quest'); };
  const [game, setGame] = useState(() => {
    try {
      const saved = JSON.parse(local.getItem('mochi.game.v1'));
      if (saved && Number.isFinite(saved.xp) && saved.xp >= 0 && Number.isFinite(saved.coins) && saved.coins >= 0 && Array.isArray(saved.characters) && Array.isArray(saved.completed)) {
        const characters = [...new Set(['potato', ...saved.characters])];
        const attendance = saved.attendance && typeof saved.attendance === 'object' && !Array.isArray(saved.attendance) ? saved.attendance : {};
        const questAnswers = saved.questAnswers && typeof saved.questAnswers === 'object' && !Array.isArray(saved.questAnswers) ? saved.questAnswers : {};
        const current = characters.includes(saved.character) ? saved.character : 'potato';
        const oldName = local.getItem('mochi.petName')?.trim().slice(0, 12);
        return migrateQuestProgress(restoreNicknames({ ...saved, attendance, questAnswers, characters, character: current }, oldName));
      }
    } catch { /* 처음 방문이면 기본 캐릭터 제공 */ }
    const fresh = initialGame();
    try { const name = local.getItem('mochi.petName')?.trim().slice(0, 12); return restoreNicknames(fresh, name); } catch { return fresh; }
  });
  const prepareChallenges = useCallback(day => setGame(value => {
    let notes; try { notes = JSON.parse(local.getItem('mochi.visitNotes.v1')); } catch { /* no valid saved posts */ }
    return ensureDailyMissions(value, day, notes);
  }), []);
  const [day, setDay] = useState(seoulDateKey);
  useEffect(() => { const refresh = () => setDay(seoulDateKey()); const timer = setInterval(refresh, 1000); document.addEventListener('visibilitychange', refresh); return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); }; }, []);
  useEffect(() => prepareChallenges(day), [day, prepareChallenges]);
  const prepareAttendance = useCallback(date => setGame(value => ensureAttendanceWeek(value, date)), []);
  const server = useServerGame(serverUserId), sv = server.state;
  const level = sv ? sv.shop.level.level : levelFor(game.xp);
  const levelInfo = sv ? sv.home.level : levelProgress(game.xp);
  const coins = sv ? sv.home.coins : game.coins;
  const shownCharacter = sv ? sv.home.equipped.character ?? 'potato' : game.character ?? 'potato';
  const shownDecor = sv ? sv.home.room.decor : game.decor ?? {};
  // 서버 행동: 결과를 기다린 뒤 서버 상태를 다시 불러온다
  const serverAct = async job => { try { await job(); await server.refresh(); return { ok: true, changed: true }; } catch (e) { return { ok: false, message: e.message }; } };
  const gameRef = useRef(game); gameRef.current = game;
  const commitGame = transform => {
    try {
      const previous = gameRef.current;
      const next = transform(previous);
      local.setItem('mochi.game.v1', JSON.stringify(next));
      gameRef.current = next; setGame(next); return { ok: true, changed: next !== previous };
    } catch { return { ok: false, message: '저장하지 못했어요. 작성한 글은 유지돼요. 다시 시도해 주세요.' }; }
  };
  const saveDiary = async (date, text, emotion) => {
    if (date !== seoulDateKey() || !text.trim()) return { ok:false, message:'당일의 공백 아닌 일기만 저장할 수 있어요.' };
    if (deletedJournal(gameRef.current, date)) return { ok:false, message: DIARY_DELETED_MESSAGE };
    const saved = commitGame(value => saveDiaryMission(value, date, text, new Date(), emotion));
    if (!saved.ok) return saved;
    if (!serverUserId) return { ...saved, message: '이 브라우저에 저장했어요.' };
    // 서버에도 저장(서버 일기 미션도 완료). 결과를 화면에 알린다 — 조용히 실패하지 않게 (10/19)
    try { await saveServerDiary(serverUserId, date, text.trim()); void server.refresh(); return { ...saved, synced: true, message: '저장했어요. 다른 기기에서도 볼 수 있어요.' }; }
    catch (e) { return { ...saved, synced: false, message: `이 브라우저에는 저장했지만 서버에 저장하지 못했어요. '다시 저장'을 눌러 주세요. (${e.message})` }; }
  };
  // 지우기: 서버에서 먼저 지우고 성공하면 브라우저에서도 (서버 실패 때 한쪽만 지워져 어긋나지 않게)
  const deleteDiary = async date => {
    if (serverUserId) { try { await removeServerDiary(serverUserId, date); } catch (e) { return { ok: false, message: `서버에서 지우지 못했어요. 다시 시도해 주세요. (${e.message})` }; } }
    return commitGame(value => deleteDiaryMission(value, date));
  };
  const continueDraft = (source, target, draft, choice) => { let moved; const result=commitGame(value=>{moved=continueJournalDraft(value,source,target,draft,choice);return moved.game;});return {...moved,...result,ok:result.ok&&moved.ok}; };
  const saveDraft = (date, draft) => commitGame(value => ({ ...value, journalDrafts: { ...value.journalDrafts, [date]:draft } }));
  const [wardrobe, setWardrobe] = useState(() => {
    try { const saved = JSON.parse(local.getItem('mochi.wardrobe.v1')); if (saved && Array.isArray(saved.owned)) return saved; } catch { /* 기본 옷장 */ }
    return { owned: [], outfit: null };
  });
  useEffect(() => { try { local.setItem('mochi.game.v1', JSON.stringify(game)); local.setItem('mochi.wardrobe.v1', JSON.stringify(wardrobe)); } catch { /* 브라우저 저장 제한 */ } }, [game, wardrobe]);
  const petColor = '#FFF5E6';
  const petName = game.nicknames?.[game.character] || CHARACTERS.find(item => item.id === game.character)?.name || 'MOCHI';
  const rename = name => {
    setGame(value => ({ ...value, nicknames: { ...value.nicknames, [value.character]: name.trim().slice(0, 12) } }));
  };
  const ownedClothes = [...new Set([...wardrobe.owned, ...(game.attendanceClothes ?? [])])];
  const outfit = CLOTHES.find((item) => item.id === (sv ? sv.home.equipped.outfit : wardrobe.outfit));
  const buy = (item) => {
    if (game.coins < item.price || level < (item.level ?? 1) || ownedClothes.includes(item.id)) return false;
    setGame((value) => ({ ...value, coins: value.coins - item.price }));
    setWardrobe((value) => ({ ...value, owned: [...value.owned, item.id] }));
    return true;
  };
  const wear = (id) => setWardrobe((value) => id === null || ownedClothes.includes(id) ? { ...value, outfit: id } : value);
  const observed = useRef({ quest: game.questReward?.sequence ?? 0, outfit: wardrobe.outfit, character: game.character });
  const reactionSequence = useRef(0);
  const [potatoReaction, setPotatoReaction] = useState(null);
  useEffect(() => {
    const quest = game.questReward?.sequence ?? 0;
    const outfitChanged = wardrobe.outfit !== null && wardrobe.outfit !== observed.current.outfit;
    if (game.character !== observed.current.character) setPotatoReaction(null);
    if ((quest !== observed.current.quest || outfitChanged) && game.character) {
      setPotatoReaction(++reactionSequence.current);
    }
    observed.current = { quest, outfit: wardrobe.outfit, character: game.character };
  }, [game.questReward?.sequence, wardrobe.outfit, game.character]);
  const consumePotatoReaction = useCallback(id => setPotatoReaction(value => value === id ? null : value), []);

  // 서버 사용자인데 서버 값을 아직 못 받았으면 브라우저 기록(로컬 코인·레벨)으로 조용히 바꾸지 않고 알린다 (10/19)
  if (serverUserId && !sv) return <div className="app"><div className="phone-shell"><IPhoneChrome /><section className="server-wait" role="status">
    <h2>{server.error ? '서버에 연결하지 못했어요' : '모찌의 방을 불러오는 중…'}</h2>
    {server.error && <><p>{server.error}</p><p className="server-wait-hint">코인·미션·꾸미기는 서버 기록을 써요. 연결되면 그대로 이어져요.</p><button type="button" className="pb ui-primary" onClick={server.refresh}>다시 시도</button></>}
  </section></div></div>;

  return (
    <CharacterContext.Provider value={shownCharacter}>
    <div className="app">
      <div className={`phone-shell${screen === 'home' ? ' is-home' : screen === 'shop' ? ' is-shop' : screen === 'quest' ? ' is-quest' : ''}`}>
      <IPhoneChrome />
      {sv && server.error && <div className="server-lost" role="status"><span>서버와 연결이 잠시 끊겼어요. 마지막으로 받은 기록을 보여 주고 있어요.</span><button type="button" className="pb ui-secondary" onClick={server.refresh}>다시 연결</button></div>}
      <div className="status-header">
      {sv ? <Attendance records={Object.fromEntries(sv.week.days.filter(d => d.claimed).map(d => [d.date, d.claimed.duplicate ? { ...d.claimed, duplicateOutfit: d.claimed.duplicate } : d.claimed]))}
        plans={{}} cycle={sv.week} onPrepare={() => {}}
        onClaim={async () => { try { const r = await checkIn(serverUserId); await server.refresh(); const receipt = r.gift && (r.gift.duplicate ? { ...r.gift, duplicateOutfit: r.gift.duplicate } : r.gift); if (receipt) setAttendanceAward(receipt); return { ok: true, receipt }; } catch (e) { return { ok: false, message: e.message }; } }} />
      : <Attendance records={game.attendance} plans={game.attendancePlans ?? {}} onPrepare={prepareAttendance} onClaim={date => { const previous = gameRef.current; const result = commitGame(value => {
        if(date !== seoulDateKey()) return value;
        return recordRoutine(claimAttendance({ ...ensureAttendanceWeek(value, date), attendanceClothes: ownedClothes }, date), 'day-attendance', date);
      }); const receipt = result.ok ? newAttendanceReward(previous, gameRef.current, date) : null; if (receipt) setAttendanceAward(receipt); return { ...result, receipt }; }} />}
      {screen !== 'home' && <div className="growth-bar"><strong>LV.{level}</strong><progress value={levelInfo.xp_in_level} max={levelInfo.xp_for_level} aria-label="다음 레벨까지 경험치" /><span>{levelInfo.xp_in_level} / {levelInfo.xp_for_level} XP</span><button type="button" className="pb" onClick={() => setScreen('quest')}>퀘스트 →</button></div>}
      {screen === 'home' && <div className="home-wallet" aria-label={`보유 코인 ${coins}`}><UiIcon kind="coin" size={18} /><strong>{coins.toLocaleString('ko-KR')}</strong></div>}
      </div>
      <div className={`phone-content${screen === 'quest' ? ' is-quest' : ''}`}>
      <div className="phone-page" hidden={screen !== 'home'}><Home game={game} day={day} active={screen === 'home'} reactionId={potatoReaction} onReactionConsumed={consumePotatoReaction} petName={petName} petColor={petColor} onQuest={openQuest} onDiary={() => openDiary()} onGuestbook={() => setScreen('guest')} onVisit={() => setScreen('visit')} onSettings={() => setScreen('settings')} onShop={() => setScreen('shop')} coins={coins} outfit={outfit} decor={shownDecor} levelInfo={levelInfo}
        positions={sv ? sv.home.room.positions ?? {} : game.decorPositions ?? {}}
        onMoveDecor={(slot, pos) => sv ? serverAct(() => moveDecor(serverUserId, slot, pos)) : setGame(value => ({ ...value, decorPositions: { ...value.decorPositions, [slot]: pos } }))} /></div>
      {screen === 'diary' && <Diary game={game} day={day} initialDate={diaryDate} onSave={saveDiary} onDelete={deleteDiary} onDraft={saveDraft} onContinue={continueDraft} onHome={() => setScreen('home')} />}
      {screen === 'visit' && (serverUserId ? <Neighbors userId={serverUserId} myName={petName} onBack={() => setScreen('home')} />
        : <Visit onVisited={date => commitGame(value => recordRoutine(value, 'day-visit', date))} onGuestbook={() => setScreen('guest')} visitorName={petName} visitorVariant={game.character ?? 'potato'} onBack={() => setScreen('home')} />)}
      {screen === 'quest' && <Quest onServerChanged={server.refresh} onPreferences={answers => commitGame(value => saveMissionPreferences(value,answers))} game={game} focusId={questFocus} onDiary={openDiary} onVisit={() => setScreen('visit')} onAttendance={() => document.querySelector('.attendance-open')?.click()}
        onPrepare={prepareChallenges}
        onReplace={(id, date, options) => date===seoulDateKey()?commitGame(value => replaceDailyMission(value, id, date, options)):{ok:false,message:'날짜가 바뀌었어요. 오늘 목록에서 다시 확인해 주세요.'}}
        onPause={(id, date, reason) => setGame(value => pauseDailyMission(value, id, date, reason))}
        onFeedback={(key, response) => setGame(value => ({ ...value, feedback: { ...value.feedback, [key]: response } }))}
        onProfile={(field, text, key) => setGame(value => field === 'choice' ? ({ ...value, challengeChoices: { ...value.challengeChoices, [key]: text } }) : ({ ...value, preferences: { ...value.preferences, [field]: text.slice(0, 80) } }))}
        onGoal={id => setGame(value => claimGoal(value, id))} onStart={id => setGame(value => startDailyMission(value, id))} onPhotoSave={(id, date, photo) => commitGame(value => completePhotoMission(value, id, date, photo))} onComplete={(id, answer) => setGame((value) => finishDailyMission(value, id, new Date()))} petColor={petColor} onShop={() => setScreen('shop')} onSettings={() => setScreen('settings')} onHome={() => setScreen('home')} />}
      {screen === 'guest' && serverUserId && <Neighbors userId={serverUserId} myName={petName} initialTab="mine" onBack={() => setScreen('home')} />}
      {screen === 'guest' && !serverUserId && <Guestbook petName={petName} level={level} petColor={petColor} onShop={() => setScreen('shop')} onSettings={() => setScreen('settings')} onHome={() => setScreen('home')} />}
      <div className="phone-page" hidden={screen !== 'settings'}><Settings preferences={game.preferences} onPreferences={answers => commitGame(value => saveMissionPreferences(value,answers))} key={game.character} petColor={petColor} petName={petName} onPetName={rename} onBack={() => setScreen('home')} /></div>
      {screen === 'shop' && sv && <Shop serverMode game={{ ...game, ...shopAsGame(sv.shop) }} level={level} coins={sv.shop.coins} owned={shopAsGame(sv.shop).ownedClothes} outfit={sv.shop.equipped.outfit} petColor={petColor} onBack={() => setScreen('home')}
        onBuyCharacter={id => serverAct(() => buyItem(serverUserId, 'character', id))} onEquipCharacter={id => serverAct(() => equip(serverUserId, { character_id: id }))}
        onBuy={item => { void serverAct(() => buyItem(serverUserId, 'outfit', item.id)); return true; }} onWear={id => serverAct(() => equip(serverUserId, { outfit_id: id }))}
        onBuyDecor={id => serverAct(() => buyItem(serverUserId, 'decor', id))} onEquipDecor={(slot, id) => serverAct(() => placeDecor(serverUserId, slot, id))} />}
      {screen === 'shop' && !sv && <Shop onBuyDecor={id => setGame(value => buyDecor(value, id))} onEquipDecor={(slot, id) => setGame(value => equipDecor(value, slot, id))} game={game} level={level} onBuyCharacter={id => commitGame(value => buyCharacter(value, id))} onEquipCharacter={(id) => setGame((value) => equipCharacter(value, id))} petColor={petColor} coins={game.coins} owned={ownedClothes} outfit={wardrobe.outfit} onBuy={buy} onWear={wear} onBack={() => setScreen('home')} />}
      </div>
      <BottomNav screen={screen} onNavigate={destination => { if(destination==='quest') openQuest(); else setScreen(destination); }}/>
      {attendanceAward && <><div className="reward-scrim" aria-hidden="true" /><RewardPanel receipt={attendanceAward} /></>}
      <div className="iphone-home-indicator" aria-hidden="true"><span /></div>
      </div>
    </div>
    </CharacterContext.Provider>
  );
}
