import { useState } from 'react';
import Mochi from '../components/Mochi.jsx';
import SubScreen from '../components/SubScreen.jsx';

const CAL = 'M3 5 H17 V17 H3Z M3 9 H17 M7 3 V6 M13 3 V6';
const STAR = 'M10 2 l2.4 5 5.4.6-4 3.7 1.1 5.4L10 14l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6Z';
const TABS = [
  { id: 'day', label: '오늘', icon: STAR },
  { id: 'week', label: '이번 주', icon: CAL },
  { id: 'month', label: '이번 달', icon: CAL },
];

const TONES = {
  green: ['#EAF7E3', '#A8D99A', '#D8F0CC'],
  blue: ['#E6F2FC', '#9CC7EC', '#D3E8FA'],
  purple: ['#EFE9FB', '#C2B2EA', '#E1D7F7'],
};
const ICONS = {
  out: 'M10 2 C6 2 3 5 3 9 C3 14 10 18 10 18 C10 18 17 14 17 9 C17 5 14 2 10 2Z',
  sun: 'M5 10 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0Z',
  book: 'M3 4 H9 C10 4 10 5 10 5 V17 C10 16 9 16 9 16 H3Z M17 4 H11 C10 4 10 5 10 5 V17 C10 16 11 16 11 16 H17Z',
};
const KIND = {
  out: { tone: 'green', icon: ICONS.out, fill: '#8CCB8F' },
  wake: { tone: 'blue', icon: ICONS.sun, fill: '#F7D35C' },
  diary: { tone: 'purple', icon: ICONS.book, fill: '#C2B2EA' },
};

// TODO: GET /users/{id}/quests/today 연결 전까지 쓰는 mock 데이터
function questLists(diaryDone) {
  return {
    day: [
      { kind: 'out', title: '잠깐 밖에 나가보기', desc: '오늘 한 번 외출했어요.', status: 'done' },
      { kind: 'wake', title: '평소 시간에 일어나기', desc: '내 리듬에 맞춰 하루를 시작해봐요.', status: 'progress', cur: 0, max: 1 },
      { kind: 'diary', title: '오늘의 하루 기록하기', desc: '지금의 하루를 남겨볼까요?', status: diaryDone ? 'done' : 'todo' },
    ],
    week: [
      { kind: 'out', title: '집 앞 산책 두 번', desc: '가까운 곳이라도 괜찮아요.', status: 'progress', cur: 1, max: 2 },
      { kind: 'wake', title: '비슷한 시간에 일어나기', desc: '이번 주 3일만 맞춰봐요.', status: 'progress', cur: 2, max: 3 },
      { kind: 'diary', title: '하루 기록 다섯 번', desc: '짧게 한 줄이어도 좋아요.', status: 'progress', cur: 3, max: 5 },
    ],
    month: [
      { kind: 'out', title: '새로운 장소 한 곳 가보기', desc: '안 가본 가게나 공원도 좋아요.', status: 'progress', cur: 0, max: 1 },
      { kind: 'wake', title: '리듬 일정한 주 두 번', desc: '한 주 동안 비슷하게 지내봐요.', status: 'progress', cur: 1, max: 2 },
      { kind: 'diary', title: '한 달 기록 열다섯 번', desc: '지난 기록을 돌아볼 수 있어요.', status: 'progress', cur: 9, max: 15 },
    ],
  };
}

const REWARDS = {
  day: ['오늘 보상', '방에 새 소품 추가!', '퀘스트를 완료하고 방을 꾸며보세요.'],
  week: ['이번 주 보상', '새 옷 한 벌', '이번 주 퀘스트를 모두 마치면 받아요.'],
  month: ['이번 달 보상', '새 방 테마', '한 달 동안 천천히 모아봐요.'],
};

const btnBase = {
  flexShrink: 0, minHeight: 40, minWidth: 76, padding: '0 12px', borderRadius: 999, fontFamily: 'Jua, sans-serif', fontSize: 15,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
};
const BTN = {
  done: { background: '#6CC36A', color: '#FFFFFF', border: '2.5px solid #3F8F3E' },
  progress: { background: '#FFFFFF', color: '#2F6FB3', border: '2.5px solid #6FA9DA' },
  todo: { background: '#6FA9DA', color: '#FFFFFF', border: '2.5px solid #3F7DB3' },
};
const BTN_LABEL = { done: '✓ 완료', progress: '진행 중', todo: '기록하기 →' };

function QuestCard({ q, petColor, onDo }) {
  const k = KIND[q.kind];
  const t = TONES[k.tone];
  const pct = q.max ? Math.round((q.cur / q.max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, background: t[0], border: `2.5px solid ${t[1]}` }}>
      <span style={{ position: 'relative', flexShrink: 0, width: 58, height: 58, borderRadius: '50%', background: t[2], border: `2px solid ${t[1]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
        <Mochi color={petColor} width={46} height={44} />
        <span style={{ position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: '50%', background: '#FFFFFF', border: '2px solid #3A3A55', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
          <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true"><path d={k.icon} fill={k.fill} stroke="#3A3A55" strokeWidth="1.6" strokeLinejoin="round" /></svg>
        </span>
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flexGrow: 1 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{q.title}</span>
        <span style={{ fontSize: 12, lineHeight: 1.4, color: '#4A4E60' }}>{q.desc}</span>
        {q.status === 'progress' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ position: 'relative', width: 84, height: 8, borderRadius: 999, background: '#FFFFFF', border: '1.5px solid #6FA9DA', overflow: 'hidden' }}>
              <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: '#6FA9DA' }} />
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#3A3A55' }}>{q.cur}/{q.max}</span>
          </div>
        )}
      </div>
      <button type="button" className="pb" disabled={q.status !== 'todo'} onClick={onDo} style={{ ...btnBase, ...BTN[q.status] }}>
        {BTN_LABEL[q.status]}
      </button>
    </div>
  );
}

export default function Quest({ petColor }) {
  const [tab, setTab] = useState('day');
  const [diaryDone, setDiaryDone] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const lists = questLists(diaryDone);
  const doneCount = lists.day.filter((q) => q.status === 'done').length;
  const canClaim = tab === 'day' && doneCount === 3 && !claimed;
  const claimLabel = claimed && tab === 'day' ? '받았어요' : canClaim ? '받기' : tab === 'day' ? `${doneCount}/3` : '예정';
  const [rewardTag, rewardTitle, rewardDesc] = REWARDS[tab];

  return (
    <SubScreen title="오늘의 퀘스트" petColor={petColor}>
      <div role="tablist" aria-label="퀘스트 기간" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, marginTop: 6, padding: '0 4px' }}>
        {TABS.map((t) => {
          const on = t.id === tab;
          return (
            <button key={t.id} type="button" role="tab" className="pb" aria-selected={on} onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 46, borderRadius: '16px 16px 0 0',
                fontSize: 15, fontWeight: 700, color: '#2E2A3A', borderBottom: 0,
                ...(on
                  ? { background: '#FFE79A', borderTop: '3px solid #E0B83A', borderLeft: '3px solid #E0B83A', borderRight: '3px solid #E0B83A', position: 'relative', zIndex: 1 }
                  : { background: '#EAF4FC', borderTop: '3px solid #8DBDE6', borderLeft: '3px solid #8DBDE6', borderRight: '3px solid #8DBDE6' }),
              }}>
              <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d={t.icon} fill="none" stroke="#3A3A55" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></svg>
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: -3, background: 'rgba(255,255,255,0.88)', border: '3px solid #8DBDE6', borderRadius: 22, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lists[tab].map((q) => (
          <QuestCard key={q.title} q={q} petColor={petColor} onDo={() => setDiaryDone(true)} />
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, background: '#FFF6D6', border: '2.5px solid #F2D27A' }}>
          <span style={{ width: 52, height: 52, borderRadius: 14, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
              <rect x="5" y="15" width="26" height="17" rx="3" fill="#F7A8BE" stroke="#B4506E" strokeWidth="2.2" />
              <rect x="3" y="10" width="30" height="7" rx="2.5" fill="#F59AB5" stroke="#B4506E" strokeWidth="2.2" />
              <path d="M18 10 V32" stroke="#B4506E" strokeWidth="2.2" />
              <path d="M18 10 C14 2 8 4 10 8 C11 10 15 10 18 10 C21 10 25 10 26 8 C28 4 22 2 18 10Z" fill="#FFFFFF" stroke="#B4506E" strokeWidth="2" />
            </svg>
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flexGrow: 1 }}>
            <span style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 700, color: '#8A6512', background: '#FBE7A6', borderRadius: 999, padding: '2px 8px' }}>{rewardTag}</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{rewardTitle}</span>
            <span style={{ fontSize: 12, color: '#4A4E60' }}>{rewardDesc}</span>
          </div>
          <button type="button" className="pb" disabled={!canClaim} onClick={() => canClaim && setClaimed(true)}
            style={{ ...btnBase, ...(canClaim
              ? { background: '#F59AB5', color: '#FFFFFF', border: '2.5px solid #C9587E' }
              : { background: '#FFFFFF', color: '#8A6512', border: '2.5px solid #F2D27A' }) }}>
            {claimLabel}
          </button>
        </div>
      </div>
    </SubScreen>
  );
}
