import { AuthContext } from './AuthContext.js';
import { useState } from 'react';
import Mochi from '../components/Mochi.jsx';
import useAuthEntry from './useAuthEntry.js';
import './login.css';
import IPhoneChrome from '../components/IPhoneChrome.jsx';

export default function AuthGate({ children }) {
  const auth = useAuthEntry();
  const [preview, setPreview] = useState(import.meta.env.DEV && new URLSearchParams(location.search).get('preview') === 'game');
  async function logout() {
    const result = await auth.signOut();
    if (result.ok) {
      setPreview(false);
      const url = new URL(location.href); url.searchParams.delete('preview'); history.replaceState(null, '', url);
    }
    return result;
  }
  if (preview || auth.status === 'authenticated') return <AuthContext.Provider value={{ logout }}>{children}</AuthContext.Provider>;
  if (auth.status === 'checking') return <main className="login-screen login-check" role="status">모찌와 만날 준비를 하고 있어요…</main>;
  const busy = auth.status === 'working';
  return <div className="app"><div className="phone-shell is-login"><IPhoneChrome /><main className="login-screen"><section className="login-content" aria-label="MY MOCHI 로그인 및 가입">
    <header className="login-brand"><h1 aria-label="MY MOCHI"><span>MY</span> MOCHI</h1><p>작은 하루를 함께하는 나의 모찌</p></header>
    <div className="login-welcome" aria-label="모찌와 친구들이 환영해요"><Mochi variant="proto-pebble" full width={105} height={111} label="버터 곰 밀루" /><Mochi variant="mochi" full width={130} height={137} label="구름 모찌" /><Mochi variant="proto-pear" full width={105} height={111} label="살구 강아지 라니" /></div>
    <div className="login-actions" aria-busy={busy}>
      <button className="provider-button kakao" disabled={busy} onClick={() => auth.signIn('kakao')} aria-label="카카오 로그인"><img src="/auth/kakao.png" alt="카카오 로그인" /></button>
      <button className="provider-button google" disabled={busy} onClick={() => auth.signIn('google')} aria-label="Google로 로그인"><img src="/auth/google.png" alt="Sign in with Google" /></button>
      <p className="login-hint">처음이라면 가입까지 한 번에 진행돼요.</p>
      <p className="login-message" role="status">{auth.message || (!auth.configured ? '로그인 연결 준비 중' : '')}</p>
      {busy && <button className="login-preview" onClick={auth.cancel}>로그인 취소</button>}
    </div>
    <footer className="login-footer"><span>이용약관 · 개인정보처리방침 준비 중</span>{import.meta.env.DEV && <><button className="login-preview" onClick={() => setPreview(true)}>개발용 게임 미리보기</button><small>소셜 인증 미연결 · 기존 로컬 기록을 사용해요</small></>}</footer>
  </section></main><div className="iphone-home-indicator" aria-hidden="true"><span /></div></div></div>;
}
