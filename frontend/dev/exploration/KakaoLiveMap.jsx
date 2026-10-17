import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import Mochi from '../../src/components/Mochi.jsx';
import { clearLocationWatch, watchCurrentLocation } from './realLocation.mjs';
import { loadKakaoMapsSdk } from './kakaoMaps.mjs';
import { createLivePlaceMarkers } from './livePlaceMarkers.mjs';
import { distanceMeters, LIVE_PLACES, NEARBY_METERS, NOTE_LIMIT, readLocalNotes, REVIEW_REGION, writeLocalNotes } from './livePlaces.mjs';
import Postit from './PreviewPostit.jsx';

const MAP_KEY = import.meta.env.VITE_KAKAO_MAP_JS_KEY?.trim() ?? '';
const POOR_ACCURACY_METERS = 100;
const STALE_AFTER_MS = 30000;

function characterMarkup(character) {
  return renderToStaticMarkup(<Mochi variant={character} full width={54} height={58} active={false} label="현재 위치의 모찌" />);
}

function savedNotes() {
  try { return readLocalNotes(window.localStorage); } catch { return []; }
}

function noteDate(value) {
  if (!value) return '이 기기에 저장';
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeZone: 'Asia/Seoul' }).format(new Date(value));
}

export default function KakaoLiveMap({ character, onBackToExample }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const markerContentRef = useRef(null);
  const sdkRef = useRef(null);
  const watchRef = useRef(null);
  const dragListenerRef = useRef(null);
  const tilesListenerRef = useRef(null);
  const mapLoadTimerRef = useRef(null);
  const lastPannedRef = useRef(null);
  const animationRef = useRef(null);
  const placesRef = useRef(null);
  const noteOpenerRef = useRef(null);
  const noteCloseRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [sdkState, setSdkState] = useState(MAP_KEY ? 'loading' : 'missing-key');
  const [sdkAttempt, setSdkAttempt] = useState(0);
  const [locationState, setLocationState] = useState('idle');
  const [fix, setFix] = useState(null);
  const [follow, setFollow] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const [viewRegion, setViewRegion] = useState('review');
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [notePlaceId, setNotePlaceId] = useState(null);
  const [localNotes, setLocalNotes] = useState(savedNotes);
  const [noteDraft, setNoteDraft] = useState('');
  const [paperColor, setPaperColor] = useState('yellow');
  const [sticker, setSticker] = useState('♡');
  const [reactions, setReactions] = useState({});
  const [noteError, setNoteError] = useState('');

  useEffect(() => {
    if (!MAP_KEY) return undefined;
    let mounted = true;
    setSdkState('loading');
    loadKakaoMapsSdk(MAP_KEY).then(sdk => {
      if (mounted) {
        sdkRef.current = sdk;
        setSdkState('ready');
      }
    }).catch(() => {
      if (mounted) {
        setSdkState('error');
        setError('카카오 지도를 불러오지 못했어요. JavaScript 키, 지도 사용 설정, 등록 도메인을 확인해 주세요.');
      }
    });

    return () => {
      mounted = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (dragListenerRef.current && mapRef.current && sdkRef.current) {
        sdkRef.current.event.removeListener(mapRef.current, 'dragstart', dragListenerRef.current);
      }
      if (tilesListenerRef.current && mapRef.current && sdkRef.current) {
        sdkRef.current.event.removeListener(mapRef.current, 'tilesloaded', tilesListenerRef.current);
      }
      window.clearTimeout(mapLoadTimerRef.current);
      placesRef.current?.dispose();
      placesRef.current = null;
      markerRef.current?.setMap(null);
      markerRef.current = null;
      markerContentRef.current = null;
      mapRef.current = null;
      lastPannedRef.current = null;
      sdkRef.current = null;
    };
  }, [sdkAttempt]);

  useEffect(() => {
    if (!started) return undefined;
    let mounted = true;
    let errorBlocked = false;
    const geolocation = navigator.geolocation;
    const stopLocation = () => {
      clearLocationWatch(geolocation, watchRef.current);
      watchRef.current = null;
    };
    const startLocation = () => {
      if (!mounted || watchRef.current !== null || errorBlocked) return;
      setLocationState('requesting');
      setError('');
      try {
        watchRef.current = watchCurrentLocation(
          geolocation,
          position => {
            if (!mounted) return;
            setFix(position);
            setNow(Date.now());
            setLocationState('watching');
          },
          (locationError, message) => {
            if (!mounted) return;
            errorBlocked = true;
            setError(message);
            setLocationState(locationError?.code === 1 ? 'denied' : 'error');
            stopLocation();
          },
        );
      } catch {
        errorBlocked = true;
        setLocationState('error');
        setError('이 브라우저에서는 위치 확인을 지원하지 않아요. 예시 지도를 이용해 주세요.');
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        stopLocation();
        if (!errorBlocked) setLocationState('paused');
      } else startLocation();
    };
    startLocation();
    document.addEventListener('visibilitychange', onVisibilityChange);

    const freshnessTimer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => {
      mounted = false;
      window.clearInterval(freshnessTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      stopLocation();
    };
  }, [started]);

  useEffect(() => {
    const sdk = sdkRef.current;
    const container = containerRef.current;
    if (!sdk || !container || sdkState !== 'ready') return;
    const position = fix ? new sdk.LatLng(fix.latitude, fix.longitude) : null;
    if (!mapRef.current) {
      const center = position ?? new sdk.LatLng(REVIEW_REGION.latitude, REVIEW_REGION.longitude);
      const map = new sdk.Map(container, { center, level: position ? 4 : 6, draggable: true, scrollwheel: true });
      mapRef.current = map;
      if (position) setViewRegion('my');
      placesRef.current = createLivePlaceMarkers(sdk, map, {
        onSelect: id => { setSelectedPlaceId(id); setFollow(false); },
        onOpenNotes: (id, opener) => openNotes(id, opener),
        onOpenGroup: () => {
          setFollow(false);
          setViewRegion('review');
          map.setLevel(3);
          map.panTo(new sdk.LatLng(37.565981, 126.977939));
        },
      });
      dragListenerRef.current = () => { setFollow(false); setViewRegion('browse'); };
      sdk.event.addListener(map, 'dragstart', dragListenerRef.current);
      let tilesLoaded = false;
      tilesListenerRef.current = () => {
        tilesLoaded = true;
        window.clearTimeout(mapLoadTimerRef.current);
      };
      sdk.event.addListener(map, 'tilesloaded', tilesListenerRef.current);
      mapLoadTimerRef.current = window.setTimeout(() => {
        if (!tilesLoaded) {
          setSdkState('error');
          setError('지도 타일이 표시되지 않아요. Kakao Maps 사용 설정과 JavaScript SDK 도메인을 확인해 주세요.');
        }
      }, 12000);
      lastPannedRef.current = fix;
    }

    if (!position) return;
    if (!markerRef.current) {
      const markerContent = document.createElement('div');
      markerContent.className = 'live-character-marker';
      markerContent.innerHTML = `<span class="live-marker-art">${characterMarkup(character)}</span><span class="live-marker-label">내 위치</span>`;
      markerContentRef.current = markerContent;
      markerRef.current = new sdk.CustomOverlay({ position, content: markerContent, yAnchor: 1.08, zIndex: 10, clickable: false });
      markerRef.current.setMap(mapRef.current);
    } else {
      const previous = markerRef.current.getPosition();
      const previousCoords = { latitude: previous.getLat(), longitude: previous.getLng() };
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const startedAt = performance.now();
      const duration = reduceMotion || distanceMeters(previousCoords, fix) < 8 ? 0 : 350;
      const moveMarker = time => {
        const progress = duration === 0 ? 1 : Math.min(1, (time - startedAt) / duration);
        const eased = 1 - (1 - progress) ** 3;
        markerRef.current?.setPosition(new sdk.LatLng(
          previousCoords.latitude + (fix.latitude - previousCoords.latitude) * eased,
          previousCoords.longitude + (fix.longitude - previousCoords.longitude) * eased,
        ));
        if (progress < 1) animationRef.current = requestAnimationFrame(moveMarker);
        else animationRef.current = null;
      };
      if (duration === 0) moveMarker(startedAt);
      else animationRef.current = requestAnimationFrame(moveMarker);
    }

    if (follow && (!lastPannedRef.current || distanceMeters(lastPannedRef.current, fix) >= 12)) {
      mapRef.current.panTo(position);
      lastPannedRef.current = fix;
      setViewRegion('my');
    }
  }, [sdkState, fix, follow, character]);

  useEffect(() => { placesRef.current?.select(selectedPlaceId); }, [selectedPlaceId, sdkState]);

  useEffect(() => {
    const art = markerContentRef.current?.querySelector('.live-marker-art');
    if (art) art.innerHTML = characterMarkup(character);
  }, [character]);

  useEffect(() => {
    if (!notePlaceId) return undefined;
    const previous = document.activeElement;
    noteCloseRef.current?.focus({ preventScroll: true });
    const onKey = event => { if (event.key === 'Escape') setNotePlaceId(null); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const target = noteOpenerRef.current?.isConnected ? noteOpenerRef.current : previous;
      target?.focus?.({ preventScroll: true });
    };
  }, [notePlaceId]);

  function openNotes(placeId, opener) {
    noteOpenerRef.current = opener;
    setSelectedPlaceId(placeId);
    setNoteError('');
    setNotePlaceId(placeId);
  }

  function saveNote(event) {
    event.preventDefault();
    const text = noteDraft.trim();
    if (!notePlaceId || !text || text.length > NOTE_LIMIT) return;
    const item = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      placeId: notePlaceId, text, color: paperColor, sticker,
      createdAt: new Date().toISOString(),
    };
    const next = [...localNotes, item];
    try {
      writeLocalNotes(window.localStorage, next);
      setLocalNotes(next);
      setNoteDraft('');
      setNoteError('이 기기에 쪽지를 저장했어요. 다른 사용자에게는 보이지 않아요.');
    } catch {
      setNoteError('이 브라우저에 저장하지 못했어요. 작성한 글은 그대로 두었으니 다시 시도해 주세요.');
    }
  }

  function deleteNote(id) {
    const next = localNotes.filter(item => item.id !== id);
    try {
      writeLocalNotes(window.localStorage, next);
      setLocalNotes(next);
      setNoteError('이 기기에서 쪽지를 삭제했어요.');
    } catch {
      setNoteError('삭제 내용을 저장하지 못했어요. 다시 시도해 주세요.');
    }
  }

  function reactTo(id) {
    setReactions(current => ({ ...current, [id]: current[id] === 'heart' ? undefined : 'heart' }));
  }

  function start() {
    if (!MAP_KEY) return;
    if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      setLocationState('error');
      setError('브라우저 위치 권한은 HTTPS 또는 localhost에서 사용할 수 있어요.');
      return;
    }
    setStarted(true);
  }

  function retry() {
    setError('');
    if (sdkState === 'error') setSdkAttempt(value => value + 1);
    if (locationState === 'denied' || locationState === 'error') {
      setStarted(false);
      window.setTimeout(() => setStarted(true), 0);
    }
  }

  function returnToMyLocation() {
    if (!fix || !mapRef.current || !sdkRef.current) return;
    setFollow(true);
    setViewRegion('my');
    setSelectedPlaceId(null);
    lastPannedRef.current = fix;
    mapRef.current.panTo(new sdkRef.current.LatLng(fix.latitude, fix.longitude));
  }

  function showReviewRegion() {
    if (!mapRef.current || !sdkRef.current) return;
    setFollow(false);
    setViewRegion('review');
    mapRef.current.setLevel(6);
    mapRef.current.panTo(new sdkRef.current.LatLng(REVIEW_REGION.latitude, REVIEW_REGION.longitude));
  }

  const stale = fix && now - fix.timestamp > STALE_AFTER_MS;
  const poorAccuracy = fix && fix.accuracy > POOR_ACCURACY_METERS;
  const selectedPlace = LIVE_PLACES.find(place => place.id === selectedPlaceId);
  const notePlace = LIVE_PLACES.find(place => place.id === notePlaceId);
  const nearRegisteredPlace = fix && LIVE_PLACES.some(place => distanceMeters(fix, place) <= NEARBY_METERS);
  const portalTarget = typeof document === 'undefined' ? null : document.querySelector('.prototype');

  return <><section className="live-map-panel" aria-label="실제 위치 지도">
    <div className="live-map-toolbar">
      <span className="live-mode-badge">카카오 지도 · 검토용 장소</span>
      <button className="text-button live-back" type="button" onClick={onBackToExample}>예시 지도</button>
    </div>
    {!started && <div className="live-map-intro">
      <button className="primary a-wide" type="button" disabled={!MAP_KEY} onClick={start}>내 위치로 시작</button>
      <small>위치 표시는 선택 사항이에요. 서버에 저장하지 않아요.</small>
      {!MAP_KEY && <p className="live-config-note" role="status">카카오 지도 JavaScript 키 설정이 필요해요. 예시 지도를 계속 이용할 수 있어요.</p>}
    </div>}
    {(started || sdkState !== 'ready') && <div className="live-map-status" role="status">
        {locationState === 'requesting' && '위치 권한을 확인하고 있어요…'}
        {locationState === 'watching' && !stale && !poorAccuracy && `내 위치 표시 중 · 정확도 약 ${Math.round(fix.accuracy)}m`}
        {locationState === 'watching' && poorAccuracy && `위치 정확도가 낮아요 · 약 ${Math.round(fix.accuracy)}m`}
        {locationState === 'watching' && stale && '마지막 위치가 오래됐어요. 위치 갱신을 기다리고 있어요.'}
        {locationState === 'paused' && '화면이 숨겨져 위치 확인을 멈췄어요. 돌아오면 다시 확인해요.'}
        {locationState === 'denied' && error}
        {locationState === 'error' && error}
        {sdkState === 'loading' && '카카오 지도를 불러오고 있어요…'}
        {sdkState === 'error' && error}
      </div>}
      {sdkState === 'ready' && <div className="live-map-frame">
        <div ref={containerRef} className="live-kakao-map" aria-label="카카오 지도와 검토용 장소" />
        <span className="live-map-caption">{viewRegion === 'review' ? '서울 검토 지역 · 실제 장소 3곳' : viewRegion === 'my' ? '내 위치 · 등록 장소만 표시' : '지도 둘러보는 중'}</span>
      </div>}
      {sdkState === 'ready' && <div className="live-map-actions">
        <button className="secondary" type="button" onClick={returnToMyLocation} disabled={!fix}>내 위치</button>
        <button className="secondary" type="button" onClick={showReviewRegion}>서울 검토 지역</button>
      </div>}
      {sdkState === 'ready' && fix && !nearRegisteredPlace && viewRegion !== 'review' && <p className="live-nearby-note">현재 위치 가까이에 등록된 검토 장소가 없어요. 서울 검토 지역을 둘러볼 수 있어요.</p>}
      {sdkState === 'ready' && !fix && <p className="live-nearby-note">위치 확인 전에도 서울의 검토 장소를 둘러볼 수 있어요. 지도 속 장소는 현재 주변 장소가 아니에요.</p>}
      {selectedPlace && sdkState === 'ready' && <section className="live-place-card" aria-label={`${selectedPlace.name} 장소 상세`}>
        <div className="live-place-card-head"><div><small>{selectedPlace.kind} · 확인된 실제 장소</small><h2>{selectedPlace.name}</h2></div><button className="text-button" type="button" onClick={() => setSelectedPlaceId(null)} aria-label="장소 카드 닫기">×</button></div>
        <p>{selectedPlace.intro}</p>
        <small>{selectedPlace.locationNote}</small>
        {fix && <small>내 위치에서 약 {Math.round(distanceMeters(fix, selectedPlace))}m · 직선거리, 경로 안내 아님</small>}
        <div className="live-place-card-actions">
          <button className="primary" type="button" onClick={event => openNotes(selectedPlace.id, event.currentTarget)}>쪽지 읽고 쓰기</button>
          <a href={selectedPlace.officialUrl} target="_blank" rel="noopener noreferrer">공식 안내</a>
        </div>
      </section>}
      {(locationState === 'denied' || locationState === 'error' || sdkState === 'error') && <button className="secondary a-wide live-retry" type="button" onClick={retry}>다시 시도</button>}
    <p className="live-example-separation">장소 좌표만 실제이며 쪽지는 창작 예시 또는 이 기기의 시안 글이에요. 방문 인증과 보상은 없어요.</p>
  </section>
  {notePlace && portalTarget && createPortal(<div className="sheet-overlay postit-overlay" onClick={event => { if (event.target === event.currentTarget) setNotePlaceId(null); }}>
    <section className="sheet a-sheet" role="dialog" aria-modal="true" aria-label={`${notePlace.name} 포스트잇`}>
      <header><div><small>검토용 실제 장소 · {notePlace.kind}</small><h2>{notePlace.name} 쪽지</h2></div><button ref={noteCloseRef} type="button" aria-label="쪽지 닫기" onClick={() => setNotePlaceId(null)}>×</button></header>
      <p className="postit-sample-label">창작 예시와 이 기기에 저장한 글이에요. 실제 방문자 글이 아니에요.</p>
      <div className="postit-stack">
        {notePlace.sampleNotes.map((text, index) => {
          const id = `sample:${notePlace.id}:${index}`;
          return <Postit key={id} note={{ text, color: ['yellow', 'mint', 'apricot'][index % 3], author: '창작 예시', date: '실제 방문 글 아님' }} reaction={reactions[id]} onReact={() => reactTo(id)} />;
        })}
        {localNotes.filter(item => item.placeId === notePlace.id).map(item => <Postit key={item.id} note={{ ...item, author: '내 기기의 예시 글', date: noteDate(item.createdAt) }} reaction={reactions[item.id]} onReact={() => reactTo(item.id)}><button className="text-button postit-delete" type="button" onClick={() => deleteNote(item.id)}>내 글 삭제</button></Postit>)}
      </div>
      <form className="postit-compose" onSubmit={saveNote}>
        <h3>내 쪽지 붙이기 <small>이 브라우저에만 저장돼요.</small></h3>
        <textarea aria-label="쪽지 내용" maxLength={NOTE_LIMIT} value={noteDraft} onChange={event => setNoteDraft(event.target.value)} placeholder="여기에서 떠오른 생각을 적어 보세요." />
        <div className="choice-group"><span>종이색</span>{[['yellow','연노랑'],['apricot','살구'],['mint','연민트']].map(([key,label]) => <button type="button" key={key} className={`swatch swatch-${key}`} aria-pressed={paperColor === key} onClick={() => setPaperColor(key)}>{label}</button>)}</div>
        <div className="choice-group"><span>스티커</span>{['♡','✿','☀'].map(value => <button type="button" key={value} className="sticker-choice" aria-pressed={sticker === value} onClick={() => setSticker(value)}>{value}</button>)}</div>
        <button className="primary a-wide" type="submit" disabled={!noteDraft.trim()}>쪽지 붙이기</button>
      </form>
      {noteError && <p className="live-note-result" role="status">{noteError}</p>}
      <small className="postit-footer-note">실제 사용자에게 전달되지 않고 XP·코인은 지급되지 않아요.</small>
    </section>
  </div>, portalTarget)}
  </>;
}
