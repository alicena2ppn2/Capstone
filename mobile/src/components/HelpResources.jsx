import React, { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { HELP } from '../../../shared/data/helpResources.js';
import { Button, Card, Label, styles } from './ui';

export default function HelpResources() {
  const [open, setOpen] = useState(false), [message, setMessage] = useState('');
  const close = () => setOpen(false);
  async function launch(url) {
    try { await Linking.openURL(url); setMessage('전화 앱이나 사이트가 열리지 않으면 아래 번호·주소를 복사해 이용해 주세요.'); }
    catch { setMessage('연결 화면을 열지 못했어요. 번호나 공식 주소를 복사해 다시 시도해 주세요.'); }
  }
  async function copy(text) {
    try { await Clipboard.setStringAsync(text); setMessage('복사했어요.'); }
    catch { setMessage('복사하지 못했어요. 표시된 번호나 주소를 길게 눌러 복사해 주세요.'); }
  }
  return <><Button variant="text" onPress={()=>{setMessage('');setOpen(true);}}>{HELP.title}</Button>{open&&<Modal transparent animationType="none" onRequestClose={close}><View style={styles.overlay}><Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="도움 안내 닫기"/><SafeAreaView edges={['bottom']} style={styles.sheet} accessibilityViewIsModal><View style={styles.row}><Label accessibilityRole="header" style={[styles.heading,styles.flex]}>{HELP.title}</Label><Button onPress={close}>닫기</Button></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:10}}><Label>{HELP.description}</Label><Button onPress={()=>launch(`tel:${HELP.services[2].phone}`)}>자살예방상담전화 {HELP.services[2].phone} · 전화 앱 열기</Button><Label style={styles.small}>{HELP.scope}</Label><Label style={styles.small}>{HELP.region}</Label>{HELP.services.map(s=><Card key={s.id}><Label accessibilityRole="header" style={styles.cardTitle}>{s.title}</Label><Label>{s.note}</Label>{s.phone&&<><Button onPress={()=>launch(`tel:${s.phone}`)}>{s.name} {s.phone} · 전화 앱 열기</Button><Button onPress={()=>copy(s.phone)}>{s.phone} 번호 복사</Button></>}<Button onPress={()=>launch(s.url)}>{s.name} 공식 안내 · 외부 사이트</Button><Label selectable style={styles.small}>{s.url}</Label><Button onPress={()=>copy(s.url)}>공식 주소 복사</Button></Card>)}<Label accessibilityLiveRegion="polite">{message}</Label><Label style={styles.small}>정보 확인일: {HELP.checked}</Label></ScrollView></SafeAreaView></View></Modal>}</>;
}
