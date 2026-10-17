import { LIVE_PLACES } from './livePlaces.mjs';

const ICON_PATHS = {
  library: '<path d="M4 20V7l8-3 8 3v13H4Z"/><path d="M8 20v-6h8v6M8 9h.01M12 9h.01M16 9h.01"/>',
  park: '<path d="M12 21v-6M7 15c-2.5 0-3.5-1.8-3-3.8.3-1.3 1.2-2 2.3-2.2.1-2.5 2-4 4-4 1-2 2.5-2 3.5 0 2 0 3.9 1.5 4 4 1.1.2 2 1 2.3 2.2.5 2-.5 3.8-3 3.8H7Z"/>',
  plaza: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 4v16M4 12h16"/>',
};

function pinElement(place, onSelect, onOpenNotes) {
  const root = document.createElement('div');
  root.className = `live-place-overlay live-place-${place.icon}`;
  const pin = document.createElement('button');
  pin.type = 'button';
  pin.className = 'live-place-pin';
  pin.setAttribute('aria-label', `${place.name} 장소 보기`);
  pin.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[place.icon]}</svg>`;
  const label = document.createElement('span');
  label.className = 'live-place-name';
  label.textContent = place.name;
  pin.appendChild(label);
  pin.addEventListener('click', event => onSelect(place.id, event.currentTarget));
  const note = document.createElement('button');
  note.type = 'button';
  note.className = 'live-place-note-pin';
  note.setAttribute('aria-label', `${place.name} 쪽지 열기 · 창작 예시와 내 기기 쪽지`);
  note.textContent = '✉';
  note.addEventListener('click', event => onOpenNotes(place.id, event.currentTarget));
  root.append(pin, note);
  return root;
}

export function createLivePlaceMarkers(sdk, map, { onSelect, onOpenNotes, onOpenGroup }) {
  const markers = new Map();
  LIVE_PLACES.forEach(place => {
    const content = pinElement(place, onSelect, onOpenNotes);
    const overlay = new sdk.CustomOverlay({
      map, position: new sdk.LatLng(place.latitude, place.longitude),
      content, clickable: true, yAnchor: 1, zIndex: 3,
    });
    markers.set(place.id, { content, overlay });
  });

  const group = document.createElement('button');
  group.type = 'button';
  group.className = 'live-place-cluster';
  group.setAttribute('aria-label', '서울도서관과 서울광장 확대해서 보기');
  group.textContent = '2곳';
  group.addEventListener('click', onOpenGroup);
  const cluster = new sdk.CustomOverlay({
    position: new sdk.LatLng(37.565981, 126.977939), content: group,
    clickable: true, yAnchor: 1, zIndex: 4,
  });

  function attach(overlay, visible) {
    const target = visible ? map : null;
    if (overlay.getMap() !== target) overlay.setMap(target);
  }
  function updateZoom() {
    const grouped = map.getLevel() >= 5;
    attach(markers.get('seoul-library').overlay, !grouped);
    attach(markers.get('seoul-plaza').overlay, !grouped);
    attach(cluster, grouped);
  }
  function select(id) {
    markers.forEach(({ content }, placeId) => content.classList.toggle('selected', placeId === id));
  }

  sdk.event.addListener(map, 'zoom_changed', updateZoom);
  updateZoom();
  return {
    select,
    dispose() {
      sdk.event.removeListener(map, 'zoom_changed', updateZoom);
      markers.forEach(({ overlay }) => overlay.setMap(null));
      cluster.setMap(null);
    },
  };
}
