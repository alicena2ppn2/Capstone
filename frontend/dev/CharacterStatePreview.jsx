import { useEffect, useState } from 'react';
import { CHARACTERS } from '../../shared/data/characters.js';
import { FRIEND_INTROS } from '../../shared/data/catalog.js';
import { CHARACTER_VOICE_DRAFTS } from '../../shared/data/characterVoiceDrafts.js';
import { initialGame, levelFor } from '../../shared/features/game.js';
import DailySentence from '../src/components/DailySentence.jsx';
import Mochi from '../src/components/Mochi.jsx';
import './character-state-preview.css';

const STATE_KEY = 'mochi.dev.character-state.v1';
const BACKUP_KEY = 'mochi.dev.character-state.backup.v1';
const XP_FOR_LEVEL_25 = 2400;

function validGame(value) {
  return value && Number.isFinite(value.xp) && Array.isArray(value.characters);
}

function loadOrCreatePreview() {
  try {
    const existingPreview = JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null');
    const ids = CHARACTERS.map(item => item.id);
    if (validGame(existingPreview)) {
      const normalized = { ...existingPreview, xp: XP_FOR_LEVEL_25, coins: 9000, characters: [...new Set([...(existingPreview.characters ?? []), ...ids])] };
      localStorage.setItem(STATE_KEY, JSON.stringify(normalized));
      return normalized;
    }

    const sourceRaw = localStorage.getItem('mochi.game.v1');
    let source;
    try { source = JSON.parse(sourceRaw); } catch { source = null; }
    const base = validGame(source) ? source : initialGame();
    // Keep an untouched snapshot for this preview. The real game key is read-only.
    if (localStorage.getItem(BACKUP_KEY) === null) {
      localStorage.setItem(BACKUP_KEY, JSON.stringify({ game: base, source: sourceRaw === null ? 'fresh-preview' : 'local-game-copy' }));
    }
    const preview = {
      ...base,
      xp: XP_FOR_LEVEL_25,
      coins: 9000,
      characters: [...new Set([...(base.characters ?? []), ...ids])],
      character: ids.includes(base.character) ? base.character : 'potato',
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(preview));
    return preview;
  } catch {
    const base = initialGame();
    const ids = CHARACTERS.map(item => item.id);
    return { ...base, xp: XP_FOR_LEVEL_25, coins: 9000, characters: ids, character: 'potato' };
  }
}

export default function CharacterStatePreview() {
  const [game, setGame] = useState(loadOrCreatePreview);
  const [now, setNow] = useState(() => new Date());
  const [voiceIndex, setVoiceIndex] = useState(0);
  const selected = CHARACTERS.find(item => item.id === game.character) ?? CHARACTERS[0];
  const displayName = game.nicknames?.[selected.id] || selected.name;
  const level = levelFor(game.xp);
  const voices = CHARACTER_VOICE_DRAFTS[selected.id];
  const introduction = FRIEND_INTROS[selected.id]?.introduction;

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);

  const select = id => { setVoiceIndex(0); setGame(previous => {
    const next = { ...previous, character: id };
    try { localStorage.setItem(STATE_KEY, JSON.stringify(next)); } catch { /* 화면 안 상태는 유지 */ }
    return next;
  }); };
  const restore = () => {
    try {
      const backup = JSON.parse(localStorage.getItem(BACKUP_KEY) ?? 'null');
      if (!validGame(backup?.game)) return;
      localStorage.setItem(STATE_KEY, JSON.stringify(backup.game));
      setGame(backup.game);
    } catch { /* 복원할 수 없으면 현재 미리보기 상태를 유지 */ }
  };

  return <main className="dev-test-state-page">
    <div className="dev-test-state-phone">
      <header className="dev-test-state-header">
        <span>개발용 로컬 미리보기</span>
        <strong>LV.{level} · {game.coins.toLocaleString('ko-KR')} 코인</strong>
        <small>실제 게임 저장·서버 계정은 변경하지 않아요.</small>
      </header>
      <section className="dev-test-state-room" aria-label={`${displayName} 홈 미리보기`}>
        <div className="dev-test-state-window" aria-hidden="true"><span>☼</span></div>
        <div className="dev-test-state-character"><Mochi variant={selected.id} color={selected.color} full width="100%" height="100%" label={displayName} /></div>
        <strong className="dev-test-state-name">{displayName}</strong>
        <DailySentence now={now} characterId={selected.id} previewIndex={voices ? voiceIndex : undefined} />
      </section>
      <section className="dev-test-state-profile" aria-label={`${displayName} 소개와 한마디 미리보기`}>
        <strong>{selected.name} 소개</strong>
        <p>{introduction || '소개 문구가 아직 등록되지 않았어요.'}</p>
        {voices ? <div className="dev-test-state-voice-controls" aria-label="개발용 한마디 선택">
          <button type="button" onClick={() => setVoiceIndex(value => (value + voices.length - 1) % voices.length)}>이전</button>
          <span>{voiceIndex + 1} / {voices.length} · {voices[voiceIndex].theme}</span>
          <button type="button" onClick={() => setVoiceIndex(value => (value + 1) % voices.length)}>다음</button>
        </div> : <small>이 캐릭터는 날짜 기준 공통 한마디를 사용해요.</small>}
      </section>
      <section className="dev-test-state-picker" aria-label="캐릭터 선택">
        <div><strong>함께하는 친구</strong><small>{game.characters.filter(id => CHARACTERS.some(item => item.id === id)).length}/{CHARACTERS.length} 보유 · 미리보기</small></div>
        <div className="dev-test-state-list">{CHARACTERS.map(item => <button key={item.id} type="button" aria-pressed={item.id === selected.id} onClick={() => select(item.id)}>{item.name}</button>)}</div>
      </section>
      <button className="dev-test-state-restore" type="button" onClick={restore}>미리보기 전 상태 복원</button>
      <p className="dev-test-state-note">미리보기 상태는 이 브라우저의 별도 개발 저장 키에만 보관돼요. 새로고침해도 유지됩니다.</p>
    </div>
  </main>;
}
