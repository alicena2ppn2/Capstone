import { Redirect } from 'expo-router';
// AuthGate resolves the real PKCE session before this route is mounted.
export default function AuthCallback(){return <Redirect href="/"/>;}
