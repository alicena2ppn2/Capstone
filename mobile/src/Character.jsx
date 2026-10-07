import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Platform, Pressable, View } from 'react-native';
import Mochi from './art/Mochi.jsx';
import { CharacterContext } from './art/CharacterContext.jsx';
import { MotionContext } from './art/useFriendReaction.js';

export default function Character({ variant = 'potato', outfit, size = 230, label = '친구', interactive = false, reactionId, onConsumed }) {
  const [blink, setBlink] = useState(false);
  const [reaction, setReaction] = useState(null);
  const [reduced, setReduced] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [transform, setTransform] = useState('');
  const [value] = useState(() => new Animated.Value(0));
  const busy = useRef(false);
  const serial = useRef(0);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(flag => { if (mounted) setReduced(flag); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    const app = AppState.addEventListener('change', status => {
      setActive(status === 'active');
      if (status !== 'active') { value.stopAnimation(); busy.current = false; setReaction(null); setTransform(''); }
    });
    return () => { mounted = false; subscription.remove(); app.remove(); };
  }, [value]);
  useEffect(() => {
    if (!interactive || !active) return;
    let timer;
    const schedule = () => { timer = setTimeout(() => { setBlink(true); timer = setTimeout(() => { setBlink(false); schedule(); }, 180); }, 3000 + Math.random() * 3500); };
    schedule();
    return () => { clearTimeout(timer); setBlink(false); };
  }, [interactive, active]);
  useEffect(() => {
    const listener = value.addListener(({ value: amount }) => {
      setTransform(reduced ? '' : `translate(0 ${-12 * Math.sin(amount * Math.PI * 2) ** 2}) rotate(${reaction?.kind === 'joy' ? 5 * Math.sin(amount * Math.PI * 2) : 0} 100 190)`);
    });
    return () => value.removeListener(listener);
  }, [value, reduced, reaction?.kind]);
  const respond = useCallback(kind => {
    if (!interactive || !active || busy.current) return false;
    busy.current = true;
    setReaction({ kind, id: ++serial.current });
    value.setValue(0);
    Animated.timing(value, { toValue: 1, duration: 1000, useNativeDriver: false }).start(({ finished }) => {
      if (finished) { setReaction(null); setTransform(''); busy.current = false; }
    });
    return true;
  }, [active, interactive, value]);
  useEffect(() => {
    if (reactionId && active) {
      // A successful reward takes priority over an in-flight tap, without stacking.
      value.stopAnimation(); busy.current = false;
      if (respond('joy')) onConsumed?.(reactionId);
    }
  }, [reactionId, active, respond, onConsumed, value]);
  useEffect(() => () => { value.stopAnimation(); busy.current = false; }, [value]);
  const art = <CharacterContext.Provider value={variant}><MotionContext.Provider value={{ reaction, blink, eyeTransform: blink ? 'translate(0 100) scale(1 0.08) translate(0 -100)' : '', bodyTransform: transform, props: {} }}><Mochi variant={variant} full asleep={false} width={size} height={size * 1.05} outfit={outfit} /></MotionContext.Provider></CharacterContext.Provider>;
  return interactive ? <Pressable accessibilityRole="button" accessibilityLabel={`${label}, 반응 보기`} onPress={() => respond('tap')} {...(Platform.OS === 'web' ? { onKeyDown: event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); respond('tap'); } } } : {})} style={({ focused }) => ({ width: size, overflow: 'visible', borderWidth: focused ? 2 : 0, borderColor: '#496FA0', borderRadius: 20 })}>{art}</Pressable> : <View accessible accessibilityLabel={label}>{art}</View>;
}
