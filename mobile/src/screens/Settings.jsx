import HelpResources from '../components/HelpResources';
import MissionPreferences from './quests/MissionPreferences';
import { saveMissionPreferences } from '../../../shared/features/missionGuidance.js';
import { useAuthActions } from '../../../shared/auth/AuthContext.js';
import React, { useState } from 'react';
import { Alert, Platform, Switch, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Label, Button, Input, Card, styles, ScreenHeader } from '../components/ui';
import { decodeBackup, encodeBackup } from '../storage/storage';
import ProfileCard from './ProfileCard';
import AccountDelete from './AccountDelete';
import { notificationsAllowed } from '../notify/comeback';

export default function Settings({ serverUserId, onProfileSaved, onBack, state, name, update, setState, openSheet, onPreferences }) {
  const auth = useAuthActions();
  const [loggingOut, setLoggingOut] = useState(false), [logoutError, setLogoutError] = useState('');
  async function logout() {
    if (loggingOut || !auth) return;
    setLoggingOut(true); setLogoutError('');
    const result = await auth.logout();
    if (!result.ok) { setLogoutError(result.message); setLoggingOut(false); }
  }

  const [draft, setDraft] = useState(name), [notice, setNotice] = useState('');
  return <><ScreenHeader title="설정" onBack={onBack} />{serverUserId && <ProfileCard userId={serverUserId} onSaved={onProfileSaved} />}<Card><Label style={styles.cardTitle}>캐릭터 별명</Label><Input accessibilityLabel="캐릭터 별명" maxLength={12} value={draft} onChangeText={setDraft} /><Button primary disabled={!draft.trim()} onPress={() => update(value => ({ ...value, nicknames: { ...value.nicknames, [value.character]: draft.trim() } }))}>이름 저장</Button></Card>{!serverUserId && <MissionPreferences preferences={state.game.preferences} onSave={onPreferences??(answers=>update(value=>saveMissionPreferences(value,answers)))}/>}<Card><Label style={styles.cardTitle}>알림 설정</Label><Label style={styles.body}>다시 부르기 알림: 며칠 안 들어오면 친구가 불러요 (2·4·7일 뒤 저녁 7시).</Label><View style={styles.row}><Label style={styles.flex}>다시 부르기 알림</Label><Switch accessibilityLabel="다시 부르기 알림" value={state.settings.reminders !== false} onValueChange={async enabled => { if (enabled && !await notificationsAllowed(true)) { setNotice('휴대폰 설정에서 이 앱의 알림을 허용해 주세요.'); return; } setNotice(''); setState(old => ({ ...old, settings: { ...old.settings, reminders: enabled } })); }} /></View>{!!notice && <Label style={styles.small}>{notice}</Label>}</Card><Card><Label style={styles.cardTitle}>기록 옮기기</Label><Label style={styles.body}>웹과 앱 저장소는 서로 달라요. 백업으로 기존 기록과 보유 아이템을 가져올 수 있어요.</Label><Button onPress={() => openSheet({ kind: 'backup', title: '기록 백업·가져오기' })}>백업·가져오기</Button></Card><HelpResources/><AccountDelete /><Card><Label style={styles.cardTitle}>로그아웃</Label><Label style={styles.body}>로그인 화면으로 돌아가요. 저장된 기록은 유지돼요.</Label><Button disabled={loggingOut || !auth} onPress={logout}>{loggingOut ? '로그아웃 중…' : '로그아웃'}</Button>{!!logoutError && <Label accessibilityRole="alert">{logoutError}</Label>}</Card></>;
}
export function Backup({ state, onRestore, close }) {
  const [draft, setDraft] = useState(''), [message, setMessage] = useState('');
  const importData = () => {
    let loaded;
    try { loaded = decodeBackup(draft); if (!JSON.parse(draft)['mochi.game.v1']) throw new Error('게임 기록이 없는 백업이에요.'); }
    catch (error) { setMessage(error.message); return; }
    const apply = () => { onRestore(loaded); close(); };
    if (Platform.OS === 'web') { if (globalThis.confirm('현재 앱 기록을 가져온 백업으로 교체할까요? 먼저 현재 기록을 백업해 주세요.')) apply(); }
    else Alert.alert('백업 가져오기', '현재 앱 기록을 가져온 백업으로 교체합니다. 먼저 현재 기록을 백업해 주세요.', [{ text: '취소', style: 'cancel' }, { text: '가져오기', onPress: apply }]);
  };
  return <><Button onPress={async () => { try { await Clipboard.setStringAsync(JSON.stringify(encodeBackup(state))); setMessage('현재 기록을 복사했어요. 안전한 곳에 보관해 주세요.'); } catch { setMessage('복사 권한을 확인해 주세요.'); } }}>현재 기록 복사</Button><Input multiline accessibilityLabel="백업 JSON" value={draft} onChangeText={setDraft} placeholder="웹 설정에서 복사한 백업 JSON을 붙여넣으세요" /><Button primary disabled={!draft.trim()} onPress={importData}>백업 가져오기</Button><Label style={styles.body}>{message}</Label></>;
}
