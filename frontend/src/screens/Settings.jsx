import { useState } from 'react';
import Mochi from '../components/Mochi.jsx';
import { GearIcon } from '../components/Icons.jsx';
import BackupExport from '../components/BackupExport.jsx';

export default function Settings({ petColor, petName, onPetName, onBack }) {
  const [nameDraft, setNameDraft] = useState(petName);
  const [nameMessage, setNameMessage] = useState('');
  const [options, setOptions] = useState({ music: true, effects: true, reminders: false });
  const [volume, setVolume] = useState(70);
  const [saved, setSaved] = useState(false);
  const update = (key) => {
    setOptions((value) => ({ ...value, [key]: !value[key] }));
    setSaved(false);
  };

  return (
    <section className="settings-screen" aria-labelledby="settings-title">
      <header className="settings-header">
        <button type="button" className="pb settings-back" onClick={onBack} aria-label="홈으로 돌아가기">←</button>
        <h1 id="settings-title" className="jua"><GearIcon size={26} /> 설정</h1>
        <span className="settings-header-spacer" />
      </header>
      <div className="settings-intro">
        <div className="settings-avatar"><Mochi color={petColor} width={100} height={94} /></div>
        <h2 className="jua">나에게 맞는 모찌 생활</h2>
        <p>편안하게, 내 취향대로 바꿔보세요.</p>
      </div>
      <form className="settings-card" onSubmit={(event) => {
        event.preventDefault();
        const name = nameDraft.trim();
        if (!name) { setNameMessage('이름을 입력해주세요.'); return; }
        onPetName(name);
        setNameDraft(name);
        setNameMessage(`이제 이름은 ${name}이에요!`);
      }}>
        <h2 className="jua">함께하는 친구의 애칭</h2>
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
          ['music', '배경 음악', '방 안을 채우는 포근한 음악'],
          ['effects', '효과음', '모찌와 함께하는 작은 소리'],
        ].map(([key, title, description]) => (
          <div className="settings-row" key={key}>
            <div><strong id={`${key}-label`}>{title}</strong><p>{description}</p></div>
            <button type="button" className="pb settings-toggle" role="switch" aria-checked={options[key]} aria-labelledby={`${key}-label`} onClick={() => update(key)}><span /></button>
          </div>
        ))}
        <div className="settings-volume">
          <label htmlFor="settings-volume">소리 크기 <output>{volume}%</output></label>
          <input id="settings-volume" type="range" min="0" max="100" value={volume} onChange={(event) => { setVolume(Number(event.target.value)); setSaved(false); }} />
          <div><span>조용하게</span><span>크게</span></div>
        </div>
      </div>
      <div className="settings-card settings-card-pink">
        <h2 className="jua">알림 설정</h2>
        <div className="settings-row">
          <div><strong id="reminders-label">일상 알림</strong><p>산책과 오늘의 퀘스트를 알려드려요.</p></div>
          <button type="button" className="pb settings-toggle" role="switch" aria-checked={options.reminders} aria-labelledby="reminders-label" onClick={() => update('reminders')}><span /></button>
        </div>
      </div>
      <div className="settings-note"><span aria-hidden="true">✦</span> 작은 변화로 더 포근한 하루를 만들어요.</div>
      <button type="button" className="pb jua settings-save" onClick={() => setSaved(true)}>설정 저장하기</button>
      <p className="settings-status" role="status">{saved ? '설정을 저장했어요! (미리보기 동안 유지돼요)' : '미리보기용 설정이에요. 실제 소리와 알림은 연결 예정이에요.'}</p>
      <BackupExport />
      <section className="settings-card settings-tools"><h2>계정 삭제</h2><p>현재는 로그인 계정과 서버가 연결되어 있지 않아 계정을 삭제할 수 없어요.</p><button type="button" className="pb ui-secondary" onClick={() => window.alert('계정 삭제는 로그인·서버 연결 후 사용할 수 있어요. 현재 저장된 기록은 삭제하지 않았어요.')}>계정 삭제 안내</button></section>
      <footer className="settings-footer jua">MY MOCHI <span>v0.1.0</span></footer>
    </section>
  );
}
