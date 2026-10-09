// Checks WCAG contrast for every token pair the UI relies on, in both themes.
// Run: node scripts/check-contrast.js   (exits 1 on any failure)
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');

function block(selector) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`selector ${selector} not found`);
  const body = css.slice(start, css.indexOf('}', start));
  const vars = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) vars[m[1]] = m[2];
  return vars;
}

const light = block(':root');
const dark = { ...light, ...block(':root[data-theme="dark"]') };

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = 4.5, GRAPHIC = 3;
const checks = [];
for (const fg of ['text', 'text-2', 'text-3', 'accent', 'danger-text']) {
  for (const bg of ['page', 'surface', 'surface-2']) checks.push([fg, bg, TEXT]);
}
checks.push(['text', 'highlight', TEXT], ['text-2', 'highlight', TEXT], ['text-3', 'highlight', TEXT]);
checks.push(['accent', 'accent-soft', TEXT], ['text', 'accent-soft', TEXT], ['accent-contrast', 'accent', TEXT]);
for (const fg of ['c-high', 'c-low', 'c-rain', 'c-sun']) {
  checks.push([fg, 'surface', GRAPHIC], [fg, 'highlight', GRAPHIC]);
}
checks.push(['control-border', 'surface', GRAPHIC], ['control-border', 'page', GRAPHIC], ['accent', 'page', GRAPHIC]);

let failed = 0;
for (const [name, tokens] of [['light', light], ['dark', dark]]) {
  console.log(`\n${name} theme`);
  for (const [fg, bg, min] of checks) {
    if (!tokens[fg] || !tokens[bg]) { console.log(`  MISSING ${fg} / ${bg}`); failed++; continue; }
    const r = ratio(tokens[fg], tokens[bg]);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`  ${ok ? 'pass' : 'FAIL'}  ${r.toFixed(2).padStart(5)} ≥ ${min}  --${fg} on --${bg}`);
  }
}
console.log(failed ? `\n${failed} contrast check(s) failed` : '\nAll contrast checks pass');
process.exit(failed ? 1 : 0);
