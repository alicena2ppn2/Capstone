import { useState } from 'react';
import { PREFERENCE_QUESTIONS } from '../../../shared/features/missionGuidance.js';
export default function MissionPreferences({ preferences, onSave }) {
  const [answers,setAnswers]=useState(()=>({activities:[],exclude:[],...preferences?.missions}));
  const [saved,setSaved]=useState(false);
  const [error,setError]=useState('');
  const save=async value=>{try{const result=await onSave(value);if(result?.ok===false){setError(result.message??'저장하지 못했어요. 다시 시도해 주세요.');return;}setError('');setAnswers(value);setSaved(true);}catch{setError('저장하지 못했어요. 다시 시도해 주세요.');}};
  const toggle=(key,value)=>{setSaved(false);setAnswers(old=>({...old,[key]:key==='minutes'?(old[key]===value?undefined:value):(old[key]??[]).includes(value)?old[key].filter(x=>x!==value):[...(old[key]??[]),value]}));};
  return <section className="mission-preferences settings-card"><h2>나에게 맞는 활동</h2><p>모두 선택 사항이에요. 변경한 선호는 다음 배정과 직접 바꾸기에 반영돼요.</p>{PREFERENCE_QUESTIONS.map(q=><fieldset key={q.key}><legend>{q.title}</legend><div className="mission-preference-options">{q.options.map(([id,label])=><button key={id} type="button" className="pb ui-secondary" aria-pressed={q.key==='minutes'?answers.minutes===id:(answers[q.key]??[]).includes(id)} onClick={()=>toggle(q.key,id)}>{label}</button>)}</div></fieldset>)}<div className="mission-preference-options"><button type="button" className="pb shop-buy" onClick={()=>{save(answers);}}>선호 저장</button><button type="button" className="pb ui-secondary" onClick={()=>{save(preferences?.missions??{activities:[],exclude:[]});}}>건너뛰기</button></div>{error&&<p role="alert">{error}</p>}{saved&&<p role="status">저장했어요. 오늘 목록은 유지돼요.</p>}</section>;
}
