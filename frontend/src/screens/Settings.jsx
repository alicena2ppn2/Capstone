import HelpResources from '../components/HelpResources.jsx';
import MissionPreferences from '../components/MissionPreferences.jsx';
import { useAuthActions } from '../../../shared/auth/AuthContext.js';
import ScreenHeader from '../components/ScreenHeader.jsx';
import { useState } from 'react';
import Mochi from '../components/Mochi.jsx';

import BackupExport from '../components/BackupExport.jsx';
import ProfileCard from '../components/ProfileCard.jsx';
import AccountDelete from '../components/AccountDelete.jsx';

export default function Settings({ petColor, petName, onPetName, onBack, preferences, onPreferences }) {
  const auth = useAuthActions();
  const [loggingOut, setLoggingOut] = useState(false), [logoutError, setLogoutError] = useState('');
  async function logout() {
    if (loggingOut || !auth) return;
    setLoggingOut(true); setLogoutError('');
    const result = await auth.logout();
    if (!result.ok) { setLogoutError(result.message); setLoggingOut(false); }
  }

  const [nameDraft, setNameDraft] = useState(petName);
  const [nameMessage, setNameMessage] = useState('');
  const [options, setOptions] = useState({ effects: true, reminders: false });
  const [saved, setSaved] = useState(false);
  const update = (key) => {
    setOptions((value) => ({ ...value, [key]: !value[key] }));
    setSaved(false);
  };

  return (
    <section className="settings-screen" aria-labelledby="settings-title">
      <ScreenHeader title="설정" titleId="settings-title" onBack={onBack} />
      <div className="settings-intro">
        <div className="settings-avatar"><Mochi color={petColor} width={100} height={94} /></div>
        <h2 className="jua">나에게 맞는 모찌 생활</h2>
        <p>편안하게, 내 취향대로 바꿔보세요.</p>
      </div>
      <ProfileCard />
      <form className="settings-card" onSubmit={(event) => {
        event.preventDefault();
        const name = nameDraft.trim();
        if (!name) { setNameMessage('이름을 입력해주세요.'); return; }
        onPetName(name);
        setNameDraft(name);
        setNameMessage(`이제 이름은 ${name}이에요!`);
      }}>
        <h2 className="jua">캐릭터 별명</h2>
        <label className="settings-name-label" htmlFor="pet-name">현재 친구를 어떻게 부를까요?</label>
        <div className="settings-name-controls">
          <input id="pet-name" className="inp" type="text" maxLength={12} value={nameDraft} placeholder="모찌 이름 입력" onChange={(event) => { setNameDraft(event.target.value); setNameMessage(''); }} aria-describedby="pet-name-hint pet-name-status" />
          <button type="submit" className="pb">이름 저장</button>
        </div>
        <p id="pet-name-hint" className="settings-name-hint">최대 12자 · 친구별로 저장하며 고유 이름은 그대로 유지해요.</p>
        <p id="pet-name-status" className="settings-name-status" role="status">{nameMessage}</p>
      </form>
      <div className="settings-card">
        <h2 className="jua">소리 설정</h2>
        {[
          ['effects', '효과음', '모찌와 함께하는 작은 소리'],
        ].map(([key, title, description]) => (
          <div className="settings-row" key={key}>
            <div><strong id={`${key}-label`}>{title}</strong><p>{description}</p></div>
            <button type="button" className="pb settings-toggle" role="switch" aria-checked={options[key]} aria-labelledby={`${key}-label`} onClick={() => update(key)}><span /></button>
          </div>
        ))}

      </div>
      <div className="settings-card settings-card-pink">
        <h2 className="jua">알림 설정</h2>
        <div className="settings-row">
          <div><strong id="reminders-label">일상 알림</strong><p>산책과 오늘의 퀘스트를 알려드려요.</p></div>
          <button type="button" className="pb settings-toggle" role="switch" aria-checked={options.reminders} aria-labelledby="reminders-label" onClick={() => update('reminders')}><span /></button>
        </div>
      </div>
      <button type="button" className="pb jua settings-save" onClick={() => setSaved(true)}>설정 저장하기</button>
      <p className="settings-status" role="status">{saved ? '설정을 저장했어요! (미리보기 동안 유지돼요)' : '미리보기용 설정이에요. 실제 소리와 알림은 연결 예정이에요.'}</p>
      <MissionPreferences preferences={preferences} onSave={onPreferences} />
      <HelpResources />
      <BackupExport />
      <AccountDelete />
      <section className="settings-card settings-tools"><h2>로그아웃</h2><p>로그인 화면으로 돌아가요. 저장된 기록은 유지돼요.</p><button type="button" className="pb ui-secondary" disabled={loggingOut || !auth} onClick={logout}>{loggingOut ? '로그아웃 중…' : '로그아웃'}</button>{logoutError && <p role="alert">{logoutError}</p>}</section>
      <footer className="settings-footer jua">MY MOCHI <span>v0.1.0</span></footer>
    </section>
  );
}
