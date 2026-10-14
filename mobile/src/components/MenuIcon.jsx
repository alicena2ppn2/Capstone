import UiIcon from './UiIcon';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../../shared/theme/tokens.js';
export default function MenuIcon({ kind }) {
 if (kind !== 'visit') return <UiIcon kind={kind === 'diary' ? 'diary' : 'envelope'} size={22} />;
 return <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}><Path d="M3 11 L12 3 L21 11 M6 9 V21 H18 V9 M10 21 V14 H14 V21" fill={colors.surface} stroke={colors.primary} strokeWidth={1.7} strokeLinejoin="round" /></Svg>;
}
