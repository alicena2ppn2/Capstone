export const AUTH_REDIRECT = 'capstone-mochi://auth/callback';
export function callbackCode(value) {
  if (!value) return null;
  let url; try { url = new URL(value); } catch { return null; }
  const expected = new URL(AUTH_REDIRECT);
  if (url.protocol !== expected.protocol || url.host !== expected.host || url.pathname !== expected.pathname) return null;
  if (url.searchParams.has('error')) throw new Error('Google 로그인을 완료하지 못했어요. 다시 시도해 주세요.');
  return url.searchParams.get('code');
}
export function createSupabaseAuthClient({ auth, browser }) {
  let pending = false;
  let newSessionSignal = null;
  const exchanges = new Map();
  const abort = signal => { if (signal?.aborted) throw new Error('로그인을 취소했어요. 다시 시도할 수 있어요.'); };
  const exchange = (code, signal) => {
    if (exchanges.has(code)) return exchanges.get(code);
    const job = (async () => {
      abort(signal);
      const { error } = await auth.exchangeCodeForSession(code);
      if (error) throw new Error('앱 복귀 후 로그인 확인에 실패했어요. Google로 다시 시작해 주세요.');
      if (signal?.aborted) { await auth.signOut({scope:'local'}); abort(signal); }
    })();
    exchanges.set(code, job); return job;
  };
  return {
    configured: true,
    async handleCallback(url) {
      if (pending) return; // openAuthSession owns the live attempt and its cancellation.
      const code = callbackCode(url); if (code) await exchange(code);
    },
    async getSession({ signal } = {}) {
      const checkAbort = async () => {
        if (signal?.aborted && newSessionSignal === signal) {
          await auth.signOut({scope:'local'}); newSessionSignal = null;
        }
        abort(signal);
      };
      await checkAbort();
      const { data, error } = await auth.getSession();
      if (error) throw new Error('로그인 기록을 읽지 못했어요. 다시 시도해 주세요.');
      if (!data.session) return null;
      if (typeof data.session.access_token !== 'string' || !data.session.access_token) throw new Error('로그인 토큰을 확인하지 못했어요. 다시 로그인해 주세요.');
      const result = await auth.getUser(data.session.access_token);
      await checkAbort();
      if (result.error) throw new Error('로그인 상태를 확인하지 못했어요. 인터넷 연결을 확인해 주세요.');
      if(newSessionSignal===signal)newSessionSignal=null;
      return result.data.user ? {verified:true,user:{id:result.data.user.id},source:'supabase',access_token:data.session.access_token} : null;
    },
    async signIn(provider, { signal } = {}) {
      if (provider !== 'google') throw new Error('카카오 로그인은 아직 연결되지 않았어요. Google로 시작해 주세요.');
      if (pending) throw new Error('로그인 창을 닫은 뒤 다시 시도해 주세요.');
      pending = true; const close = () => browser.dismiss();
      signal?.addEventListener('abort',close,{once:true});
      try {
        abort(signal);
        const { data, error } = await auth.signInWithOAuth({provider:'google',options:{redirectTo:AUTH_REDIRECT,skipBrowserRedirect:true,queryParams:{prompt:'select_account'}}});
        abort(signal);
        if (error || !data.url) throw new Error('Google 로그인 연결에 실패했어요. 다시 시도해 주세요.');
        const result = await browser.open(data.url,AUTH_REDIRECT);
        abort(signal);
        if (result.type !== 'success') throw new Error('Google 로그인을 취소했어요. 다시 시도할 수 있어요.');
        const code = callbackCode(result.url);
        if (!code) throw new Error('앱 복귀 주소를 확인하지 못했어요. 로그인 설정을 확인해 주세요.');
        await exchange(code,signal);
        newSessionSignal=signal;
      } finally { signal?.removeEventListener('abort',close); pending = false; }
    },
    async signOut() {
      if (pending) throw new Error('로그인 창을 닫은 뒤 다시 시도해 주세요.');
      const { error } = await auth.signOut({scope:'local'});
      if (error) throw new Error('로그아웃하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.');
      newSessionSignal=null;
    },
    subscribe: callback => { const {data} = auth.onAuthStateChange(callback); return () => data.subscription.unsubscribe(); },
    startRefresh: () => auth.startAutoRefresh(),
    stopRefresh: () => auth.stopAutoRefresh(),
  };
}
