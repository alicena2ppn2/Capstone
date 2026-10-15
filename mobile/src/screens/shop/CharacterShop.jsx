import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Label, Button, Card, styles } from '../../components/ui';
import Character from '../../components/Character';
import { CHARACTERS, equipCharacter } from '../../../../shared/features/game.js';
import { FRIEND_INTROS } from '../../../../shared/data/catalog.js';
import { characterAvailability, CHARACTER_STATUS } from '../../../../shared/features/finalFriends.js';
export default function CharacterShop({ game, level, ownedOnly, update, onBuy }) {
  const [intro, setIntro] = useState(null), [welcome, setWelcome] = useState(null), [message, setMessage] = useState('');
  const busy = useRef(false);
  const next = CHARACTERS.find(item => !item.method && !game.characters.includes(item.id) && item.level > level);
  const purchase = async item => {
    if (busy.current) return;
    busy.current = true;
    try { const result = await onBuy(item.id); if (result?.ok && result.changed) { setWelcome(item); setMessage(`${item.name}을 만났어요!`); } else setMessage(result?.ok ? '현재 레벨·코인·보유 상태를 확인해 주세요.' : '구매를 저장하지 못했어요. 다시 시도해 주세요.'); }
    finally { busy.current = false; }
  };
  const equip = id => update(value => equipCharacter(value, id));
  return <>{next && <Label style={styles.small}>다음에 만날 친구: {next.name} · LV.{next.level}</Label>}
    {welcome && <Card><Character variant={welcome.id} size={100} label={welcome.name} /><Label style={styles.cardTitle}>{welcome.name}</Label><Label>새 친구가 컬렉션에 왔어요. 반가워요!</Label><Button primary onPress={() => { equip(welcome.id); setWelcome(null); }}>함께하기</Button><Button onPress={() => setWelcome(null)}>나중에 함께하기</Button></Card>}
    {CHARACTERS.filter(item => !ownedOnly || game.characters.includes(item.id)).map(item => {
      const status = characterAvailability(game, item), has = status === 'owned' || status === 'active', secret = !has && item.method === 'quest', profile = FRIEND_INTROS[item.id];
      return <Card key={item.id}><View style={styles.center}>{secret ? <Label style={styles.heading}>?</Label> : <Character variant={item.id} size={130} label={item.name} />}</View><Label style={styles.cardTitle}>{secret ? '비밀 친구' : item.name}</Label>
        <Label style={styles.small}>{secret ? '현실 행동 누적 10회' : `LV.${item.level} · ${item.method ? '무료 보상' : `${item.price} 코인`}`}</Label><Label style={[styles.state, has ? styles.done : null]}>{CHARACTER_STATUS[status]}</Label>
        {!secret && <><Button onPress={() => setIntro(intro === item.id ? null : item.id)}>{intro === item.id ? '⌃' : '⌄'} 친구 소개</Button>{intro === item.id && <Label style={styles.body}>{profile?.introduction}{profile?.likes ? `\n좋아하는 것: ${profile.likes}\n작은 습관: ${profile.habit}` : ''}</Label>}</>}
        {status === 'active' ? item.id !== 'potato' && <Button onPress={() => equip('potato')}>함께하기 해제</Button> : has ? <Button primary onPress={() => equip(item.id)}>함께하기</Button> : <Button primary disabled={status !== 'available'} onPress={() => purchase(item)}>{status === 'level' ? `LV.${item.level}` : status === 'coins' ? '코인이 부족해요' : status === 'special' ? '보상으로 만나요' : '구매하기'}</Button>}
      </Card>;
    })}<Label accessibilityLiveRegion="polite">{message}</Label></>;
}
