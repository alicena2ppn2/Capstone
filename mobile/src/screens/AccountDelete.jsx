// 설정 > 계정 삭제 (App Store 심사 5.1.1(v): 앱 안에서 계정을 지울 수 있어야 함). 웹 frontend/src/components/AccountDelete.jsx와 같은 흐름.
// 확인 창에서 '삭제'를 입력하면 서버의 게임 기록 전부 + Supabase 로그인 계정을 지우고,
// 휴대폰에 남은 기록·걸음 연결·예약 알림도 지운 뒤 로그아웃한다.
import React, { useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthActions } from '../../../shared/auth/AuthContext.js';
import { Label, Button, Input, Card, Sheet, styles } from '../components/ui';
import { call, useServerUserId } from '../api/server';
import { KEYS } from '../storage/storage';
import { cancelComeback } from '../notify/comeback';

const CONFIRM = '삭제';
const GONE = ['캐릭터·옷·집 꾸미기·코인·레벨', '미션·출석·걸음 기록', '일기와 사진', '이웃 방문·방명록·좋아요·친구', '로그인 계정 (Google·카카오 연결)'];
const LOCAL_EXTRA = ['mochi.steps.connected.v1'];

export default function AccountDelete() {
  const auth = useAuthActions(), userId = useServerUserId();
  const [open, setOpen] = useState(false), [typed, setTyped] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const remove = async () => {
    if (busy || typed.trim() !== CONFIRM) return;
    setBusy(true); setMessage('');
    try {
      if (userId) await call(`/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      await AsyncStorage.multiRemove([...KEYS, ...LOCAL_EXTRA]).catch(() => {});
      await cancelComeback().catch(() => {});
      setOpen(false);
      if (auth?.logout) await auth.logout();
    } catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  };
  return <Card>
    <Label style={styles.cardTitle}>계정 삭제</Label>
    <Label style={styles.body}>계정과 모든 게임 기록을 지워요. 지운 기록은 되살릴 수 없어요.</Label>
    <Button onPress={() => { setTyped(''); setMessage(''); setOpen(true); }}>계정 삭제</Button>
    {open && <Sheet title="정말 계정을 지울까요?" close={() => !busy && setOpen(false)}>
      <Label style={styles.small}>아래 기록이 모두 지워지고 되살릴 수 없어요.</Label>
      {GONE.map(item => <Label key={item} style={styles.body}>· {item}</Label>)}
      <Label style={styles.body}>확인을 위해 ‘{CONFIRM}’를 입력해 주세요</Label>
      <Input accessibilityLabel="삭제 확인" value={typed} onChangeText={setTyped} editable={!busy} autoCapitalize="none" autoCorrect={false} />
      {!!message && <Label accessibilityRole="alert" style={styles.small}>{message}</Label>}
      <View style={styles.row}>
        <Button style={styles.flex} disabled={busy} onPress={() => setOpen(false)}>취소</Button>
        <Button primary style={[styles.flex, { backgroundColor: typed.trim() === CONFIRM ? '#D9534F' : undefined, borderColor: typed.trim() === CONFIRM ? '#D9534F' : undefined }]} disabled={busy || typed.trim() !== CONFIRM} onPress={remove}>{busy ? '지우는 중…' : '영구 삭제'}</Button>
      </View>
    </Sheet>}
  </Card>;
}
