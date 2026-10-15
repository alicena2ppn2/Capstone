import { Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { iconPaths } from '../../../shared/theme/icons.js';
import { colors } from '../../../shared/theme/tokens.js';
export default function UiIcon({ kind, size = 20, color = colors.primary }) { return <Svg width={size} height={size} viewBox="0 0 24 24" {...(Platform.OS === 'web' ? { 'aria-hidden': true } : { accessible: false })}><Path d={iconPaths[kind]} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" /></Svg>; }
