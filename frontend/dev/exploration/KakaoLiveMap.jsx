import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import Mochi from '../../src/components/Mochi.jsx';
import { clearLocationWatch, LOCATION_OPTIONS, locationErrorMessage, normalizePosition, watchCurrentLocation } from './realLocation.mjs';
import { loadKakaoMapsSdk } from './kakaoMaps.mjs';
import { createLivePlaceMarkers } from './livePlaceMarkers.mjs';
import { distanceMeters, LIVE_PLACES, NOTE_LIMIT, notesForPlace, readLocalNotes, REVIEW_REGION, writeLocalNotes } from './livePlaces.mjs';
import { combinePlaceResults, DEFAULT_RADIUS, EXPANDED_RADIUS, PLACE_CATEGORIES, searchNearbyPlaces } from './placeSearch.mjs';
import { ARRIVAL_POLICY, arrivalRadiusFor, updateArrival } from './arrivalGate.mjs';
import { hasDiscovered, readDiscoveredNotes, readNoteDrafts, writeDiscoveredNotes, writeNoteDrafts } from './discoveredNotes.mjs';
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

function savedDiscoveries() {
  try { return readDiscoveredNotes(window.localStorage); } catch { return []; }
}

function savedDrafts() {
  try { return readNoteDrafts(window.localStorage); } catch { return {}; }
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
  const placeServiceRef = useRef(null);
  const searchSerialRef = useRef(0);
  const searchInFlightRef = useRef(false);
  const lastCompletedSearchRef = useRef(null);
  const noteOpenerRef = useRef(null);
  const noteCloseRef = useRef(null);
  const arrivalTrackersRef = useRef(new Map());
  const announcedArrivalsRef = useRef(new Set());
  const arrivalToastTimerRef = useRef(null);
  const remeasureInFlightRef = useRef(false);
  const activeRef = useRef(true);
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
  const [groupPlaceIds, setGroupPlaceIds] = useState(null);
  const [notePlaceId, setNotePlaceId] = useState(null);
  const [resultsByCategory, setResultsByCategory] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchStatus, setSearchStatus] = useState('idle');
  const [searchBlocked, setSearchBlocked] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchRadius, setSearchRadius] = useState(DEFAULT_RADIUS);
  const [searchCenter, setSearchCenter] = useState(null);
  const [localNotes, setLocalNotes] = useState(savedNotes);
  const [discoveredNotes, setDiscoveredNotes] = useState(savedDiscoveries);
  const [draftsByPlace, setDraftsByPlace] = useState(savedDrafts);
  const [arrivalState, setArrivalState] = useState(null);
  const [mockArrival, setMockArrival] = useState(null);
  const [arrivalToast, setArrivalToast] = useState(null);
  const [paperColor, setPaperColor] = useState('yellow');
  const [sticker, setSticker] = useState('♡');
  const [reactions, setReactions] = useState({});
  const [noteError, setNoteError] = useState('');

  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);

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
      searchSerialRef.current += 1;
      window.clearTimeout(arrivalToastTimerRef.current);
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
      placeServiceRef.current = null;
      markerRef.current?.setMap(null);
      markerRef.current = null;
      markerContentRef.current = null;
      mapRef.current = null;
      lastPannedRef.current = null;
      sdkRef.current = null;
      searchInFlightRef.current = false;
      lastCompletedSearchRef.current = null;
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
    try {
    const position = fix ? new sdk.LatLng(fix.latitude, fix.longitude) : null;
    if (!mapRef.current) {
      const center = position ?? new sdk.LatLng(REVIEW_REGION.latitude, REVIEW_REGION.longitude);
      const map = new sdk.Map(container, { center, level: position ? 4 : 6, draggable: true, scrollwheel: true });
      mapRef.current = map;
      if (position) setViewRegion('my');
      placeServiceRef.current = new sdk.services.Places();
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
    } catch {
      setSdkState('error');
      setError('카카오 지도를 초기화하지 못했어요. 지도 설정과 등록 도메인을 확인한 뒤 다시 시도해 주세요.');
    }
  }, [sdkState, fix, follow, character]);

  const visiblePlaces = useMemo(() => combinePlaceResults(resultsByCategory ?? {}, categoryFilter), [resultsByCategory, categoryFilter]);

  useEffect(() => {
    placesRef.current?.dispose();
    placesRef.current = null;
    if (!mapRef.current || !sdkRef.current || sdkState !== 'ready') return;
    try {
    placesRef.current = createLivePlaceMarkers(sdkRef.current, mapRef.current, visiblePlaces, {
      onSelect: id => { setSelectedPlaceId(id); setGroupPlaceIds(null); },
      onOpenNotes: (id, opener) => openNotes(id, opener),
      onOpenGroup: ids => { setSelectedPlaceId(null); setGroupPlaceIds(ids); },
    });
    placesRef.current.select(selectedPlaceId);
    } catch {
      setSdkState('error');
      setError('검색한 장소를 지도에 표시하지 못했어요. 예시 지도에서 계속 확인할 수 있어요.');
    }
  }, [visiblePlaces, sdkState]);

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

  useEffect(() => {
    const placeId = notePlaceId ?? selectedPlaceId;
    const place = allPlaces.find(item => item.id === placeId);
    if (!place) { setArrivalState(null); return; }
    const previous = arrivalTrackersRef.current.get(place.id);
    const activeFix = locationState === 'watching' ? fix : null;
    const next = updateArrival(previous, activeFix, place, now);
    arrivalTrackersRef.current.set(place.id, next);
    setArrivalState({ placeId: place.id, ...next });
    const arrived = mockArrival?.placeId === place.id ? mockArrival.status === 'arrived' : next.status === 'arrived';
    if (arrived && !announcedArrivalsRef.current.has(place.id)) {
      announcedArrivalsRef.current.add(place.id);
      setArrivalToast(place.id);
      window.clearTimeout(arrivalToastTimerRef.current);
      arrivalToastTimerRef.current = window.setTimeout(() => setArrivalToast(null), 1100);
    }
  }, [fix, now, selectedPlaceId, notePlaceId, locationState, resultsByCategory, mockArrival]);

  function openNotes(placeId, opener) {
    noteOpenerRef.current = opener;
    setSelectedPlaceId(placeId);
    setNoteError('');
    setNotePlaceId(placeId);
  }

  async function runSearch(center, radius = DEFAULT_RADIUS) {
    if (!sdkRef.current || !placeServiceRef.current || searchInFlightRef.current || searchBlocked) return;
    const previous = lastCompletedSearchRef.current;
    if (previous && previous.radius === radius && distanceMeters(previous.center, center) < 40) return;
    searchInFlightRef.current = true;
    const serial = ++searchSerialRef.current;
    setSearchStatus('loading');
    setSearchError('');
    setSearchRadius(radius);
    setSearchCenter(center);
    setResultsByCategory(null);
    arrivalTrackersRef.current.clear();
    setSelectedPlaceId(null);
    setGroupPlaceIds(null);
    setNotePlaceId(null);
    try {
      const result = await searchNearbyPlaces(sdkRef.current, placeServiceRef.current, center, radius);
      if (serial !== searchSerialRef.current) return;
      setResultsByCategory(result.resultsByCategory);
      lastCompletedSearchRef.current = { center, radius };
      setSearchStatus('ready');
      if (result.failedCategories.length) {
        setSearchBlocked(true);
        setSearchError('일부 장소 검색이 실패했어요. 무료 쿼터 제한일 수 있어 추가 검색을 멈췄어요. 카카오 콘솔의 사용량을 확인해 주세요.');
      }
    } catch {
      if (serial !== searchSerialRef.current) return;
      setSearchBlocked(true);
      setSearchStatus('blocked');
      setSearchError('장소 검색이 실패했어요. 무료 쿼터 제한 여부를 구분할 수 없어 이 화면에서는 추가 검색을 멈췄어요. 카카오 콘솔의 사용량과 설정을 확인해 주세요.');
    } finally {
      if (serial === searchSerialRef.current) searchInFlightRef.current = false;
    }
  }

  function searchMapCenter() {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    runSearch({ latitude: center.getLat(), longitude: center.getLng() });
    setViewRegion('browse');
    setFollow(false);
  }

  function saveNote(event) {
    event.preventDefault();
    const text = noteDraft.trim();
    if (!notePlaceId || !text || text.length > NOTE_LIMIT) return;
    const currentPlace = allPlaces.find(place => place.id === notePlaceId);
    const simulated = mockArrival?.placeId === notePlaceId && mockArrival.status === 'arrived';
    const currentGate = currentPlace && updateArrival(arrivalTrackersRef.current.get(notePlaceId),
      locationState === 'watching' ? fix : null, currentPlace, Date.now());
    const mockForPlace = mockArrival?.placeId === notePlaceId;
    if ((mockForPlace && !simulated) || (!mockForPlace && currentGate?.status !== 'arrived')) {
      setNoteError('지금 위치를 다시 확인할 수 없어요. 초안은 이 기기에 남겨 뒀어요.');
      return;
    }
    const item = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      placeId: notePlaceId, text, color: paperColor, sticker,
      source: simulated ? 'simulation' : 'device-preview',
      createdAt: new Date().toISOString(),
    };
    const next = [...localNotes, item];
    try {
      writeLocalNotes(window.localStorage, next);
      setLocalNotes(next);
    } catch {
      setNoteError('이 브라우저에 저장하지 못했어요. 작성한 글은 그대로 두었으니 다시 시도해 주세요.');
      return;
    }
    const nextDrafts = { ...draftsByPlace };
    delete nextDrafts[notePlaceId];
    setDraftsByPlace(nextDrafts);
    try {
      writeNoteDrafts(window.localStorage, nextDrafts);
      setNoteError('이 기기에 쪽지를 저장했어요. 다른 사용자에게는 보이지 않아요.');
    } catch {
      setNoteError('쪽지는 저장했지만 이전 초안을 정리하지 못했어요. 새로고침 후 초안이 다시 보일 수 있어요.');
    }
  }

  function updateDraft(text) {
    if (!notePlaceId) return;
    const next = { ...draftsByPlace, [notePlaceId]: text };
    setDraftsByPlace(next);
    try { writeNoteDrafts(window.localStorage, next); }
    catch { setNoteError('초안을 이 기기에 저장하지 못했어요. 화면을 닫기 전 내용을 복사해 주세요.'); }
  }

  function discoverNote(noteId) {
    if (!notePlaceId || !canOpenNewNotes || hasDiscovered(discoveredNotes, notePlaceId, noteId, noteSource)) return;
    const next = [...discoveredNotes, { placeId: notePlaceId, noteId,
      source: mockArrival?.placeId === notePlaceId && mockArrival.status === 'arrived' ? 'simulation' : 'device-preview' }];
    setDiscoveredNotes(next);
    try { writeDiscoveredNotes(window.localStorage, next); }
    catch { setNoteError('읽은 쪽지를 이 기기에 보관하지 못했어요. 새로고침하면 다시 잠길 수 있어요.'); }
  }

  function deleteNote(id) {
    const next = localNotes.filter(item => item.id !== id);
    try {
      writeLocalNotes(window.localStorage, next);
      setLocalNotes(next);
      setNoteError('이 기기에서 쪽지를 삭제했어요.');
    } catch {
      setNoteError('삭제 내용을 저장하지 못했어요. 다시 시도해 주세요.');
      return;
    }
    const nextDiscovered = discoveredNotes.filter(item => item.noteId !== id);
    setDiscoveredNotes(nextDiscovered);
    try { writeDiscoveredNotes(window.localStorage, nextDiscovered); } catch { /* Deleted body remains deleted. */ }
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

  function remeasure() {
    if (mockArrival || remeasureInFlightRef.current) return;
    if (!started) { start(); return; }
    if (locationState === 'denied' || locationState === 'error') { retry(); return; }
    if (!navigator.geolocation?.getCurrentPosition) {
      setError('이 브라우저에서는 위치를 다시 측정할 수 없어요.');
      setLocationState('error');
      return;
    }
    remeasureInFlightRef.current = true;
    setLocationState('requesting');
    navigator.geolocation.getCurrentPosition(position => {
      remeasureInFlightRef.current = false;
      if (!activeRef.current) return;
      const normalized = normalizePosition(position);
      if (!normalized) { setLocationState('error'); setError('위치 값을 확인하지 못했어요.'); return; }
      setFix(normalized);
      setNow(Date.now());
      setLocationState('watching');
    }, locationError => {
      remeasureInFlightRef.current = false;
      if (!activeRef.current) return;
      setError(locationErrorMessage(locationError));
      setLocationState(locationError?.code === 1 ? 'denied' : 'error');
    }, LOCATION_OPTIONS);
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
    runSearch(REVIEW_REGION);
  }

  const stale = fix && now - fix.timestamp > STALE_AFTER_MS;
  const poorAccuracy = fix && fix.accuracy > POOR_ACCURACY_METERS;
  const allPlaces = Object.values(resultsByCategory ?? {}).flat();
  const selectedPlace = allPlaces.find(place => place.id === selectedPlaceId);
  const notePlace = allPlaces.find(place => place.id === notePlaceId);
  const groupedPlaces = groupPlaceIds?.map(id => allPlaces.find(place => place.id === id)).filter(Boolean) ?? [];
  const noteSource = mockArrival?.placeId === notePlaceId ? 'simulation' : 'device-preview';
  const selectedNoteSource = mockArrival?.placeId === selectedPlaceId ? 'simulation' : 'device-preview';
  const placeNotes = notePlace ? notesForPlace(localNotes, notePlace).filter(item => !item.source || item.source === noteSource) : [];
  const sampleNotePlace = notePlace && LIVE_PLACES.find(place => place.name === notePlace.name && distanceMeters(place, notePlace) < 400);
  const selectedNotes = selectedPlace ? notesForPlace(localNotes, selectedPlace).filter(item => !item.source || item.source === selectedNoteSource) : [];
  const selectedSamplePlace = selectedPlace && LIVE_PLACES.find(place => place.name === selectedPlace.name && distanceMeters(place, selectedPlace) < 400);
  const selectedNoteCount = selectedNotes.length + (selectedSamplePlace?.sampleNotes.length ?? 0);
  const gatePlace = notePlace ?? selectedPlace;
  const simulatedStatus = mockArrival && gatePlace && mockArrival.placeId === gatePlace.id ? mockArrival.status : null;
  const effectiveArrival = simulatedStatus === 'before' ? 'not-arrived' : simulatedStatus === 'inaccurate' ? 'uncertain'
    : simulatedStatus === 'arrived' ? 'arrived'
      : arrivalState && gatePlace && arrivalState.placeId === gatePlace.id ? arrivalState.status : 'unavailable';
  const canOpenNewNotes = effectiveArrival === 'arrived';
  const arrivalReason = simulatedStatus ? '개발용 모의 상태예요. 실제 GPS 방문 기록이 아닙니다.'
    : locationState === 'denied' || locationState === 'error' ? '위치를 확인할 수 없어요. 권한을 확인하고 다시 측정해 주세요.'
      : arrivalState && gatePlace && arrivalState.placeId === gatePlace.id && arrivalState.reason ? arrivalState.reason
        : effectiveArrival === 'not-arrived' ? '가까이 도착하면 이야기를 펼칠 수 있어요.' : '내 위치로 시작해 위치를 확인해 주세요.';
  const noteDraft = draftsByPlace[notePlaceId] ?? '';
  const noteRecords = notePlace ? [
    ...(sampleNotePlace?.sampleNotes ?? []).map((text, index) => ({
      id: `sample:${notePlace.id}:${index}`, text, color: ['yellow', 'mint', 'apricot'][index % 3],
      author: '창작 예시', date: '실제 방문 글 아님', own: false,
    })),
    ...placeNotes.map(item => ({ ...item, author: '내 기기의 예시 글', date: noteDate(item.createdAt), own: true })),
  ] : [];
  const portalTarget = typeof document === 'undefined' ? null : document.querySelector('.prototype');

  return <><section className="live-map-panel" aria-label="실제 위치 지도">
    <div className="live-map-toolbar">
      <span className="live-mode-badge">카카오 지도 · 주변 탐험</span>
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
        <div ref={containerRef} className="live-kakao-map" aria-label="카카오 지도와 주변 장소 검색 결과" />
        <span className="live-map-caption">{viewRegion === 'review' ? '서울 예시 지역 · 검색 결과는 실제 장소' : viewRegion === 'my' ? '내 위치 주변' : '지도 둘러보는 중'}</span>
        {arrivalToast && <span className="live-arrival-toast" role="status">도착했어요! 어떤 이야기가 있을까요?</span>}
      </div>}
      {sdkState === 'ready' && <div className="live-map-actions">
        <button className="secondary" type="button" onClick={returnToMyLocation} disabled={!fix}>내 위치</button>
        <button className="secondary" type="button" onClick={searchMapCenter} disabled={searchStatus === 'loading' || searchBlocked}>이 지역 둘러보기</button>
        <button className="secondary" type="button" onClick={showReviewRegion} disabled={searchStatus === 'loading' || searchBlocked}>서울 예시 지역 검색</button>
      </div>}
      {sdkState === 'ready' && <div className="live-place-filters" role="group" aria-label="장소 종류">
        {[{ id: 'all', label: '전체' }, ...PLACE_CATEGORIES].map(category => <button key={category.id} type="button" className={categoryFilter === category.id ? 'active' : ''} aria-pressed={categoryFilter === category.id} onClick={() => { setCategoryFilter(category.id); setSelectedPlaceId(null); setGroupPlaceIds(null); }}>{category.label}</button>)}
      </div>}
      {sdkState === 'ready' && searchStatus === 'idle' && <p className="live-nearby-note">내 위치가 표시되면 ‘이 지역 둘러보기’를 눌러 검색하세요. 위치를 쓰지 않으려면 서울 예시 지역을 선택할 수 있어요.</p>}
      {sdkState === 'ready' && searchStatus === 'loading' && <p className="live-nearby-note" role="status">반경 {searchRadius / 1000}km의 장소를 찾고 있어요…</p>}
      {sdkState === 'ready' && searchStatus === 'blocked' && <p className="live-nearby-note" role="alert">{searchError}</p>}
      {sdkState === 'ready' && searchStatus === 'ready' && <div className="live-search-summary" role="status">
        <span>{searchCenter && viewRegion === 'review' ? '서울 예시 지역' : '검색한 지도 영역'} · 반경 {searchRadius / 1000}km · {visiblePlaces.length}곳</span>
        {searchError && <small>{searchError}</small>}
      </div>}
      {sdkState === 'ready' && searchStatus === 'ready' && visiblePlaces.length === 0 && <div className="live-nearby-note">
        <p>이 범위에서 {categoryFilter === 'all' ? '장소를' : `${PLACE_CATEGORIES.find(item => item.id === categoryFilter)?.label} 장소를`} 찾지 못했어요.</p>
        {searchRadius < EXPANDED_RADIUS && !searchBlocked && <button className="secondary" type="button" onClick={() => runSearch(searchCenter, EXPANDED_RADIUS)}>2km로 넓혀 보기</button>}
        {viewRegion !== 'review' && !searchBlocked && <button className="text-button" type="button" onClick={showReviewRegion}>서울 예시 지역 검색</button>}
      </div>}
      {groupedPlaces.length > 0 && <section className="live-place-card live-group-card" aria-label="겹친 장소 선택">
        <div className="live-place-card-head"><h2>여기 모인 장소</h2><button className="text-button" type="button" onClick={() => setGroupPlaceIds(null)} aria-label="목록 닫기">×</button></div>
        {groupedPlaces.map(place => <button className="live-group-choice" type="button" key={place.id} onClick={() => { setGroupPlaceIds(null); setSelectedPlaceId(place.id); }}>{place.name}<small>{place.kind}</small></button>)}
      </section>}
      {selectedPlace && sdkState === 'ready' && <section className="live-place-card" aria-label={`${selectedPlace.name} 장소 상세`}>
        <div className="live-place-card-head"><div><small>{selectedPlace.kind} · 카카오 장소 검색</small><h2>{selectedPlace.name}</h2></div><button className="text-button" type="button" onClick={() => setSelectedPlaceId(null)} aria-label="장소 카드 닫기">×</button></div>
        {selectedPlace.categoryName && <p>{selectedPlace.categoryName}</p>}
        {selectedPlace.address && <small>{selectedPlace.address}</small>}
        {fix && <small>내 위치에서 약 {Math.round(distanceMeters(fix, selectedPlace))}m · 직선거리, 경로 안내 아님</small>}
        <p className="live-note-preview">{selectedNoteCount ? `이곳에 쪽지 ${selectedNoteCount}장이 기다리고 있어요.` : '아직 쪽지가 없어요.'}</p>
        <small>{canOpenNewNotes ? '도착했어요! 쪽지를 읽거나 남길 수 있어요.' : `🔒 ${arrivalReason}`}</small>
        <div className="live-place-card-actions">
          <button className="primary" type="button" onClick={event => openNotes(selectedPlace.id, event.currentTarget)}>{canOpenNewNotes ? '쪽지 읽고 쓰기' : '쪽지 미리보기'}</button>
          {selectedPlace.officialUrl && <a href={selectedPlace.officialUrl} target="_blank" rel="noopener noreferrer">카카오 장소 정보</a>}
        </div>
        {import.meta.env.DEV && <div className="live-arrival-dev" role="group" aria-label="개발용 도착 상태 시험">
          <small>개발용 도착 상태 · 실제 방문 기록 아님</small>
          <div>
            {[['before', '도착 전'], ['arrived', '도착'], ['inaccurate', '위치 부정확']].map(([value, label]) => <button type="button" key={value} aria-pressed={mockArrival?.placeId === selectedPlace.id && mockArrival.status === value} onClick={() => setMockArrival({ placeId: selectedPlace.id, status: value })}>{label}</button>)}
            <button type="button" onClick={() => setMockArrival(null)}>실제 위치 기준</button>
          </div>
        </div>}
      </section>}
      {(locationState === 'denied' || locationState === 'error' || sdkState === 'error') && <button className="secondary a-wide live-retry" type="button" onClick={retry}>다시 시도</button>}
    <p className="live-example-separation">검색 장소는 카카오 데이터예요. 쪽지는 창작 예시 또는 이 기기의 시안 글이며, 방문 인증과 보상은 없어요.</p>
  </section>
  {notePlace && portalTarget && createPortal(<div className="sheet-overlay postit-overlay" onClick={event => { if (event.target === event.currentTarget) setNotePlaceId(null); }}>
    <section className="sheet a-sheet" role="dialog" aria-modal="true" aria-label={`${notePlace.name} 포스트잇`}>
      <header><div><small>카카오 검색 장소 · {notePlace.kind}</small><h2>{notePlace.name} 쪽지</h2></div><button ref={noteCloseRef} type="button" aria-label="쪽지 닫기" onClick={() => setNotePlaceId(null)}>×</button></header>
      <p className="postit-sample-label">{noteRecords.length ? `이곳에 쪽지 ${noteRecords.length}장이 기다리고 있어요. ` : '아직 쪽지가 없어요. '}{canOpenNewNotes ? '도착했어요! 읽고 남길 수 있어요.' : `가까이 도착하면 새 이야기를 펼칠 수 있어요. ${arrivalReason}`}</p>
      {!canOpenNewNotes && !simulatedStatus && notePlace.icon !== 'park' && <button className="secondary live-remeasure" type="button" onClick={remeasure}>위치 다시 측정</button>}
      <div className="postit-stack">
        {noteRecords.length === 0 && <p className="postit-empty">아직 쪽지가 없어요. 도착 후 첫 쪽지를 이 기기에만 붙일 수 있어요.</p>}
        {noteRecords.map(note => note.own || hasDiscovered(discoveredNotes, notePlace.id, note.id, noteSource)
          ? <Postit key={note.id} note={note} reaction={reactions[note.id]} onReact={() => reactTo(note.id)}>{note.own && <button className="text-button postit-delete" type="button" onClick={() => deleteNote(note.id)}>내 글 삭제</button>}</Postit>
          : <div className="postit-locked" key={note.id}>
            <span aria-hidden="true">✉</span><div><strong>아직 펼치지 않은 쪽지</strong><small>{canOpenNewNotes ? '도착했어요. 읽으면 발견한 쪽지에 남아요.' : '가까이 도착하면 읽을 수 있어요.'}</small></div>
            <button className="secondary" type="button" disabled={!canOpenNewNotes} onClick={() => discoverNote(note.id)}>{canOpenNewNotes ? '읽기' : '잠김'}</button>
          </div>)}
      </div>
      {(canOpenNewNotes || noteDraft) && <form className="postit-compose" onSubmit={saveNote}>
        <h3>내 쪽지 붙이기 <small>이 브라우저에만 저장돼요.</small></h3>
        {!canOpenNewNotes && <p className="live-draft-notice">위치를 다시 확인할 때까지 초안을 보존해요. 현장에서만 쪽지를 붙일 수 있어요.</p>}
        <textarea aria-label="쪽지 내용" maxLength={NOTE_LIMIT} value={noteDraft} onChange={event => updateDraft(event.target.value)} placeholder="여기에서 떠오른 생각을 적어 보세요." />
        <div className="choice-group"><span>종이색</span>{[['yellow','연노랑'],['apricot','살구'],['mint','연민트']].map(([key,label]) => <button type="button" key={key} className={`swatch swatch-${key}`} aria-pressed={paperColor === key} onClick={() => setPaperColor(key)}>{label}</button>)}</div>
        <div className="choice-group"><span>스티커</span>{['♡','✿','☀'].map(value => <button type="button" key={value} className="sticker-choice" aria-pressed={sticker === value} onClick={() => setSticker(value)}>{value}</button>)}</div>
        <button className="primary a-wide" type="submit" disabled={!noteDraft.trim() || !canOpenNewNotes}>쪽지 붙이기</button>
      </form>}
      {!canOpenNewNotes && !noteDraft && <p className="live-note-locked">🔒 새 쪽지는 현장에서 작성할 수 있어요.</p>}
      {noteError && <p className="live-note-result" role="status">{noteError}</p>}
      <small className="postit-footer-note">실제 사용자에게 전달되지 않고 XP·코인은 지급되지 않아요.</small>
    </section>
  </div>, portalTarget)}
  </>;
}
