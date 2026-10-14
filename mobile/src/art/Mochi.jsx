import { Platform } from 'react-native';
import ExpansionFriends from './ExpansionFriends.jsx';
import { isBasicFriendDraft } from '../../../shared/data/characterExpansion.js';
import Svg, { G, Path, Ellipse, Circle, Rect, Line, Defs, ClipPath, Text as SvgText } from 'react-native-svg';
import { useContext } from 'react';
import { CharacterContext } from './CharacterContext.jsx';
import Potato from './Potato.jsx';
import MochiFriends from './MochiFriends.jsx';
import useFriendReaction from './useFriendReaction.js';
import FriendEffects from './FriendEffects.jsx';
import PrototypeFriends from './PrototypeFriends.jsx';

function Flower() {
  return <G transform="translate(151 65)" stroke="#8EA9CD" strokeWidth="1.8">
    <Path d="M0 -5 C-9 -17 -17 -7 -10 0 C-22 7 -11 17 -4 10 C0 22 12 15 9 7 C22 5 17 -9 8 -7 C7 -20 -6 -19 0 -5Z" fill="#C9DFF6" />
    <Path d="M0 -4 C-5 -10 -10 -4 -6 1 C-11 6 -5 10 0 6 C5 12 11 5 6 1 C12 -5 5 -10 0 -4Z" fill="#FFFAF0" stroke="none" />
    <Circle cx="1" cy="1" r="2.3" fill="#EBCB8B" stroke="none" />
  </G>;
}

// cha1의 둥근 윤곽, 하늘색 귀와 꼬리, 꽃 장식을 표현한다.
export default function Mochi({ color = '#FFF5E6', width, height, full = false, asleep = false, label, outfit, variant, interactive, active, reactionId, onReactionConsumed }) {
  const character = useContext(CharacterContext);
  const motion = useFriendReaction({ interactive: interactive && (variant ?? character) === 'mochi', active, reactionId, onReactionConsumed });
  if (isBasicFriendDraft(variant ?? character)) return <ExpansionFriends variant={variant ?? character} width={width} height={height} label={label} outfit={outfit} />;
  if (['proto-pebble', 'proto-pear', 'proto-quilt'].includes(variant ?? character)) return <PrototypeFriends variant={variant ?? character} width={width} height={height} label={label} outfit={outfit} interactive={interactive} active={active} reactionId={reactionId} onReactionConsumed={onReactionConsumed} />;
  if ((variant ?? character) === 'potato') return <Potato width={width} height={height} full={full} asleep={asleep} label={label} outfit={outfit} interactive={interactive} active={active} reactionId={reactionId} onReactionConsumed={onReactionConsumed} />;
  if (['pink', 'lavender', 'mint', 'sky'].includes(variant ?? character)) return <MochiFriends variant={variant ?? character} width={width} height={height} full={full} asleep={asleep} label={label} outfit={outfit} interactive={interactive} active={active} reactionId={reactionId} onReactionConsumed={onReactionConsumed} />;
  const a11y = Platform.OS === 'web' ? { 'aria-hidden': true } : { accessible: false };
  const line = '#91A6C5';
  return (
    <Svg width={width} height={height} viewBox={full ? '0 0 200 210' : '15 0 170 146'} {...a11y} {...motion.props}>
      {full && <Ellipse cx="102" cy="200" rx="67" ry="6" fill="#AFC9E6" opacity=".22" />}
      <G key={motion.reaction?.id ?? 'idle'} transform={motion.bodyTransform}>
      {full && <>
        <Path d="M137 159 C150 138 179 138 176 155 C197 157 190 179 180 179 C193 196 169 204 163 195 C146 206 133 190 140 182Z" fill="#D8E8F8" stroke={line} strokeWidth="2.5" />
        <Path d="M153 162 Q171 150 174 166 Q184 166 179 178 Q172 181 170 189" fill="none" stroke="#F9FCFF" strokeWidth="7" strokeLinecap="round" />
        <Path d="M70 120 Q55 143 64 169 Q58 178 72 183 Q84 192 100 183 Q118 193 130 180 Q143 176 136 166 Q145 140 131 120Z" fill={color} stroke={line} strokeWidth="2.5" />
        <Ellipse cx="100" cy="159" rx="26" ry="23" fill="#FFFCF5" opacity=".85" />
        {outfit ? <G stroke={outfit.trim} strokeWidth="2" strokeLinejoin="round">
          <Path d="M71 125 L53 141 L62 153 L69 148 L65 175 Q100 187 135 175 L131 148 L139 153 L148 141 L130 125 Q100 137 71 125Z" fill={outfit.color} />
          <Path d="M83 130 Q100 143 117 130" fill="none" />
          {outfit.motif === 'heart' && <Path d="M100 169 C82 159 85 146 94 150 L100 155 L106 150 C115 146 118 159 100 169Z" fill="#FFF5F8" />}
          {outfit.motif === 'cloud' && <Path d="M85 166 Q79 156 89 155 Q92 143 101 149 Q112 146 114 156 Q124 166 112 168 H90Z" fill="white" />}
          {outfit.motif === 'star' && <Path d="M100 146 L105 154 L114 156 L108 162 L110 171 L100 166 L90 171 L92 162 L86 156 L95 154Z" fill="#FFF0AE" />}
          {outfit.motif === 'leaf' && <Path d="M100 171 V156 M100 159 Q81 158 86 148 Q101 147 100 159 M100 161 Q117 160 115 150 Q101 150 100 161" fill="#EDF9E4" />}
        </G> : <G stroke={line} strokeWidth="2" strokeLinejoin="round">
          <Path d="M67 124 Q100 141 133 124 L134 136 Q100 152 66 136Z" fill="#C8E0F7" />
          <Path d="M94 137 Q73 120 75 139 Q71 159 95 144 L86 165 L101 153 L112 166 L108 144 Q133 159 126 137 Q125 122 106 137Z" fill="#B8D4EF" />
          <Ellipse cx="100" cy="140" rx="7" ry="6" fill="#EDF5FE" />
        </G>}
        <Path d="M62 142 Q45 142 47 157 Q44 167 55 168 Q71 169 73 155Z" fill={color} stroke={line} strokeWidth="2.5" />
        <Path d="M138 142 Q155 142 153 157 Q156 167 145 168 Q129 169 127 155Z" fill={color} stroke={line} strokeWidth="2.5" />
        <Ellipse cx="77" cy="184" rx="21" ry="17" transform="rotate(-13 77 184)" fill={color} stroke={line} strokeWidth="2.5" />
        <Ellipse cx="124" cy="184" rx="21" ry="17" transform="rotate(13 124 184)" fill={color} stroke={line} strokeWidth="2.5" />
        <G fill="#F7C5D1" opacity=".55"><Ellipse cx="77" cy="189" rx="8" ry="7" /><Circle cx="67" cy="180" r="3" /><Circle cx="77" cy="176" r="3" /><Circle cx="87" cy="180" r="3" /><Ellipse cx="124" cy="189" rx="8" ry="7" /><Circle cx="114" cy="180" r="3" /><Circle cx="124" cy="176" r="3" /><Circle cx="134" cy="180" r="3" /></G>
      </>}
      <G stroke={line} strokeWidth="2.5" strokeLinejoin="round">
        <Path d="M43 56 Q25 33 37 14 Q48 7 68 26 L68 55Z" fill="#D4E5F7" />
        <Path d="M135 26 Q157 6 166 17 Q176 38 155 58 L132 54Z" fill="#D4E5F7" />
        <Path d="M42 40 Q38 24 46 23 Q58 26 59 42" fill="#EED9E6" stroke="none" />
        <Path d="M143 40 Q154 23 160 27 Q165 38 157 46" fill="#EDF4FC" stroke="none" />
        <Path d="M49 98 Q22 82 24 102 Q14 118 31 125 Q39 143 62 128Z" fill="#D4E5F7" />
        <Path d="M151 98 Q178 82 176 102 Q186 118 169 125 Q161 143 138 128Z" fill="#D4E5F7" />
        <Path d="M99 22 Q125 19 144 38 Q162 54 160 78 Q169 91 158 99 Q170 117 149 126 Q128 137 100 134 Q69 139 48 126 Q30 117 41 102 Q30 93 39 80 Q37 52 58 36 Q75 24 99 22Z" fill={color} />
        <Path d="M99 23 Q90 7 104 9 Q121 14 105 30" fill={color} strokeLinecap="round" />
        <Path d="M96 47 Q111 44 108 59 Q105 74 95 77" fill="none" stroke="#D2DCEF" strokeWidth="3.5" strokeLinecap="round" />
        <Path d="M56 71 Q52 77 53 84 M146 78 Q151 85 149 90" fill="none" stroke="#FFFDF8" strokeWidth="4" strokeLinecap="round" opacity=".8" />
      </G>
      <G fill="#F5B9CC" opacity=".28"><Ellipse cx="53" cy="111" rx="14" ry="8" /><Ellipse cx="147" cy="111" rx="14" ry="8" /></G>
      {asleep ? <G fill="none" stroke="#758AAB" strokeWidth="3" strokeLinecap="round">
        <Path d="M59 94 Q68 100 77 94 M123 94 Q132 100 141 94" />
        <SvgText x="156" y="12" fill="#91ACD4" stroke="none" fontSize="17">z</SvgText>
      </G> : <G>
        {[68, 132].map((x) => <G key={x} transform={motion.eyeTransform}>
          <Ellipse cx={x} cy="94" rx="10" ry="14" fill="#637EA9" stroke="#7189AD" strokeWidth="1.5" />
          <Ellipse cx={x} cy="101" rx="8" ry="7" fill="#B8D7F4" />
          <Ellipse cx={x + 2} cy="104" rx="5" ry="4" fill="#E5F4FF" opacity=".85" />
          <Circle cx={x - 3} cy="87" r="3.5" fill="#FFFFFF" />
          <Circle cx={x + 4} cy="96" r="2" fill="#F8FCFF" />
        </G>)}
      </G>}
      <Path d="M95 112 Q98 117 101 112 Q104 117 107 112" fill="none" stroke="#9D8296" strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M156 79 Q171 83 168 95 L156 90 L149 98 L146 82" fill="#C7DFF6" stroke={line} strokeWidth="1.8" strokeLinejoin="round" />
      <Flower />
      </G>
      <FriendEffects reaction={motion.reaction} />
    </Svg>
  );
}
