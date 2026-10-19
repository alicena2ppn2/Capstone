import { colors } from '../../../shared/theme/tokens.js';
import { useEffect, useState } from 'react';
import Mochi from '../components/Mochi.jsx';
import SubScreen from '../components/SubScreen.jsx';
import { HeartIcon } from '../components/Icons.jsx';
import { useGuestModeration, SafetyPanel, ModerationActions, writingMessage } from '../components/GuestbookSafety.jsx';
import { SELF_AUTHOR, visibleNote, violation, suspensionUntil } from '../../../shared/features/guestModeration.js';
import { local } from '../storage/local.js';

const PER_PAGE = 4;

const LETTER_SURFACE = [colors.surface, colors.border, colors.primarySoft];

// TODO: 방명록 API 연결 전까지 쓰는 mock 데이터
const SEED = [
  { id: 'a', name: '루비', date: '2026.09.30', text: '너무 예쁜 방이에요! 항상 좋은 일만 가득하길 :)', likes: 3, color: '#F9D4E2', tone: 'pink' },
  { id: 'b', name: '준호', date: '2026.09.29', text: '오늘도 와서 구경하고 갑니다! 너무 재밌어요!!', likes: 5, color: '#D3E8FA', tone: 'blue' },
  { id: 'c', name: '하린', date: '2026.09.28', text: '방명록 처음 써봐요! 잘 부탁해요~', likes: 2, color: '#FFF1B8', tone: 'yellow' },
  { id: 'd', name: '지민', date: '2026.09.27', text: '여기 진짜 힐링된다… 다음에 또 올게요!', likes: 4, color: '#E3D9F7', tone: 'purple' },
  { id: 'e', name: '서윤', date: '2026.09.26', text: '창문 옆 화분 너무 귀여워요', likes: 6, color: '#CDEFE0', tone: 'blue' },
  { id: 'f', name: '도현', date: '2026.09.25', text: '오늘 산책 퀘스트 같이 했어요!', likes: 1, color: '#FFD9C4', tone: 'pink' },
  { id: 'g', name: '유나', date: '2026.09.24', text: '떡 색 바꾼 거 잘 어울려요 ㅎㅎ', likes: 3, color: '#F9D4E2', tone: 'yellow' },
  { id: 'h', name: '태오', date: '2026.09.23', text: '조용하고 아늑한 방이네요', likes: 2, color: '#D3E8FA', tone: 'purple' },
];

function today() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const pageBtn = { border: 0, background: 'transparent', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' };

export default function Guestbook({ level, petColor, onShop, onSettings, onHome, petName }) {
  const safety = useGuestModeration();
  const suspended = !!suspensionUntil(safety.state, SELF_AUTHOR, safety.now);
  const [entries, setEntries] = useState(() => {
    try { const value = JSON.parse(local.getItem('mochi.homeGuestbook.v1')); if (Array.isArray(value)) return value; } catch { /* 샘플 글 제공 */ }
    return SEED.map((entry, index) => ({ ...entry, variant: ['pink', 'sky', 'mint', 'lavender', 'mochi', 'potato'][index % 6] }));
  });
  const [draft, setDraft] = useState('');
  const [liked, setLiked] = useState(() => {
    try { const value = JSON.parse(local.getItem('mochi.homeGuestLikes.v1')); if (value && typeof value === 'object' && !Array.isArray(value)) return value; } catch { /* 빈 좋아요 */ }
    return {};
  });
  useEffect(() => {
    try { local.setItem('mochi.homeGuestbook.v1', JSON.stringify(entries)); local.setItem('mochi.homeGuestLikes.v1', JSON.stringify(liked)); } catch { /* 현재 화면 유지 */ }
  }, [entries, liked]);
  const [page, setPage] = useState(0);

  const visible = entries.filter(entry => visibleNote(safety.state, 'home', entry));
  const pages = Math.max(1, Math.ceil(visible.length / PER_PAGE));
  const cur = Math.min(page, pages - 1);
  const shown = visible.slice(cur * PER_PAGE, cur * PER_PAGE + PER_PAGE);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    const error = safety.validate(text);
    if (error) { safety.setMessage(writingMessage(error)); return; }
    setEntries((list) => [{ id: `m${Date.now()}`, authorId: SELF_AUTHOR, source: 'local', name: petName || '나', date: today(), text, likes: 0, color: petColor, tone: 'blue' }, ...list]);
    safety.setMessage('이 브라우저에 방명록을 기록했어요.');
    setDraft('');
    setPage(0);
  };

  return (
    <SubScreen title="방명록" plainTitle petColor={petColor} onShop={onShop} onSettings={onSettings} onHome={onHome} level={level}>
      <SafetyPanel safety={safety} showBlockedAuthors />
      <div style={{ marginTop: 4, background: colors.surface, border: `1px solid ${colors.inputBorder}`, borderRadius: 22, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 16, background: colors.primarySoft, border: `1px solid ${colors.border}` }}>
          <span style={{ position: 'relative', flexShrink: 0, width: 52, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mochi color={petColor} width={50} height={48} />
            <HeartIcon width={20} height={18} fill={colors.accent} stroke={colors.primary} strokeWidth={1.4} style={{ position: 'absolute', right: -6, top: -4 }} />
          </span>
          <input className="inp" type="text" maxLength={60} disabled={suspended} aria-label="방명록 내용" placeholder="방명록을 남겨보세요!"
            value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()}
            style={{ flex: '1 1 0', minWidth: 0, height: 44, boxSizing: 'border-box', borderRadius: 12, border: `1px solid ${colors.inputBorder}`, background: colors.surface, padding: '0 12px', font: 'inherit', fontSize: 14, color: colors.ink }} />
          <button type="button" className="pb ui-primary" onClick={submit} disabled={suspended || !draft.trim()}
            style={{ flexShrink: 0, height: 44, padding: '0 14px', borderRadius: 14, fontSize: 15 }}>
            등록하기
          </button>
        </div>

        {shown.map((e) => {
          const t = LETTER_SURFACE;
          const on = !!liked[e.id];
          const likes = e.likes + (on ? 1 : 0);
          return (
            <div key={e.id} data-note-id={e.id} className="guestbook-entry" style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 16, background: t[0], border: `1px solid ${t[1]}` }}>
              <span style={{ flexShrink: 0, width: 54, height: 54, borderRadius: '50%', background: t[2], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mochi variant={e.variant} color={e.color} width={44} height={42} />
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flexGrow: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{e.name}</span>
                  <span style={{ fontSize: 13, color: colors.muted }}>{e.date}</span>
                </div>
                <span style={{ fontSize: 14, lineHeight: 1.65 }}>{violation(e.text) ? '혐오·욕설 필터로 내용을 가렸어요.' : e.text}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                  <ModerationActions entry={e} scope="home" safety={safety} onRemove={id => setEntries(list => list.filter(entry => entry.id !== id))} />
                  <button type="button" className="pb" aria-pressed={on} aria-label={`좋아요 ${likes}개`}
                    onClick={() => setLiked((l) => ({ ...l, [e.id]: !l[e.id] }))}
                    style={{ border: 0, background: 'transparent', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: colors.ink }}>
                    <HeartIcon fill={on ? colors.primary : colors.surface} stroke={colors.primary} />{likes}
                  </button>
                  <button type="button" className="pb" aria-label="답글" style={{ border: 0, background: 'transparent', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="18" viewBox="0 0 20 18" aria-hidden="true">
                      <path d="M3 2 H17 C18 2 19 3 19 4 V11 C19 12 18 13 17 13 H8 L4 16 V13 H3 C2 13 1 12 1 11 V4 C1 3 2 2 3 2Z" fill={colors.surface} stroke={colors.primary} strokeWidth="1.8" strokeLinejoin="round" />
                      <circle cx="6" cy="7.5" r="1" fill={colors.primary} /><circle cx="10" cy="7.5" r="1" fill={colors.primary} /><circle cx="14" cy="7.5" r="1" fill={colors.primary} />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {!shown.length && <p className="guest-safety-empty">표시할 방명록이 없어요.</p>}

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: colors.primarySoft, border: `1px solid ${colors.border}`, borderRadius: 14, padding: '2px 6px' }}>
            <button type="button" className="pb" aria-label="이전 페이지" disabled={cur === 0} onClick={() => setPage(cur - 1)} style={{ ...pageBtn, opacity: cur === 0 ? 0.35 : 1 }}>
              <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><path d="M9 2 L3 7 L9 12" fill="none" stroke={colors.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <span className="jua" style={{ fontSize: 15, minWidth: 44, textAlign: 'center' }}>{cur + 1} / {pages}</span>
            <button type="button" className="pb" aria-label="다음 페이지" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} style={{ ...pageBtn, opacity: cur >= pages - 1 ? 0.35 : 1 }}>
              <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><path d="M3 2 L9 7 L3 12" fill="none" stroke={colors.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
      </div>
    </SubScreen>
  );
}
