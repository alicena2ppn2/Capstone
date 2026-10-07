import React, { useState } from 'react';
import { View } from 'react-native';
import { Label, Button, Input, Card, Progress, styles } from '../ui';
import { QUESTS, selectChallenge, startQuest, completeQuest, pauseChallenge, claimGoal, questCompletionKey, goalProgress, previewReward } from '../../../frontend/src/utils/game.js';
import { saveJournal, deletedJournal } from '../../../frontend/src/utils/journal.js';
import { CATEGORIES } from '../../../frontend/src/utils/challenges.js';

export default function Quests({ game, day, update, openSheet }) {
  const [tab, setTab] = useState('day'), [expanded, setExpanded] = useState(false), [drafts, setDrafts] = useState({});
  const plan = game.challengeDays?.[day];
  const card = (q, candidate) => {
    if (!q) return null;
    const key = questCompletionKey(q, day), done = game.completed.includes(key), started = game.started.includes(key), selected = plan?.selected.includes(q.id), reward = previewReward(game, q, day);
    return <Card key={q.id}><View style={styles.row}><Label style={styles.small}>{CATEGORIES[q.category]}</Label>{candidate && <Button onPress={() => openSheet({ title: '추천 이유', text: candidate.reason })} accessibilityLabel="추천 이유">ⓘ</Button>}</View><View style={styles.row}><Label style={[styles.cardTitle, styles.flex]}>{q.name}</Label><Label style={styles.badge}>{done ? '완료 ✓' : started ? '도전 중' : selected ? '선택함' : ''}</Label></View>
      {!done && <><Label style={styles.body}>{q.description}</Label><Label style={styles.small}>{reward.xp || reward.coins ? `${reward.xp} XP · ${reward.coins} 코인` : '오늘 추가 보상 없음 · 기록은 남길 수 있어요.'}</Label>
        {selected && q.choices && <View style={styles.wrap}>{q.choices.map(choice => <Button key={choice} selected={game.challengeChoices?.[key] === choice} onPress={() => update(value => ({ ...value, challengeChoices: { ...value.challengeChoices, [key]: choice } }))}>{choice}</Button>)}</View>}
        {selected && q.input && <Input multiline accessibilityLabel="하루 기록" maxLength={80} placeholder="한 줄을 남겨주세요" value={drafts[key] ?? ''} onChangeText={text => setDrafts(value => ({ ...value, [key]: text }))} />}
        <Button primary disabled={!selected ? (plan?.selected.length ?? 0) >= 3 : q.input ? (!drafts[key]?.trim() || deletedJournal(game, day)) : !!q.choices && !game.challengeChoices?.[key]} onPress={() => update(value => !selected ? selectChallenge(value, q.id, day) : q.input || started ? completeQuest(value, q.id, new Date(), drafts[key]) : startQuest(value, q.id))}>{!selected ? '오늘의 도전 선택' : q.input ? '한 줄 저장' : started ? '해냈어요!' : '도전하기'}</Button>
        {selected && <View style={styles.row}><Button onPress={() => openSheet({ kind: 'swap', id: q.id })} style={styles.flex}>바꾸기</Button><Button onPress={() => update(value => pauseChallenge(value, q.id, day))} style={styles.flex}>나중에 하기</Button></View>}
      </>}
      {done && <Button onPress={() => openSheet({ kind: 'feedback', key, title: '오늘의 도전은 어땠나요?' })}>느낌 남기기{game.feedback?.[key] ? ` · ${{ easy: '편했어요', okay: '적당했어요', hard: '버거웠어요' }[game.feedback[key]] ?? game.feedback[key]}` : ''}</Button>}
    </Card>;
  };
  return <><Label style={styles.heading}>오늘의 도전</Label><View style={styles.wrap}>{[['day', '오늘'], ['week', '이번 주'], ['month', '이번 달'], ['records', '기록·취향']].map(([id, text]) => <Button key={id} selected={tab === id} onPress={() => setTab(id)}>{text}</Button>)}</View>
    <Button onPress={() => openSheet({ title: '보상 안내', text: '일일 도전은 하루 최대 3회 보상받아요. 익숙한 행동에도 기본 보상을 드리고, 처음 시도한 행동은 5 XP를 더 받아요. 한도 이후에는 기록만 남겨요. 교체와 보류에는 보상이 없어요.' })}>보상 안내</Button>
    {tab === 'day' ? <><Label style={styles.cardTitle}>선택한 도전</Label>{plan?.selected.length ? plan.selected.map(id => card(QUESTS.find(q => q.id === id))) : <Label style={styles.body}>오늘 해보고 싶은 도전을 골라보세요.</Label>}<Label style={styles.cardTitle}>오늘의 추천</Label>{plan?.candidates.filter(c => !plan.selected.includes(c.id)).map(c => card(QUESTS.find(q => q.id === c.id), c))}<Button onPress={() => setExpanded(value => !value)}>{expanded ? '⌃' : '⌄'} 다른 도전 찾아보기</Button>{expanded && QUESTS.filter(q => q.period === 'day' && !plan?.selected.includes(q.id)).map(q => card(q))}</>
    : tab === 'records' ? <><Label style={styles.cardTitle}>취향 프로필</Label>{[['music', '좋아하는 음악'], ['food', '좋아하는 음식']].map(([id, label]) => <Card key={id}><Label>{label}</Label><Input accessibilityLabel={label} maxLength={80} value={game.preferences?.[id] ?? ''} onChangeText={text => update(value => ({ ...value, preferences: { ...value.preferences, [id]: text } }))} /></Card>)}<Label style={styles.cardTitle}>하루 기록</Label>{Object.entries(game.journals ?? {}).sort(([a], [b]) => b.localeCompare(a)).map(([date, text]) => <Journal key={date} date={date} text={text} editable={date === day} update={update} />)}<Label style={styles.cardTitle}>활동 기록</Label>{Object.values(game.activityRecords ?? {}).sort((a, b) => b.day.localeCompare(a.day)).map(record => <Label key={`${record.day}:${record.id}`} style={styles.body}>{record.day} · {CATEGORIES[record.category]} · {QUESTS.find(q => q.id === record.id)?.name}</Label>)}</>
    : QUESTS.filter(q => q.period === tab).map(q => { const count = goalProgress(game, q, day), done = game.completed.includes(questCompletionKey(q, day)); return <Card key={q.id}><Label style={styles.cardTitle}>{q.name}</Label><Label style={styles.body}>{q.description} · 사용자 확인 기록 집계</Label><Progress value={count} max={q.target} /><Label style={styles.small}>{count} / {q.target} · {q.xp} XP · {q.coins} 코인</Label><Button primary disabled={done || count < q.target} onPress={() => update(value => claimGoal(value, q.id))}>{done ? '보상 받음 ✓' : '집계 보상 받기'}</Button></Card>; })}
  </>;
}
function Journal({ date, text, editable, update }) {
  const [draft, setDraft] = useState(text), [saved, setSaved] = useState(false);
  return <Card><Label>{date}</Label><Input multiline accessibilityLabel={`${date} 하루 기록`} editable={editable} maxLength={2000} value={draft} onChangeText={value => { setDraft(value); setSaved(false); }} /><Button disabled={!editable || !draft.trim() || draft.trim() === text} onPress={() => { update(value => saveJournal(value, date, draft)); setSaved(true); }}>기록 수정 저장</Button>{saved && <Label style={styles.small}>수정했어요.</Label>}</Card>;
}
