import { colors } from '../../../shared/theme/tokens.js';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Label, Button, Card, styles, ScreenHeader } from '../components/ui';
import Character from '../components/Character';
import RoomBackdrop from '../art/RoomBackdrop';
import { CHARACTERS, buyDecor, equipDecor } from '../../../shared/features/game.js';
import { CLOTHES } from '../../../shared/data/clothes.js';
import { DECOR, categoryOf } from '../../../shared/data/decor.js';
import CharacterShop from './shop/CharacterShop';

export default function Shop({ onBack, game, level, ownedClothes, outfit, update, buyClothes, wear, onBuyCharacter }) {
  const [tab, setTab] = useState('character'), [ownedOnly, setOwnedOnly] = useState(false), [slot, setSlot] = useState('all');
  const allItems = tab === 'character' ? CHARACTERS : tab === 'clothes' ? CLOTHES : DECOR;
  const ownedIds = tab === 'character' ? game.characters : tab === 'clothes' ? ownedClothes : game.ownedDecor ?? [];
  const items = allItems.filter(item => (!ownedOnly || ownedIds.includes(item.id)) && (tab !== 'decor' || slot === 'all' || categoryOf(item.slot) === slot));
  return <><ScreenHeader title="모찌 상점" onBack={onBack} /><View style={styles.wrap}>{[['character', '친구들'], ['clothes', '옷 꾸미기'], ['decor', '집 꾸미기']].map(([id, text]) => <Button key={id} selected={tab === id} onPress={() => setTab(id)}>{text}</Button>)}</View><View style={styles.wrap}><Button selected={!ownedOnly} onPress={() => setOwnedOnly(false)}>모든 상품</Button><Button selected={ownedOnly} onPress={() => setOwnedOnly(true)}>보유 아이템 {ownedIds.length}</Button></View>{tab === 'decor' && <View style={styles.wrap}>{[['all', '전체'], ['wallpaper', '벽지'], ['floor', '바닥'], ['sofa', '소파'], ['drawer', '서랍장'], ['curtain', '커튼'], ['lamp', '전등'], ['carpet', '카페트'], ['props', '소품'], ['scenery', '창밖 풍경']].map(([id, name]) => <Button key={id} selected={slot === id} onPress={() => setSlot(id)}>{name}</Button>)}</View>}{tab === 'character' ? <CharacterShop game={game} level={level} ownedOnly={ownedOnly} update={update} onBuy={onBuyCharacter} /> : items.map(item => {
    const owned = (tab === 'clothes' ? ownedClothes : game.ownedDecor ?? []).includes(item.id);
    const equipped = tab === 'clothes' ? outfit === item.id : game.decor?.[item.slot] === item.id;
    const locked = level < (item.level ?? 1);
    const secret = item.method === 'quest' && !owned;
    return <Card key={item.id}><View style={styles.center}>{tab === 'character' ? secret ? <Label style={styles.heading}>?</Label> : <Character variant={item.id} size={130} label={item.name} /> : tab === 'clothes' ? <Character variant={game.character} size={130} outfit={item} label={item.name} /> : <View style={{ width: '100%', aspectRatio: 368 / 500 }}><RoomBackdrop homeScene decor={{ ...game.decor, [item.slot]: item.id }} positions={game.decorPositions} /></View>}</View><Label style={styles.cardTitle}>{secret ? '비밀 친구' : item.name}</Label><Label style={[styles.small, { fontFamily: 'A2z-500', fontSize: 14, lineHeight: 22, color: colors.muted }]}>{secret ? '누적 행동 도전 10회' : `${item.price} 코인 · LV.${item.level ?? 1}${locked ? ' · 잠금' : ''}`}</Label>

      {equipped && <Label style={[styles.state, styles.done]}>현재 장착 중 ✓</Label>}
      <Button primary={!equipped} disabled={tab === 'character' && equipped && item.id === 'potato' || !owned && (locked || game.coins < item.price)} onPress={() => {
        if (tab === 'clothes') { if (owned) wear(equipped ? null : item.id); else buyClothes(item); }
        else update(value => owned ? equipDecor(value, item.slot, equipped ? null : item.id) : buyDecor(value, item.id));
      }}>{owned ? equipped ? tab === 'character' && item.id === 'potato' ? '기본 친구 장착 중 ✓' : '해제하기' : tab === 'character' ? '함께하기' : '장착하기' : locked ? '잠겨 있어요' : '구매하기'}</Button></Card>;
  })}</>;
}
