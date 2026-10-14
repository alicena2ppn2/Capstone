import React from 'react';
import { Image } from 'react-native';
import { albumPhotos } from '../../frontend/src/utils/missionPhotos.js';
import { Card, Label, styles } from './ui';
export default function PhotoAlbum({game}) {
  const photos=albumPhotos(game);
  return <><Label style={styles.cardTitle}>사진으로 남긴 도전</Label><Label style={styles.small}>이 기기에 저장한 미션 사진이에요.</Label>{photos.length?photos.map(item=><Card key={item.id}><Image source={{uri:item.uri}} accessibilityLabel={item.title} resizeMode="contain" style={{width:'100%',height:220,borderRadius:12}}/><Label style={styles.small}>{item.date}</Label><Label style={styles.cardTitle}>{item.title}</Label><Label style={styles.small}>미션 완료 ✓</Label></Card>):<Label style={styles.body}>사진 미션을 완료하면 이곳에 사진과 도전이 함께 남아요.</Label>}</>;
}
