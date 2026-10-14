import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { dailySentence } from '../../frontend/src/utils/dailySentence.js';
import { colors } from '../../frontend/src/design/tokens.js';
import { Label } from './ui';

export default function DailySentence({ now, width, onHeight }) {
  const sentence = dailySentence(now);
  const [opacity] = useState(() => new Animated.Value(1));
  const [reduce, setReduce] = useState(true);
  const introduced = useRef(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(flag => {
      if (!active) return; setReduce(flag);
      if (!flag && !introduced.current) { introduced.current = true; opacity.setValue(0); Animated.timing(opacity,{toValue:1,duration:240,useNativeDriver:true}).start(); }
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged',flag=>{setReduce(flag);if(flag){opacity.stopAnimation();opacity.setValue(1);}});
    return () => { active = false; subscription.remove(); opacity.stopAnimation(); };
  }, [opacity]);
  return <Animated.View pointerEvents="none" onLayout={event=>onHeight?.(event.nativeEvent.layout.height)} accessible accessibilityLabel={`오늘의 한 문장. ${sentence.text}`} style={[s.bubble,{width,opacity:reduce?1:opacity}]}>
    <Label accessible={false} style={s.text}>{sentence.text}</Label>
    <View style={s.tail}/>
  </Animated.View>;
}
const s=StyleSheet.create({bubble:{position:'relative',alignSelf:'center',backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:15,paddingVertical:7,paddingHorizontal:12,zIndex:2},text:{fontFamily:'A2z-400',fontSize:13,lineHeight:20,color:colors.ink,textAlign:'center'},tail:{position:'absolute',top:-6,left:'50%',width:11,height:11,backgroundColor:colors.surface,borderLeftWidth:1,borderTopWidth:1,borderColor:colors.border,transform:[{translateX:-5.5},{rotate:'45deg'}]}});
