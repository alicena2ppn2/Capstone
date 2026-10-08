import React, { useCallback, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Label, styles, FontReadyContext } from '../ui';
import { useFonts } from 'expo-font';
import Character from '../Character';
import RoomBackdrop from '../art/RoomBackdrop';
import { PROTOTYPE_FRIENDS } from '../../../frontend/src/utils/prototypeFriends.js';
import { CLOTHES } from '../../../frontend/src/utils/clothes.js';

export default function FriendPreview() {
  const [ready, error] = useFonts({ 'A2z-400': require('../../assets/fonts/A2z-400.ttf'), 'A2z-500': require('../../assets/fonts/A2z-500.ttf'), 'A2z-600': require('../../assets/fonts/A2z-600.ttf') });
  if (!ready && !error) return <SafeAreaView style={styles.safe}><Label>친구를 준비하고 있어요…</Label></SafeAreaView>;
  return <FontReadyContext.Provider value={ready}><PreviewContent /></FontReadyContext.Provider>;
}
function PreviewContent() {
  const [selected, setSelected] = useState(PROTOTYPE_FRIENDS[0].id);
  const [outfitId, setOutfitId] = useState(null);
  const [reaction, setReaction] = useState(null);
  const [sequence, setSequence] = useState(0);
  const { width } = useWindowDimensions();
  const roomWidth = Math.min(430, Math.max(240, width - 24));
  const consume = useCallback(id => setReaction(value => value === id ? null : value), []);
  const celebrate = () => { setSequence(value => value + 1); setReaction(sequence + 1); };
  const friend = PROTOTYPE_FRIENDS.find(item => item.id === selected);
  const outfit = CLOTHES.find(item => item.id === outfitId);
  if (!__DEV__) return <SafeAreaView style={styles.safe}><Label>개발용 미리보기입니다.</Label><Button onPress={() => router.replace('/')}>홈으로</Button></SafeAreaView>;
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <Label style={styles.heading}>새 친구 디자인 미리보기</Label><Label>레벨·가격 미정 · 실제 지급·저장 없음</Label><Button onPress={() => router.replace('/')}>게임으로 돌아가기</Button>
    <Label style={styles.cardTitle}>기본 모습 · 터치해서 인사하기</Label>
    <View style={[styles.wrap, { justifyContent: 'center' }]}>{PROTOTYPE_FRIENDS.map(item => <View key={item.id} style={{ alignItems: 'center' }}><Character variant={item.id} size={Math.min(110, (width - 48) / 3)} label={item.name} interactive /><Label style={styles.small}>{item.name}</Label></View>)}</View>
    {PROTOTYPE_FRIENDS.map(item => <Card key={item.id}><Label style={styles.cardTitle}>{item.name}</Label><Label>{item.introduction}</Label><Label style={styles.body}>{item.personality}{'\n'}좋아하는 것: {item.likes}{'\n'}작은 습관: {item.habit}</Label><Button selected={item.id === selected} onPress={() => { setSelected(item.id); setReaction(null); }}>방에서 보기</Button><View style={styles.wrap}>{CLOTHES.map(clothing => <View key={clothing.id} style={{ alignItems: 'center' }}><Character variant={item.id} outfit={clothing} size={120} label={`${item.name}, ${clothing.name}`} /><Label style={styles.small}>{clothing.name}</Label></View>)}</View></Card>)}
    <Label style={styles.cardTitle}>실제 홈 크기 · 의상 및 축하 반응</Label>
    <View style={styles.wrap}><Button selected={!outfitId} onPress={() => setOutfitId(null)}>기본 모습</Button>{CLOTHES.map(item => <Button key={item.id} selected={outfitId === item.id} onPress={() => { if (outfitId !== item.id) celebrate(); setOutfitId(item.id); }}>{item.name}</Button>)}</View>
    <View style={[styles.room, { width: roomWidth, aspectRatio: 368 / 500 }]}><RoomBackdrop homeScene /><View style={styles.friendPosition}><Character variant={selected} outfit={outfit} size={Math.min(roomWidth * .66, 248)} label={friend.name} interactive reactionId={reaction} onConsumed={consume} /></View><View style={styles.identity}><Label style={styles.cardTitle}>{friend.name}</Label></View></View>
    <Button primary onPress={celebrate}>완료 성공 반응 시연</Button>
    <Card><Label style={styles.cardTitle}>상점 카드</Label><View style={styles.center}><Character variant={selected} outfit={outfit} size={130} label={friend.name} /></View><Label style={styles.cardTitle}>{friend.name}</Label><Label>{friend.introduction}</Label><Button disabled>레벨·가격 미정</Button></Card>
    <Label style={styles.cardTitle}>작은 프로필 40 / 64</Label><View style={styles.wrap}><Character variant={selected} size={40} label={friend.name} /><Character variant={selected} size={64} label={friend.name} /></View>
  </ScrollView></SafeAreaView>;
}
