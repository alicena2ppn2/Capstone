import React, { useEffect, useState } from 'react';
import { LayoutAnimation, PanResponder, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Character from '../../components/Character';
import MenuIcon from '../../components/MenuIcon';
import UiIcon from '../../components/UiIcon';
import { Button, Card, Label, Progress, styles } from '../../components/ui';
import RoomBackdrop from '../../art/RoomBackdrop';
import DailySentence from './DailySentence';
import HomeSummary from './HomeSummary';
import { colors } from '../../../../shared/theme/tokens.js';
import { roomTime } from '../../../../shared/utils/roomTime.js';
import { levelProgress } from '../../../../shared/features/game.js';
import { DECOR_SLOTS, MOVABLE_SLOTS } from '../../../../shared/data/decor.js';
import { todayMissions } from '../../api/server';

const MOVE_LIMIT = 160;   // 서버와 같은 한계 (±160)
const clamp = v => Math.max(-MOVE_LIMIT, Math.min(MOVE_LIMIT, v));
// 아래 시트 (웹 홈 .home-sheet와 같게, 10/19): 접혀 있을 때는 손잡이 + 버튼 줄만 보이고, 끌어올리거나 누르면 오늘의 도전 요약이 올라온다
const PEEK = 104;          // 접혔을 때 보이는 높이 (손잡이 + 버튼 줄)
const SHEET = .62;          // 펼쳤을 때 화면 높이 대비

// 서버 미션 요약: 오늘의 도전 n/m 과 아직 안 한 것 3개
function ServerSummary({ userId, onQuest }) {
  const [data, setData] = useState(null);
  useEffect(() => { let live = true; todayMissions(userId).then(d => { if (live) setData(d); }).catch(() => {}); return () => { live = false; }; }, [userId]);
  if (!data) return null;
  const left = data.missions.filter(m => !m.done);
  return <Card><View style={styles.row}><Label style={[styles.cardTitle, styles.flex, { fontSize: 14 }]}>오늘의 도전</Label><Label style={styles.small}>{data.missions.length - left.length}/{data.missions.length} 완료</Label></View>
    {left.length ? left.slice(0, 3).map(m => <Button key={m.id} variant="text" style={{ justifyContent: 'flex-start', alignItems: 'flex-start', minHeight: 40 }} textStyle={{ textAlign: 'left' }} onPress={onQuest}>{`· ${m.title}`}</Button>) : <Label style={styles.small}>오늘 도전을 모두 해냈어요! 🎉</Label>}</Card>;
}

export default function HomeScreen({ serverUserId, onMoveDecor, levelInfo, game, level, name, outfit, now, day, reaction, consumeReaction, go, openDiary, setSheet, setQuestFocus, sentenceHeight, setSentenceHeight }) {
  const localLevel = levelProgress(game.xp);
  const { width, fontScale } = useWindowDimensions();
  const [areaHeight, setAreaHeight] = useState(0);   // 홈 영역 높이 (방이 시트에 가리지 않게 방 크기를 맞춘다)
  const fitWidth = areaHeight ? (areaHeight - PEEK - 16 - 48 * fontScale) * 368 / 500 : Infinity;
  // 화면 높이가 넉넉하면 웹처럼 방을 양옆 끝까지 꽉 채운다. 낮은 화면(SE 등)·태블릿은 바닥이 시트에 가리지 않게 가운데 카드로 (10/19)
  const full = !!areaHeight && (areaHeight - PEEK + 24 - 48 * fontScale) * 368 / 500 >= width;
  const roomWidth = full ? width : Math.max(220, Math.min(width - 24, 430, fitWidth));
  const baseRoomHeight = roomWidth * 500 / 368;
  const friendSize = Math.min(roomWidth * .66, 248);
  const sentenceExtra = Math.max(0,baseRoomHeight * .868 + sentenceHeight + 22 * fontScale + 14 - baseRoomHeight);
  // 방(바닥 색)을 시트 손잡이 바로 아래까지 이어서 사이 공백이 없게 — 시트 둥근 모서리 밑으로 조금 들어간다 (10/19)
  const roomHeight = Math.max(baseRoomHeight + sentenceExtra, areaHeight ? areaHeight - (full ? 0 : 4) - PEEK + 24 : 0);
  // 가구 옮기기 (서버): 옮길 소품을 고르고 방을 끌면 그만큼 움직인다. 손을 떼면 서버에 저장
  const placed = MOVABLE_SLOTS.filter(slot => game.decor?.[slot]);
  const [arranging, setArranging] = useState(false), [slot, setSlot] = useState(null), [live, setLive] = useState(null);
  const current = slot && placed.includes(slot) ? slot : placed[0];
  const scale = 368 / roomWidth, saved = game.decorPositions;
  // 손가락 시작점(start)을 상태로 두고, 지금 손가락 위치와의 차이만큼 옮긴다.
  // (다시 그릴 때마다 PanResponder가 새로 만들어져 gestureState가 초기화되므로 화면 좌표로 직접 계산)
  const [start, setStart] = useState(null);
  const moved = (event, from) => { const base = saved?.[current] ?? { dx: 0, dy: 0 }; return { dx: Math.round(clamp(base.dx + (event.nativeEvent.pageX - from.x) * scale)), dy: Math.round(clamp(base.dy + (event.nativeEvent.pageY - from.y) * scale)) }; };
  const pan = PanResponder.create({
    onStartShouldSetPanResponderCapture: () => !!current,
    onMoveShouldSetPanResponderCapture: () => !!current,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: event => setStart({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }),
    onPanResponderMove: event => { if (start) setLive({ slot: current, pos: moved(event, start) }); },
    onPanResponderRelease: () => { const done = live; setStart(null); if (done) Promise.resolve(onMoveDecor?.(done.slot, done.pos)).finally(() => setLive(null)); },
    onPanResponderTerminate: () => { setStart(null); setLive(null); },
  });
  const positions = live ? { ...(game.decorPositions ?? {}), [live.slot]: live.pos } : game.decorPositions ?? {};
  // 시트: 손잡이를 끌면 따라오고 놓으면 가까운 쪽으로, 거의 안 움직이고 떼면 '누름'으로 보고 열고 닫기 (가구 옮기기와 같은 방식 — 시작점을 상태로)
  const [open, setOpen] = useState(false), [drag, setDrag] = useState(null);
  const sheetHeight = Math.max(PEEK + 120, areaHeight * SHEET), closedY = sheetHeight - PEEK;
  const sheetY = drag ? Math.max(0, Math.min(closedY, drag.base + drag.now - drag.from)) : open ? 0 : closedY;
  const snap = next => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpen(next); };
  const sheetPan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: event => setDrag({ from: event.nativeEvent.pageY, now: event.nativeEvent.pageY, base: open ? 0 : closedY }),
    onPanResponderMove: event => { const y = event.nativeEvent.pageY; setDrag(d => d && { ...d, now: y }); },
    onPanResponderRelease: event => { const d = drag, moved = d ? event.nativeEvent.pageY - d.from : 0; setDrag(null); snap(Math.abs(moved) < 8 ? !open : d.base + moved < closedY / 2); },
    onPanResponderTerminate: () => setDrag(null),
  });
  return <View style={{ flex: 1, paddingTop: full ? 0 : 4 }} onLayout={event => setAreaHeight(event.nativeEvent.layout.height)}>
        <View {...(arranging ? pan.panHandlers : {})} style={[homeStyles.room, full && homeStyles.roomFull, arranging && homeStyles.arranging, { width: roomWidth, height: roomHeight,backgroundColor:roomTime(now).night?'#DBC1A2':'#EBCDA6' }]}><View accessible accessibilityLabel={`기기 현지 시간: ${roomTime(now).label}`} style={[StyleSheet.absoluteFill,{height:roomHeight,bottom:undefined}]}><RoomBackdrop decor={game.decor ?? {}} positions={positions} homeScene now={now} floorExtra={(roomHeight - baseRoomHeight) * 368 / roomWidth} /></View>
          <View style={homeStyles.settingsCorner}><Button onPress={() => go('settings')} accessibilityLabel="설정" icon={<UiIcon kind="gear" />} /></View>

          <View style={homeStyles.roomMenus}><Button textStyle={{ fontSize: 13 }} style={{ paddingHorizontal: 7 }} onPress={() => go('visit')} icon={<MenuIcon kind="visit" />}>방문하기</Button><Button textStyle={{ fontSize: 13 }} style={{ paddingHorizontal: 7 }} onPress={() => go('guest')} icon={<MenuIcon kind="guest" />}>방명록</Button><Button textStyle={{ fontSize: 13 }} style={{ paddingHorizontal: 7 }} onPress={() => openDiary()} icon={<MenuIcon kind="diary" />}>일기</Button></View>
          <View style={{position:'absolute',top:64,alignSelf:'center',maxWidth:'50%'}}><Button textStyle={{fontFamily:'A2z-600',fontSize:14}} style={{minHeight:38,paddingVertical:7}} onPress={()=>go('settings')}>{name}</Button></View><View style={[styles.friendPosition,{bottom:baseRoomHeight*.15+roomHeight-baseRoomHeight-sentenceExtra}]}><Character variant={game.character} outfit={outfit} size={friendSize} label={name} interactive reactionId={reaction} onConsumed={consumeReaction} /></View>
          <View style={[styles.identity,{top:baseRoomHeight*.868,bottom:undefined,maxWidth:undefined,gap:6}]}><DailySentence now={now} characterId={game.character} width={Math.min(roomWidth-24,340)} onHeight={setSentenceHeight}/><View style={styles.level}><Label style={styles.small}>LV.{levelInfo?.level ?? level}</Label><View style={{ width: 60 }}><Progress value={levelInfo?.xp_in_level ?? localLevel.xp_in_level} max={levelInfo?.xp_for_level ?? localLevel.xp_for_level} /></View><Label style={styles.small}>{levelInfo?.xp_in_level ?? localLevel.xp_in_level} / {levelInfo?.xp_for_level ?? localLevel.xp_for_level} XP</Label></View></View>
        </View>
        {open && !arranging && <Pressable accessibilityLabel="오늘의 도전 닫기" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(40,30,20,.18)' }]} onPress={() => snap(false)} />}
        {arranging ? <View style={homeStyles.arrangeDock}><Card style={{ gap: 6 }}><Label style={styles.body}>옮길 소품을 고르고 방 그림을 끌어 보세요.</Label><View style={styles.wrap}>{placed.map(id => <Button key={id} selected={current === id} onPress={() => setSlot(id)}>{DECOR_SLOTS[id]}</Button>)}<Button onPress={() => current && onMoveDecor(current, { dx: 0, dy: 0 })}>제자리로</Button><Button primary onPress={() => setArranging(false)}>다 했어요</Button></View></Card></View>
        : <View style={[homeStyles.sheet, { height: sheetHeight, transform: [{ translateY: sheetY }] }]}>
          <View {...sheetPan.panHandlers} accessible accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={open ? '오늘의 도전 접기' : '오늘의 도전 펼치기'} onAccessibilityTap={() => snap(!open)} style={homeStyles.handle}>
            <View style={homeStyles.grip} /><Label style={styles.small}>{open ? '오늘의 도전 접기' : '오늘의 도전 펼치기'}</Label>
          </View>
          <View style={styles.row}><Button primary onPress={() => { setQuestFocus(null); go('quest'); }} style={styles.flex} icon={<UiIcon kind="routine" color={colors.surface} />}>오늘의 도전</Button><Button onPress={() => go('shop')} style={styles.flex} icon={<UiIcon kind="wardrobe" />}>꾸미기</Button><Button accessibilityLabel="동네 탐험" textStyle={{ fontSize: 16 }} style={{ paddingHorizontal: 12 }} onPress={() => go('explore')}>🗺️</Button>{onMoveDecor && placed.length > 0 && !arranging && <Button accessibilityLabel="가구 옮기기" textStyle={{ fontSize: 16 }} style={{ paddingHorizontal: 12 }} onPress={() => setArranging(true)}>🪑</Button>}</View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, paddingBottom: 16 }} scrollEnabled={open}>
            {serverUserId ? <ServerSummary userId={serverUserId} onQuest={() => { setQuestFocus(null); go('quest'); }} /> : <HomeSummary game={game} day={day} onQuest={id => { setQuestFocus(id ?? null); go('quest'); }} />}
          </ScrollView>
        </View>}
      </View>;
}

const homeStyles = StyleSheet.create({
  room: { alignSelf: 'center', borderRadius: 20, overflow: 'hidden' }, roomFull: { borderRadius: 0 }, arranging: { borderWidth: 3, borderColor: colors.primary, borderStyle: 'dashed' }, settingsCorner: { position: 'absolute', top: 8, right: 8 },
  roomMenus: { position: 'absolute', left: 8, right: 64, top: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: .12, shadowRadius: 12, shadowOffset: { width: 0, height: -2 }, elevation: 8 },
  handle: { alignItems: 'center', gap: 2, paddingTop: 6, paddingBottom: 6 },
  grip: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border },
  arrangeDock: { position: 'absolute', left: 12, right: 12, bottom: 8 },
});
