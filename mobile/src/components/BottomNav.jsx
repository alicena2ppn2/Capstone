import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../../../shared/theme/tokens.js';
import { Label } from './ui';
import UiIcon from './UiIcon';
export default function BottomNav({screen,onNavigate}) {
  return <View style={s.bar} accessibilityRole="tablist">{[['quest','퀘스트','routine'],['home','홈','home'],['shop','상점','shop']].map(([id,label,icon])=><Pressable key={id} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{selected:screen===id}} onPress={()=>onNavigate(id)} style={({pressed,focused})=>[s.item,id==='home'&&s.home,screen===id&&s.selected,pressed&&{opacity:.7},focused&&s.focus]}><UiIcon kind={icon} size={id==='home'?26:22} color={screen===id?colors.surface:colors.primary}/><Label style={[s.label,screen===id&&{color:colors.surface}]}>{label}</Label></Pressable>)}</View>;
}
const s=StyleSheet.create({bar:{flexDirection:'row',gap:8,paddingHorizontal:14,paddingTop:8,paddingBottom:6,borderTopWidth:1,borderTopColor:colors.border,backgroundColor:colors.surface},item:{flex:1,minHeight:52,alignItems:'center',justifyContent:'center',gap:3,borderRadius:12},home:{backgroundColor:colors.primarySoft,borderWidth:1,borderColor:colors.border},selected:{backgroundColor:colors.primary},label:{fontSize:12,lineHeight:17,fontFamily:'A2z-500',color:colors.primary},focus:{borderWidth:2,borderColor:colors.ink}});
