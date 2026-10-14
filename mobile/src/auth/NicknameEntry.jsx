import React from 'react';
import { Card, Label, Input, Button, styles } from '../ui';
export default function NicknameEntry({value,onChange,onSubmit,busy,message}) {
  return <Card style={{width:'100%'}}><Label accessibilityRole="header" style={styles.cardTitle}>어떤 이름으로 시작할까요?</Label><Label style={styles.body}>사용할 닉네임을 정해 주세요.</Label><Label>닉네임</Label><Input accessibilityLabel="계정 닉네임" value={value} onChangeText={onChange} editable={!busy} autoCapitalize="none" returnKeyType="done" onSubmitEditing={()=>{if(!busy&&value.trim())onSubmit(value);}}/><Label style={styles.small}>2~12자 · 사용 가능 여부는 서버에서 확인해요.</Label>{!!message&&<Label accessibilityRole="alert" style={styles.body}>{message}</Label>}<Button primary disabled={busy||!value.trim()} onPress={()=>onSubmit(value)}>{busy?'등록 중…':'닉네임으로 시작하기'}</Button></Card>;
}
