import { PHOTO_MAX_BYTES } from '../../../shared/features/missionPhotos.js';
function openPhotos() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mochi.photos.v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('photos');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('사진 저장소를 열지 못했어요. 다시 시도해 주세요.'));
  });
}
async function transaction(mode, action) {
  const db = await openPhotos();
  try { return await new Promise((resolve, reject) => {
    const tx = db.transaction('photos', mode), request = action(tx.objectStore('photos'));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = tx.onabort = () => reject(new Error('사진을 저장하지 못했어요. 저장 공간을 확인하고 다시 시도해 주세요.'));
  }); } finally { db.close(); }
}
export async function saveWebPhoto(file) {
  if (!file?.type.startsWith('image/') || !file.size || file.size > PHOTO_MAX_BYTES) throw new Error('10MB 이하의 사진을 선택해 주세요.');
  const url = URL.createObjectURL(file);
  let blob;
  try {
    const img = new Image(); img.src = url; await img.decode();
    const ratio = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio)); canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .8));
    if (!blob) throw new Error('이미지를 변환하지 못했어요.');
  } catch { throw new Error('이 사진을 읽지 못했어요. JPG·PNG 등 다른 사진을 선택해 주세요.'); }
  finally { URL.revokeObjectURL(url); }
  const id = crypto.randomUUID(); await transaction('readwrite', store => store.put(blob, id));
  return { id, uri: id, storage: 'indexeddb', mime: blob.type, size: blob.size };
}
export const readWebPhoto = id => transaction('readonly', store => store.get(id));
export const deleteWebPhoto = id => transaction('readwrite', store => store.delete(id));
