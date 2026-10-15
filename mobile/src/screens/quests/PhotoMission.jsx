import React, { useRef, useState } from 'react';
import { Image, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { Button, Label, styles } from '../../components/ui';
import { PHOTO_MAX_BYTES } from '../../../../shared/features/missionPhotos.js';
export default function PhotoMission({ onSave }) {
  const [asset, setAsset] = useState(null), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const lock = useRef(false);
  const choose = async camera => {
    if (lock.current) return; lock.current = true; setBusy(true); setMessage('');
    try {
      if (camera) { const permission = await ImagePicker.requestCameraPermissionsAsync(); if (!permission.granted) { setMessage('카메라 권한이 필요해요. 사진 선택으로도 진행할 수 있어요.'); return; } }
      const result = await (camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync)({ mediaTypes: ['images'], quality: .7, exif: false, allowsMultipleSelection: false });
      if (!result.canceled) setAsset(result.assets[0]);
    } catch { setMessage('사진을 열지 못했어요. 다시 시도해 주세요.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const save = async () => {
    if (lock.current || !asset) return; lock.current = true; setBusy(true); setMessage('사진 저장 중…'); let target;
    try {
      const source = new File(asset.uri);
      if (!source.exists || source.size <= 0 || source.size > PHOTO_MAX_BYTES) throw new Error('10MB 이하의 사진을 선택해 주세요.');
      const dir = new Directory(Paths.document, 'mochi-photos'); dir.create({ idempotent: true, intermediates: true });
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const extension = source.extension || '.jpg'; target = new File(dir, `${id}${extension}`); source.copy(target);
      const result = await onSave({ id, uri: target.uri, storage: 'device', mime: asset.mimeType || (extension === '.png' ? 'image/png' : 'image/jpeg'), size: target.size });
      if (!result?.ok || !result.changed) throw new Error(result?.message || '오늘 진행 중인 사진 미션에만 저장할 수 있어요.');
      setMessage('사진첩에 저장했어요.');
    } catch (error) { if (target?.exists) target.delete(); setMessage(error.message || '사진을 저장하지 못했어요. 다시 시도해 주세요.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <View style={{gap:8}}><View style={styles.row}><Button disabled={busy} style={styles.flex} onPress={()=>choose(false)}>사진 선택</Button><Button disabled={busy} style={styles.flex} onPress={()=>choose(true)}>사진 찍기</Button></View>{asset&&<><Image source={{uri:asset.uri}} accessibilityLabel="저장할 사진 미리보기" style={{width:'100%',height:180,borderRadius:12}} resizeMode="contain"/><Button primary disabled={busy} onPress={save}>{busy?'저장 중…':'사진 저장하고 완료'}</Button></>}<Label style={styles.small}>사진은 이 기기에 저장돼요.</Label><Label accessibilityLiveRegion="polite" style={styles.small}>{message}</Label></View>;
}
