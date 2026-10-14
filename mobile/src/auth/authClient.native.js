import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { createClient, processLock } from '@supabase/supabase-js';
import { createSupabaseAuthClient } from './supabaseAuthCore.mjs';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const ready = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url ?? '') && key?.startsWith('sb_publishable_');
const storage = {
  getItem: name => SecureStore.getItemAsync(name),
  setItem: (name,value) => SecureStore.setItemAsync(name,value),
  removeItem: name => SecureStore.deleteItemAsync(name),
};
const supabase = ready ? createClient(url,key,{auth:{storage,storageKey:'mochi.supabase.auth.v1',flowType:'pkce',autoRefreshToken:true,persistSession:true,detectSessionInUrl:false,lock:processLock}}) : null;
export const authClient = supabase ? createSupabaseAuthClient({
  auth:supabase.auth,
  browser:{open:(address,redirect)=>WebBrowser.openAuthSessionAsync(address,redirect),dismiss:()=>{try{WebBrowser.dismissAuthSession();}catch{/* Android closes through its browser flow. */}}},
}) : {
  configured:false,
  getSession:async()=>null,
  signIn:async()=>{throw new Error('Supabase 연결 설정이 필요해요.');},
  signOut:async()=>{},
};
