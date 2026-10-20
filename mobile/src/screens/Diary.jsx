import HelpResources from '../components/HelpResources';
import PhotoAlbum from './diary/PhotoAlbum';
import { colors } from '../../../shared/theme/tokens.js';
import React, { useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, Input, Label, styles, ScreenHeader } from '../components/ui';
import { calendarDays, hasJournal, shiftMonth, JOURNAL_LIMIT, JOURNAL_EMOTIONS, journalEmotion } from '../../../shared/features/journal.js';
import { DIARY_PROMPTS } from '../../../shared/data/diaryPrompts.js';
import { seoulDateKey } from '../../../shared/utils/seoulDate.js';
const WEEK=['일','월','화','수','목','금','토'];
// '2026-10-19' → { md:'10월 19일', week:'월요일', wd:'월', day:19, month:10, year:2026 }
const pretty=date=>{const [year,month,day]=date.split('-').map(Number);const wd=WEEK[new Date(year,month-1,day).getDay()];return {md:`${month}월 ${day}일`,week:`${wd}요일`,wd,day,month,year};};
// 위쪽 탭 (목록·달력·사진첩): 상점과 같은 둥근 칸 (10/19)
function Tabs({mode,setMode}){return <View accessibilityRole="tablist" style={ds.tabs}>{[['list','목록'],['calendar','달력'],['photos','사진첩']].map(([id,text])=><Pressable key={id} accessibilityRole="tab" accessibilityState={{selected:mode===id}} onPress={()=>setMode(id)} style={[ds.tab,mode===id&&ds.tabOn]}><Label style={[ds.tabText,mode===id&&ds.tabTextOn]}>{text}</Label></Pressable>)}</View>;}
function Entry({date,day,game,onDraft,onSave,onDelete,onContinue,onOpen,onClose}) {
  const saved=game.journalDrafts?.[date];
  const [draft,setDraft]=useState(saved?.text??game.journals?.[date]??''),[emotion,setEmotion]=useState(saved?.emotion??journalEmotion(game,date)?.id??''),[prompt,setPrompt]=useState(saved?.prompt??0),[status,setStatus]=useState('idle'),[message,setMessage]=useState('');
  const [beganToday]=useState(date===day);
  const busy=useRef(false),editable=date===day;
  const [conflict,setConflict]=useState(false);
  const carry=async choice=>{if(busy.current)return;busy.current=true;try{const kept=await onDraft(date,{text:draft,emotion,prompt});if(kept?.ok===false){setMessage('초안을 저장하지 못했어요. 글은 이 화면에 유지돼요.');return;}const result=await onContinue(date,seoulDateKey(),{text:draft,emotion,prompt},choice);if(result?.ok)onOpen(seoulDateKey());else{setConflict(!!result?.conflict);setMessage(result?.message??'이어 쓰지 못했어요. 다시 시도해 주세요.');}}finally{busy.current=false;}};
  const keep=async(text,mood,question)=>{setStatus('idle');const result=await onDraft(date,{text,emotion:mood,prompt:question});if(result?.ok===false)setMessage('초안을 저장하지 못했어요. 이 화면의 글은 유지돼요.');};
  const save=async()=>{if(busy.current||!draft.trim())return;if(date!==seoulDateKey()){setMessage('날짜가 바뀌었어요. 지난 일기는 읽기만 가능해요.');return;}busy.current=true;setStatus('saving');setMessage('저장 중…');try{const result=await onSave(date,draft,emotion||undefined);if(result?.ok===false)throw Error(result.message);setStatus(result?.synced===false?'failed':'saved');setMessage(result?.message??'이 기기에 저장했어요.');}catch(error){setStatus('failed');setMessage(error.message||'저장하지 못했어요. 다시 시도해 주세요.');}finally{busy.current=false;}};
  const remove=()=>{const apply=async()=>{const result=await onDelete(date);if(result?.ok===false)setMessage(result.message);else onClose();};if(Platform.OS==='web'){if(globalThis.confirm('이 날짜의 일기와 초안을 삭제할까요?'))apply();}else Alert.alert('일기 삭제','삭제한 글은 복구할 수 없어요.',[{text:'취소',style:'cancel'},{text:'삭제',style:'destructive',onPress:apply}]);};
  const when=pretty(date),mood=journalEmotion(game,date);
  return <Card style={{gap:14}}>
    <View style={styles.row}><View style={styles.flex}><Label style={ds.entryDate}>{when.md}</Label><Label style={styles.small}>{when.week}{editable?' · 오늘':''}</Label></View><Button variant="text" onPress={onClose}>목록으로</Button></View>
    {!editable&&draft.trim()&&(saved||beganToday)&&<View style={ds.notice}>
      <Label style={styles.body}>날짜가 바뀌었어요. 작성한 글을 오늘의 일기로 이어 쓸까요?</Label>
      <Label style={styles.small} numberOfLines={3}>{JOURNAL_EMOTIONS.find(e=>e.id===emotion)?.emoji} {draft}</Label>
      <Button primary onPress={()=>carry()}>오늘로 이어 쓰기</Button>
      <Button onPress={async()=>{const result=await onDraft(date,{text:draft,emotion,prompt});if(result?.ok===false)setMessage('초안을 저장하지 못했어요. 글은 이 화면에 유지돼요.');else onClose();}}>초안으로 남기기</Button>
      {conflict&&<><Label style={styles.small}>오늘 내용은 덮어쓰지 않아요. 지난 초안도 유지돼요.</Label><Button onPress={()=>carry('keep')}>오늘 내용 유지</Button><Button onPress={()=>carry('merge')}>합쳐 이어 쓰기</Button></>}
    </View>}
    {editable?<>
      <View style={ds.prompt}>
        <Label style={ds.promptCaption}>💭 오늘의 질문</Label>
        <Label style={ds.promptText}>{DIARY_PROMPTS[prompt%DIARY_PROMPTS.length]}</Label>
        <Button variant="text" style={{alignSelf:'flex-end',minHeight:36}} disabled={status==='saving'} onPress={()=>{const next=(prompt+1)%DIARY_PROMPTS.length;setPrompt(next);keep(draft,emotion,next);}}>↻ 다른 질문</Button>
      </View>
      <View style={{gap:8}}>
        <Label style={ds.fieldTitle}>오늘의 기분 <Label style={styles.small}>(선택)</Label></Label>
        <View style={ds.moods}>{JOURNAL_EMOTIONS.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{selected:emotion===item.id,disabled:status==='saving'}} disabled={status==='saving'} onPress={()=>{setEmotion(item.id);keep(draft,item.id,prompt);}} style={[ds.mood,emotion===item.id&&ds.moodOn]}><Label style={ds.moodEmoji}>{item.emoji}</Label><Label style={[ds.moodLabel,emotion===item.id&&{color:colors.primary}]} numberOfLines={1}>{item.label}</Label></Pressable>)}</View>
      </View>
      <View style={{gap:6}}>
        <Input multiline editable={status!=='saving'} maxLength={JOURNAL_LIMIT} accessibilityLabel="오늘의 일기" placeholder="한 줄이어도 좋아요. 자유롭게 남겨보세요." value={draft} onChangeText={text=>{setDraft(text);keep(text,emotion,prompt);}} style={ds.paper}/>
        <Label style={[styles.small,{textAlign:'right'}]}>{draft.length.toLocaleString('ko-KR')}/{JOURNAL_LIMIT.toLocaleString('ko-KR')}</Label>
      </View>
      <Button primary disabled={!draft.trim()||status==='saving'} onPress={save}>{status==='saving'?'저장 중…':status==='failed'?'다시 저장':hasJournal(game,date)?'수정 저장':'일기 저장'}</Button>
    </>:<>
      <View style={ds.read}>
        {!!mood&&<Label style={ds.readMood}>{mood.emoji} <Label style={styles.small}>{mood.label}</Label></Label>}
        <Label style={ds.readText}>{game.journals?.[date]??'남긴 일기가 없어요.'}</Label>
      </View>
      <Label style={styles.small}>지난 날짜의 일기는 수정할 수 없어요. 삭제는 가능해요.</Label>
    </>}
    {!!message&&<Label accessibilityLiveRegion="polite" style={[styles.small,{textAlign:'center'}]}>{message}</Label>}
    {(hasJournal(game,date)||game.journalDrafts?.[date])&&<Button variant="text" disabled={status==='saving'} onPress={remove} textStyle={{color:colors.error}}>일기 삭제</Button>}
    <HelpResources/>
  </Card>;
}
export default function Diary({onBack,game,day,initialDate,onDraft,onSave,onDelete,onContinue,scrollTop}) {
  const [mode,setMode]=useState('list'),[month,setMonth]=useState(day.slice(0,7)),[selected,setSelected]=useState(initialDate??null);
  const open=date=>{scrollTop();setSelected(date);};
  const entries=Object.entries(game.journals??{}).filter(([date,text])=>typeof text==='string'&&text.trim()&&(mode==='list'||date.startsWith(month))).sort(([a],[b])=>b.localeCompare(a));
  const today=pretty(day),wrote=hasJournal(game,day),draftToday=!!game.journalDrafts?.[day]?.text,[year,monthNum]=month.split('-').map(Number);
  return <><ScreenHeader title="일기" onBack={onBack}/>{selected?<Entry key={selected} date={selected} day={day} game={game} onDraft={onDraft} onSave={onSave} onDelete={onDelete} onContinue={onContinue} onOpen={open} onClose={()=>setSelected(null)}/>:<>
    {/* 오늘 카드: 날짜·기분 + 쓴 글 미리보기 또는 한 줄 안내 */}
    <Card style={ds.today}>
      <View style={styles.row}><View style={styles.flex}><Label style={styles.small}>오늘 · {today.week}</Label><Label style={ds.todayDate}>{today.md}</Label></View><Label style={{fontSize:34}}>{journalEmotion(game,day)?.emoji??'📔'}</Label></View>
      {wrote?<Label style={styles.body} numberOfLines={2}>{game.journals[day]}</Label>:<Label style={styles.small}>{draftToday?'작성 중인 초안이 있어요. 이어서 써 보세요.':'오늘 하루는 어땠어요? 한 줄이어도 좋아요.'}</Label>}
      <Button primary onPress={()=>open(day)}>{wrote?'오늘의 일기 보기':draftToday?'이어 쓰기':'오늘 일기 쓰기'}</Button>
    </Card>
    {Object.entries(game.journalDrafts??{}).filter(([date,d])=>date<day&&d?.text?.trim()).map(([date])=><Button key={date} onPress={()=>open(date)}>{pretty(date).md} · 남겨 둔 초안</Button>)}
    <Tabs mode={mode} setMode={setMode}/>
    {mode==='photos'&&<PhotoAlbum game={game}/>}
    {mode==='calendar'&&<Card style={{gap:10}}>
      <View style={styles.row}><Button variant="text" style={ds.arrow} accessibilityLabel="이전 달" onPress={()=>setMonth(shiftMonth(month,-1))}>‹</Button><Label style={[styles.cardTitle,styles.flex,{textAlign:'center'}]}>{year}년 {monthNum}월</Label><Button variant="text" style={ds.arrow} accessibilityLabel="다음 달" onPress={()=>setMonth(shiftMonth(month,1))}>›</Button></View>
      <View style={{flexDirection:'row',flexWrap:'wrap'}}>
        {WEEK.map((label,i)=><Label key={label} style={[ds.weekday,i===0&&{color:colors.error}]}>{label}</Label>)}
        {calendarDays(month).map((date,index)=><View key={date??index} style={ds.cell}>{date&&<Pressable accessibilityRole="button" disabled={!hasJournal(game,date)} accessibilityLabel={`${date}, ${hasJournal(game,date)?'일기 읽기':'일기 없음'}`} onPress={()=>open(date)} style={[ds.dayCell,hasJournal(game,date)&&ds.dayDone,date===day&&ds.dayToday]}>
          <Label style={[ds.dayNum,hasJournal(game,date)&&ds.dayNumDone]}>{Number(date.slice(8))}</Label>
          {hasJournal(game,date)&&<Label style={ds.stamp}>{journalEmotion(game,date)?.emoji??'✿'}</Label>}
        </Pressable>}</View>)}
      </View>
    </Card>}
    {mode!=='photos'&&entries.map(([date,text])=>{const p=pretty(date),m=journalEmotion(game,date);return <Pressable key={date} accessibilityRole="button" accessibilityLabel={`${p.md} 일기 읽기`} onPress={()=>open(date)} style={({pressed})=>[styles.card,ds.item,pressed&&{opacity:.85}]}>
      <View style={ds.dateBox}><Label style={ds.dateMonth}>{p.month}월</Label><Label style={ds.dateDay}>{p.day}</Label><Label style={ds.dateWeek}>{p.wd}</Label></View>
      <View style={[styles.flex,{gap:4}]}><Label style={styles.small}>{m?`${m.emoji} ${m.label}`:'기분 기록 없음'}</Label><Label style={styles.body} numberOfLines={2}>{text}</Label></View>
      <Label style={ds.chevron}>›</Label>
    </Pressable>;})}
    {mode!=='photos'&&!entries.length&&<View style={ds.empty}><Label style={{fontSize:36}}>✏️</Label><Label style={styles.body}>{mode==='calendar'?'이 달에는 남긴 일기가 없어요.':'아직 남긴 일기가 없어요.'}</Label><Label style={styles.small}>오늘 한 줄부터 시작해 보세요.</Label></View>}
  </>}</>;
}

const ds = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: colors.primarySoft, borderRadius: 16, padding: 4, gap: 4 },
  tab: { flex: 1, minHeight: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: .08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  tabText: { fontFamily: 'A2z-500', fontSize: 14, color: colors.muted }, tabTextOn: { color: colors.primary, fontFamily: 'A2z-600' },
  today: { gap: 10, backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  todayDate: { fontFamily: 'A2z-600', fontSize: 22, color: colors.ink },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  dateBox: { width: 52, alignItems: 'center', paddingVertical: 6, borderRadius: 12, backgroundColor: colors.primarySoft },
  dateMonth: { fontSize: 11, color: colors.primary }, dateDay: { fontFamily: 'A2z-600', fontSize: 22, lineHeight: 26, color: colors.primary }, dateWeek: { fontSize: 11, color: colors.muted },
  chevron: { fontSize: 22, color: colors.muted },
  empty: { alignItems: 'center', gap: 4, paddingVertical: 28 },
  arrow: { minWidth: 44, minHeight: 40 },
  weekday: { width: '14.2857%', textAlign: 'center', fontSize: 12, color: colors.muted, paddingBottom: 4 },
  cell: { width: '14.2857%', alignItems: 'center', paddingVertical: 3 },
  dayCell: { width: 42, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayDone: { backgroundColor: colors.primarySoft }, dayToday: { borderWidth: 2, borderColor: colors.primary },
  dayNum: { fontSize: 14, color: colors.ink }, dayNumDone: { color: colors.primary, fontFamily: 'A2z-600' }, stamp: { fontSize: 12, lineHeight: 14 },
  entryDate: { fontFamily: 'A2z-600', fontSize: 22, color: colors.ink },
  notice: { gap: 8, padding: 12, borderRadius: 14, backgroundColor: colors.warningSoft },
  prompt: { gap: 4, padding: 14, borderRadius: 16, backgroundColor: colors.primarySoft },
  promptCaption: { fontSize: 12, color: colors.primary, fontFamily: 'A2z-500' }, promptText: { fontFamily: 'A2z-500', fontSize: 16, lineHeight: 24, color: colors.ink },
  fieldTitle: { fontFamily: 'A2z-500', fontSize: 15, color: colors.ink },
  moods: { flexDirection: 'row', gap: 6 },
  mood: { flex: 1, minHeight: 64, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 2 },
  moodOn: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primarySoft },
  moodEmoji: { fontSize: 24, lineHeight: 30 }, moodLabel: { fontSize: 11, color: colors.muted },
  paper: { minHeight: 200, textAlignVertical: 'top', lineHeight: 26, backgroundColor: colors.surface },
  read: { gap: 8, padding: 14, borderRadius: 16, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  readMood: { fontSize: 22 }, readText: { fontSize: 16, lineHeight: 26, color: colors.ink },
});
