import { useState } from 'react';
import { local, LOCAL_KEYS } from '../storage/local.js';
export default function BackupExport() {
  const [backup, setBackup] = useState(''), [message, setMessage] = useState('');
  const exportData = () => {
    try { const values = Object.fromEntries(LOCAL_KEYS.map(key => [key, local.getItem(key)]).filter(([, value]) => value !== null)); setBackup(JSON.stringify(values)); setMessage('아래 내용을 복사해 앱 설정의 백업 가져오기에 붙여넣으세요.'); }
    catch { setMessage('브라우저 저장소 접근 권한을 확인해 주세요.'); }
  };
  return <section className="settings-card settings-tools"><h2>앱으로 기록 옮기기</h2><button type="button" className="pb ui-secondary" onClick={exportData}>현재 기록 백업</button>{backup && <textarea className="inp" aria-label="모바일 앱으로 옮길 백업 JSON" readOnly value={backup} onFocus={event => event.target.select()} rows={4} />}<p role="status">{message}</p></section>;
}
