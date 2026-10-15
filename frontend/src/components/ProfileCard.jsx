import { useEffect, useState } from 'react';
import { call, useServerUserId } from '../api/missions.js';
import Mochi from './Mochi.jsx';

// 설정 > 내 프로필: 닉네임·한 줄 소개(이웃이 내 방에서 봄)·관심사 (서버 설문의 interests)
const BIO_MAX = 40, INTEREST_MAX = 5;

export default function ProfileCard() {
  const userId = useServerUserId();
  const [profile, setProfile] = useState(null), [interests, setInterests] = useState([]), [answers, setAnswers] = useState({});
  const [options, setOptions] = useState([]), [message, setMessage] = useState(''), [saving, setSaving] = useState(false);
  const [nickname, setNickname] = useState(''), [bio, setBio] = useState('');
  useEffect(() => {
    if (!userId) return undefined;
    let live = true;
    Promise.all([call(`/users/${encodeURIComponent(userId)}`), call(`/users/${encodeURIComponent(userId)}/survey`), call('/survey/questions')]).then(([user, survey, questions]) => {
      if (!live) return;
      setProfile(user); setNickname(user.nickname ?? ''); setBio(user.bio ?? '');
      setAnswers(survey.answers ?? {}); setInterests(survey.answers?.interests ?? []);
      setOptions(questions.questions.find(q => q.id === 'interests')?.options ?? []);
    }).catch(e => { if (live) setMessage(e.message); });
    return () => { live = false; };
  }, [userId]);
  if (!userId) return <section className="settings-card profile-card"><h2 className="jua">내 프로필</h2><p className="settings-name-hint">서버에 연결되면 닉네임과 소개를 바꿀 수 있어요.</p></section>;
  const toggle = id => setInterests(list => list.includes(id) ? list.filter(x => x !== id) : list.length >= INTEREST_MAX ? list : [...list, id]);
  const save = async event => {
    event.preventDefault(); if (saving) return;
    setSaving(true); setMessage('');
    try {
      const change = {};
      if (nickname.trim() !== profile.nickname) change.nickname = nickname.trim();
      if ((bio.trim() || null) !== (profile.bio ?? null)) change.bio = bio.trim();
      let user = profile;
      if (Object.keys(change).length) user = await call(`/users/${encodeURIComponent(userId)}`, { method: 'PATCH', body: change });
      if (JSON.stringify(interests) !== JSON.stringify(answers.interests ?? [])) {
        const next = { ...answers, interests };
        await call(`/users/${encodeURIComponent(userId)}/survey`, { method: 'PUT', body: { answers: next } });
        setAnswers(next);
      }
      setProfile(user); setNickname(user.nickname); setBio(user.bio ?? '');
      setMessage('프로필을 저장했어요!');
    } catch (e) { setMessage(e.message); }
    finally { setSaving(false); }
  };
  return <form className="settings-card profile-card" onSubmit={save}>
    <h2 className="jua">내 프로필</h2>
    {!profile ? <p role="status">{message || '불러오는 중…'}</p> : <>
      <div className="profile-head"><span className="profile-avatar"><Mochi width={64} height={64} /></span><div><strong>{profile.nickname}</strong><small>이웃에게 이렇게 보여요</small></div></div>
      <label className="settings-name-label" htmlFor="profile-nickname">닉네임 <small>(2~12자)</small></label>
      <input id="profile-nickname" className="inp" maxLength={12} value={nickname} onChange={e => { setNickname(e.target.value); setMessage(''); }} />
      <label className="settings-name-label" htmlFor="profile-bio">한 줄 소개 <small>{bio.length}/{BIO_MAX}</small></label>
      <input id="profile-bio" className="inp" maxLength={BIO_MAX} value={bio} placeholder="예: 강아지랑 산책하는 걸 좋아해요" onChange={e => { setBio(e.target.value); setMessage(''); }} />
      <fieldset className="profile-interests"><legend>관심 있는 것 <small>({interests.length}/{INTEREST_MAX})</small></legend>
        <div>{options.map(o => <button type="button" key={o.id} className="pb ui-secondary" aria-pressed={interests.includes(o.id)} onClick={() => toggle(o.id)}>{o.label}</button>)}</div>
      </fieldset>
      <button type="submit" className="pb ui-primary" disabled={saving || nickname.trim().length < 2}>{saving ? '저장 중…' : '프로필 저장'}</button>
      <p className="settings-name-status" role="status">{message}</p>
    </>}
  </form>;
}
