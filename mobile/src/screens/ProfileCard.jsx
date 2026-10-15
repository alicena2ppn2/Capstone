// 설정 > 내 프로필 (서버): 닉네임·한 줄 소개(이웃이 내 방에서 봄)·관심사 (서버 설문의 interests).
// 웹 frontend/src/components/ProfileCard.jsx와 같은 규칙.
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Label, Button, Input, Card, styles } from '../components/ui';
import { profileOf, saveProfile, surveyOf, saveSurvey, surveyQuestions } from '../api/server';

const BIO_MAX = 40, INTEREST_MAX = 5;

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
  return <Card>
    <Label style={styles.cardTitle}>내 프로필</Label>
    {!profile ? <Label style={styles.small}>{message || '불러오는 중…'}</Label> : <>
      <Label style={styles.small}>이웃에게 이렇게 보여요: {profile.nickname}{profile.bio ? ` · “${profile.bio}”` : ''}</Label>
      <Label>닉네임 <Label style={styles.small}>(2~12자)</Label></Label>
      <Input accessibilityLabel="닉네임" maxLength={12} value={nickname} onChangeText={text => { setNickname(text); setMessage(''); }} />
      <Label>한 줄 소개 <Label style={styles.small}>{bio.length}/{BIO_MAX}</Label></Label>
      <Input accessibilityLabel="한 줄 소개" maxLength={BIO_MAX} value={bio} placeholder="예: 강아지랑 산책하는 걸 좋아해요" onChangeText={text => { setBio(text); setMessage(''); }} />
      <Label>관심 있는 것 <Label style={styles.small}>({interests.length}/{INTEREST_MAX})</Label></Label>
      <View style={styles.wrap}>{options.map(o => <Button key={o.id} selected={interests.includes(o.id)} onPress={() => toggle(o.id)}>{o.label}</Button>)}</View>
      <Button primary disabled={saving || nickname.trim().length < 2} onPress={save}>{saving ? '저장 중…' : '프로필 저장'}</Button>
      {!!message && <Label accessibilityLiveRegion="polite" style={styles.small}>{message}</Label>}
    </>}
  </Card>;
}
