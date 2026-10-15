import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { G, Path, Ellipse, Circle, Defs, ClipPath } from 'react-native-svg';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Button, Card, Label, styles, FontReadyContext } from '../components/ui';
import RoomBackdrop from '../art/RoomBackdrop';
import Drawing from '../../../shared/art/IdentityReviewDrawing.jsx';
import { IDENTITY_FRIENDS, IDENTITY_PLANS, IDENTITY_NOTES } from '../../../shared/data/identityReview.js';
function Art({ friend, plan, size }) {
  return <Svg width={size} height={size * 1.05} viewBox="0 0 200 210" preserveAspectRatio="xMidYMid meet" accessibilityLabel={`${friend.name} ${plan}안`}><Drawing variant={friend.id} revision={plan} elements={{ G, Path, Ellipse, Circle, Defs, ClipPath }} /></Svg>;
}
export default function FriendIdentityReview() {
  const [mode, setMode] = useState('character'), [friendId, setFriendId] = useState(IDENTITY_FRIENDS[0].id), [plan, setPlan] = useState('B'), [size, setSize] = useState(200), [room, setRoom] = useState(false);
  const [ready, error] = useFonts({ 'A2z-400': require('../../assets/fonts/A2z-400.ttf'), 'A2z-500': require('../../assets/fonts/A2z-500.ttf'), 'A2z-600': require('../../assets/fonts/A2z-600.ttf') });
  if (!__DEV__) return <SafeAreaView style={styles.safe}><Label>개발용 비교 화면입니다.</Label></SafeAreaView>;
  if (!ready && !error) return <SafeAreaView style={styles.safe}><Label>친구를 준비하고 있어요.</Label></SafeAreaView>;
  const current = IDENTITY_FRIENDS.find(friend => friend.id === friendId);
  const rows = mode === 'character' ? IDENTITY_PLANS.map(item => ({ friend: current, plan: item.id })) : IDENTITY_FRIENDS.map(friend => ({ friend, plan }));
  return <FontReadyContext.Provider value={ready}><SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <Label style={styles.heading}>친구 개성 A/B/C 비교</Label><Label>A 원본 · B 눈과 표정 · C 체형과 자세. 게임에는 적용하지 않는 정적 시안입니다.</Label>
    <Button onPress={() => router.replace('/friend-preview')}>기존 의상·반응 비교로</Button>
    <View style={styles.wrap}><Button selected={mode === 'character'} onPress={() => setMode('character')}>캐릭터별 A/B/C</Button><Button selected={mode === 'plan'} onPress={() => setMode('plan')}>같은 안의 6종</Button></View>
    <View style={styles.wrap}>{mode === 'character' ? IDENTITY_FRIENDS.map(friend => <Button key={friend.id} selected={friendId === friend.id} onPress={() => setFriendId(friend.id)}>{friend.name}</Button>) : IDENTITY_PLANS.map(item => <Button key={item.id} selected={plan === item.id} onPress={() => setPlan(item.id)}>{item.id}안</Button>)}</View>
    <View style={styles.wrap}>{[200, 180, 110, 64, 40].map(value => <Button key={value} selected={size === value} onPress={() => setSize(value)}>{value}px</Button>)}<Button selected={room} onPress={() => setRoom(!room)}>{room ? '홈 배경 ✓' : '홈 배경'}</Button></View>
    {rows.map(({ friend, plan: revision }) => <Card key={`${friend.id}:${revision}`}><Label style={styles.cardTitle}>{friend.name} · {revision}안</Label>
      <View style={{ backgroundColor: '#EDF4F8', borderRadius: 16, ...(room ? { width: '100%', aspectRatio: 368 / 420 } : { paddingVertical: 16, alignItems: 'center' }) }}>{room && <RoomBackdrop homeScene />}<View style={room ? { position: 'absolute', bottom: '12%', alignSelf: 'center' } : undefined}><Art friend={friend} plan={revision} size={size} /></View></View>
      <Label>{revision === 'A' ? '현재 원본 그대로' : revision === 'B' ? IDENTITY_NOTES[friend.id].B : `${IDENTITY_NOTES[friend.id].B}. ${IDENTITY_NOTES[friend.id].C}`}</Label>
      <View style={[styles.wrap, { alignItems: 'flex-end' }]}>{[110, 64, 40].map(value => <View key={value}><Art friend={friend} plan={revision} size={value} /><Label style={styles.small}>{value}px</Label></View>)}</View>
    </Card>)}
  </ScrollView></SafeAreaView></FontReadyContext.Provider>;
}
