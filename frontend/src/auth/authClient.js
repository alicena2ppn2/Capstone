// Replace this adapter only after the team's verified session/OAuth contract exists.
// A user ID from POST /users is not an authenticated session.
export const authClient = {
  configured: false,
  async signOut() { /* No session exists until the authentication adapter is configured. */ },
  async getSession() { return null; },
  async signIn() { throw new Error('로그인 연결을 준비 중이에요. 연결 후 다시 시도해 주세요.'); },
};

export async function verifiedSession(client, signal) {
  const session = await client.getSession({ signal });
  if (signal?.aborted) return null;
  // The adapter must validate with the authentication service, not a local flag.
  return session?.verified === true && session?.user?.id ? session : null;
}
