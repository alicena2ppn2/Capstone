import React from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, Label, styles } from './ui';
import Character from './Character';
import RoomBackdrop from './art/RoomBackdrop';
import { homeChallenges } from '../../frontend/src/utils/homeSummary.js';
import { levelFor } from '../../frontend/src/utils/game.js';

export default function HomeSummary({ game, day, target, onQuest, onShop }) {
  const quests = homeChallenges(game, day);
  return <><Card><Label style={[styles.cardTitle, { fontSize: 14 }]}>오늘의 도전</Label>
    {quests.length ? quests.map(quest => <Pressable key={quest.id} accessibilityRole="button" accessibilityLabel={`${quest.name}, ${quest.statusLabel}`} onPress={() => onQuest(quest.id)} style={({ focused }) => [styles.row, { minHeight: 44, borderRadius: 14, padding: 4 }, focused && styles.focused]}><Label style={[styles.body, styles.flex]}>{quest.name}</Label><Label style={[styles.state, quest.status === 'started' && styles.started, quest.status === 'done' && styles.done]}>{quest.statusLabel}{quest.status === 'done' ? ' ✓' : ''}</Label></Pressable>) : <Button onPress={() => onQuest()}>오늘 해볼 도전 고르기 ›</Button>}
  </Card>{target ? <Pressable accessibilityRole="button" accessibilityLabel={`목표 상품 ${target.name}, 상점에서 보기`} onPress={onShop} style={({ focused }) => [styles.card, styles.row, focused && styles.focused]}>
    <View style={{ width: 64, height: 72, overflow: 'hidden', borderRadius: 12, backgroundColor: '#F1EDF6', justifyContent: 'center', alignItems: 'center' }}>{target.kind === 'decor' ? <RoomBackdrop homeScene decor={{ [target.slot]: target.id }} /> : <Character variant={target.kind === 'character' ? target.id : game.character} size={64} outfit={target.kind === 'clothes' ? target : undefined} label={target.name} />}</View>
    <View style={[styles.flex, { gap: 3 }]}><Label style={styles.small}>갖고 싶은 아이템</Label><Label style={[styles.cardTitle, { fontSize: 15 }]}>{target.name}</Label>{target.complete ? <Label style={[styles.state, styles.done]}>획득 완료 ✓</Label> : <><Label style={[styles.small, { color: target.coinsNeeded ? '#725B2C' : '#526A4E' }]}>코인 {game.coins.toLocaleString('ko-KR')} / {target.price.toLocaleString('ko-KR')}{target.coinsNeeded ? '' : ' · 충족 ✓'}</Label><Label style={[styles.small, { color: target.levelsNeeded ? '#725B2C' : '#526A4E' }]}>레벨 {levelFor(game.xp)} / {target.level}{target.levelsNeeded ? '' : ' · 충족 ✓'}</Label></>}</View><Label>›</Label>
  </Pressable> : <Button onPress={onShop}>갖고 싶은 아이템 골라보기 ›</Button>}</>;
}
