import HelpResources from '../components/HelpResources.jsx';
import PhotoAlbum from '../components/PhotoAlbum.jsx';
import { useEffect, useRef, useState } from 'react';
import ScreenHeader from '../components/ScreenHeader.jsx';
import { calendarDays, hasJournal, JOURNAL_LIMIT, JOURNAL_EMOTIONS, journalEmotion, shiftMonth } from '../../../shared/features/journal.js';
import { DIARY_PROMPTS } from '../../../shared/data/diaryPrompts.js';
import { seoulDateKey } from '../../../shared/utils/seoulDate.js';
function DiaryEntry({ date, day, game, onSave, onDelete, onDraft, onContinue, onClose, onOpen }) {
  const savedDraft = game.journalDrafts?.[date];
  const [draft, setDraft] = useState(savedDraft?.text ?? game.journals?.[date] ?? '');
  const [emotion, setEmotion] = useState(savedDraft?.emotion ?? journalEmotion(game,date)?.id ?? '');
  const [prompt, setPrompt] = useState(savedDraft?.prompt ?? 0);
  const [status, setStatus] = useState('idle'), [message, setMessage] = useState('');
  const [beganToday]=useState(date===day);
  const busy = useRef(false), editable = date === day;
  const [conflict,setConflict]=useState(false);
  const carry=async choice=>{if(busy.current)return;busy.current=true;try{const kept=await onDraft(date,{text:draft,emotion,prompt});if(kept?.ok===false){setMessage('초안을 저장하지 못했어요. 글은 이 화면에 유지돼요.');return;}const result=await onContinue(date,seoulDateKey(),{text:draft,emotion,prompt},choice);if(result?.ok){onOpen(seoulDateKey());}else{setConflict(!!result?.conflict);setMessage(result?.message??'이어 쓰지 못했어요. 다시 시도해 주세요.');}}finally{busy.current=false;}};
  const keepDraft = (text, mood, question) => {
    const result = onDraft?.(date, { text, emotion:mood, prompt:question });
    setStatus('idle'); setMessage(result?.ok === false ? '초안을 저장하지 못했어요. 이 화면의 글은 유지돼요.' : '');
  };
  const save = async () => {
    if(busy.current || !draft.trim())return;
    if(date!==seoulDateKey()){setMessage('날짜가 바뀌었어요. 지난 날짜의 일기는 수정할 수 없어요.');return;}
    busy.current=true;setStatus('saving');setMessage('저장 중…');
    try { const result=await onSave(date,draft,emotion || undefined); if(result?.ok===false)throw Error(result.message);setStatus('saved');setMessage('이 브라우저에 저장했어요.'); }
    catch(error){setStatus('failed');setMessage(error.message || '저장하지 못했어요. 작성한 글은 그대로 있어요. 다시 시도해 주세요.');}
    finally{busy.current=false;}
  };
  return <article className="diary-entry"><header><h2>{date}</h2><button type="button" className="pb ui-secondary" onClick={onClose}>목록으로</button></header>
    {!editable&&draft.trim()&&(savedDraft||beganToday)&&<div className="diary-rollover"><p>날짜가 바뀌었어요. 작성한 글을 오늘의 일기로 이어 쓸까요?</p><p className="diary-read-text">{draft}</p>{emotion&&<p>{JOURNAL_EMOTIONS.find(e=>e.id===emotion)?.emoji}</p>}<button className="pb ui-secondary" onClick={()=>carry()}>오늘로 이어 쓰기</button><button className="pb ui-secondary" onClick={async()=>{const result=await onDraft(date,{text:draft,emotion,prompt});if(result?.ok===false)setMessage('초안을 저장하지 못했어요. 글은 이 화면에 유지돼요.');else onClose();}}>초안으로 남기기</button>{conflict&&<><p>오늘 내용은 자동으로 덮어쓰지 않아요. 지난 초안도 유지돼요.</p><button className="pb ui-secondary" onClick={()=>carry('keep')}>오늘 내용 유지</button><button className="pb ui-secondary" onClick={()=>carry('merge')}>합쳐 이어 쓰기</button></>}</div>}{editable ? <><div className="diary-prompt"><p>{DIARY_PROMPTS[prompt % DIARY_PROMPTS.length]}</p><button type="button" className="pb ui-secondary" disabled={status==='saving'} onClick={()=>{const next=(prompt+1)%DIARY_PROMPTS.length;setPrompt(next);keepDraft(draft,emotion,next);}}>다른 질문</button></div>
    <fieldset className="diary-emotions"><legend>오늘의 감정 <small>선택 사항</small></legend><div>{JOURNAL_EMOTIONS.map(item=><button type="button" className="pb ui-secondary diary-emotion" key={item.id} aria-pressed={emotion===item.id} disabled={status==='saving'} onClick={()=>{setEmotion(item.id);keepDraft(draft,item.id,prompt);}}><span aria-hidden="true">{item.emoji}</span><span>{item.label}</span></button>)}</div></fieldset>
    <label htmlFor="diary-text">오늘의 일기</label><textarea id="diary-text" maxLength={JOURNAL_LIMIT} disabled={status==='saving'} placeholder="한 줄이어도 좋아요. 자유롭게 남겨보세요." value={draft} onChange={event=>{setDraft(event.target.value);keepDraft(event.target.value,emotion,prompt);}} /><small>{draft.length} / {JOURNAL_LIMIT}</small>
    <button type="button" className="pb diary-save" disabled={!draft.trim()||status==='saving'} onClick={save}>{status==='saving'?'저장 중…':status==='failed'?'다시 저장':hasJournal(game,date)?'수정 저장':'일기 저장'}</button></> : <>{journalEmotion(game,date)&&<p>{journalEmotion(game,date).emoji} {journalEmotion(game,date).label}</p>}<p className="diary-read-text">{game.journals?.[date] ?? '남긴 일기가 없어요.'}</p><small>지난 날짜의 일기는 수정할 수 없어요. 삭제는 가능해요.</small></>}
    <HelpResources/>
    {(hasJournal(game,date)||game.journalDrafts?.[date])&&<button type="button" className="pb ui-secondary diary-delete" disabled={status==='saving'} onClick={async()=>{if(!window.confirm('이 날짜의 일기와 초안을 삭제할까요? 삭제한 글은 복구할 수 없어요.'))return;try{const result=await onDelete(date);if(result?.ok===false)throw Error(result.message);onClose();}catch(error){setMessage(error.message||'삭제하지 못했어요.');}}}>일기 삭제</button>}
    <p role="status" aria-live="polite">{message}</p>
  </article>;
}
export default function Diary({ game, day, initialDate, onSave, onDelete, onDraft, onContinue, onHome }) {
  const root=useRef(null),[mode,setMode]=useState('list'),[month,setMonth]=useState(day.slice(0,7)),[selected,setSelected]=useState(initialDate??null);
  useEffect(()=>{root.current?.closest('.phone-content')?.scrollTo({top:0});},[selected]);
  useEffect(()=>{const handler=e=>{if(e.key==='Escape')setSelected(null);};document.addEventListener('keydown',handler);return()=>document.removeEventListener('keydown',handler);},[]);
  const entries=Object.entries(game.journals??{}).filter(([,text])=>typeof text==='string'&&text.trim()).sort(([a],[b])=>b.localeCompare(a));
  return <section ref={root} className="diary-screen"><ScreenHeader title="일기" onBack={onHome}/>{selected?<DiaryEntry key={selected} date={selected} day={day} game={game} onSave={onSave} onDelete={onDelete} onDraft={onDraft} onContinue={onContinue} onOpen={setSelected} onClose={()=>setSelected(null)}/>:<><article className="diary-today"><h2>{day} · 오늘</h2><p>{hasJournal(game,day)?'오늘 남긴 일기를 다시 볼까요?':game.journalDrafts?.[day]?.text?'작성 중인 초안이 있어요.':'나의 하루를 한 편의 일기로 남겨요.'}</p><button type="button" className="pb diary-save" onClick={()=>setSelected(day)}>{hasJournal(game,day)?'오늘의 일기 보기':'오늘 일기 쓰기'}</button></article>
  <section className="diary-past-drafts">{Object.entries(game.journalDrafts??{}).filter(([date,d])=>date<day&&d?.text?.trim()).sort(([a],[b])=>b.localeCompare(a)).map(([date])=><button className="pb ui-secondary" key={date} onClick={()=>setSelected(date)}>{date} · 남겨 둔 초안</button>)}</section><nav className="diary-tabs" aria-label="일기 보기 방식">{[['list','날짜별 목록'],['calendar','월별 달력'],['photos','사진첩']].map(([id,label])=><button type="button" key={id} className="pb ui-secondary" aria-pressed={mode===id} onClick={()=>setMode(id)}>{label}</button>)}</nav>
  {mode==='photos'&&<PhotoAlbum game={game}/>}
  {mode==='calendar'&&<section className="diary-calendar"><header><button type="button" className="pb ui-secondary" onClick={()=>setMonth(value=>shiftMonth(value,-1))} aria-label="이전 달">{'<'}</button><h2>{month}</h2><button type="button" className="pb ui-secondary" onClick={()=>setMonth(value=>shiftMonth(value,1))} aria-label="다음 달">{'>'}</button></header><div className="diary-calendar-grid">{['일','월','화','수','목','금','토'].map(label=><span key={label}>{label}</span>)}{calendarDays(month).map((date,index)=>date?<button type="button" className={`pb diary-calendar-day${hasJournal(game,date)?' is-written':''}`} key={date} disabled={!hasJournal(game,date)} aria-label={`${date}, ${hasJournal(game,date)?'일기 읽기':'일기 없음'}`} onClick={()=>setSelected(date)}>{Number(date.slice(8))}<span className="diary-stamp">{hasJournal(game,date)?'✿':''}</span></button>:<span key={index}/>)}</div></section>}
  {mode!=='photos'&&<div className="diary-list">{entries.filter(([date])=>mode==='list'||date.startsWith(month)).map(([date,text])=><button type="button" className="pb diary-list-entry" key={date} onClick={()=>setSelected(date)}><strong>{date} {journalEmotion(game,date)?.emoji}</strong><span>{text.slice(0,90)}{text.length>90?'…':''}</span></button>)}{!entries.length&&<p>아직 남긴 일기가 없어요.</p>}</div>}</>}</section>;
}