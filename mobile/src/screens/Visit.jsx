import { colors } from '../../../shared/theme/tokens.js';
import useBriefFeedback from '../../../shared/hooks/useBriefFeedback.js';
import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { Label, Button, Input, Card, styles, ScreenHeader } from '../components/ui';
import Character from '../components/Character';
import RoomBackdrop from '../art/RoomBackdrop';
import { USERS, VISITOR_NOTES } from '../../../shared/features/visitors.js';
import { CLOTHES } from '../../../shared/data/clothes.js';
import { recordRoutine } from '../../../shared/features/dailyMissions.js';
import { seoulDateKey } from '../../../shared/utils/seoulDate.js';
import { violation } from '../../../shared/features/guestModeration.js';
import { visitNeighbor, favoriteNeighbor, isSampleNote } from '../../../shared/features/neighbors.js';

export default function Visit({ onBack, state, setState, commitState, name, day }) {
  const [reactionFeedback,showReactionFeedback]=useBriefFeedback();
  const reactionBusy=React.useRef(false);
  const react=async reaction=>{if(reactionBusy.current)return;reactionBusy.current=true;try{const result=await commitState(old=>old.connections.reactions[user.id]===reaction?old:{...old,connections:{...old.connections,reactions:{...old.connections.reactions,[user.id]:reaction}}});if(!result.ok)showReactionFeedback('반응을 저장하지 못했어요. 다시 눌러 시도해 주세요.',true);else if(result.changed)showReactionFeedback(reaction==='응원해요'?'응원을 남겼어요':'고마움을 남겼어요');}finally{reactionBusy.current=false;}};
  const [list, setList] = useState('recommended'), [selected, setSelected] = useState(null), [draft, setDraft] = useState('');
  const [posting,setPosting]=useState(false),[message,setMessage]=useState(''),busy=useRef(false);
  const submit=async()=>{
    if(busy.current||!draft.trim())return;
    if(violation(draft)){setMessage('혐오 표현이나 욕설이 포함되지 않도록 바꿔 주세요.');return;}
    busy.current=true;setPosting(true);
    const text=draft.trim(), date=seoulDateKey();
    const result=await commitState(old=>({...old,game:recordRoutine(old.game,'day-guestbook',date),visitNotes:{...old.visitNotes,[user.id]:[{id:`local-${Date.now()}`,name,text,date,source:'local',likes:0},...(old.visitNotes[user.id]??VISITOR_NOTES[user.id])]}}));
    if(result.ok){setDraft('');setMessage('이 기기에 저장했어요. 실제 상대에게 전달되지 않아요.');}else setMessage(result.message);
    busy.current=false;setPosting(false);
  };
  const ids = list === 'favorites' ? state.connections.favorites : list === 'recent' ? state.connections.recent : state.visitors?.ids ?? [];
  const user = USERS.find(item => item.id === selected), notes = user ? state.visitNotes[user.id] ?? VISITOR_NOTES[user.id] : [];
  const mine = Object.entries({ ...VISITOR_NOTES, ...state.visitNotes }).flatMap(([id, entries]) => entries.filter(entry => entry.source === 'local' || !isSampleNote(entry)).map(entry => ({ ...entry, neighborId: id, neighbor: USERS.find(user => user.id === id)?.nickname })));
  return <><ScreenHeader title={user ? `${user.nickname}의 방` : '이웃 방문'} onBack={() => { if(user) { setSelected(null); setDraft(''); } else onBack(); }} backLabel={user ? '이웃 목록으로 돌아가기' : '홈 화면으로 돌아가기'} /><Label style={styles.small}>샘플 이웃 · 글과 반응은 이 기기에만 저장돼요.</Label>{user ? <><View style={{ width: '100%', aspectRatio: 368 / 500 }}><RoomBackdrop homeScene decor={user.decorItems} wallColor={user.wall} floorColor={user.floor} /><View style={styles.friendPosition}><Character variant={user.variant} outfit={CLOTHES.find(c => c.id === user.outfit)} size={220} label={user.name} /></View></View><Button selected={state.connections.favorites.includes(user.id)} onPress={() => setState(old => ({ ...old, connections: favoriteNeighbor(old.connections, user.id) }))}>{state.connections.favorites.includes(user.id) ? '저장한 이웃 ✓' : '이웃 저장'}</Button><View style={styles.row}>{['응원해요', '고마워요'].map(reaction => <Button key={reaction} selected={state.connections.reactions[user.id] === reaction} onPress={() => react(reaction)}>{state.connections.reactions[user.id]===reaction ? `${reaction==='응원해요'?'응원':'감사'} 선택됨 ✓` : reaction}</Button>)}</View>{reactionFeedback&&<Label accessibilityLiveRegion="polite" style={[styles.small,reactionFeedback.error&&{color:colors.error}]}>{reactionFeedback.text}</Label>}<Input maxLength={60} accessibilityLabel="이웃 방명록" value={draft} onChangeText={setDraft} placeholder="방명록을 남겨보세요" /><Button primary disabled={posting||!draft.trim()} onPress={submit}>{posting?'저장 중…':'기기에 글 저장'}</Button><Label accessibilityLiveRegion="polite" style={styles.small}>{message}</Label>{notes.map(note => <Card key={note.id}><Label style={styles.cardTitle}>{note.name}</Label><Label style={styles.body}>{note.text}</Label><Label style={styles.small}>{note.date} · {isSampleNote(note) ? '시연 글' : '내가 작성한 글'}</Label><Button selected={!!state.visitLikes[note.id]} onPress={() => setState(old => ({ ...old, visitLikes: { ...old.visitLikes, [note.id]: !old.visitLikes[note.id] } }))}>♡ {(note.likes ?? 0) + (state.visitLikes[note.id] ? 1 : 0)}</Button></Card>)}</>
    : <><View style={styles.wrap}>{[['recommended', '오늘 추천'], ['recent', '최근 방문'], ['favorites', '저장한 이웃'], ['mine', '내가 남긴 글']].map(([id, title]) => <Button key={id} selected={list === id} onPress={() => setList(id)}>{title}</Button>)}</View>{list === 'mine' ? mine.map(note => <Card key={note.id}><Label style={styles.cardTitle}>{note.neighbor}</Label><Label>{note.text}</Label><Label style={styles.small}>{note.date}</Label><Button onPress={() => { setSelected(note.neighborId); setDraft(''); setState(old => ({ ...old, connections: visitNeighbor(old.connections, note.neighborId) })); }}>그 집 방명록 보기</Button></Card>) : ids.map(id => { const neighbor = USERS.find(user => user.id === id); return neighbor && <Card key={id}><Character variant={neighbor.variant} size={90} label={neighbor.name} /><Label style={styles.cardTitle}>{neighbor.icon} {neighbor.name} · {neighbor.nickname}</Label><Label style={styles.body}>{neighbor.detail}</Label><Button onPress={() => { setSelected(id); setDraft(''); setState(old => ({ ...old, connections: visitNeighbor(old.connections, id) })); }}>방 방문하기</Button></Card>; })}</> }</>;
}
export function Guestbook({ onBack, state, setState, name, day }) {
  const [draft, setDraft] = useState('');
  return <><ScreenHeader title="방명록" onBack={onBack} /><Label style={styles.small}>이 기기에 저장된 글 · 실제 사용자 간 공유는 아직 연결되지 않았어요.</Label><Input value={draft} accessibilityLabel="우리 집 방명록" maxLength={60} onChangeText={setDraft} placeholder="방명록을 남겨보세요" /><Button primary disabled={!draft.trim()} onPress={() => { const text = draft.trim(); setState(old => ({ ...old, homeNotes: [{ id: `local-${Date.now()}`, name, text, date: day, likes: 0, source: 'local' }, ...old.homeNotes] })); setDraft(''); }}>등록하기</Button>{state.homeNotes.map(note => <Card key={note.id}><Label style={styles.cardTitle}>{note.name}</Label><Label style={styles.body}>{note.text}</Label><Label style={styles.small}>{note.date}</Label><Button selected={!!state.homeLikes[note.id]} onPress={() => setState(old => ({ ...old, homeLikes: { ...old.homeLikes, [note.id]: !old.homeLikes[note.id] } }))}>♡ {(note.likes ?? 0) + (state.homeLikes[note.id] ? 1 : 0)}</Button></Card>)}</>;
}
