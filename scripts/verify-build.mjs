// verify-build.mjs — فحص سريع للملف المبني
import { readFileSync } from 'fs';

const h = readFileSync('dist/index.html', 'utf8');
const has = (s, ci = false) => (ci ? h.toLowerCase().includes(s.toLowerCase()) : h.includes(s));

const checks = [
  // [label, expected, actual]
  ['app title', true, has('Saleen Social')],
  ['lang="ar"', true, has('lang="ar"')],
  ['dir="rtl"', true, has('dir="rtl"')],
  ['root div present', true, has('<div id="root">')],
  ['accent purple #6D5ACF', true, has('#6D5ACF', true)],
  ['light bg #F7F7FA', true, has('#F7F7FA', true)],
  ['royal bg #1A1828', true, has('#1A1828', true)],
  ['royal accent #8B7BE0', true, has('#8B7BE0', true)],
  ['royal theme selector', true, has('data-theme=royal', true) || has('data-theme', true)],
  ['NO old neon 00FFC9', false, has('00FFC9', true)],
  ['NO old neon FF10F0', false, has('FF10F0', true)],
  ['NO old neon 00E5FF', false, has('00E5FF', true)],
  ['admin pass 199444', true, has('199444')],
  ['slider system', true, has('useSlider', true) || has('slider/__', true)],
];

let allOk = true;
for (const [label, expected, actual] of checks) {
  const ok = expected === actual;
  console.log(`${ok ? 'PASS' : 'FAIL'}  [expected=${expected}] ${label}  (actual=${actual})`);
  if (!ok) allOk = false;
}
console.log(allOk ? '\n=== ALL CHECKS PASSED ===' : '\n=== SOME CHECKS FAILED ===');
process.exit(allOk ? 0 : 1);