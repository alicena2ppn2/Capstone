import { useCallback, useEffect, useRef, useState } from 'react';
import Diary from './screens/Diary.jsx';
import { saveJournal, deleteJournal } from './utils/journal.js';
import Home from './screens/Home.jsx';
import Visit from './screens/Visit.jsx';
import Quest from './screens/Quest.jsx';
import Guestbook from './screens/Guestbook.jsx';
import Settings from './screens/Settings.jsx';
import Shop, { CLOTHES } from './screens/Shop.jsx';
import { CharacterContext } from './components/CharacterContext.jsx';
import { CHARACTERS, initialGame, levelFor, completeQuest, startQuest, migrateQuestProgress, buyCharacter, equipCharacter, claimAttendance, ensureAttendanceWeek, buyDecor, equipDecor, ensureChallenges, selectChallenge, pauseChallenge, replaceChallenge, claimGoal } from './utils/game.js';
import Attendance from './components/Attendance.jsx';
import IPhoneChrome from './components/IPhoneChrome.jsx';
import { targetStatus, restoreNicknames } from './utils/catalog.js';
import { seoulDateKey } from './utils/seoulDate.js';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [game, setGame] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mochi.game.v1'));
      if (saved && Number.isFinite(saved.xp) && saved.xp >= 0 && Number.isFinite(saved.coins) && saved.coins >= 0 && Array.isArray(saved.characters) && Array.isArray(saved.completed)) {
        const characters = [...new Set(['potato', ...saved.characters])];
        const attendance = saved.attendance && typeof saved.attendance === 'object' && !Array.isArray(saved.attendance) ? saved.attendance : {};
        const questAnswers = saved.questAnswers && typeof saved.questAnswers === 'object' && !Array.isArray(saved.questAnswers) ? saved.questAnswers : {};
        const current = characters.includes(saved.character) ? saved.character : 'potato';
        const oldName = localStorage.getItem('mochi.petName')?.trim().slice(0, 12);
        return migrateQuestProgress(restoreNicknames({ ...saved, attendance, questAnswers, characters, character: current }, oldName));
      }
    } catch { /* 처음 방문이면 기본 캐릭터 제공 */ }
    const fresh = initialGame();
    try { const name = localStorage.getItem('mochi.petName')?.trim().slice(0, 12); return restoreNicknames(fresh, name); } catch { return fresh; }
  });
  const prepareChallenges = useCallback(day => setGame(value => ensureChallenges(value, day)), []);
  const [day, setDay] = useState(seoulDateKey);
  useEffect(() => { const refresh = () => setDay(seoulDateKey()); const timer = setInterval(refresh, 1000); document.addEventListener('visibilitychange', refresh); return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); }; }, []);
  useEffect(() => prepareChallenges(day), [day, prepareChallenges]);
  const prepareAttendance = useCallback(date => setGame(value => ensureAttendanceWeek(value, date)), []);
  const level = levelFor(game.xp);
  const [wardrobe, setWardrobe] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem('mochi.wardrobe.v1')); if (saved && Array.isArray(saved.owned)) return saved; } catch { /* 기본 옷장 */ }
    return { owned: [], outfit: null };
  });
  useEffect(() => { try { localStorage.setItem('mochi.game.v1', JSON.stringify(game)); localStorage.setItem('mochi.wardrobe.v1', JSON.stringify(wardrobe)); } catch { /* 브라우저 저장 제한 */ } }, [game, wardrobe]);
  const petColor = '#FFF5E6';
  const petName = game.nicknames?.[game.character] || CHARACTERS.find(item => item.id === game.character)?.name || 'MOCHI';
  const rename = name => {
    setGame(value => ({ ...value, nicknames: { ...value.nicknames, [value.character]: name.trim().slice(0, 12) } }));
  };
  const ownedClothes = [...new Set([...wardrobe.owned, ...(game.attendanceClothes ?? [])])];
  const outfit = CLOTHES.find((item) => item.id === wardrobe.outfit);
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


  return (
    <CharacterContext.Provider value={game.character ?? 'potato'}>
    <div className="app">
      <div className={`phone-shell${screen === 'home' ? ' is-home' : screen === 'shop' ? ' is-shop' : screen === 'quest' ? ' is-quest' : ''}`}>
      <IPhoneChrome />
      <div className="status-header">
      <Attendance records={game.attendance} plans={game.attendancePlans ?? {}} onPrepare={prepareAttendance} onClaim={(date) => setGame(value => claimAttendance({ ...ensureAttendanceWeek(value, date), attendanceClothes: ownedClothes }, date))} />
      {screen !== 'home' && <div className="growth-bar"><strong>LV.{level}</strong><progress value={game.xp % 100} max="100" aria-label="다음 레벨까지 경험치" /><span>{game.xp % 100} / 100 XP</span><button type="button" className="pb" onClick={() => setScreen('quest')}>퀘스트 →</button></div>}
      {screen === 'home' && <div className="home-wallet" aria-label={`보유 코인 ${game.coins}`}><span aria-hidden="true">●</span><strong>{game.coins.toLocaleString('ko-KR')}</strong><span>코인</span></div>}
      </div>
      <div className={`phone-content${screen === 'quest' ? ' is-quest' : ''}`}>
      <div className="phone-page" hidden={screen !== 'home'}><Home game={game} day={day} target={targetStatus(game, ownedClothes)} active={screen === 'home'} reactionId={potatoReaction} onReactionConsumed={consumePotatoReaction} petName={petName} petColor={petColor} onQuest={() => setScreen('quest')} onDiary={() => setScreen('diary')} onGuestbook={() => setScreen('guest')} onVisit={() => setScreen('visit')} onSettings={() => setScreen('settings')} onShop={() => setScreen('shop')} coins={game.coins} outfit={outfit} decor={game.decor ?? {}} /></div>
      {screen === 'diary' && <Diary game={game} day={day} onSave={(date, text) => setGame(value => saveJournal(value, date, text))} onDelete={date => setGame(value => deleteJournal(value, date))} onHome={() => setScreen('home')} />}
      {screen === 'visit' && <Visit visitorName={petName} visitorVariant={game.character ?? 'potato'} onBack={() => setScreen('home')} />}
      {screen === 'quest' && <Quest game={game}
        onPrepare={prepareChallenges}
        onSelect={(id, date) => setGame(value => selectChallenge(value, id, date))}
        onReplace={(id, date, reason) => setGame(value => replaceChallenge(value, id, date, reason))}
        onPause={(id, date, reason) => setGame(value => pauseChallenge(value, id, date, reason))}
        onFeedback={(key, response) => setGame(value => ({ ...value, feedback: { ...value.feedback, [key]: response } }))}
        onProfile={(field, text, key) => setGame(value => field === 'choice' ? ({ ...value, challengeChoices: { ...value.challengeChoices, [key]: text } }) : ({ ...value, preferences: { ...value.preferences, [field]: text.slice(0, 80) } }))}
        onJournal={(date, text) => setGame(value => saveJournal(value, date, text))}
        onGoal={id => setGame(value => claimGoal(value, id))} onStart={id => setGame(value => startQuest(value, id))} onComplete={(id, answer) => setGame((value) => completeQuest(value, id, new Date(), answer))} petColor={petColor} onShop={() => setScreen('shop')} onSettings={() => setScreen('settings')} onHome={() => setScreen('home')} />}
      {screen === 'guest' && <Guestbook petName={petName} level={level} petColor={petColor} onShop={() => setScreen('shop')} onSettings={() => setScreen('settings')} onHome={() => setScreen('home')} />}
      <div className="phone-page" hidden={screen !== 'settings'}><Settings key={game.character} petColor={petColor} petName={petName} onPetName={rename} onBack={() => setScreen('home')} /></div>
      {screen === 'shop' && <Shop onTarget={targetItem => setGame(value => ({ ...value, targetItem }))} onBuyDecor={id => setGame(value => buyDecor(value, id))} onEquipDecor={(slot, id) => setGame(value => equipDecor(value, slot, id))} game={game} level={level} onBuyCharacter={(id) => setGame((value) => buyCharacter(value, id))} onEquipCharacter={(id) => setGame((value) => equipCharacter(value, id))} petColor={petColor} coins={game.coins} owned={ownedClothes} outfit={wardrobe.outfit} onBuy={buy} onWear={wear} onBack={() => setScreen('home')} />}
      </div>
      <div className="iphone-home-indicator" aria-hidden="true"><span /></div>
      </div>
    </div>
    </CharacterContext.Provider>
  );
}
