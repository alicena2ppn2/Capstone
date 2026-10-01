import { useState } from 'react';
import Home from './screens/Home.jsx';
import Quest from './screens/Quest.jsx';
import Guestbook from './screens/Guestbook.jsx';
import Settings from './screens/Settings.jsx';

const SCREENS = [
  { id: 'home', label: '홈' },
  { id: 'quest', label: '퀘스트' },
  { id: 'guest', label: '방명록' },
  { id: 'settings', label: '설정' },
];

export default function App() {
  const [screen, setScreen] = useState('home');
  // 홈에서 고른 떡 색이 다른 화면에도 그대로 이어지도록 위에서 관리
  const [petColor, setPetColor] = useState('#FFD9C4');

  return (
    <div className="app">
      <nav className="screen-nav" aria-label="화면 선택">
        {SCREENS.map((s) => (
          <button key={s.id} type="button" aria-current={screen === s.id ? 'page' : undefined} onClick={() => setScreen(s.id)}>
            {s.label}
          </button>
        ))}
      </nav>
      <div hidden={screen !== 'home'}><Home petColor={petColor} onPetColor={setPetColor} onSettings={() => setScreen('settings')} /></div>
      {screen === 'quest' && <Quest petColor={petColor} />}
      {screen === 'guest' && <Guestbook petColor={petColor} />}
      <div hidden={screen !== 'settings'}><Settings petColor={petColor} onBack={() => setScreen('home')} /></div>
    </div>
  );
}
