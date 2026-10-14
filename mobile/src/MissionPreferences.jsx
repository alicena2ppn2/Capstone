import React, { useState } from 'react';
import { View } from 'react-native';
import { PREFERENCE_QUESTIONS } from '../../frontend/src/utils/missionGuidance.js';
import { Card, Label, Button, styles } from './ui';
export default function MissionPreferences({ preferences,onSave }) {
  const [answers,setAnswers]=useState(()=>({activities:[],exclude:[],...preferences?.missions})),[saved,setSaved]=useState(false),[error,setError]=useState('');
  const save=async value=>{try{const result=await onSave(value);if(result?.ok===false){setError(result.message??'저장하지 못했어요. 다시 시도해 주세요.');return;}setError('');setAnswers(value);setSaved(true);}catch{setError('저장하지 못했어요. 다시 시도해 주세요.');}};
  const toggle=(key,id)=>{setSaved(false);setAnswers(old=>({...old,[key]:key==='minutes'?(old[key]===id?undefined:id):(old[key]??[]).includes(id)?old[key].filter(x=>x!==id):[...(old[key]??[]),id]}));};
  return <Card><Label style={styles.cardTitle}>나에게 맞는 활동</Label><Label style={styles.body}>모두 선택 사항이에요. 변경한 선호는 다음 배정과 직접 바꾸기에 반영돼요.</Label>{PREFERENCE_QUESTIONS.map(q=><View key={q.key} style={{gap:8}}><Label style={styles.body}>{q.title}</Label><View style={styles.wrap}>{q.options.map(([id,label])=><Button key={id} selected={q.key==='minutes'?answers.minutes===id:(answers[q.key]??[]).includes(id)} onPress={()=>toggle(q.key,id)}>{label}</Button>)}</View></View>)}<Button primary onPress={()=>{save(answers);}}>선호 저장</Button><Button onPress={()=>{save(preferences?.missions??{activities:[],exclude:[]});}}>건너뛰기</Button>{error&&<Label accessibilityRole="alert">{error}</Label>}{saved&&<Label accessibilityLiveRegion="polite">저장했어요. 오늘 목록은 유지돼요.</Label>}</Card>;
}
