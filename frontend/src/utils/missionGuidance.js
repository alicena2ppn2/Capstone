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
const guides = {
  'day-wake':['평소 시작 행동 하나를 하면 완료예요. 기상 시간을 평가하지 않아요.',['편한 시작 행동을 골라요.','커튼 열기나 물 마시기처럼 정한 행동 하나를 해요.'],'가능한 시작 동작 하나만 해요.'],
  'day-water':['물 한 모금을 마시면 완료예요.',['편하게 마실 수 있는 물을 준비해요.','한 모금을 마셔요.']],
  'day-seasonal':['제철 음식 하나의 이름을 확인하면 완료예요. 먹거나 사지 않아도 돼요.',['관심 있는 음식 정보를 찾아요.','제철 음식 하나를 확인해요.'],'제철 음식 제목 하나를 확인해요.'],
  'day-walk':['안전한 범위에서 밖의 공기를 맡고 돌아오면 완료예요.',['나갈 수 있는 상황인지 살펴요.','편한 범위로 다녀와요.'],'문밖에서 잠깐 주변을 보고 돌아와요.'],
  'day-drink':['익숙한 가까운 장소를 잠깐 둘러보고 돌아오면 완료예요. 구매는 필요 없어요.',['평소 이용하던 가까운 장소를 골라요.','감당 가능한 범위로 다녀와요.'],'가까운 장소 앞까지만 다녀와요.'],
  'day-more-steps':['선택한 1·5·10분 목표만큼 걸으면 완료예요.',['오늘 가능한 목표를 선택해요.','안전한 범위에서 정한 만큼 걸어요.']],
  'day-door':['문밖에서 주변을 잠깐 보고 돌아오면 완료예요.',['안전하게 나갈 수 있는지 확인해요.','문밖에서 주변을 보고 돌아와요.']],
  'day-place':['익숙한 길의 다른 골목이나 쉼터 한 곳을 둘러보면 완료예요.',['가능한 가까운 장소를 골라요.','그곳을 잠깐 둘러보고 돌아와요.'],'가까운 익숙한 장소 앞까지만 다녀와요.'],
  'day-nod':['자연스러운 기회에 눈인사 한 번을 하면 완료예요.',['상대가 응대하기 편한 상황인지 살펴요.','고개로 가볍게 인사해요.'],undefined,'안녕하세요.'],
  'day-tidy': ['물건 세 개를 제자리에 놓으면 완료예요.',['작은 범위를 골라요.','안전하게 옮길 수 있는 물건 세 개를 놓아요.'],'물건 하나를 제자리에 놓아요.'],
  'day-space':['손바닥 크기 공간 한 칸을 비우면 완료예요.',['비우고 싶은 작은 공간을 골라요.','물건을 안전한 자리로 옮겨요.'],'물건 하나만 옮겨요.'],
  'day-cup':['사용한 컵 하나를 씻으면 완료예요.',['씻을 컵이 있을 때 골라요.','평소 방법으로 씻어 놓아요.'],'컵 하나를 헹궈요.'],
  'day-hobby':['내가 정한 짧은 만큼 취미를 하면 완료예요. 결과물은 필요 없어요.',['원래 즐기던 취미를 골라요.','준비 가능한 부분부터 잠깐 해요.'],'취미 도구를 꺼내거나 첫 동작 하나를 해요.'],
  'day-listen':['선택한 곡의 정한 구간을 들으면 완료예요.',['좋아하는 곡을 골라요.','편한 볼륨으로 원하는 구간을 들어요.'],'좋아하는 부분 30초를 들어요.'],
  'day-read':['짧은 글이나 책 한 쪽을 읽으면 완료예요.',['읽고 싶은 글을 골라요.','한 쪽을 읽고 여기서 마쳐도 좋아요.'],'한 문단을 읽어요.'],
  'day-local':['생활권 소식 하나의 내용을 확인하면 완료예요. 참여는 필요 없어요.',['관심 있는 공공시설 게시판이나 공식 페이지를 열어요.','소식 하나를 읽어요.'],'소식 제목 하나를 확인해요.'],
  'day-checkin':['원하는 상대에게 안부 한 번을 보내면 완료예요. 답장은 필요 없어요.',['연락하고 싶은 안전한 상대가 있는지 확인해요.','안부를 한 번 보내요.'],'편한 기회에 짧게 인사해요.','문득 생각나서 안부 남겨요.'],
  'day-greet':['자연스럽게 마주친 기회에 한 번 인사하면 완료예요.',['상대가 응대하기 편한 상황인지 살펴요.','짧게 인사해요.'],'고개로 가볍게 인사해요.','안녕하세요.'],
  'day-question':['관련 질문 하나를 남기면 완료예요. 답변은 필요 없어요.',['이용하는 관심사 공간의 규칙을 살펴요.','알고 싶은 질문 하나를 남겨요.'],'자연스러운 대화에서 관련 질문 한마디를 해요.','그중 어떤 점이 좋았어요?'],
  'day-thanks':['실제로 전하고 싶은 고마움을 한 번 표현하면 완료예요.',['고마웠던 상황이 있을 때 골라요.','말이나 메시지로 한 번 표현해요.'],'고마워요 한마디를 전해요.','아까 알려줘서 도움이 됐어요.'],
  'day-invite':['원하는 활동을 한 번 제안하면 완료예요. 성사는 필요 없어요.',['상대와 내가 원할 만한 활동을 골라요.','거절하기 편하게 한 번 제안해요.'],'관심 있는 활동 이야기를 한마디 꺼내요.','괜찮으면 다음에 같이 해볼까요?'],
};
export function missionGuide(q) {
  const g=guides[q.id];
  return {criterion:g?.[0]??q.description,steps:g?.[1]??['편한 상황과 범위를 골라요.',q.description],light:g?.[2],example:g?.[3],
    condition:contact.has(q.id)?'원하는 관계나 자연스러운 기회가 있을 때만 해요. 반복 연락이나 상대 반응은 요구하지 않아요.':q.category==='outside'?'이동과 주변 상황이 안전하고 가능한 경우에 해요.':q.id==='day-cup'?'컵과 씻을 환경이 있을 때만 해요.':q.id==='day-hobby'?'준비 가능한 기존 취미를 골라요. 비용이나 장비를 새로 마련할 필요 없어요.':'나에게 해당하지 않으면 다른 활동으로 바꿀 수 있어요.',
    confirmation:q.photo?'로컬 사진 저장 확인 · 서버 사진 인증 연결 전':'사용자 자기 확인 · 서버 확인 연결 전'};
}
export function missionMode(game,q,day) {
  return game.missionModes?.[`${day}:${q.id}`]??'base';
}
export function missionCriterion(game,q,day) {
  const guide=missionGuide(q), mode=missionMode(game,q,day);
  return mode==='light'?guide.light:mode==='extend'?`${guide.criterion} 원하면 같은 활동을 조금 더 이어 하거나 오늘 한 번 더 해요. 늘릴 범위는 내가 정해요.`:guide.criterion;
}
export function missionSteps(game,q,day) {
  return missionMode(game,q,day)==='base'?missionGuide(q).steps:['가능한 상황과 범위를 골라요.',missionCriterion(game,q,day)];
}
export function selectMissionMode(game,id,day,mode,quests) {
  const q=quests.find(q=>q.id===id),key=`${day}:${id}`;
  if(!q||game.completed?.includes(key)||game.missionSlots?.[`${day}:slot:${q.slot}`]||!['base','light','extend'].includes(mode)||q.photo||q.choices||(mode==='light'&&!missionGuide(q).light)) return game;
  return {...game,missionModes:{...game.missionModes,[key]:mode}};
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
  return selected.map(q=>({...q,reason:burden(q)?'부담 응답을 참고해 더 가볍게 할 수 있는 방법을 준비했어요.':familiarity(q)?'선택한 관심 활동이나 이전 기록을 이어갈 수 있어요.':'정보가 부족해 조건이 적은 기본 활동을 제안해요.',suggestLight:!!burden(q)&&!!missionGuide(q).light}));
}
