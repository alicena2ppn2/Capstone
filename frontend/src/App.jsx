import { useEffect, useState } from 'react';
import Home from './screens/Home.jsx';
import Quest from './screens/Quest.jsx';
import Guestbook from './screens/Guestbook.jsx';
import Settings from './screens/Settings.jsx';
import Shop, { CLOTHES } from './screens/Shop.jsx';
import { CharacterContext } from './components/CharacterContext.jsx';
import { initialGame, levelFor, completeQuest, buyCharacter, equipCharacter, claimAttendance } from './utils/game.js';
import Attendance from './components/Attendance.jsx';

const SCREENS = [
  { id: 'home', label: '홈' },
  { id: 'quest', label: '퀘스트' },
  { id: 'guest', label: '방명록' },
  { id: 'settings', label: '설정' },
  { id: 'shop', label: '상점' },
];

export default function App() {
  const [screen, setScreen] = useState('home');
  const [game, setGame] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mochi.game.v1'));
      if (saved && Number.isFinite(saved.xp) && saved.xp >= 0 && Number.isFinite(saved.coins) && saved.coins >= 0 && Array.isArray(saved.characters) && Array.isArray(saved.completed)) {
        const characters = [...new Set(['potato', ...saved.characters])];
        const attendance = saved.attendance && typeof saved.attendance === 'object' && !Array.isArray(saved.attendance) ? saved.attendance : {};
        return { ...saved, attendance, characters, character: characters.includes(saved.character) ? saved.character : 'potato' };
      }
    } catch { /* 처음 방문이면 기본 캐릭터 제공 */ }
    return initialGame();
  });
  const level = levelFor(game.xp);
  const [wardrobe, setWardrobe] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem('mochi.wardrobe.v1')); if (saved && Array.isArray(saved.owned)) return saved; } catch { /* 기본 옷장 */ }
    return { owned: [], outfit: null };
  });
  useEffect(() => { try { localStorage.setItem('mochi.game.v1', JSON.stringify(game)); localStorage.setItem('mochi.wardrobe.v1', JSON.stringify(wardrobe)); } catch { /* 브라우저 저장 제한 */ } }, [game, wardrobe]);
  // 홈에서 고른 떡 색이 다른 화면에도 그대로 이어지도록 위에서 관리
  const [petColor, setPetColor] = useState('#FFF5E6');
  const [petName, setPetName] = useState(() => {
    try { return localStorage.getItem('mochi.petName')?.trim().slice(0, 12) || 'MOCHI'; }
    catch { return 'MOCHI'; }
  });
  const rename = (name) => {
    setPetName(name);
    try { localStorage.setItem('mochi.petName', name); } catch { /* 저장이 제한되어도 현재 화면에는 반영 */ }
  };
  const outfit = CLOTHES.find((item) => item.id === wardrobe.outfit);
  const buy = (item) => {
    if (game.coins < item.price || level < (item.level ?? 1) || wardrobe.owned.includes(item.id)) return false;
    setGame((value) => ({ ...value, coins: value.coins - item.price }));
    setWardrobe((value) => ({ ...value, owned: [...value.owned, item.id] }));
    return true;
  };
  const wear = (id) => setWardrobe((value) => id === null || value.owned.includes(id) ? { ...value, outfit: id } : value);

  return (
    <CharacterContext.Provider value={game.character ?? 'potato'}>
    <div className="app">
      <nav className="screen-nav" aria-label="화면 선택">
        {SCREENS.map((s) => (
          <button key={s.id} type="button" aria-current={screen === s.id ? 'page' : undefined} onClick={() => setScreen(s.id)}>
            {s.label}
          </button>
        ))}
      </nav>
      <Attendance records={game.attendance} onClaim={(date, reward) => setGame((value) => claimAttendance(value, date, reward))} />
      <div className="growth-bar"><strong>LV.{level}</strong><progress value={game.xp % 100} max="100" aria-label="다음 레벨까지 경험치" /><span>{game.xp % 100} / 100 XP</span><button type="button" className="pb" onClick={() => setScreen('quest')}>퀘스트 →</button></div>
      <div hidden={screen !== 'home'}><Home level={level} petName={petName} petColor={petColor} onPetColor={setPetColor} onSettings={() => setScreen('settings')} onShop={() => setScreen('shop')} coins={game.coins} outfit={outfit} onEarnCoins={() => setGame((value) => ({ ...value, coins: value.coins + 5 }))} /></div>
      {screen === 'quest' && <Quest game={game} onComplete={(id) => setGame((value) => completeQuest(value, id))} petColor={petColor} onShop={() => setScreen('shop')} onSettings={() => setScreen('settings')} />}
      {screen === 'guest' && <Guestbook level={level} petColor={petColor} onShop={() => setScreen('shop')} onSettings={() => setScreen('settings')} />}
      <div hidden={screen !== 'settings'}><Settings petColor={petColor} petName={petName} onPetName={rename} onBack={() => setScreen('home')} /></div>
      {screen === 'shop' && <Shop game={game} level={level} onBuyCharacter={(id) => setGame((value) => buyCharacter(value, id))} onEquipCharacter={(id) => setGame((value) => equipCharacter(value, id))} petColor={petColor} coins={game.coins} owned={wardrobe.owned} outfit={wardrobe.outfit} onBuy={buy} onWear={wear} onBack={() => setScreen('home')} />}
    </div>
    </CharacterContext.Provider>
  );
}
