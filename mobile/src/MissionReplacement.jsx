import React, { useRef, useState } from 'react';
import { replacementCandidates } from '../../frontend/src/utils/dailyMissions.js';
import { Label, Button, styles } from './ui';
export default function MissionReplacement({ game,id,day,onReplace,onClose,onNotice }) {
  const [revisit,setRevisit]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const locked=useRef(false),next=replacementCandidates(game,id,day,{revisit})[0];
  async function apply(){
    if(locked.current||!next)return;
    locked.current=true;setBusy(true);setError('');
    try {const result=await onReplace(id,day,{revisit});if(!result?.ok){setError(result?.message??'교체를 저장하지 못했어요. 다시 시도해 주세요.');return;}if(!result.changed){setError('현재 활동은 유지됐어요. 오늘 목록에서 다시 확인해 주세요.');return;}onNotice('다른 활동으로 바꿨어요. 준비되면 시작해요.');onClose();}
    catch{setError('교체를 저장하지 못했어요. 다시 시도해 주세요.');}finally{locked.current=false;setBusy(false);}
  }
  return <>{next?<><Label style={styles.cardTitle}>{next.name}</Label><Label style={styles.body}>{next.description}</Label><Label style={styles.small}>{next.minutes}분 안팎 · 시작 전으로 바뀌어요</Label><Button primary disabled={busy} onPress={apply}>{busy?'저장 중…':'이 활동으로 바꾸기'}</Button></>:<><Label accessibilityLiveRegion="polite" style={styles.body}>지금 조건에 맞는 다른 활동을 모두 살펴봤어요</Label><Label style={styles.body}>현재 미션은 그대로 유지돼요.</Label>{!revisit?<Button onPress={()=>setRevisit(true)}>살펴본 활동 다시 보기</Button>:<Label style={styles.small}>다시 봐도 시간·제외 조건과 오늘 완료·다른 슬롯 중복 제한에 맞는 활동이 없어요.</Label>}</>}{error&&<Label accessibilityRole="alert">{error}</Label>}</>;
}
