import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg,{Path,Circle,Ellipse} from 'react-native-svg';
import { Label,styles } from './ui';
import HouseDecor from './art/HouseDecor';
import RewardGlyphDrawing from '../../frontend/src/components/RewardGlyphDrawing.jsx';
import { rewardPresentation,DECOR_VIEWBOX } from '../../frontend/src/utils/rewardFeedback.js';
const elements={Path,Circle,Ellipse};
export default function RewardPanel({receipt}) {
  const [opacity]=useState(() => new Animated.Value(0));
  useEffect(()=>{const motion=Animated.sequence([Animated.timing(opacity,{toValue:1,duration:120,useNativeDriver:true}),Animated.delay(730),Animated.timing(opacity,{toValue:0,duration:150,useNativeDriver:true})]);motion.start();return()=>motion.stop();},[receipt,opacity]);
  // Opacity only: no zoom or movement, including reduced-motion mode.
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill,{justifyContent:'center',alignItems:'center',zIndex:20}]}><Animated.View accessibilityLiveRegion="polite" style={{opacity,backgroundColor:'#FFF7DF',borderColor:'#E9D49D',borderWidth:1,borderRadius:22,padding:18,gap:6,maxWidth:'85%'}}><Label style={styles.small}>오늘 받은 선물</Label>{rewardPresentation(receipt).map((reward,index)=><View key={index} style={{alignItems:'center',gap:6}}><Svg width={64} height={64} viewBox={reward.type==='decor'?DECOR_VIEWBOX[reward.item.slot]:'0 0 64 64'}>{reward.type==='decor'?<HouseDecor equipped={{[reward.item.slot]:reward.id}}/>:<RewardGlyphDrawing reward={reward} elements={elements}/>}</Svg><Label style={styles.cardTitle}>{reward.label}</Label></View>)}</Animated.View></View>;
}
