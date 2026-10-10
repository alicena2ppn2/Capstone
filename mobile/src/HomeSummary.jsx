import React from 'react';
import { Pressable } from 'react-native';
import { Button, Card, Label, styles } from './ui';
import { homeChallenges } from '../../frontend/src/utils/homeSummary.js';

export default function HomeSummary({ game, day, onQuest }) {
  const quests = homeChallenges(game, day);
  return <><Card><Label style={[styles.cardTitle, { fontSize: 14 }]}>오늘의 도전</Label>
    {quests.length ? quests.map(quest => <Pressable key={quest.id} accessibilityRole="button" accessibilityLabel={`${quest.name}, ${quest.statusLabel}`} onPress={() => onQuest(quest.id)} style={({ focused }) => [styles.row, { minHeight: 44, borderRadius: 14, padding: 4 }, focused && styles.focused]}><Label style={[styles.body, styles.flex]}>{quest.name}</Label><Label style={[styles.state, quest.status === 'started' && styles.started, quest.status === 'done' && styles.done]}>{quest.statusLabel}{quest.status === 'done' ? ' ✓' : ''}</Label></Pressable>) : <Button onPress={() => onQuest()}>오늘 해볼 도전 고르기 ›</Button>}
  </Card></>;
}
