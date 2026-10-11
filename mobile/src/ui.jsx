import UiIcon from './UiIcon';
import { colors, ui } from '../../frontend/src/design/tokens.js';
import React, { createContext, useContext, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const FontReadyContext = createContext(false);
export function Label({ children, style, ...props }) {
  const ready = useContext(FontReadyContext);
  const resolved = StyleSheet.flatten([styles.text, style]);
  const weight = resolved.fontFamily === 'A2z-600' || Number(resolved.fontWeight) >= 600 ? 600 : resolved.fontFamily === 'A2z-500' || Number(resolved.fontWeight) >= 500 ? 500 : 400;
  return <Text {...props} style={[styles.text, style, { fontFamily: ready ? `A2z-${weight}` : undefined, fontWeight: ready ? 'normal' : String(weight), flexShrink: 1 }]}>{children}</Text>;
}
export function Button({ children, icon, onPress, primary, disabled, selected, variant = 'secondary', style, textStyle, accessibilityLabel }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled: !!disabled, selected: !!selected }} disabled={disabled} onPress={onPress} style={({ pressed, focused }) => [styles.button, variant === 'text' && styles.textButton, primary && styles.primary, selected && styles.selected, disabled && styles.disabled, pressed && !disabled && { backgroundColor: primary || selected ? colors.primaryPressed : colors.primarySoft }, focused && styles.focused, style]}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexShrink: 1, gap: 6 }}>{icon}<Label style={[styles.buttonText, variant === 'text' && { color: colors.ink }, primary && { color: colors.surface }, selected && { color: colors.surface }, disabled && { color: colors.muted }, textStyle]}>{children}</Label></View></Pressable>;
}
export function AttendanceButton(props) { return <Button {...props} textStyle={[{fontSize:14,lineHeight:22},props.textStyle]} />; }
export function Input(props) { const ready = useContext(FontReadyContext), [focused, setFocused] = useState(false); return <TextInput {...props} onFocus={event => { setFocused(true); props.onFocus?.(event); }} onBlur={event => { setFocused(false); props.onBlur?.(event); }} placeholderTextColor={colors.muted} style={[styles.input, props.multiline && styles.multiline, props.style, focused && { borderColor: colors.primary, borderWidth: 2 }, { fontFamily: ready ? 'A2z-400' : undefined, fontWeight: '400' }]} />; }
export function Card({ children, style, ...props }) { return <View {...props} style={[styles.card, style]}>{children}</View>; }
export function ScreenHeader({ title, onBack, backLabel = '홈 화면으로 돌아가기' }) {
  return <View style={styles.screenHeader}><Button onPress={onBack} accessibilityLabel={backLabel} style={styles.backButton}>{'‹'}</Button><Label accessibilityRole="header" style={[styles.heading, styles.flex]}>{title}</Label>{title === '방명록' && <UiIcon kind="envelope" />}</View>;
}
export function Progress({ value, max = 100 }) { return <View accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max, now: Math.min(max, value) }} style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, Math.max(0, value / max * 100))}%` }]} /></View>; }
export function Sheet({ title, close, children }) {
  return <Modal visible transparent animationType="slide" onRequestClose={close}><KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Pressable accessibilityLabel="창 닫기" onPress={close} style={StyleSheet.absoluteFill} /><SafeAreaView edges={['bottom']} style={styles.sheet} accessibilityViewIsModal><View style={styles.row}><Label accessibilityRole="header" style={[styles.heading, styles.flex]}>{title}</Label><Button onPress={close} accessibilityLabel="창 닫기">닫기</Button></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>{children}</ScrollView></SafeAreaView></KeyboardAvoidingView></Modal>;
}
export const styles = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: colors.background },
  text: { fontFamily: 'A2z-400', color: colors.ink, fontSize: ui.body, lineHeight: 22 },
  heading: { fontFamily: 'A2z-600', fontSize: ui.title, lineHeight: 30 }, cardTitle: { fontFamily: 'A2z-600', fontSize: ui.cardTitle, lineHeight: 25 },
  body: { fontSize: 14, lineHeight: 22 }, small: { fontSize: ui.caption, lineHeight: 20, color: colors.muted }, badge: { fontSize: 12, color: colors.primary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 4, gap: 8 },
  coin: { fontFamily: 'A2z-500', backgroundColor: colors.accentSoft, padding: 8, borderRadius: 14 },
  content: { padding: 12, paddingBottom: 36, gap: 10, width: '100%', maxWidth: 480, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, center: { alignItems: 'center' },
  button: { minHeight: ui.touch, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, borderColor: colors.inputBorder, borderWidth: 1, borderRadius: ui.radius, justifyContent: 'center', alignItems: 'center' },
  textButton: { backgroundColor: 'transparent', borderWidth: 0 },
  primary: { backgroundColor: colors.primary, borderColor: colors.primary }, selected: { backgroundColor: colors.primary, borderColor: colors.primary }, buttonText: { fontFamily: 'A2z-500', fontSize: 14, textAlign: 'center' }, disabled: { backgroundColor: colors.disabled, borderColor: colors.border, opacity: 1 }, pressed: { opacity: .75 }, focused: { borderColor: colors.primary, borderWidth: 2 },
  screenHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, marginBottom: 2 },
  backButton: { width: 44, height: 44, padding: 0 },
  state: { fontSize: 12, lineHeight: 18, color: colors.muted, backgroundColor: colors.disabled, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 7 },
  started: { backgroundColor: colors.primarySoft, color: colors.ink }, done: { backgroundColor: colors.primarySoft, color: colors.ink },
  reward: { backgroundColor: colors.accentSoft, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 7, color: colors.ink },
  card: { borderRadius: ui.cardRadius, padding: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 8 },
  input: { fontFamily: 'A2z-400', fontSize: 16, color: colors.ink, minHeight: 44, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, padding: 10, backgroundColor: colors.surface }, multiline: { minHeight: 88, textAlignVertical: 'top' },
  track: { height: 7, backgroundColor: colors.border, borderRadius: 6, overflow: 'hidden' }, fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 6 },
  room: { alignSelf: 'center', borderRadius: 20, overflow: 'hidden' }, settingsCorner: { position: 'absolute', top: 8, right: 8 },
  clock: { position: 'absolute', top: '31%', alignSelf: 'center', fontSize: 11, backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 6 },
  roomMenus: { position: 'absolute', left: 8, right: 64, top: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  friendPosition: { position: 'absolute', bottom: '15%', alignSelf: 'center', alignItems: 'center' }, identity: { position: 'absolute', bottom: 8, alignSelf: 'center', alignItems: 'center', maxWidth: '85%' }, nameButton: { minHeight: 44, paddingVertical: 5, paddingHorizontal: 10 }, level: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexShrink: 1, gap: 6 },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }, sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 10, maxHeight: '85%' }, attendanceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 8 },
  toast: { position: 'absolute', bottom: 30, alignSelf: 'center', padding: 12, borderRadius: 18, backgroundColor: colors.accentSoft }, error: { color: colors.error, padding: 12 },
});
