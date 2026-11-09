#!/usr/bin/env node
// Checks the files that will go into the public repository (plan 1d, 1e). Exit code 0 = pass.
//   - Public tree = tracked + new files, minus the private parts listed in PRIVATE below.
//   - No personal paths (/Users/, cowork/) in the public tree.
//   - No hard-coded transition/animation durations outside src/ui/tokens.css (motion comes from tokens).
// Usage: node tools/check-public.mjs [--list]
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const H = join(dirname(fileURLToPath(import.meta.url)), '..');
// Kept in this private working repo only (lecture-kit integration, internal planning docs, design scratch).
export const PRIVATE = [/^private\//, /^_docs\//, /^BACKLOG\.md$/, /^\.impeccable\//, /^\.taste-skill\//, /^CLAUDE\.md$/, /^[^/]*[가-힣][^/]*\.md$/];
export function publicFiles() {
  const out = execSync('git ls-files -co --exclude-standard -z', { cwd: H, encoding: 'utf8' });
  return out.split('\0').filter((f) => f && existsSync(join(H, f)) && !PRIVATE.some((r) => r.test(f)));
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
// --export <dir>: copy the public tree (frontmatter stripped) to a folder that becomes the new public repository (plan 4a/7)
const ei = process.argv.indexOf('--export');
if (ei > 0) {
  const { mkdirSync, writeFileSync, copyFileSync } = await import('node:fs');
  const out = process.argv[ei + 1]; if (!out) { console.log('usage: --export <dir>'); process.exit(2); }
  for (const f of files) { const to = join(out, f); mkdirSync(dirname(to), { recursive: true }); if (f.endsWith('.md')) writeFileSync(to, stripFrontmatter(readFileSync(join(H, f), 'utf8'))); else copyFileSync(join(H, f), to); }
  console.log(`exported ${files.length} files to ${out}`); process.exit(0);
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
