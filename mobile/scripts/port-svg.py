"""Port existing repo-owned SVG geometry; run from repository root."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[2]
out = root / 'mobile/src/art'
out.mkdir(parents=True, exist_ok=True)
tags = {'svg': 'Svg', 'g': 'G', 'path': 'Path', 'ellipse': 'Ellipse', 'circle': 'Circle', 'rect': 'Rect', 'line': 'Line', 'defs': 'Defs', 'clipPath': 'ClipPath', 'text': 'SvgText'}
header = "import Svg, { G, Path, Ellipse, Circle, Rect, Line, Defs, ClipPath, Text as SvgText } from 'react-native-svg';\n"

def convert(text):
    text = re.sub(r'\saria-hidden="true"', '', text)
    text = re.sub(r'\sclassName="[^"]*"', '', text)
    text = text.replace("className={motion.blink ? 'friend-eye is-blinking' : 'friend-eye'}", 'transform={motion.eyeTransform}')
    text = text.replace("className={blinking ? 'potato-eye is-blinking' : 'potato-eye'}", 'transform={motion.eyeTransform}')
    text = re.sub(r'className=\{`(?:friend-body|potato-body).*?`\}', 'transform={motion.bodyTransform}', text)
    text = text.replace('style={{ animationDelay: `${i * 70}ms` }}', '')
    for old, new in tags.items():
        text = re.sub(r'(<\/?)' + old + r'(?=[\s>])', r'\1' + new, text)
    return header + text

for name in ['Mochi', 'MochiFriends', 'HouseDecor', 'FriendEffects']:
    text = (root / f'frontend/src/components/{name}.jsx').read_text(encoding='utf-8')
    text = text.replace("../utils/decor.js", "../../../frontend/src/utils/decor.js")
    text = text.replace("const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };", 'const a11y = { accessible: false };')
    (out / f'{name}.jsx').write_text(convert(text), encoding='utf-8')

text = (root / 'frontend/src/components/Potato.jsx').read_text(encoding='utf-8')
start = text.index('  const [reaction,')
end = text.index('  const bodyPath')
text = text[:start] + '  const motion = useFriendReaction();\n  const reaction = motion.reaction;\n' + text[end:]
text = "import useFriendReaction from './useFriendReaction.js';\n" + text
text = re.sub(r'className=\{interactive .*?\}\s*\{\.\.\.\(interactive .*?\)\}', 'accessible={false}', text)
(out / 'Potato.jsx').write_text(convert(text), encoding='utf-8')

home = (root / 'frontend/src/screens/Home.jsx').read_text(encoding='utf-8')
start = home.index('export function RoomBackdrop')
end = home.index('export default function Home')
text = "import HouseDecor from './HouseDecor.jsx';\n" + home[start:end]
text = text.replace("export function RoomBackdrop", "export default function RoomBackdrop")
text = text.replace("style={{ position: 'absolute', inset: 0 }}", '')
(out / 'RoomBackdrop.jsx').write_text(convert(text), encoding='utf-8')
(out / 'CharacterContext.jsx').write_text("import { createContext } from 'react';\nexport const CharacterContext = createContext('potato');\n", encoding='utf-8')
