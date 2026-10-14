import { useEffect, useRef, useState } from 'react';
import { saveWebPhoto, deleteWebPhoto } from '../utils/photoStorage.js';
export default function PhotoMission({ onSave }) {
  const [file, setFile] = useState(null), [preview, setPreview] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const lock = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (!file) return; const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  const choose = event => { const picked = event.target.files?.[0]; if (picked) { setFile(picked); setMessage(''); } event.target.value = ''; };
  const save = async () => {
    if (lock.current || !file) return; lock.current = true; setBusy(true); setMessage('사진 저장 중…');
    let photo;
    try { photo = await saveWebPhoto(file); const result = await onSave(photo);
      if (!result?.ok || !result.changed) { await deleteWebPhoto(photo.id); throw new Error(result?.message || '오늘 진행 중인 사진 미션에만 저장할 수 있어요.'); }
      if (mounted.current) setMessage('사진첩에 저장했어요.');
    } catch (error) { if (mounted.current) setMessage(error.message || '사진을 저장하지 못했어요. 다시 시도해 주세요.'); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  return <div className="photo-mission"><div className="photo-source-actions"><label className={`pb ui-secondary${busy?' is-disabled':''}`}>사진 선택<input type="file" accept="image/*" disabled={busy} onChange={choose}/></label><label className={`pb ui-secondary${busy?' is-disabled':''}`}>사진 찍기<input type="file" accept="image/*" capture="environment" disabled={busy} onChange={choose}/></label></div>{file&&<><img className="photo-preview" src={preview} alt="저장할 사진 미리보기"/><button className="pb shop-buy" disabled={busy} onClick={save}>{busy?'저장 중…':'사진 저장하고 완료'}</button></>}<small>사진은 이 기기에 저장돼요. 촬영 메뉴는 기기·브라우저에 따라 달라요.</small><p role="status">{message}</p></div>;
}
