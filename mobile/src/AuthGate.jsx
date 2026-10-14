import NicknameEntry from './auth/NicknameEntry';
import { colors } from '../../frontend/src/design/tokens.js';
import { AuthContext } from '../../frontend/src/auth/AuthContext.js';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Button, FontReadyContext, Label } from './ui';
import Character from './Character';
import useMobileAuthEntry from './auth/useMobileAuthEntry';

export default function AuthGate({ children }) {
  const auth = useMobileAuthEntry();
  const [nicknameDraft,setNickname]=useState({owner:null,text:''});
  const nickname=nicknameDraft.owner===auth.supabaseUserId?nicknameDraft.text:'';
  const [preview, setPreview] = useState(false);
  const [ready, error] = useFonts({ 'A2z-400': require('../assets/fonts/A2z-400.ttf'), 'A2z-500': require('../assets/fonts/A2z-500.ttf'), 'A2z-600': require('../assets/fonts/A2z-600.ttf') });
  async function logout() {
    const result = await auth.signOut();
    if (result.ok) {
      setPreview(false);
    }
    return result;
  }
  if (preview || auth.status === 'authenticated') return <AuthContext.Provider value={{ logout,backendUserId:auth.backendUserId,supabaseUserId:auth.supabaseUserId,backendNickname:auth.backendNickname,requestUser:auth.requestUser }}>{children}</AuthContext.Provider>;
  const busy = ['working','connecting','registering'].includes(auth.status),choosingNickname=['nickname','registering'].includes(auth.status);
  return <FontReadyContext.Provider value={ready}><SafeAreaView style={s.safe}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll}>
    {auth.status === 'checking' || (!ready && !error) ? <Label accessibilityRole="alert">모찌와 만날 준비를 하고 있어요…</Label> : <View style={s.content}>
      <View style={s.brand}><Label accessibilityRole="header" style={s.logo}><Label style={[s.logo,{color:colors.primary}]}>MY</Label> MOCHI</Label><Label style={s.tagline}>작은 하루를 함께하는 나의 모찌</Label></View>
      <View style={s.welcome}><Character variant="proto-pebble" size={92} label="버터 곰 밀루" /><Character variant="mochi" size={118} label="구름 모찌" /><Character variant="proto-pear" size={92} label="살구 강아지 라니" /></View>
      <View style={s.actions}>{choosingNickname?<NicknameEntry value={nickname} onChange={text=>setNickname({owner:auth.supabaseUserId,text})} onSubmit={auth.submitNickname} busy={busy} message={auth.message}/>:<>{[['kakao','카카오 로그인',require('../assets/auth/kakao.png')],['google','Google로 로그인',require('../assets/auth/google.png')]].map(([provider,label,source]) => <Pressable key={provider} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:busy}} disabled={busy} onPress={() => auth.signIn(provider)} style={({pressed,focused})=>[s.provider,provider==='kakao'?s.kakao:{height:52,backgroundColor:'#F2F2F2',borderRadius:12},pressed&&{opacity:.8},busy&&{opacity:.65},focused&&s.focus]}><Image source={source} resizeMode="contain" style={[s.image,provider==='google'&&{height:44}]} /></Pressable>)}<Label style={s.hint}>처음이라면 가입까지 한 번에 진행돼요.</Label></>}<Label accessibilityRole="alert" style={s.message}>{choosingNickname?'':auth.message || (auth.configured ? 'Google 계정으로 시작할 수 있어요.' : '로그인 연결 준비 중')}</Label>{auth.status==='connection-error'&&<><Button primary onPress={auth.retry}>계정 연결 다시 시도</Button><Button onPress={logout}>로그아웃</Button></>}{choosingNickname&&!busy&&<Button onPress={logout}>다른 계정으로 로그인</Button>}{busy&&<Button onPress={auth.cancel}>연결 취소</Button>}</View>
      <View style={s.footer}><Label style={s.small}>이용약관 · 개인정보처리방침 준비 중</Label>{__DEV__&&<><Button onPress={()=>setPreview(true)}>개발용 게임 미리보기</Button><Label style={s.small}>개발 미리보기 · 게임 기록은 이 기기에 저장돼요</Label></>}</View>
    </View>}
  </ScrollView></KeyboardAvoidingView></SafeAreaView></FontReadyContext.Provider>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},scroll:{flexGrow:1,justifyContent:'center',alignItems:'center',padding:20},content:{width:'100%',maxWidth:380,gap:20,alignItems:'center'},brand:{alignItems:'center',gap:12},logo:{fontFamily:'A2z-600',fontSize:38,lineHeight:46,color:colors.primary,letterSpacing:1},tagline:{fontSize:15,lineHeight:24,textAlign:'center'},welcome:{flexDirection:'row',alignItems:'flex-end',justifyContent:'center',backgroundColor:colors.primarySoft,borderRadius:24,paddingVertical:12,width:'100%'},actions:{width:'100%',gap:12,alignItems:'center'},provider:{width:'100%',height:52,minHeight:44,alignItems:'center',justifyContent:'center',overflow:'hidden'},kakao:{backgroundColor:'#FEE500',borderRadius:12},google:{backgroundColor:'#FFFFFF',borderColor:'#747775',borderWidth:1,borderRadius:26},image:{height:44,width:'100%'},focus:{borderWidth:3,borderColor:colors.primary},hint:{fontSize:13,lineHeight:21,textAlign:'center'},message:{fontSize:13,lineHeight:21,color:colors.muted,textAlign:'center'},footer:{alignItems:'center',gap:8},small:{fontSize:12,lineHeight:20,textAlign:'center',color:colors.muted}});
