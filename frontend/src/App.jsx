import { useCallback, useEffect, useState } from 'react';
import Home from './screens/Home.jsx';
import Visit from './screens/Visit.jsx';
import Quest from './screens/Quest.jsx';
import Guestbook from './screens/Guestbook.jsx';
import Settings from './screens/Settings.jsx';
import Shop, { CLOTHES } from './screens/Shop.jsx';
import { CharacterContext } from './components/CharacterContext.jsx';
import { initialGame, levelFor, completeQuest, startQuest, migrateQuestProgress, buyCharacter, equipCharacter, claimAttendance, ensureAttendanceWeek, buyDecor, equipDecor } from './utils/game.js';
import Attendance from './components/Attendance.jsx';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [game, setGame] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mochi.game.v1'));
      if (saved && Number.isFinite(saved.xp) && saved.xp >= 0 && Number.isFinite(saved.coins) && saved.coins >= 0 && Array.isArray(saved.characters) && Array.isArray(saved.completed)) {
        const characters = [...new Set(['potato', ...saved.characters])];
        const attendance = saved.attendance && typeof saved.attendance === 'object' && !Array.isArray(saved.attendance) ? saved.attendance : {};
        const questAnswers = saved.questAnswers && typeof saved.questAnswers === 'object' && !Array.isArray(saved.questAnswers) ? saved.questAnswers : {};
        return migrateQuestProgress({ ...saved, attendance, questAnswers, characters, character: characters.includes(saved.character) ? saved.character : 'potato' });
      }
    } catch { /* 처음 방문이면 기본 캐릭터 제공 */ }
    return initialGame();
  });
  const prepareAttendance = useCallback(date => setGame(value => ensureAttendanceWeek(value, date)), []);
  const level = levelFor(game.xp);
  const [wardrobe, setWardrobe] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem('mochi.wardrobe.v1')); if (saved && Array.isArray(saved.owned)) return saved; } catch { /* 기본 옷장 */ }
    return { owned: [], outfit: null };
  });
  useEffect(() => { try { localStorage.setItem('mochi.game.v1', JSON.stringify(game)); localStorage.setItem('mochi.wardrobe.v1', JSON.stringify(wardrobe)); } catch { /* 브라우저 저장 제한 */ } }, [game, wardrobe]);
  const petColor = '#FFF5E6';
  const [petName, setPetName] = useState(() => {
    try { return localStorage.getItem('mochi.petName')?.trim().slice(0, 12) || 'MOCHI'; }
    catch { return 'MOCHI'; }
  });
  const rename = (name) => {
    setPetName(name);
    try { localStorage.setItem('mochi.petName', name); } catch { /* 저장이 제한되어도 현재 화면에는 반영 */ }
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

  return (
    <CharacterContext.Provider value={game.character ?? 'potato'}>
    <div className="app">
      <div className="phone-shell">
      <Attendance records={game.attendance} plans={game.attendancePlans ?? {}} onPrepare={prepareAttendance} onClaim={(date) => setGame(value => claimAttendance({ ...ensureAttendanceWeek(value, date), attendanceClothes: ownedClothes }, date))} />
      <div className="growth-bar"><strong>LV.{level}</strong><progress value={game.xp % 100} max="100" aria-label="다음 레벨까지 경험치" /><span>{game.xp % 100} / 100 XP</span><button type="button" className="pb" onClick={() => setScreen('quest')}>퀘스트 →</button></div>
      <div className={`phone-content${screen === 'quest' ? ' is-quest' : ''}`}>
      <div className="phone-page" hidden={screen !== 'home'}><Home level={level} petName={petName} petColor={petColor} onQuest={() => setScreen('quest')} onGuestbook={() => setScreen('guest')} onVisit={() => setScreen('visit')} onSettings={() => setScreen('settings')} onShop={() => setScreen('shop')} coins={game.coins} outfit={outfit} decor={game.decor ?? {}} onEarnCoins={() => setGame((value) => ({ ...value, coins: value.coins + 5 }))} /></div>
      {screen === 'visit' && <Visit visitorName={petName} visitorVariant={game.character ?? 'potato'} onBack={() => setScreen('home')} />}
      {screen === 'quest' && <Quest game={game} onStart={id => setGame(value => startQuest(value, id))} onComplete={(id, answer) => setGame((value) => completeQuest(value, id, new Date(), answer))} petColor={petColor} onShop={() => setScreen('shop')} onSettings={() => setScreen('settings')} onHome={() => setScreen('home')} />}
      {screen === 'guest' && <Guestbook petName={petName} level={level} petColor={petColor} onShop={() => setScreen('shop')} onSettings={() => setScreen('settings')} onHome={() => setScreen('home')} />}
      <div className="phone-page" hidden={screen !== 'settings'}><Settings petColor={petColor} petName={petName} onPetName={rename} onBack={() => setScreen('home')} /></div>
      {screen === 'shop' && <Shop onBuyDecor={id => setGame(value => buyDecor(value, id))} onEquipDecor={(slot, id) => setGame(value => equipDecor(value, slot, id))} game={game} level={level} onBuyCharacter={(id) => setGame((value) => buyCharacter(value, id))} onEquipCharacter={(id) => setGame((value) => equipCharacter(value, id))} petColor={petColor} coins={game.coins} owned={ownedClothes} outfit={wardrobe.outfit} onBuy={buy} onWear={wear} onBack={() => setScreen('home')} />}
      </div>
      </div>
    </div>
    </CharacterContext.Provider>
  );
}
