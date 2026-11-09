#!/usr/bin/env node
// Checks the files that will go into the public repository (plan 1d, 1e). Exit code 0 = pass.
//   - Public tree = tracked + new files, minus the private parts listed in PRIVATE below.
//   - No personal paths (/Users/, cowork/) in the public tree.
//   - No hard-coded transition/animation durations outside src/ui/tokens.css (motion comes from tokens).
// Usage: node tools/check-public.mjs [--list] [--export <dir>]
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const H = join(dirname(fileURLToPath(import.meta.url)), '..');
// Kept in this private working repo only (lecture-kit integration, internal planning docs, design scratch).
export const PRIVATE = [/^private\//, /^_docs\//, /^BACKLOG\.md$/, /^\.impeccable\//, /^\.taste-skill\//, /^CLAUDE\.md$/, /^[^/]*[가-힣][^/]*\.md$/];
export function publicFiles() {
  const out = execSync('git ls-files -co --exclude-standard -z', { cwd: H, encoding: 'utf8' });
  // In the private repo the allowlist (public-export/allowlist.txt) decides what is public; the public repo has no allowlist.
  const al = join(H, 'public-export/allowlist.txt');
  const list = existsSync(al) ? readFileSync(al, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')) : null;
  const inList = (f) => !list || list.some((a) => (a.endsWith('/') ? f.startsWith(a) : f === a)) || f.startsWith('public-export/overlay/');
  return out.split('\0').filter((f) => f && existsSync(join(H, f)) && !PRIVATE.some((r) => r.test(f)) && inList(f));
}
// Markdown files in this working repo may start with frontmatter that carries the author's tool bookkeeping
// (session id/path, created, ai). Only those keys are private: they are removed on export, and a block left empty
// is dropped. Product keys stay — e.g. skills/*/SKILL.md needs `name` and `description` to be installable.
const PRIVATE_KEYS = /^(session_id|session_path|created|ai|runtime|title|plan|spec|tags|nn):/;
export const stripFrontmatter = (s) => s.replace(/^---\n([\s\S]*?)\n---\n+/, (m, body) => {
  const keep = body.split('\n').filter((l) => !PRIVATE_KEYS.test(l));
  return keep.some((l) => l.trim()) ? `---\n${keep.join('\n')}\n---\n\n` : '';
});
const files = publicFiles();
if (process.argv.includes('--list')) { console.log(files.join('\n')); process.exit(0); }
// --export <dir>: build the public folder = tracked files on public-export/allowlist.txt (frontmatter stripped, public-only edits
// applied), then public-export/overlay/ on top. Scans the result for internal info; exits 1 (nothing should be pushed) if any is found.
const ei = process.argv.indexOf('--export');
if (ei > 0) {
  const { mkdirSync, writeFileSync, copyFileSync, readdirSync, statSync } = await import('node:fs');
  const out = process.argv[ei + 1]; if (!out) { console.log('usage: --export <dir>'); process.exit(2); }
  const list = readFileSync(join(H, 'public-export/allowlist.txt'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const tracked = execSync('git ls-files -z', { cwd: H, encoding: 'utf8' }).split('\0').filter((f) => f && existsSync(join(H, f)));
  const exp = tracked.filter((f) => list.some((a) => (a.endsWith('/') ? f.startsWith(a) : f === a)));
  const miss = list.filter((a) => !tracked.some((f) => (a.endsWith('/') ? f.startsWith(a) : f === a)));
  const errs = miss.map((a) => `allowlist entry matches nothing: ${a}`);
  // public-only text edits (fail if the expected text is gone, so a changed source cannot silently leak)
  const EDITS = {
    'README.md': [['actions/workflows/deploy.yml/badge.svg', 'actions/workflows/ci.yml/badge.svg']],
    'README.ko.md': [['actions/workflows/deploy.yml/badge.svg', 'actions/workflows/ci.yml/badge.svg']],
    'tools/landing-deck.html': [[/출처: 강의슬라이드_키트\/[^\n]*?의 26·25·28장\(시연 장을 맨 앞에\)\(사진 없는 장만\)/, '슬라이드 덱의 세 장(시연 장을 맨 앞에, 사진 없는 장만)'], ['26장 제목에만', '첫 장 제목에만']],
  };
  const put = (f, buf) => { const to = join(out, f); mkdirSync(dirname(to), { recursive: true }); writeFileSync(to, buf); };
  for (const f of exp) {
    if (/\.(md|html)$/.test(f)) {
      let s = readFileSync(join(H, f), 'utf8'); if (f.endsWith('.md')) s = stripFrontmatter(s);
      for (const [from, to] of EDITS[f] || []) { const n = s.replace(from, to); if (n === s) errs.push(`public edit did not apply: ${f}: ${from}`); s = n; }
      put(f, s);
    } else put(f, readFileSync(join(H, f)));
  }
  const walk = (d, base = '') => readdirSync(join(d, base)).flatMap((n) => { const r = join(base, n); return statSync(join(d, r)).isDirectory() ? walk(d, r) : [r]; });
  const ov = join(H, 'public-export/overlay');
  for (const f of walk(ov)) put(f.split('\\').join('/').replace(/CHANGELOG\.public\.md$/, 'CHANGELOG.md'), readFileSync(join(ov, f))); // kept under another name: repo rules allow CHANGELOG.md only at the root
  // leak scan over everything exported
  const LEAK = [[/\/Users\//, 'personal path'], [/(^|[^A-Za-z])[A-Z]:[\\/]/, 'drive path'], [/\.ts\.net/, 'tailscale host'], [/cowork\//, 'cowork path'], [/강의슬라이드_키트/, 'internal folder'],
    [/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, 'session id shape'],
    [/gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|xox[abprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY/, 'key or token shape']];
  for (const f of walk(out).filter((x) => x !== 'tools/check-public.mjs')) {
    const buf = readFileSync(join(out, f)); if (buf.includes(0)) continue;
    buf.toString('utf8').split('\n').forEach((line, i) => { for (const [re, what] of LEAK) if (re.test(line)) errs.push(`${what}: ${f}:${i + 1}: ${line.trim().slice(0, 60)}`); });
  }
  if (errs.length) { console.log(errs.join('\n')); console.log(`\n${errs.length} leak/problem(s): not exporting`); process.exit(1); }
  console.log(`exported ${walk(out).length} files to ${out}, no internal info found`); process.exit(0);
}
const problems = [];
const TEXT = /\.(m?js|json|html|css|md|txt|ya?ml)$/;
for (const f of files.filter((x) => TEXT.test(x) && !x.endsWith('demo.js') && !x.endsWith('assets.css'))) {
  let s = readFileSync(join(H, f), 'utf8'); if (f.endsWith('.md')) s = stripFrontmatter(s);
  s.split('\n').forEach((line, i) => {
    if (/\/Users\/|cowork\//.test(line) && !/check-public\.mjs$/.test(f)) problems.push(`personal path: ${f}:${i + 1}: ${line.trim().slice(0, 80)}`);
  });
}
// motion durations: any "<number>s" / "<number>ms" inside transition/animation outside tokens.css
for (const f of files.filter((x) => /^src\/.*\.(css|js)$/.test(x) && !x.endsWith('tokens.css') && !x.endsWith('demo.js') && !x.endsWith('assets.css'))) {
  const s = readFileSync(join(H, f), 'utf8');
  for (const m of s.matchAll(/(transition|animation)\s*:[^;'"}]*/g)) if (/(^|[\s,(])\d*\.?\d+m?s\b/.test(m[0].replace(/var\([^)]*\)/g, ''))) problems.push(`hard-coded duration: ${f}: ${m[0].slice(0, 80)}`);
}
if (problems.length) { console.log(problems.join('\n')); console.log(`\n${problems.length} problem(s)`); process.exit(1); }
console.log(`ok: ${files.length} public files, no personal paths, no hard-coded motion durations`);
