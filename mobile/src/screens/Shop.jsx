import { colors } from '../../../shared/theme/tokens.js';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Label, Button, Card, styles, ScreenHeader } from '../components/ui';
import Character from '../components/Character';
import RoomBackdrop from '../art/RoomBackdrop';
import { CHARACTERS, buyDecor, equipDecor } from '../../../shared/features/game.js';
import { CLOTHES } from '../../../shared/data/clothes.js';
import { DECOR, categoryOf } from '../../../shared/data/decor.js';
import CharacterShop from './shop/CharacterShop';
import Price from '../components/Price';

const TABS = [['character', '친구들'], ['clothes', '옷 꾸미기'], ['decor', '집 꾸미기']];
const DECOR_TABS = [['all', '전체'], ['wallpaper', '벽지'], ['floor', '바닥'], ['sofa', '소파'], ['drawer', '서랍장'], ['curtain', '커튼'], ['lamp', '전등'], ['carpet', '카페트'], ['props', '소품'], ['scenery', '창밖 풍경']];

// 상점 위쪽 (10/19): 큰 분류는 같은 너비 3칸 탭, '모든 상품·보유'는 작은 보조 버튼, 집 꾸미기 종류는 옆으로 넘기는 한 줄
function Tabs({ tab, setTab }) {
  return <View accessibilityRole="tablist" style={shop.tabs}>{TABS.map(([id, text]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: tab === id }} onPress={() => setTab(id)} style={[shop.tab, tab === id && shop.tabOn]}>
    <Label style={[shop.tabText, tab === id && shop.tabTextOn]}>{text}</Label>
  </Pressable>)}</View>;
}
function Chip({ on, onPress, children }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={[shop.chip, on && shop.chipOn]}><Label style={[shop.chipText, on && shop.chipTextOn]}>{children}</Label></Pressable>;
}

export default function Shop({ onBack, game, level, ownedClothes, outfit, update, buyClothes, wear, onBuyCharacter }) {
  const [tab, setTab] = useState('character'), [ownedOnly, setOwnedOnly] = useState(false), [slot, setSlot] = useState('all');
  const allItems = tab === 'character' ? CHARACTERS : tab === 'clothes' ? CLOTHES : DECOR;
  const ownedIds = tab === 'character' ? game.characters : tab === 'clothes' ? ownedClothes : game.ownedDecor ?? [];
  const items = allItems.filter(item => (!ownedOnly || ownedIds.includes(item.id)) && (tab !== 'decor' || slot === 'all' || categoryOf(item.slot) === slot));
  return <><ScreenHeader title="모찌 상점" onBack={onBack} />
    <Tabs tab={tab} setTab={next => { setTab(next); setSlot('all'); }} />
    <View style={shop.filterRow}><Chip on={!ownedOnly} onPress={() => setOwnedOnly(false)}>모든 상품</Chip><Chip on={ownedOnly} onPress={() => setOwnedOnly(true)}>보유 {ownedIds.length}</Chip></View>
    {tab === 'decor' && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={shop.slotRow}>{DECOR_TABS.map(([id, name]) => <Chip key={id} on={slot === id} onPress={() => setSlot(id)}>{name}</Chip>)}</ScrollView>}
    {tab === 'character' ? <CharacterShop game={game} level={level} ownedOnly={ownedOnly} update={update} onBuy={onBuyCharacter} /> : <View style={shop.grid}>{!items.length && <Label style={[styles.small, { padding: 24, textAlign: 'center', width: '100%' }]}>아직 보유한 아이템이 없어요.</Label>}{items.map(item => {
    const owned = (tab === 'clothes' ? ownedClothes : game.ownedDecor ?? []).includes(item.id);
    const equipped = tab === 'clothes' ? outfit === item.id : game.decor?.[item.slot] === item.id;
    const locked = level < (item.level ?? 1);
    const secret = item.method === 'quest' && !owned;
    return <Card key={item.id} style={shop.item}><View style={styles.center}>{tab === 'character' ? secret ? <Label style={styles.heading}>?</Label> : <Character variant={item.id} size={130} label={item.name} /> : tab === 'clothes' ? <Character variant={game.character} size={92} outfit={item} label={item.name} /> : <View style={{ width: '100%', aspectRatio: 368 / 500, borderRadius: 12, overflow: 'hidden' }}><RoomBackdrop homeScene decor={{ ...game.decor, [item.slot]: item.id }} positions={game.decorPositions} /></View>}</View><Label style={[styles.cardTitle, { textAlign: 'center', fontSize: 15 }]}>{secret ? '비밀 친구' : item.name}</Label>{secret ? <Label style={[styles.small, shop.meta]}>누적 행동 도전 10회</Label> : <View style={shop.metaRow}><Price value={item.price} size={14} textStyle={shop.meta} /><Label style={[styles.small, shop.meta]}>· LV.{item.level ?? 1}{locked ? ' · 잠금' : ''}</Label></View>}

      {equipped && <Label style={[styles.state, styles.done, { alignSelf: 'center' }]}>장착 중 ✓</Label>}
      <Button primary={!equipped} disabled={tab === 'character' && equipped && item.id === 'potato' || !owned && (locked || game.coins < item.price)} onPress={() => {
        if (tab === 'clothes') { if (owned) wear(equipped ? null : item.id); else buyClothes(item); }
        else update(value => owned ? equipDecor(value, item.slot, equipped ? null : item.id) : buyDecor(value, item.id));
      }}>{owned ? equipped ? tab === 'character' && item.id === 'potato' ? '기본 친구 장착 중 ✓' : '해제하기' : tab === 'character' ? '함께하기' : '장착하기' : locked ? '잠겨 있어요' : '구매하기'}</Button></Card>;
  })}</View>}</>;
}

const shop = StyleSheet.create({
  meta: { fontFamily: 'A2z-500', fontSize: 13, lineHeight: 20, color: colors.muted, textAlign: 'center' }, metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabs: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: 16, backgroundColor: colors.primarySoft },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  tabOn: { backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: .08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  tabText: { fontFamily: 'A2z-500', fontSize: 15, color: colors.muted }, tabTextOn: { fontFamily: 'A2z-600', color: colors.primary },
  filterRow: { flexDirection: 'row', gap: 6 },
  slotRow: { gap: 6, paddingRight: 8 },
  chip: { minHeight: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: 'A2z-500', fontSize: 13, color: colors.ink }, chipTextOn: { color: colors.surface },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  item: { width: '48.5%', padding: 10, gap: 6 },
});
