import Svg, { Path } from 'react-native-svg';
import { iconPaths } from '../../frontend/src/design/icons.js';
import { colors } from '../../frontend/src/design/tokens.js';
export default function UiIcon({ kind, size = 20, color = colors.primary }) { return <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}><Path d={iconPaths[kind]} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" /></Svg>; }
