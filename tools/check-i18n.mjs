#!/usr/bin/env node
// Screen-text checks (plan 1c). Exit code 0 = all pass.
//  1. ko.json and en.json have the same keys, and no value is the placeholder "임시" (= not written yet).
//  2. Every key used in editor.html (data-i18n, data-i18n-attr) and in src/**/*.js exists in the dictionaries.
//  3. No Korean text in code outside comments (src/**/*.js|css, editor.html, build/test scripts).
//     Allowed: the language name shown on the language switch.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const H = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (f) => readFileSync(join(H, f), 'utf8');
const walk = (d) => readdirSync(join(H, d)).flatMap((n) => { const p = join(d, n); return statSync(join(H, p)).isDirectory() ? walk(p) : [p]; });
const problems = [];
const HANGUL = /[ㄱ-ㆎ가-힣]/;
const PLACEHOLDER = '임시';
const ALLOWED_TEXT = ['한국어'];

// 1 dictionaries
const ko = JSON.parse(rd('src/i18n/ko.json')), en = JSON.parse(rd('src/i18n/en.json'));
for (const k of Object.keys(ko)) if (!(k in en)) problems.push(`en.json missing key: ${k}`);
for (const k of Object.keys(en)) if (!(k in ko)) problems.push(`ko.json missing key: ${k}`);
for (const [lang, d] of [['ko', ko], ['en', en]]) for (const [k, v] of Object.entries(d)) if (String(v).trim() === PLACEHOLDER || !String(v).trim()) problems.push(`${lang}.json placeholder/empty: ${k}`);
// placeholders like {n} must match between languages
const holes = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
for (const k of Object.keys(ko)) if (k in en && holes(ko[k]) !== holes(en[k])) problems.push(`placeholders differ for ${k}: ko{${holes(ko[k])}} en{${holes(en[k])}}`);

// 2 used keys
const PREFIX = 'app|lang|land|title|btn|grp|menu|need|mini|side|stage|pos|notes|pv|status|state|where|msg|tag|op|obj|file|cm|ai|grid|find|dlg|copy|back|conflict';
const used = new Map();
const html = rd('editor.html');
for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) used.set(m[1], 'editor.html');
for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) for (const p of m[1].split(';')) used.set(p.split(':')[1].trim(), 'editor.html');
const jsFiles = walk('src').filter((f) => f.endsWith('.js') && !f.endsWith('demo.js'));
for (const f of jsFiles) for (const m of rd(f).matchAll(new RegExp(`['"]((?:${PREFIX})\\.[A-Za-z0-9]+)['"]`, 'g'))) used.set(m[1], f);
for (const [k, f] of used) if (!(k in ko)) problems.push(`unknown key ${k} (used in ${f})`);

// 3 Korean outside comments
function stripJs(src) {
  let out = '', i = 0, prev = '';
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1; while (j < src.length && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      out += src.slice(i, j + 1); i = j + 1; prev = c; continue;
    }
    if (c === '/' && /[(,=:[!&|?{};+\-*%<>~^]|^$/.test(prev)) { // regex literal
      let j = i + 1, cls = false; while (j < src.length && (src[j] !== '/' || cls)) { if (src[j] === '\\') j++; else if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; j++; }
      out += src.slice(i, j + 1); i = j + 1; prev = 'r'; continue;
    }
    out += c; if (!/\s/.test(c)) prev = c; i++;
  }
  return out;
}
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const stripHtml = (s) => s.replace(/<!--[\s\S]*?-->/g, '');
const codeFiles = [...walk('src').filter((f) => /\.(js|css)$/.test(f)), 'editor.html', 'build-single.mjs', 'test-security.mjs', 'check-live.mjs', // demo-deck.html / example-deck.html / landing-deck.html / record-demo.mjs are demo material (Korean sample decks); the two checkers hold Hangul ranges in regexes
// test-dynamic.mjs runs on Korean company files and writes Korean result tables (markers like 편집확인① must not collide with data); not shipped
...walk('tools').filter((f) => !/(check-i18n|check-public|record-demo|test-dynamic)\.mjs$|(demo|example|landing)-deck\.html$/.test(f))];
for (const f of codeFiles) {
  const raw = rd(f);
  let s = f.endsWith('.css') ? stripCss(raw) : f.endsWith('.html') ? stripHtml(raw) : stripJs(raw);
  for (const a of ALLOWED_TEXT) s = s.split(a).join('');
  s.split('\n').forEach((line, i) => { if (HANGUL.test(line)) problems.push(`Korean text in code: ${f}: ${line.trim().slice(0, 90)}`); });
}
if (problems.length) { console.log(problems.join('\n')); console.log(`\n${problems.length} problem(s)`); process.exit(1); }
console.log(`ok: ${Object.keys(ko).length} keys in ko/en, ${used.size} keys used, ${codeFiles.length} code files without Korean text`);
