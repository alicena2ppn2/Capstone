// Expo web remains unconfigured; .native (iOS) and .android select Supabase.
export const authClient = {
  configured: false,
  async getSession() { return null; },
  async signOut() {},
  async signIn() { throw new Error('로그인 연결을 준비 중이에요. 연결 후 다시 시도해 주세요.'); },
};
