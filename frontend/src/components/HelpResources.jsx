import { useCallback, useState } from 'react';
import QuestSheet from './QuestSheet.jsx';
import { HELP } from '../../../shared/data/helpResources.js';

export default function HelpResources() {
  const [entry, setEntry] = useState(null), [message, setMessage] = useState('');
  const close = useCallback(() => setEntry(null), []);
  const copy = async text => {
    try { await navigator.clipboard.writeText(text); setMessage('복사했어요.'); }
    catch { setMessage('복사하지 못했어요. 표시된 번호나 주소를 길게 눌러 복사해 주세요.'); }
  };
  const open = url => {
    try {
      if (url.startsWith('tel:')) { window.location.href = url; setMessage('전화 앱이 열리지 않으면 표시된 번호를 복사해 이용해 주세요.'); }
      else { window.open(url, '_blank', 'noopener,noreferrer'); setMessage('새 탭이 열리지 않으면 공식 주소를 복사해 이용해 주세요.'); }
    } catch { setMessage('연결 화면을 열지 못했어요. 번호나 공식 주소를 복사해 다시 시도해 주세요.'); }
  };
  return <><button type="button" className="pb help-entry" onClick={event => {setMessage('');setEntry({trigger:event.currentTarget,frame:event.currentTarget.closest('.phone-shell')??document.getElementById('root')});}}>{HELP.title}</button>{entry&&<QuestSheet {...entry} title={HELP.title} onClose={close}><div className="help-resources"><p>{HELP.description}</p><nav aria-label="도움 서비스 바로가기">{[HELP.services[2],...HELP.services.slice(0,2)].map(s=><button type="button" className="pb ui-secondary" key={s.id} onClick={()=>document.getElementById(`help-${s.id}`)?.scrollIntoView({block:'nearest'})}>{s.title}</button>)}</nav><p className="help-scope">{HELP.scope}</p><p className="help-region">{HELP.region}</p>{HELP.services.map(s=><section key={s.id} id={`help-${s.id}`}><h3>{s.title}</h3><p>{s.note}</p>{s.phone&&<><button type="button" className="pb ui-secondary" onClick={()=>open(`tel:${s.phone}`)}>{s.name} {s.phone} · 전화 앱 열기</button><button type="button" className="pb ui-secondary" onClick={()=>copy(s.phone)}>{s.phone} 번호 복사</button></>}<button type="button" className="pb ui-secondary" onClick={()=>open(s.url)}>{s.name} 공식 안내 · 외부 사이트</button><div className="help-address">{s.url}</div><button type="button" className="pb ui-secondary" onClick={()=>copy(s.url)}>공식 주소 복사</button></section>)}<p role="status" aria-live="polite">{message}</p><small>정보 확인일: {HELP.checked}</small></div></QuestSheet>}</>;
}
