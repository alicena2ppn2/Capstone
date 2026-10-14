import LoginScreen from '../screens/login/LoginScreen';
import { AuthContext } from '../../../shared/auth/AuthContext.js';
import React, { useState } from 'react';
import { useFonts } from 'expo-font';
import useMobileAuthEntry from './useMobileAuthEntry';

export default function AuthGate({ children }) {
  const auth = useMobileAuthEntry();
  const [nicknameDraft,setNickname]=useState({owner:null,text:''});
  const nickname=nicknameDraft.owner===auth.supabaseUserId?nicknameDraft.text:'';
  const [preview, setPreview] = useState(false);
  const [ready, error] = useFonts({ 'A2z-400': require('../../assets/fonts/A2z-400.ttf'), 'A2z-500': require('../../assets/fonts/A2z-500.ttf'), 'A2z-600': require('../../assets/fonts/A2z-600.ttf') });
  async function logout() {
    const result = await auth.signOut();
    if (result.ok) {
      setPreview(false);
    }
    return result;
  }
  if (preview || auth.status === 'authenticated') return <AuthContext.Provider value={{ logout,backendUserId:auth.backendUserId,supabaseUserId:auth.supabaseUserId,backendNickname:auth.backendNickname,requestUser:auth.requestUser }}>{children}</AuthContext.Provider>;
  return <LoginScreen auth={auth} ready={ready} error={error} nickname={nickname} onNicknameChange={text=>setNickname({owner:auth.supabaseUserId,text})} logout={logout} onPreview={()=>setPreview(true)} />;
}
