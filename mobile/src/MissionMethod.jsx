import React from 'react';
import { View } from 'react-native';
import { Label, Button, styles } from './ui';
import { dailyActivities } from '../../frontend/src/utils/dailyMissions.js';
import { missionGuide, missionCriterion, missionMode, missionSteps, selectMissionMode } from '../../frontend/src/utils/missionGuidance.js';
export default function MissionMethod({ game,day,id,update }) {
  const q=dailyActivities(game,day).find(q=>q.id===id);if(!q)return <Label>날짜가 바뀌었어요. 오늘 목록에서 다시 열어 주세요.</Label>;
  const guide=missionGuide(q),done=game.completed.includes(`${day}:${id}`)||!!game.missionSlots?.[`${day}:slot:${q.slot}`];
  return <><Label style={styles.cardTitle}>{q.name}</Label><Label style={styles.body}>{missionCriterion(game,q,day)}</Label><Label style={styles.small}>{q.minutes}분 안팎 · 시간 제한은 없어요</Label>{missionSteps(game,q,day).map((step,i)=><Label key={step} style={styles.body}>{i+1}. {step}</Label>)}{guide.example&&<Label style={styles.body}>말해보기: “{guide.example}”</Label>}<Label style={styles.body}>{guide.condition}</Label><Label style={styles.small}>{guide.confirmation}</Label>{!q.photo&&!q.choices&&<View style={styles.wrap}>{[['base','기본 행동'],...(guide.light?[['light','더 가볍게']]:[]),['extend','조금 더 해볼래요']].map(([mode,label])=><Button key={mode} disabled={done} selected={missionMode(game,q,day)===mode} onPress={()=>update(value=>selectMissionMode(value,id,day,mode,dailyActivities(value,day)))}>{label}</Button>)}</View>}{guide.light&&<Label style={styles.body}>더 가볍게: {guide.light}</Label>}<Label style={styles.small}>방법을 바꿔도 추가 보상은 없어요.</Label></>;
}
