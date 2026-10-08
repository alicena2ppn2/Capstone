import React, { useState } from 'react';
import { View } from 'react-native';
import { Label, Button, Card, styles } from '../ui';
import Character from '../Character';
import RoomBackdrop from '../art/RoomBackdrop';
import { CHARACTERS, buyCharacter, equipCharacter, buyDecor, equipDecor } from '../../../frontend/src/utils/game.js';
import { CLOTHES } from '../../../frontend/src/utils/clothes.js';
import { DECOR } from '../../../frontend/src/utils/decor.js';
import { CATALOG, FRIEND_INTROS } from '../../../frontend/src/utils/catalog.js';

export default function Shop({ game, level, ownedClothes, outfit, update, buyClothes, wear }) {
  const [tab, setTab] = useState('character'), [intro, setIntro] = useState(null), [ownedOnly, setOwnedOnly] = useState(false), [slot, setSlot] = useState('all');
  const allItems = tab === 'character' ? CHARACTERS : tab === 'clothes' ? CLOTHES : DECOR;
  const ownedIds = tab === 'character' ? game.characters : tab === 'clothes' ? ownedClothes : game.ownedDecor ?? [];
  const items = allItems.filter(item => (!ownedOnly || ownedIds.includes(item.id)) && (tab !== 'decor' || slot === 'all' || item.slot === slot));
  return <><Label style={styles.heading}>꾸미기 상점</Label><View style={styles.wrap}>{[['character', '친구들'], ['clothes', '옷 꾸미기'], ['decor', '집 꾸미기']].map(([id, text]) => <Button key={id} selected={tab === id} onPress={() => setTab(id)}>{text}</Button>)}</View><View style={styles.wrap}><Button selected={!ownedOnly} onPress={() => setOwnedOnly(false)}>모든 상품</Button><Button selected={ownedOnly} onPress={() => setOwnedOnly(true)}>보유 아이템 {ownedIds.length}</Button></View>{tab === 'decor' && <View style={styles.wrap}>{[['all', '전체'], ['lamp', '전등'], ['carpet', '카페트'], ['frame', '액자'], ['doll', '인형'], ['scenery', '창밖 풍경']].map(([id, name]) => <Button key={id} selected={slot === id} onPress={() => setSlot(id)}>{name}</Button>)}</View>}{items.map(item => {
    const owned = (tab === 'character' ? game.characters : tab === 'clothes' ? ownedClothes : game.ownedDecor ?? []).includes(item.id);
    const equipped = tab === 'character' ? game.character === item.id : tab === 'clothes' ? outfit === item.id : game.decor?.[item.slot] === item.id;
    const locked = level < (item.level ?? 1) || tab === 'character' && !!item.method && !owned;
    const secret = item.method === 'quest' && !owned, target = `${tab}:${item.id}`;
    return <Card key={item.id}><View style={styles.center}>{tab === 'character' ? secret ? <Label style={styles.heading}>?</Label> : <Character variant={item.id} size={130} label={item.name} /> : tab === 'clothes' ? <Character variant={game.character} size={130} outfit={item} label={item.name} /> : <View style={{ width: '100%', aspectRatio: 368 / 500 }}><RoomBackdrop homeScene decor={{ ...game.decor, [item.slot]: item.id }} /></View>}</View><Label style={styles.cardTitle}>{secret ? '비밀 친구' : item.name}</Label><Label style={[styles.small, { fontFamily: 'A2z-500', fontSize: 14, lineHeight: 22, color: '#5D5060' }]}>{secret ? '누적 행동 도전 10회' : `${item.price} 코인 · LV.${item.level ?? 1}${locked ? ' · 잠금' : ''}`}</Label>
      {tab === 'character' && !secret && <><Button onPress={() => setIntro(intro === item.id ? null : item.id)}>{intro === item.id ? '⌃' : '⌄'} 친구 소개</Button>{intro === item.id && <Label style={styles.body}>{FRIEND_INTROS[item.id]?.introduction}</Label>}</>}
      {CATALOG.some(entry => `${entry.kind}:${entry.id}` === target) && <Button selected={game.targetItem === target} onPress={() => update(value => ({ ...value, targetItem: value.targetItem === target ? null : target }))}>{game.targetItem === target ? '목표로 선택됨' : '목표로 선택'}</Button>}
      <Button primary disabled={tab === 'character' && equipped && item.id === 'potato' || !owned && (locked || game.coins < item.price)} onPress={() => {
        if (tab === 'character') update(value => owned ? equipCharacter(value, equipped ? 'potato' : item.id) : buyCharacter(value, item.id));
        else if (tab === 'clothes') { if (owned) wear(equipped ? null : item.id); else buyClothes(item); }
        else update(value => owned ? equipDecor(value, item.slot, equipped ? null : item.id) : buyDecor(value, item.id));
      }}>{owned ? equipped ? tab === 'character' && item.id === 'potato' ? '기본 친구 장착 중 ✓' : '해제하기' : tab === 'character' ? '함께하기' : '장착하기' : locked ? '잠겨 있어요' : '구매하기'}</Button></Card>;
  })}</>;
}
