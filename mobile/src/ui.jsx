import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function Label({ children, style, ...props }) { return <Text {...props} style={[styles.text, style]}>{children}</Text>; }
export function Button({ children, icon, onPress, primary, disabled, selected, style, textStyle, accessibilityLabel }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled: !!disabled, selected: !!selected }} disabled={disabled} onPress={onPress} style={({ pressed, focused }) => [styles.button, primary && styles.primary, selected && styles.selected, disabled && styles.disabled, pressed && styles.pressed, focused && styles.focused, style]}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{icon}<Label style={[styles.buttonText, primary && { color: '#FFFFFF' }, textStyle]}>{children}</Label></View></Pressable>;
}
export function Input(props) { return <TextInput {...props} placeholderTextColor="#81828D" style={[styles.input, props.multiline && styles.multiline, props.style]} />; }
export function Card({ children }) { return <View style={styles.card}>{children}</View>; }
export function Progress({ value, max = 100 }) { return <View accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max, now: Math.min(max, value) }} style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, Math.max(0, value / max * 100))}%` }]} /></View>; }
export function Sheet({ title, close, children }) {
  return <Modal visible transparent animationType="slide" onRequestClose={close}><KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Pressable accessibilityLabel="창 닫기" onPress={close} style={StyleSheet.absoluteFill} /><SafeAreaView edges={['bottom']} style={styles.sheet} accessibilityViewIsModal><View style={styles.row}><Label accessibilityRole="header" style={[styles.heading, styles.flex]}>{title}</Label><Button onPress={close} accessibilityLabel="창 닫기">닫기</Button></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>{children}</ScrollView></SafeAreaView></KeyboardAvoidingView></Modal>;
}
export const styles = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: '#FAF7EF' },
  text: { fontFamily: 'Pretendard', color: '#494654', fontSize: 15, lineHeight: 22 },
  heading: { fontFamily: 'Pretendard-Bold', fontSize: 22, lineHeight: 30 }, cardTitle: { fontFamily: 'Pretendard-Bold', fontSize: 17, lineHeight: 25 },
  body: { fontSize: 14, lineHeight: 22 }, small: { fontSize: 12, lineHeight: 18, color: '#74727E' }, badge: { fontSize: 12, color: '#5685A5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 4, gap: 8 },
  coin: { fontFamily: 'Pretendard-Bold', backgroundColor: '#FFF0BC', padding: 8, borderRadius: 14 },
  content: { padding: 12, paddingBottom: 36, gap: 10, width: '100%', maxWidth: 480, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, center: { alignItems: 'center' },
  button: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFF9EE', borderColor: '#DDD0BE', borderWidth: 1, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  primary: { backgroundColor: '#83B4D3', borderColor: '#6F9FBE' }, selected: { backgroundColor: '#E2EFF8', borderColor: '#75A8CC' }, buttonText: { fontFamily: 'Pretendard-Bold', fontSize: 14, textAlign: 'center' }, disabled: { opacity: .45 }, pressed: { opacity: .75 }, focused: { borderColor: '#496FA0', borderWidth: 2 },
  card: { borderRadius: 18, padding: 14, backgroundColor: '#FFFCF5', borderWidth: 1, borderColor: '#E4D9C8', gap: 8 },
  input: { fontFamily: 'Pretendard', fontSize: 16, color: '#494654', minHeight: 44, borderWidth: 1, borderColor: '#C5D9E6', borderRadius: 12, padding: 10, backgroundColor: '#FFFFFF' }, multiline: { minHeight: 88, textAlignVertical: 'top' },
  track: { height: 7, backgroundColor: '#E5E4DF', borderRadius: 6, overflow: 'hidden' }, fill: { height: '100%', backgroundColor: '#83B4D3', borderRadius: 6 },
  room: { alignSelf: 'center', borderRadius: 20, overflow: 'hidden' }, settingsCorner: { position: 'absolute', top: 8, right: 8 },
  clock: { position: 'absolute', top: '31%', alignSelf: 'center', fontSize: 11, backgroundColor: '#FFF9ED', borderRadius: 10, paddingHorizontal: 6 },
  roomMenus: { position: 'absolute', left: 8, right: 64, top: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  friendPosition: { position: 'absolute', bottom: '15%', alignSelf: 'center', alignItems: 'center' }, identity: { position: 'absolute', bottom: 8, alignSelf: 'center', alignItems: 'center', maxWidth: '85%' }, nameButton: { minHeight: 44, paddingVertical: 5, paddingHorizontal: 10 }, level: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  overlay: { flex: 1, backgroundColor: '#302D4155', justifyContent: 'flex-end' }, sheet: { backgroundColor: '#FFF9EF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 10, maxHeight: '85%' }, attendanceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 8 },
  toast: { position: 'absolute', bottom: 30, alignSelf: 'center', padding: 12, borderRadius: 18, backgroundColor: '#FFF0BA' }, error: { color: '#A34757', padding: 12 },
});
