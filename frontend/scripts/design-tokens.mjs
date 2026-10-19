import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { colors } from '../../shared/theme/tokens.js';

const css = '/* Generated from shared/theme/tokens.js by frontend/scripts/design-tokens.mjs. */\n:root {\n' + Object.entries(colors).map(([key, value]) => `  --color-${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}: ${value};\n`).join('') + '}\n';
const path = new URL('../src/design/tokens.css', import.meta.url);
if (process.argv.includes('--write')) await writeFile(path, css);
else assert.equal((await readFile(path, 'utf8')).replaceAll('\r\n', '\n'), css, 'Web/native token values must agree. Run node scripts/design-tokens.mjs --write.');
function luminance(hex) {
  const channels = hex.slice(1).match(/../g).slice(0, 3).map(c => parseInt(c, 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
for (const [foreground, background] of [['primaryInk', 'primary'], ['primaryInk', 'primaryHover'], ['primaryInk', 'primaryPressed'], ['primaryInk', 'primarySoft'], ['ink', 'background'], ['ink', 'surface'], ['ink', 'accent'], ['ink', 'accentSoft'], ['muted', 'surface'], ['muted', 'background'], ['muted', 'disabled'], ['primaryInk', 'surface'], ['error', 'errorSoft']]) {
  const a = luminance(colors[foreground]), b = luminance(colors[background]);
  const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  assert(ratio >= 4.5, `${foreground}/${background} contrast ${ratio.toFixed(2)}`);
  console.log(`${foreground}/${background}: ${ratio.toFixed(2)}:1`);
}
const inputBorderContrast = (Math.max(luminance(colors.inputBorder), luminance(colors.surface)) + .05) / (Math.min(luminance(colors.inputBorder), luminance(colors.surface)) + .05);
assert(inputBorderContrast >= 3, `inputBorder/surface contrast ${inputBorderContrast.toFixed(2)}`);
console.log(`inputBorder/surface: ${inputBorderContrast.toFixed(2)}:1`);
