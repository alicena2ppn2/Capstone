import React, { useEffect, useState } from 'react';
import { Animated } from 'react-native';
import { Label } from './ui';
export default function BriefNotice({feedback}) {
  const [opacity]=useState(() => new Animated.Value(1));
  useEffect(()=>{if(!feedback)return;opacity.setValue(1);if(feedback.error)return;const motion=Animated.sequence([Animated.delay(1100),Animated.timing(opacity,{toValue:0,duration:200,useNativeDriver:true})]);motion.start();return()=>motion.stop();},[feedback,opacity]);
  return feedback?<Animated.View style={{opacity,backgroundColor:feedback.error?'#FAE5E9':'#EEE5F7',borderRadius:12,padding:9}}><Label accessibilityLiveRegion="polite" style={{fontSize:14}}>{feedback.text}</Label></Animated.View>:null;
}
