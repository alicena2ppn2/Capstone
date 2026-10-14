import { legacyMissionCriterion } from '../data/legacyMissionConditions.js';
// Team design for local recommendations; not a clinical assessment or server policy.
export const PREFERENCE_QUESTIONS = [
  { key:'activities', title:'요즘 다시 해보고 싶은 활동은 무엇인가요?', options:[['tidy','작은 집안일'],['hobby','취미'],['music','음악'],['reading','독서'],['outside','익숙한 곳 다녀오기'],['contact','안부·대화'],['local','생활권 소식']] },
  { key:'minutes', title:'보통 얼마 정도 시간이 편한가요?', options:[['3','1~3분'],['5','5분 안팎'],['10','10분 안팎']] },
  { key:'exclude', title:'지금은 추천받고 싶지 않은 활동이 있나요?', options:[['movement','이동·외출'],['contact','연락·대화'],['photo','사진'],['music','음악'],['reading','독서']] },
];
export function saveMissionPreferences(game, answers) {
  const valid=(key)=>Array.isArray(answers?.[key])?answers[key].filter(id=>PREFERENCE_QUESTIONS.find(q=>q.key===key).options.some(([value])=>value===id)):[];
  return {...game,preferences:{...game.preferences,missions:{...game.preferences?.missions,activities:valid('activities'),exclude:valid('exclude'),minutes:['3','5','10'].includes(answers?.minutes)?answers.minutes:undefined,reviewed:true}}};
}
const contact = new Set(['day-greet','day-nod','day-checkin','day-thanks','day-question','day-invite']);
export function activityTags(q) {
  return [...(q.activityGroup==='tidy'||q.id==='day-cup'?['tidy']:[]), ...(q.category==='outside'?['outside','movement']:[]), ...(contact.has(q.id)?['contact']:[]), ...(q.photo?['photo']:[]), ...(q.id==='day-hobby'?['hobby']:[]), ...(q.id==='day-listen'?['music']:[]), ...(q.id==='day-read'?['reading']:[]), ...(q.id==='day-local'?['local']:[])];
}
export function missionPurposes(q) {
  const tags=activityTags(q);
  if(tags.includes('contact')) return ['connection'];
  if(tags.includes('local')||tags.includes('outside')) return ['connection','discovery'];
  if(tags.some(t=>['music','reading','hobby','photo'].includes(t))) return ['taste'];
  return ['achievement'];
}
export function eligibleMission(q, preferences={}) {
  const p=preferences.missions??{}, tags=activityTags(q);
  if ((p.exclude??[]).some(tag=>tags.includes(tag))) return false;
  // Contact requires explicit interest; music/reading require interest or existing taste.
  const interests=p.activities??[];
  if(tags.includes('contact')&&!interests.includes('contact')) return false;
  if(tags.includes('music')&&!interests.includes('music')&&!preferences.music?.trim()) return false;
  if(tags.includes('reading')&&!interests.includes('reading')) return false;
  if(tags.includes('hobby')&&!interests.includes('hobby')) return false;
  return !p.minutes || q.minutes<=Number(p.minutes);
}
export function missionMode(game,q,day) {
  return game.missionModes?.[`${day}:${q.id}`]??'base';
}
export function missionCriterion(game,q,day) {
  const key=`${day}:${q.id}`,mode=missionMode(game,q,day);
  return game.activityRecords?.[key]?.criterion??q.criterion??(mode!=='base'||game.started?.includes(key)?legacyMissionCriterion(q,mode):q.description);
}
export function missionTitle(game,q,day) {
  const lightTitles={'day-tidy':'물건 하나 제자리로','day-space':'물건 하나 옮기기','day-read':'한 문단 읽기','day-cup':'컵 하나 헹구기','day-checkin':'짧은 인사 건네기'};
  return missionMode(game,q,day)==='light'?(lightTitles[q.id]??q.name):q.name;
}
export function recommendMissions(game,pool,day,seed) {
  const prefs=game.preferences??{}, interests=prefs.missions?.activities??[];
  const eligible=pool.filter(q=>q.effort<=1&&eligibleMission(q,prefs));
  const recent=Object.values(game.activityRecords??{}).filter(r=>r.day<day).sort((a,b)=>b.day.localeCompare(a.day));
  const familiarity=q=>interests.some(tag=>activityTags(q).includes(tag))||recent.some(r=>r.id===q.id);
  const burden=q=>{const last=recent.find(r=>r.id===q.id||pool.find(x=>x.id===r.id)?.activityGroup===q.activityGroup);return !!last&&game.feedback?.[`${last.day}:${last.id}`]==='hard';};
  // No automatic escalation, including after easy feedback. Neutral basics aren't called familiar.
  const rotated=[...eligible.slice(seed%Math.max(1,eligible.length)),...eligible.slice(0,seed%Math.max(1,eligible.length))];
  const ranked=rotated.sort((a,b)=>Number(burden(a))-Number(burden(b))||Number(familiarity(b))-Number(familiarity(a))||Number(a.effort===0)-Number(b.effort===0));
  const selected=[];
  for(let i=0;i<3;i++) {
    const remaining=ranked.filter(q=>!selected.some(x=>x.activityGroup===q.activityGroup));
    const used=new Set(selected.flatMap(missionPurposes));
    const q=i<2?remaining[0]:remaining.find(q=>missionPurposes(q).some(p=>!used.has(p)))??remaining[0];
    if(q)selected.push(q);
  }
  return selected.map(q=>({...q,reason:burden(q)?'부담 응답을 참고해 지금 가능한 활동을 제안해요.':familiarity(q)?'선택한 관심 활동이나 이전 기록을 이어갈 수 있어요.':'정보가 부족해 조건이 적은 기본 활동을 제안해요.'}));
}
