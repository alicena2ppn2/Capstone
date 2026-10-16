import { BASIC_FRIEND_DRAFTS } from '../../../shared/data/characterExpansion.js';
import React, { useState } from 'react';
import { CLOTHES } from '../../../shared/data/clothes.js';
import Baseline from '../../../shared/art/PrototypeFriendBaseline.jsx';
import Svg, { G, Path, Ellipse, Circle } from 'react-native-svg';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Label, styles, FontReadyContext } from '../components/ui';
import { useFonts } from 'expo-font';
import Character from '../components/Character';
import RoomBackdrop from '../art/RoomBackdrop';
import { PROTOTYPE_FRIENDS } from '../../../shared/data/prototypeFriends.js';
const FRIENDS = [{ id: 'mochi', name: '구르미' }, { id: 'lavender', name: '양양이' }, ...PROTOTYPE_FRIENDS, ...BASIC_FRIEND_DRAFTS];
export default function FriendPreview() {
  const [outfitId, setOutfitId] = useState('');
  const [reactionId, setReactionId] = useState(null);
  const outfit = CLOTHES.find(item => item.id === outfitId);
  const [ready, error] = useFonts({ 'A2z-400': require('../../assets/fonts/A2z-400.ttf'), 'A2z-500': require('../../assets/fonts/A2z-500.ttf'), 'A2z-600': require('../../assets/fonts/A2z-600.ttf') });
  if (!ready && !error) return <SafeAreaView style={styles.safe}><Label>친구를 준비하고 있어요…</Label></SafeAreaView>;
  return <FontReadyContext.Provider value={ready}><SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}><Label style={styles.heading}>친구 외형·의상·반응 비교</Label><Label>승인된 친구는 의상·반응 유지. 신규 메루·도토·포포는 기본 외형만 비교 (지급·구매 없음).</Label><Button onPress={() => router.replace('/')}>게임으로 돌아가기</Button>{__DEV__ && <Button onPress={() => router.push('/friend-identity-review')}>친구 개성 A/B/C 비교</Button>}<View style={styles.wrap}><Button onPress={() => setOutfitId('')}>기본 모습</Button>{CLOTHES.map(item => <Button key={item.id} onPress={() => { setOutfitId(item.id); setReactionId(Date.now()); }}>{item.name}</Button>)}<Button onPress={() => setReactionId(Date.now())}>축하 반응</Button></View>{__DEV__ && FRIENDS.map(item => <Card key={item.id}><Label style={styles.cardTitle}>{item.name}</Label>{item.stage && <Label style={styles.small}>최종 외형</Label>}<View style={[styles.center, { backgroundColor: '#EDF4F8', borderRadius: 16 }]}><Character variant={item.id} size={200} outfit={outfit} interactive reactionId={reactionId} onConsumed={() => setReactionId(null)} label={item.name} /></View><Label style={styles.body}>{item.introduction ?? item.background ?? '기존 그림체 기준'}</Label><View style={[styles.wrap, { alignItems: 'center' }]}>{[110,64,40].map(size => <Character key={size} variant={item.id} size={size} outfit={outfit} label={`${item.name} ${size}px`} />)}</View><View style={{ width: '100%', aspectRatio: 368 / 500 }}><RoomBackdrop homeScene /><View style={styles.friendPosition}><Character variant={item.id} size={220} outfit={outfit} label={item.name} /></View></View></Card>)}{__DEV__ && PROTOTYPE_FRIENDS.map(item => <Card key={`baseline-${item.id}`}><Label>{item.name} · 승인된 기본 / 현재 기본</Label><View style={styles.wrap}><Svg width={140} height={147} viewBox="0 0 200 210"><Baseline variant={item.id} elements={{ G, Path, Ellipse, Circle }} /></Svg><Character variant={item.id} size={140} /></View><Label>모든 의상</Label><View style={styles.wrap}>{CLOTHES.map(clothes => <View key={clothes.id}><Character variant={item.id} size={140} outfit={clothes} /><Label>{clothes.name}</Label></View>)}</View></Card>)}</ScrollView></SafeAreaView></FontReadyContext.Provider>;
}
