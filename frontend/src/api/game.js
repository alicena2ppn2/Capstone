// 게임 경제(코인·XP·레벨·상점·출석·주간 미션)를 서버 기준으로 (10/15 결정: 코인·레벨은 서버 규칙, 출석은 주간 출석표)
import { useCallback, useEffect, useRef, useState } from 'react';
import { call } from './missions.js';
import { xpThresholdForLevel } from '../../../shared/features/levelProgression.js';

const u = id => encodeURIComponent(id);

export const homeOf = me => call(`/users/${u(me)}/home`);
export const shopOf = me => call(`/users/${u(me)}/shop`);
export const buyItem = (me, type, itemId) => call(`/users/${u(me)}/shop/buy`, { method: 'POST', body: { type, item_id: itemId } });
export const equip = (me, change) => call(`/users/${u(me)}/equipped`, { method: 'PUT', body: change });   // { character_id } 또는 { outfit_id } (null = 벗기)
export const moveDecor = (me, slot, { dx, dy }) => call(`/users/${u(me)}/decor/${slot}/position`, { method: 'PUT', body: { dx, dy } });
export const placeDecor = (me, slot, itemId) => call(`/users/${u(me)}/decor`, { method: 'PUT', body: { slot, item_id: itemId } });
export const attendanceWeek = me => call(`/users/${u(me)}/attendance/week`);
export const checkIn = me => call(`/users/${u(me)}/attendance`, { method: 'POST' });
export const weeklyQuests = me => call(`/users/${u(me)}/weekly`);
export const saveDiary = (me, date, text) => call(`/users/${u(me)}/diary/${date}`, { method: 'PUT', body: { text } });
export const removeDiary = (me, date) => call(`/users/${u(me)}/diary/${date}`, { method: 'DELETE' });

// 주간 미션: 사진 올리기 → 그날 채우기 (서버가 촬영 날짜 확인)
export async function completeWeekly(me, questId, file) {
  const form = new FormData();
  form.append('file', file);
  if (file.lastModified) {
    const d = new Date(file.lastModified), p = n => String(n).padStart(2, '0');
    form.append('taken_at', `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
  }
  const photo = await call(`/users/${u(me)}/photos`, { method: 'POST', form });
  return call(`/users/${u(me)}/weekly/${u(questId)}/complete`, { method: 'POST', body: { photos: [photo.photo_id] } });
}

// 서버 상점 응답 → 앱 상점 화면이 쓰는 모양 (game.characters·ownedDecor·decor 등)
export function shopAsGame(shop) {
  const owned = list => list.filter(item => item.status === 'owned').map(item => item.id);
  return {
    coins: shop.coins,
    // 앱 화면의 레벨 계산(1 + XP÷100)이 서버 레벨과 같은 값이 되도록 맞춘 숫자. 실제 XP는 shop.level.xp
    xp: xpThresholdForLevel(shop.level.level),   // 서버 레벨이 시작되는 앱 XP → 상점 해금 판정이 서버 레벨과 같아짐
    characters: owned(shop.characters),
    character: shop.equipped.character ?? 'potato',
    ownedDecor: owned(shop.decor),
    decor: shop.placed ?? {},
    ownedClothes: owned(shop.outfits),
    outfit: shop.equipped.outfit ?? null,
  };
}

// 화면 전체가 같이 쓰는 서버 상태. 행동 뒤에 refresh()로 다시 불러온다
export function useServerGame(userId) {
  const [state, setState] = useState(null), [error, setError] = useState('');
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const refresh = useCallback(async () => {
    if (!userId) return null;
    try {
      const [home, shop, week] = await Promise.all([homeOf(userId), shopOf(userId), attendanceWeek(userId)]);
      const next = { home, shop, week };
      if (live.current) { setState(next); setError(''); }
      return next;
    } catch (e) { if (live.current) setError(e.message); return null; }
  }, [userId]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { state, error, refresh };
}
