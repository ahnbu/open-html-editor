#!/usr/bin/env node
// Helper for the open-html-editor skill. No dependencies.
//   find [dir ...]   recent .html files (last 3 days) that contain an Openditor comment block, newest first
//   list <file>      the comments in that file as JSON (count + items)
//   backup <file>    copy the file to _편집백업/<name>_<timestamp>.html next to it, print the backup path
// Comment block format: docs/comment-format.md in https://github.com/ahnbu/open-html-editor
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const BLOCK = /<script type="application\/json" id="he-comments">([\s\S]*?)<\/script>/i;
const BACKUP_DIR = '_편집백업';
export function readComments(html) {
  const m = BLOCK.exec(html); if (!m) return [];
  try { const j = JSON.parse(m[1]); return (Array.isArray(j.comments) ? j.comments : []).filter((c) => c && String(c.text || '').trim()); } catch (e) { return []; }
}
const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'find') {
  const dirs = args.length ? args.map((d) => resolve(d)) : [process.cwd(), join(homedir(), 'Downloads')];
  const since = Date.now() - 3 * 864e5, hits = [];
  for (const d of dirs) {
    if (!existsSync(d)) continue;
    for (const n of readdirSync(d)) {
      if (!/\.html?$/i.test(n)) continue;
      const f = join(d, n), st = statSync(f); if (!st.isFile() || st.mtimeMs < since || st.size > 50e6) continue;
      const list = readComments(readFileSync(f, 'utf8')); if (list.length) hits.push({ file: f, comments: list.length, modified: new Date(st.mtimeMs).toISOString() });
    }
  }
  hits.sort((a, b) => b.modified.localeCompare(a.modified));
  console.log(JSON.stringify(hits, null, 1));
} else if (cmd === 'list' && args[0]) {
  const list = readComments(readFileSync(resolve(args[0]), 'utf8'));
  console.log(JSON.stringify({ file: resolve(args[0]), count: list.length, comments: list }, null, 1));
} else if (cmd === 'backup' && args[0]) {
  const f = resolve(args[0]), dir = join(dirname(f), BACKUP_DIR); mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const to = join(dir, basename(f).replace(/\.html?$/i, '') + '_' + stamp + '.html'); copyFileSync(f, to);
  console.log(to);
} else {
  console.log('usage: comments.mjs find [dir ...] | list <file.html> | backup <file.html>'); process.exit(2);
}
