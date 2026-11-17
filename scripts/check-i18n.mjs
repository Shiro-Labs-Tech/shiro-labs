/* Fails when a string passed to t('...') or tf('...') in src/ has no Indonesian entry in tr.id.json.
   The prerender only reaches the views that render on first load, so this covers the rest. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../src/', import.meta.url).pathname;
const tr = JSON.parse(readFileSync(join(root, 'content/tr.id.json'), 'utf8'));
const files = [];
(function walk(d) { for (const n of readdirSync(d)) { const p = join(d, n), s = statSync(p); if (s.isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(n)) files.push(p); } })(root);

const re = /\b(?:t|tf)\(\s*(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g;
const missing = new Map();
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(re)) {
    let key;
    try { key = new Function('return ' + m[1] + m[2] + m[1])(); } catch { continue; }
    if (!(key in tr)) { if (!missing.has(key)) missing.set(key, []); missing.get(key).push(f.replace(root, 'src/')); }
  }
}
if (missing.size) {
  console.error('Missing Indonesian translations (' + missing.size + '):');
  for (const [k, fs] of missing) console.error('  ' + JSON.stringify(k) + '  <- ' + [...new Set(fs)].join(', '));
  process.exit(1);
}
console.log('i18n: all t() strings have an Indonesian entry');
