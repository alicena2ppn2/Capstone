import { distanceMeters } from './livePlaces.mjs';

const ICON_PATHS = {
  library: '<path d="M4 20V7l8-3 8 3v13H4Z"/><path d="M8 20v-6h8v6M8 9h.01M12 9h.01M16 9h.01"/>',
  park: '<path d="M12 21v-6M7 15c-2.5 0-3.5-1.8-3-3.8.3-1.3 1.2-2 2.3-2.2.1-2.5 2-4 4-4 1-2 2.5-2 3.5 0 2 0 3.9 1 4 1.1.2 2 1 2.3 2.2.5 2-.5 3.8-3 3.8H7Z"/>',
  culture: '<path d="M3 10h18M5 10v10m5-10v10m4-10v10m5-10v10M2 20h20M12 3 2 8v2h20V8L12 3Z"/>',
  cafe: '<path d="M4 8h13v7a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6V8Zm13 1h2a3 3 0 0 1 0 6h-2M7 4v2m4-2v2"/>',
};

function pinElement(place, onSelect, onOpenNotes) {
  const root = document.createElement('div');
  root.className = `live-place-overlay live-place-${place.icon}`;
  const pin = document.createElement('button');
  pin.type = 'button';
  pin.className = 'live-place-pin';
  pin.setAttribute('aria-label', `${place.name} 장소 보기`);
  pin.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[place.icon] ?? ICON_PATHS.culture}</svg>`;
  const label = document.createElement('span');
  label.className = 'live-place-name';
  label.textContent = place.name;
  pin.appendChild(label);
  pin.addEventListener('click', () => onSelect(place.id));
  const note = document.createElement('button');
  note.type = 'button';
  note.className = 'live-place-note-pin';
  note.setAttribute('aria-label', `${place.name} 쪽지 열기`);
  note.textContent = '✉';
  note.addEventListener('click', event => onOpenNotes(place.id, event.currentTarget));
  root.append(pin, note);
  return root;
}

export function groupNearbyPlaces(places) {
  const groups = [];
  for (const place of places) {
    const existing = groups.find(group => distanceMeters(group[0], place) < 28);
    if (existing) existing.push(place);
    else groups.push([place]);
  }
  return groups;
}

export function createLivePlaceMarkers(sdk, map, places, { onSelect, onOpenNotes, onOpenGroup }) {
  const markers = new Map();
  const overlays = groupNearbyPlaces(places).map(group => {
    const place = group[0];
    let content;
    if (group.length === 1) {
      content = pinElement(place, onSelect, onOpenNotes);
      markers.set(place.id, content);
    } else {
      content = document.createElement('button');
      content.type = 'button';
      content.className = 'live-place-cluster';
      content.textContent = `${group.length}곳`;
      content.setAttribute('aria-label', `가까운 장소 ${group.length}곳 보기`);
      content.addEventListener('click', () => onOpenGroup(group.map(item => item.id)));
    }
    return new sdk.CustomOverlay({
      map, position: new sdk.LatLng(place.latitude, place.longitude),
      content, clickable: true, yAnchor: 1, zIndex: 3,
    });
  });
  return {
    select(id) { markers.forEach((content, placeId) => content.classList.toggle('selected', placeId === id)); },
    dispose() { overlays.forEach(overlay => overlay.setMap(null)); },
  };
}
