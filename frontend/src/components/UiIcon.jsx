import { iconPaths } from '../../../shared/theme/icons.js';
export default function UiIcon({ kind, size = 20 }) { return <svg className="ui-section-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPaths[kind]} /></svg>; }
