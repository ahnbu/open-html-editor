#!/usr/bin/env node
// Checks that the public site serves the same file as public/index.html and that repo files are not exposed.
// Deployment itself is done by GitHub Actions.
// Usage: node check-live.mjs          build now and compare
//        node check-live.mjs --wait   keep comparing for up to 5 minutes until the deploy shows up (Actions)
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.SITE_URL || 'https://easy-html-editor.pages.dev', OUT = join(HERE, 'public', 'index.html');
const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (spawnSync('node', ['build-single.mjs'], { cwd: HERE, stdio: 'inherit' }).status !== 0) process.exit(1);
async function checks() {
  const res = await fetch(`${BASE}/?v=${Date.now()}`, { cache: 'no-store' });
  const live = Buffer.from(await res.arrayBuffer());
  const list = { 'site opens': res.status === 200, 'same as public/index.html': sha(live) === sha(readFileSync(OUT)) };
  // Repo files must not be public. Cloudflare Pages answers unknown paths with the home page (200),
  // so "not exposed" means 404 or the same bytes as the home page.
  for (const f of ['AGENTS.md', 'README.md', 'check-live.mjs', 'src/core/state.js', 'editor.html']) {
    const r = await fetch(`${BASE}/${encodeURI(f)}`, { redirect: 'manual' });
    list[`${f} not exposed`] = r.status === 404 || (r.status === 200 && sha(Buffer.from(await r.arrayBuffer())) === sha(live));
  }
  return list;
}
const ok = (c) => Object.values(c).every(Boolean);
let c = await checks();
if (process.argv.includes('--wait')) for (let i = 0; i < 30 && !ok(c); i++) { await sleep(10000); c = await checks(); }
console.log(c);
process.exit(ok(c) ? 0 : 1);
