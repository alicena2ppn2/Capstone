import React, { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Mochi from '../../src/components/Mochi.jsx';
import { clearLocationWatch, locationErrorMessage, watchCurrentLocation } from './realLocation.mjs';
import { loadKakaoMapsSdk } from './kakaoMaps.mjs';

const MAP_KEY = import.meta.env.VITE_KAKAO_MAP_JS_KEY?.trim() ?? '';
const POOR_ACCURACY_METERS = 100;
const STALE_AFTER_MS = 30000;

function distanceMeters(a, b) {
  const radians = value => value * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLng = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function characterMarkup(character) {
  return renderToStaticMarkup(<Mochi variant={character} full width={54} height={58} active={false} label="현재 위치의 모찌" />);
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
  const [started, setStarted] = useState(false);
  const [sdkState, setSdkState] = useState(MAP_KEY ? 'idle' : 'missing-key');
  const [locationState, setLocationState] = useState('idle');
  const [fix, setFix] = useState(null);
  const [follow, setFollow] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!started || !MAP_KEY) return undefined;
    let mounted = true;
    let errorBlocked = false;
    const geolocation = navigator.geolocation;
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
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (dragListenerRef.current && mapRef.current && sdkRef.current) {
        sdkRef.current.event.removeListener(mapRef.current, 'dragstart', dragListenerRef.current);
      }
      if (tilesListenerRef.current && mapRef.current && sdkRef.current) {
        sdkRef.current.event.removeListener(mapRef.current, 'tilesloaded', tilesListenerRef.current);
      }
      window.clearTimeout(mapLoadTimerRef.current);
      markerRef.current?.setMap(null);
      markerRef.current = null;
      markerContentRef.current = null;
      mapRef.current = null;
      lastPannedRef.current = null;
      sdkRef.current = null;
    };
  }, [started]);

  useEffect(() => {
    const sdk = sdkRef.current;
    const container = containerRef.current;
    if (!sdk || !container || !fix) return;
    const position = new sdk.LatLng(fix.latitude, fix.longitude);
    if (!mapRef.current) {
      const map = new sdk.Map(container, { center: position, level: 4, draggable: true, scrollwheel: true });
      mapRef.current = map;
      const markerContent = document.createElement('div');
      markerContent.className = 'live-character-marker';
      markerContent.innerHTML = `<span class="live-marker-art">${characterMarkup(character)}</span><span class="live-marker-label">내 위치</span>`;
      markerContentRef.current = markerContent;
      markerRef.current = new sdk.CustomOverlay({ position, content: markerContent, yAnchor: 1.08, zIndex: 10, clickable: false });
      markerRef.current.setMap(map);
      dragListenerRef.current = () => setFollow(false);
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
      return;
    }

    if (markerRef.current) {
      const previous = markerRef.current.getPosition();
      const previousCoords = { latitude: previous.getLat(), longitude: previous.getLng() };
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const startedAt = performance.now();
      const duration = reduceMotion ? 0 : 350;
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
    }
  }, [fix, follow, character]);

  useEffect(() => {
    const art = markerContentRef.current?.querySelector('.live-marker-art');
    if (art) art.innerHTML = characterMarkup(character);
  }, [character]);

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
    setStarted(false);
    window.setTimeout(() => setStarted(true), 0);
  }

  function returnToMyLocation() {
    if (!fix || !mapRef.current || !sdkRef.current) return;
    setFollow(true);
    lastPannedRef.current = fix;
    mapRef.current.panTo(new sdkRef.current.LatLng(fix.latitude, fix.longitude));
  }

  const stale = fix && now - fix.timestamp > STALE_AFTER_MS;
  const poorAccuracy = fix && fix.accuracy > POOR_ACCURACY_METERS;

  return <section className="live-map-panel" aria-label="실제 위치 지도">
    <div className="live-map-toolbar">
      <span className="live-mode-badge">실제 위치 · 예시 콘텐츠 분리</span>
      <button className="text-button live-back" type="button" onClick={onBackToExample}>예시 지도</button>
    </div>
    {!started && <div className="live-map-intro">
      <p>현재 위치를 지도에 표시하는 데만 사용해요. 서버에 저장하거나 백그라운드에서 추적하지 않아요.</p>
      <button className="primary a-wide" type="button" disabled={!MAP_KEY} onClick={start}>내 위치로 시작</button>
      {!MAP_KEY && <p className="live-config-note" role="status">카카오 지도 JavaScript 키 설정이 필요해요. 예시 지도를 계속 이용할 수 있어요.</p>}
    </div>}
    {started && <>
      <div className="live-map-status" role="status">
        {locationState === 'requesting' && '위치 권한을 확인하고 있어요…'}
        {locationState === 'watching' && !stale && !poorAccuracy && `현재 위치 표시 중 · 정확도 약 ${Math.round(fix.accuracy)}m`}
        {locationState === 'watching' && poorAccuracy && `위치 정확도가 낮아요 · 약 ${Math.round(fix.accuracy)}m`}
        {locationState === 'watching' && stale && '마지막 위치가 오래됐어요. 위치 갱신을 기다리고 있어요.'}
        {locationState === 'paused' && '화면이 숨겨져 위치 확인을 멈췄어요. 돌아오면 다시 확인해요.'}
        {locationState === 'denied' && error}
        {locationState === 'error' && error}
        {sdkState === 'loading' && '카카오 지도를 불러오고 있어요…'}
        {sdkState === 'error' && error}
      </div>
      {fix && sdkState === 'ready' && <div ref={containerRef} className="live-kakao-map" aria-label="카카오 지도" />}
      {sdkState === 'ready' && !fix && <div className="live-kakao-map-placeholder">위치가 확인되면 여기에 지도가 표시돼요.</div>}
      {fix && sdkState === 'ready' && <button className="secondary live-locate" type="button" onClick={returnToMyLocation} disabled={follow}>{follow ? '내 위치를 따라가고 있어요' : '내 위치'}</button>}
      {(locationState === 'denied' || locationState === 'error' || sdkState === 'error') && <button className="secondary a-wide live-retry" type="button" onClick={retry}>다시 시도</button>}
    </>}
    <p className="live-example-separation">실제 위치만 표시해요. 장소·거리·포스트잇·보상 예시는 예시 위치 모드에서만 볼 수 있어요.</p>
  </section>;
}
