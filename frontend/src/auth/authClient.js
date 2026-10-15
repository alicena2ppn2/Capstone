// 웹 로그인: Supabase Google 로그인 (페이지가 Google로 갔다가 돌아오면 Supabase가 코드를 세션으로 바꾼다, PKCE).
// 세션 확인·서버 계정 연결·닉네임 등록은 공유 흐름(shared/auth/authBackendController.mjs)이 맡는다.
// 설정: frontend/.env.local 의 VITE_SUPABASE_URL · VITE_SUPABASE_PUBLISHABLE_KEY (공개용 키, Git에 올리지 않음)
//       Supabase 대시보드 → Authentication → URL Configuration → Redirect URLs 에 이 웹 주소(예: http://127.0.0.1:5180) 추가
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const ready = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url ?? '') && key?.startsWith('sb_publishable_');
const supabase = ready ? createClient(url, key, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'mochi.supabase.auth.v1' } }) : null;

export const authClient = supabase ? {
  configured: true,
  async getSession({ signal } = {}) {
    const { data, error } = await supabase.auth.getSession();   // Google에서 돌아온 직후면 코드 교환을 기다린 뒤 돌려준다
    if (signal?.aborted) return null;
    if (error) throw new Error('로그인 기록을 읽지 못했어요. 다시 시도해 주세요.');
    if (!data.session) return null;
    const result = await supabase.auth.getUser(data.session.access_token);   // 서버에 진짜인지 확인
    if (signal?.aborted) return null;
    if (result.error) throw new Error('로그인 상태를 확인하지 못했어요. 인터넷 연결을 확인해 주세요.');
    return result.data.user ? { verified: true, user: { id: result.data.user.id }, source: 'supabase', access_token: data.session.access_token } : null;
  },
  async signIn(provider) {
    if (provider !== 'google') throw new Error('카카오 로그인은 아직 연결되지 않았어요. Google로 시작해 주세요.');
    const back = `${location.origin}${location.pathname}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back, queryParams: { prompt: 'select_account' } } });
    if (error) throw new Error('Google 로그인 연결에 실패했어요. 다시 시도해 주세요.');
    return new Promise(() => {});   // 페이지가 Google로 이동한다. 돌아오면 AuthGate가 세션을 다시 확인
  },
  async signOut() {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw new Error('로그아웃하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.');
  },
  subscribe: callback => { const { data } = supabase.auth.onAuthStateChange(callback); return () => data.subscription.unsubscribe(); },
} : {
  configured: false,
  async signOut() { /* 설정이 없으면 세션도 없음 */ },
  async getSession() { return null; },
  async signIn() { throw new Error('로그인 연결을 준비 중이에요. 연결 후 다시 시도해 주세요.'); },
};

export async function verifiedSession(client, signal) {
  const session = await client.getSession({ signal });
  if (signal?.aborted) return null;
  // The adapter must validate with the authentication service, not a local flag.
  return session?.verified === true && session?.user?.id ? session : null;
}
