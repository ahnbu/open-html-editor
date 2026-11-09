#!/usr/bin/env node
// Site-level tests (plan 5b, 5c). Serves public/ on localhost like the real site. Exit code 0 = all pass.
//   offline : after the first visit, the site reopens with the network cut, and a deck can be edited and saved
//   update  : a page opened from the offline cache shows the "new version" notice once a newer build arrives
//   budget  : public/index.html <= 1 MB
//   speed   : time from choosing a file to the editor showing it <= 1 s (test deck)
// Usage: node test-site.mjs [result.json]
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(execSync('npm root -g', { encoding: 'utf8' }).trim() + '/')('playwright');
const HERE = dirname(fileURLToPath(import.meta.url)), PUB = join(HERE, 'public'), work = mkdtempSync(join(tmpdir(), 'he-site-'));
execSync('node build-single.mjs', { cwd: HERE, stdio: 'ignore' });
const DECK = '<!doctype html><html><head><meta charset="utf-8"><style>.slide{width:960px;height:540px;position:relative}</style></head><body><section class="slide"><h1>Offline deck</h1></section><section class="slide"><h1>Two</h1></section></body></html>';
const deck = join(work, 'deck.html'); writeFileSync(deck, DECK);
let files = { '/': readFileSync(join(PUB, 'index.html')), '/sw.js': readFileSync(join(PUB, 'sw.js')) };
const srv = createServer((q, r) => { const p = new URL(q.url, 'http://x').pathname; const body = files[p === '/index.html' ? '/' : p]; if (!body) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8', 'cache-control': 'no-cache' }); r.end(body); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const URL0 = `http://127.0.0.1:${srv.address().port}/`;
const results = {}; const t = (name, ok) => { results[name] = !!ok; console.log(ok ? 'PASS' : 'FAIL', name); };
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('page error', e.message));
await p.goto(URL0);
await p.evaluate(() => navigator.serviceWorker.ready.then(() => true));
await p.reload(); await p.waitForTimeout(300);
const controlled = await p.evaluate(() => !!navigator.serviceWorker.controller);
await ctx.setOffline(true);
let offlineOk = false, saved = '';
try {
  await p.reload(); await p.setInputFiles('#openFile', deck);
  await p.waitForFunction(() => window.HE.S.doc && window.HE.slides().length > 0, null, { timeout: 5000 });
  const box = await p.evaluate(() => { const e = window.HE.S.doc.querySelector('h1'), f = document.querySelector('#stage').getBoundingClientRect(), r = e.getBoundingClientRect(); return { x: f.left + r.left + 10, y: f.top + r.top + r.height / 2 }; });
  await p.mouse.dblclick(box.x, box.y); await p.keyboard.press('End'); await p.keyboard.type(' edited'); await p.keyboard.press('Escape');
  const [d] = await Promise.all([p.waitForEvent('download'), p.click('#bSave')]); const f = join(work, 'saved.html'); await d.saveAs(f); saved = readFileSync(f, 'utf8');
  offlineOk = /<h1>[^<]*edited[^<]*<\/h1>/.test(saved) && saved.includes('Offline deck');
} catch (e) { console.log('offline step failed:', e.message.slice(0, 160)); }
if (!controlled || !offlineOk) console.log('  controlled:', controlled, 'saved edit:', offlineOk, (saved.match(/<h1>[^<]*/) || [''])[0]);
t('offline: site reopens without network, deck edited and saved', controlled && offlineOk);
// update notice: page from cache (old build), then a new build is deployed and the network comes back
const oldBuild = await p.evaluate(() => window.HE_BUILD);
files = { '/': Buffer.from(files['/'].toString().replace(`window.HE_BUILD='${oldBuild}'`, "window.HE_BUILD='newbuild0001'")), '/sw.js': Buffer.from(files['/sw.js'].toString().replace(/VERSION = '[^']+'/, "VERSION = 'newbuild0001'")) };
await ctx.setOffline(false);
await p.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r && r.update()));
let notice = '';
for (let i = 0; i < 40 && !notice; i++) { await p.waitForTimeout(150); notice = await p.evaluate(() => { const m = document.querySelector('#msg').textContent, k = window.HE_TT('msg.newVersion'); return m === k ? m : ''; }); }
t('update: old page from cache shows the new-version notice', !!notice);
await ctx.close();
// budget
const size = statSync(join(PUB, 'index.html')).size;
t(`budget: public/index.html ${Math.round(size / 1024)}KB <= 1024KB`, size <= 1024 * 1024);
// speed (fresh context, local file like the site)
{
  const c2 = await b.newContext({ viewport: { width: 1280, height: 900 } }); const q = await c2.newPage();
  await q.goto(URL0); await q.waitForTimeout(200);
  const t0 = Date.now(); await q.setInputFiles('#openFile', deck);
  await q.waitForFunction(() => document.body.classList.contains('loaded') && window.HE.S.doc && window.HE.slides().length > 0);
  const ms = Date.now() - t0; t(`speed: file chosen -> editor shown in ${ms}ms <= 1000ms`, ms <= 1000);
  await c2.close();
}
await b.close(); srv.close();
const n = Object.values(results).filter(Boolean).length, all = Object.keys(results).length;
console.log(`total ${n}/${all} pass`);
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(results, null, 1));
process.exit(n === all ? 0 : 1);
