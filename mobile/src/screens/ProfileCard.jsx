// 설정 > 내 프로필 (서버): 닉네임·한 줄 소개(이웃이 내 방에서 봄)·관심사 (서버 설문의 interests).
// 웹 frontend/src/components/ProfileCard.jsx와 같은 규칙.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../../../shared/theme/tokens.js';
import { Label, Button, Input, Card, styles } from '../components/ui';
import { profileOf, saveProfile, surveyOf, saveSurvey, surveyQuestions } from '../api/server';

const BIO_MAX = 40, INTEREST_MAX = 5, NICK_MAX = 12;

// 관심사 칩: 작은 알약 모양, 고르면 보라 + ✓ (손가락 영역은 hitSlop으로 44px 이상)
function Chip({ on, onPress, children }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} hitSlop={6} onPress={onPress} style={[pc.chip, on && pc.chipOn]}><Label style={[pc.chipText, on && pc.chipTextOn]}>{on ? `✓ ${children}` : children}</Label></Pressable>;
}
function Field({ title, count, children }) {
  return <View style={{ gap: 6 }}><View style={styles.row}><Label style={[pc.fieldTitle, styles.flex]}>{title}</Label>{!!count && <Label style={styles.small}>{count}</Label>}</View>{children}</View>;
}

export default function ProfileCard({ userId, onSaved }) {
  const [profile, setProfile] = useState(null), [interests, setInterests] = useState([]), [answers, setAnswers] = useState({});
  const [options, setOptions] = useState([]), [message, setMessage] = useState(''), [saving, setSaving] = useState(false);
  const [nickname, setNickname] = useState(''), [bio, setBio] = useState('');
  useEffect(() => {
    let live = true;
    Promise.all([profileOf(userId), surveyOf(userId), surveyQuestions()]).then(([user, survey, questions]) => {
      if (!live) return;
      setProfile(user); setNickname(user.nickname ?? ''); setBio(user.bio ?? '');
      setAnswers(survey.answers ?? {}); setInterests(survey.answers?.interests ?? []);
      setOptions(questions.questions.find(q => q.id === 'interests')?.options ?? []);
    }).catch(e => { if (live) setMessage(e.message); });
    return () => { live = false; };
  }, [userId]);
  const toggle = id => setInterests(list => list.includes(id) ? list.filter(x => x !== id) : list.length >= INTEREST_MAX ? list : [...list, id]);
  const save = async () => {
    if (saving) return;
    setSaving(true); setMessage('');
    try {
      const change = {};
      if (nickname.trim() !== profile.nickname) change.nickname = nickname.trim();
      if ((bio.trim() || null) !== (profile.bio ?? null)) change.bio = bio.trim();
      let user = profile;
      if (Object.keys(change).length) user = await saveProfile(userId, change);
      if (JSON.stringify(interests) !== JSON.stringify(answers.interests ?? [])) {
        const next = { ...answers, interests };
        await saveSurvey(userId, next);
        setAnswers(next);
      }
      setProfile(user); setNickname(user.nickname); setBio(user.bio ?? '');
      setMessage('프로필을 저장했어요!'); onSaved?.();
    } catch (e) { setMessage(e.message); }
    finally { setSaving(false); }
  };
  const dirty = !!profile && (nickname.trim() !== profile.nickname || (bio.trim() || null) !== (profile.bio ?? null) || JSON.stringify(interests) !== JSON.stringify(answers.interests ?? []));
  const labelOf = id => options.find(o => o.id === id)?.label ?? id;
  return <Card style={{ gap: 14 }}>
    <Label style={styles.cardTitle}>내 프로필</Label>
    {!profile ? <Label style={styles.small}>{message || '불러오는 중…'}</Label> : <>
      {/* 이웃이 내 방에서 보는 모습 — 고치는 대로 바로 바뀐다 */}
      <View style={pc.preview} accessible accessibilityLabel={`이웃에게 보이는 모습: ${nickname.trim() || '닉네임'}${bio.trim() ? `, ${bio.trim()}` : ''}`}>
        <View style={[styles.row, { gap: 12 }]}>
          <View style={pc.avatar}><Label style={pc.avatarText}>{(nickname.trim() || '?').slice(0, 1)}</Label></View>
          <View style={[styles.flex, { gap: 2 }]}>
            <Label style={pc.name} numberOfLines={1}>{nickname.trim() || '닉네임'}</Label>
            <Label style={[styles.small, !bio.trim() && { color: colors.muted }]} numberOfLines={2}>{bio.trim() ? `“${bio.trim()}”` : '한 줄 소개를 써 보세요'}</Label>
          </View>
        </View>
        {!!interests.length && <View style={[styles.wrap, { gap: 6 }]}>{interests.map(id => <View key={id} style={pc.tag}><Label style={pc.tagText}>#{labelOf(id)}</Label></View>)}</View>}
      </View>

      <Field title="닉네임" count={`2~${NICK_MAX}자 · ${nickname.length}/${NICK_MAX}`}>
        <Input accessibilityLabel="닉네임" maxLength={NICK_MAX} value={nickname} onChangeText={text => { setNickname(text); setMessage(''); }} />
      </Field>
      <Field title="한 줄 소개" count={`${bio.length}/${BIO_MAX}`}>
        <Input accessibilityLabel="한 줄 소개" maxLength={BIO_MAX} value={bio} placeholder="예: 강아지랑 산책하는 걸 좋아해요" onChangeText={text => { setBio(text); setMessage(''); }} />
      </Field>
      <Field title="관심 있는 것" count={`${interests.length}/${INTEREST_MAX}`}>
        <View style={[styles.wrap, { gap: 8 }]}>{options.map(o => <Chip key={o.id} on={interests.includes(o.id)} onPress={() => { toggle(o.id); setMessage(''); }}>{o.label}</Chip>)}</View>
        {interests.length >= INTEREST_MAX && <Label style={styles.small}>최대 {INTEREST_MAX}개까지 고를 수 있어요.</Label>}
      </Field>

      <Button primary disabled={saving || !dirty || nickname.trim().length < 2} onPress={save}>{saving ? '저장 중…' : dirty ? '프로필 저장' : '바뀐 내용 없음'}</Button>
      {!!message && <Label accessibilityLiveRegion="polite" style={[styles.small, { textAlign: 'center' }]}>{message}</Label>}
    </>}
  </Card>;
}

const pc = StyleSheet.create({
  preview: { backgroundColor: colors.primarySoft, borderRadius: 16, padding: 14, gap: 10 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'A2z-600', fontSize: 22, color: colors.primary },
  name: { fontFamily: 'A2z-600', fontSize: 18, color: colors.ink },
  tag: { backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { fontSize: 12, color: colors.primary, fontFamily: 'A2z-500' },
  fieldTitle: { fontFamily: 'A2z-500', fontSize: 15, color: colors.ink },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: 'A2z-500', fontSize: 14, color: colors.ink }, chipTextOn: { color: colors.surface },
});
