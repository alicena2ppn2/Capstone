import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Character from '../../components/Character';
import MenuIcon from '../../components/MenuIcon';
import UiIcon from '../../components/UiIcon';
import { Button, Label, Progress, styles } from '../../components/ui';
import RoomBackdrop from '../../art/RoomBackdrop';
import DailySentence from './DailySentence';
import HomeSummary from './HomeSummary';
import { colors } from '../../../../shared/theme/tokens.js';
import { roomTime } from '../../../../shared/utils/roomTime.js';

export default function HomeScreen({ game, level, name, outfit, now, day, reaction, consumeReaction, go, openDiary, setSheet, setQuestFocus, sentenceHeight, setSentenceHeight }) {
  const { width, fontScale } = useWindowDimensions();
  const roomWidth = Math.min(width - 24, 430);
  const baseRoomHeight = roomWidth * 500 / 368;
  const friendSize = Math.min(roomWidth * .66, 248);
  const sentenceExtra = Math.max(0,baseRoomHeight * .868 + sentenceHeight + 22 * fontScale + 14 - baseRoomHeight);
  return <>
        <View style={[homeStyles.room, { width: roomWidth, height: baseRoomHeight + sentenceExtra,backgroundColor:roomTime(now).night?'#DBC1A2':'#EBCDA6' }]}><View accessible accessibilityLabel={`기기 현지 시간: ${roomTime(now).label}`} style={[StyleSheet.absoluteFill,{height:baseRoomHeight,bottom:undefined}]}><RoomBackdrop decor={game.decor ?? {}} homeScene now={now} /></View>
          <View style={homeStyles.settingsCorner}><Button onPress={() => go('settings')} accessibilityLabel="설정" icon={<UiIcon kind="gear" />} /></View>

          <View style={homeStyles.roomMenus}><Button textStyle={{ fontSize: 13 }} style={{ paddingHorizontal: 7 }} onPress={() => go('visit')} icon={<MenuIcon kind="visit" />}>방문하기</Button><Button textStyle={{ fontSize: 13 }} style={{ paddingHorizontal: 7 }} onPress={() => go('guest')} icon={<MenuIcon kind="guest" />}>방명록</Button><Button textStyle={{ fontSize: 13 }} style={{ paddingHorizontal: 7 }} onPress={() => openDiary()} icon={<MenuIcon kind="diary" />}>일기</Button></View>
          <View style={{position:'absolute',top:64,alignSelf:'center',maxWidth:'50%'}}><Button textStyle={{fontFamily:'A2z-600',fontSize:14}} style={{minHeight:38,paddingVertical:7}} onPress={()=>go('settings')}>{name}</Button></View><View style={[styles.friendPosition,{bottom:baseRoomHeight*.15}]}><Character variant={game.character} outfit={outfit} size={friendSize} label={name} interactive reactionId={reaction} onConsumed={consumeReaction} /></View>
          <View style={[styles.identity,{top:baseRoomHeight*.868,bottom:undefined,maxWidth:undefined,gap:6}]}><DailySentence now={now} width={Math.min(roomWidth-24,340)} onHeight={setSentenceHeight}/><View style={styles.level}><Label style={styles.small}>LV.{level}</Label><View style={{ width: 60 }}><Progress value={game.xp % 100} /></View><Label style={styles.small}>{game.xp % 100} / 100 XP</Label></View></View>
        </View><View style={styles.row}><Button primary onPress={() => { setQuestFocus(null); go('quest'); }} style={styles.flex} icon={<UiIcon kind="routine" color={colors.surface} />}>오늘의 도전</Button><Button onPress={() => go('shop')} style={styles.flex} icon={<UiIcon kind="wardrobe" />}>꾸미기</Button></View>
        <HomeSummary game={game} day={day} onQuest={id => { setQuestFocus(id ?? null); go('quest'); }} />
      </>;
}

const homeStyles = StyleSheet.create({
  room: { alignSelf: 'center', borderRadius: 20, overflow: 'hidden' }, settingsCorner: { position: 'absolute', top: 8, right: 8 },
  roomMenus: { position: 'absolute', left: 8, right: 64, top: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
});
