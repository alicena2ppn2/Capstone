import { useEffect, useRef, useState } from 'react';
import { authClient, verifiedSession } from './authClient.js';

export default function useAuthEntry(client = authClient) {
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  const controller = useRef(null);
  useEffect(() => {
    const check = new AbortController(); controller.current = check;
    verifiedSession(client, check.signal).then(session => {
      if (!check.signal.aborted) setStatus(session ? 'authenticated' : 'signed-out');
    }).catch(() => { if (!check.signal.aborted) { setStatus('signed-out'); setMessage('로그인 상태를 확인하지 못했어요. 다시 시도해 주세요.'); } });
    return () => controller.current?.abort();
  }, [client]);
  async function signIn(provider) {
    if (lock.current) return;
    lock.current = true;
    const attempt = new AbortController(); controller.current = attempt;
    setStatus('working'); setMessage('로그인 연결 중이에요…');
    try {
      await client.signIn(provider, { signal: attempt.signal });
      const session = await verifiedSession(client, attempt.signal);
      if (!attempt.signal.aborted) {
        setStatus(session ? 'authenticated' : 'signed-out');
        setMessage(session ? '' : '로그인이 완료되지 않았어요. 다시 시도할 수 있어요.');
      }
    } catch (error) {
      if (!attempt.signal.aborted) { setStatus('signed-out'); setMessage(error.message || '로그인에 실패했어요. 다시 시도해 주세요.'); }
    } finally { if (controller.current === attempt) lock.current = false; }
  }
  async function signOut() {
    if (lock.current) return { ok: false, message: '잠시 후 다시 시도해 주세요.' };
    lock.current = true;
    try {
      await client.signOut();
      controller.current?.abort();
      setStatus('signed-out'); setMessage('');
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message || '로그아웃하지 못했어요. 다시 시도해 주세요.' };
    } finally { lock.current = false; }
  }
  function cancel() { controller.current?.abort(); lock.current = false; setStatus('signed-out'); setMessage('로그인을 취소했어요. 다시 시도할 수 있어요.'); }
  return { status, message, signIn, signOut, cancel, configured: client.configured };
}
