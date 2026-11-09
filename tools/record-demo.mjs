#!/usr/bin/env node
// Records the landing-page demo from the real editor (plan 5a): open -> fix the title -> delete the sticky note
// -> pin a comment -> copy for AI -> save. Writes land/demo.mp4 and updates the 4 step timings in editor.html.
// Then run: node tools/landing-assets.mjs && node build-single.mjs
// Needs: global playwright (npm i -g playwright) and ffmpeg.
import { createRequire } from 'node:module';
import { execSync, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = createRequire(execSync('npm root -g', { encoding: 'utf8' }).trim() + '/')('playwright');
const H = join(dirname(fileURLToPath(import.meta.url)), '..'), OUT = mkdtempSync(join(tmpdir(), 'he-rec-'));
execSync('node build-single.mjs', { cwd: H, stdio: 'ignore' });
const DECK = join(H, 'tools/demo-deck.html');
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, locale: 'ko-KR', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'], recordVideo: { dir: OUT, size: { width: 1280, height: 800 } } });
const t0 = Date.now(), marks = {};
const mark = (k) => { marks[k] = (Date.now() - t0) / 1000; };
const p = await ctx.newPage();
await p.goto(pathToFileURL(join(H, 'public/index.html')).href + '?lang=ko');
await p.waitForTimeout(400);
// fake pointer so the video shows where we click
await p.evaluate(() => { const c = document.createElement('div'); c.id = 'fakecur'; c.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l16 10-7 1.5L9.5 21z" fill="#111827" stroke="#fff" stroke-width="1.5"/></svg>'; Object.assign(c.style, { position: 'fixed', left: '1100px', top: '700px', zIndex: 99999, pointerEvents: 'none', transition: 'left .6s cubic-bezier(.4,0,.2,1), top .6s cubic-bezier(.4,0,.2,1)' }); document.body.appendChild(c); });
const move = async (x, y) => { await p.evaluate(([x, y]) => { const c = document.getElementById('fakecur'); c.style.left = (x - 4) + 'px'; c.style.top = (y - 2) + 'px'; }, [x, y]); await p.mouse.move(x, y, { steps: 8 }); await p.waitForTimeout(650); };
const at = (sel) => p.evaluate((sel) => { const S = window.HE.S, e = S.doc.querySelector(sel), f = document.querySelector('#stage').getBoundingClientRect(), r = e.getBoundingClientRect(); return { x: f.left + r.left + r.width / 2, y: f.top + r.top + r.height / 2 }; }, sel);
// STEP 1 drop: pointer goes to the open button, file opens
const d = await p.locator('#drop').boundingBox(); await move(d.x + d.width / 2, d.y + d.height / 2);
mark('start');
await p.setInputFiles('#openFile', DECK);
await p.waitForFunction(() => window.HE.S.doc && window.HE.slides().length > 0);
await p.evaluate(() => { const c = document.getElementById('fakecur'); document.body.appendChild(c); });
mark('opened'); await p.waitForTimeout(1300);
// STEP 3 direct edit: retype the first word of the title, delete the sticky note
mark('edit');
let c = await at('h1.t'); await move(c.x - 40, c.y);
await p.mouse.dblclick(c.x - 40, c.y); await p.waitForTimeout(300);
await p.evaluate(() => { const S = window.HE.S, t = S.editing.firstChild, g = S.doc.createRange(); g.setStart(t, 0); g.setEnd(t, 3); const s = S.win.getSelection(); s.removeAllRanges(); s.addRange(g); });
await p.waitForTimeout(400); await p.keyboard.type('하반기', { delay: 140 }); await p.waitForTimeout(400);
await p.keyboard.press('Escape'); await p.waitForTimeout(600);
c = await at('.memo'); await move(c.x, c.y); await p.mouse.click(c.x, c.y); await p.waitForTimeout(600);
await p.keyboard.press('Delete'); await p.waitForTimeout(800);
// STEP 4 AI handoff: comment, copy for AI, save
mark('ai');
const bc = await p.locator('#bComment').boundingBox(); await move(bc.x + bc.width / 2, bc.y + bc.height / 2); await p.click('#bComment'); await p.waitForTimeout(400);
c = await at('.bars'); await move(c.x, c.y); await p.mouse.click(c.x, c.y);
await p.waitForFunction(() => document.activeElement && document.activeElement.id === 'popText');
await p.locator('#popText').pressSequentially('막대 색을 브랜드 색으로', { delay: 90 }); await p.waitForTimeout(400);
await p.click('#popOk'); await p.waitForTimeout(400);
const ba = await p.locator('#bAI').boundingBox(); await move(ba.x + ba.width / 2, ba.y + ba.height / 2); await p.click('#bAI'); await p.waitForTimeout(1400);
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
const bs = await p.locator('#bSave').boundingBox(); await move(bs.x + bs.width / 2, bs.y + bs.height / 2);
await Promise.all([p.waitForEvent('download'), p.click('#bSave')]);
await p.waitForTimeout(1500); mark('end');
await ctx.close(); await b.close();
const webm = join(OUT, readdirSync(OUT).find((f) => f.endsWith('.webm')));
// start right when the file is open (the landing page itself would show this video inside the video),
// scale to 960 wide, small H.264 for the single-file budget
const ss = Math.max(0, marks.opened + 0.3), dur = marks.end - ss;
// -ss after -i = frame-accurate cut (before -i snaps to a keyframe and leaves one landing-page frame at 0s)
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-ss', ss.toFixed(2), '-t', dur.toFixed(2), '-vf', 'scale=960:-2', '-c:v', 'libx264', '-crf', '33', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', join(H, 'land/demo.mp4')]);
const r = (k) => +(marks[k] - ss).toFixed(1);
// step 1 (drop) and step 2 (instant view) share the first moments after opening
const steps = [[0, 0.6], [0.6, r('edit')], [r('edit'), r('ai')], [r('ai'), +dur.toFixed(1)]];
let html = readFileSync(join(H, 'editor.html'), 'utf8'), i = 0;
html = html.replace(/<li data-from="[\d.]+" data-to="[\d.]+">/g, (m) => { const [a, z] = steps[i++] || [0, 0]; return `<li data-from="${a}" data-to="${z}">`; });
writeFileSync(join(H, 'editor.html'), html);
console.log(JSON.stringify({ video: 'land/demo.mp4', seconds: +dur.toFixed(1), steps }));
