#!/usr/bin/env node
// Tests for documents (plan 2), the AI handoff (3b, 3e, 3f), missing images (5e) and languages (1c).
// Builds public/index.html and drives it headless. Exit code 0 = all pass.
// Usage: node test-docs.mjs [result.json]
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = createRequire(execSync('npm root -g', { encoding: 'utf8' }).trim() + '/')('playwright');
const HERE = dirname(fileURLToPath(import.meta.url)), work = mkdtempSync(join(tmpdir(), 'he-docs-'));
execSync('node build-single.mjs', { cwd: HERE, stdio: 'ignore' });
const EDITOR = pathToFileURL(join(HERE, 'public/index.html')).href;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/AAAMCAQCOaXJ4AAAAAElFTkSuQmCC';
const PNG2 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==';
// A4 resume: two .page sheets in mm, a table, an image, an attribute from another tool (data-od-id) and @page
const RESUME = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>@page{size:A4;margin:0}body{background:#eee;margin:0}.page{width:210mm;min-height:297mm;margin:20px auto;background:#fff;padding:20mm;box-sizing:border-box;font-family:sans-serif;position:relative}h1{font-size:28px}.photo{position:absolute;right:20mm;top:20mm;width:30mm;height:36mm}td{border:1px solid #999;padding:4px 8px}.badge{display:inline-block;background:#fd0;padding:4px 10px}</style></head><body>
<div class="page" data-od-id="p1"><h1 id="nm" data-od-id="name">Jane Doe</h1><p class="role">AI planner</p><img class="photo" src="${PNG}" alt="photo"><table><tr><td id="c1">2020</td><td>Founder</td></tr><tr><td>2018</td><td>Planner</td></tr></table><p><span class="badge" id="badge">DRAFT</span></p><p id="keep">Keep this line</p></div>
<div class="page" data-od-id="p2"><h2 id="p2">Projects</h2><p>Details</p></div></body></html>`;
// landing: header + 3 sections of different heights + footer
const LANDING = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:sans-serif}section{padding:80px 40px}.hero{background:#123;color:#fff;height:500px}img{width:120px;height:80px}td{border:1px solid #999}</style></head><body><header><nav>Logo | Menu</nav></header><section class="hero"><h1 id="hero">Our service</h1><p id="tag">One line</p><img id="pic" src="${PNG}" alt=""></section><section><h2 id="feat">Features</h2><table><tr><td id="lc">A</td><td>B</td></tr></table><p class="box" id="lbox">Box</p></section><section><h2>Pricing</h2></section><footer>Footer</footer></body></html>`;
const LONG = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}section{height:1500px;border-bottom:1px solid #ccc}</style></head><body>${Array.from({ length: 16 }, (_, i) => `<section><h2 id="h${i}">Part ${i}</h2><p>Text ${i}</p></section>`).join('')}<footer id="end">End</footer></body></html>`;
const DECK = `<!doctype html><html><head><meta charset="utf-8"><style>.slide{width:960px;height:540px;position:relative}</style></head><body><section class="slide"><h1 id="t">Deck</h1></section><section class="slide"><h1>Two</h1></section></body></html>`;
const BIG = DECK.replace('</body>', `<p style="display:none">${'x'.repeat(210 * 1024)}</p></body>`);
const RELIMG = `<!doctype html><html><head><meta charset="utf-8"></head><body><section class="slide" style="width:960px;height:540px"><img src="images/a.png" alt="a"><h1>Rel</h1></section></body></html>`;
const f = (name, html) => { const p = join(work, name); writeFileSync(p, html); return p; };
const files = { resume: f('resume.html', RESUME), landing: f('landing.html', LANDING), long: f('long.html', LONG), deck: f('deck.html', DECK), big: f('big.html', BIG), rel: f('rel.html', RELIMG), png: join(work, 'p.png') };
writeFileSync(files.png, Buffer.from(PNG2, 'base64'));

const results = {}; let pageErrors = 0;
const t = (name, ok) => { results[name] = !!ok; console.log(ok ? 'PASS' : 'FAIL', name); };
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, locale: 'ko-KR', permissions: ['clipboard-read', 'clipboard-write'] });
async function open(file, url = EDITOR) {
  const p = await ctx.newPage(); p.on('pageerror', (e) => { pageErrors += 1; console.log('page error', e.message.slice(0, 160)); });
  await p.goto(url); await p.setInputFiles('#openFile', file);
  await p.waitForFunction(() => document.body.classList.contains('loaded') && window.HE.S.doc && window.HE.slides().length > 0); await p.waitForTimeout(400);
  return p;
}
const at = (p, sel) => p.evaluate((sel) => { const S = window.HE.S, e = S.doc.querySelector(sel); e.scrollIntoView({ block: 'center' }); const fr = document.querySelector('#stage').getBoundingClientRect(), r = e.getBoundingClientRect(); return { x: fr.left + r.left + Math.min(12, r.width / 2), y: fr.top + r.top + r.height / 2, k: window.HE.scaleOf(e) }; }, sel);
const save = async (p) => { const [d] = await Promise.all([p.waitForEvent('download'), p.click('#bSave')]); const out = join(work, 'out' + Date.now() + Math.random().toString(36).slice(2) + '.html'); await d.saveAs(out); return readFileSync(out, 'utf8'); };
// ⋯ 메뉴는 메뉴를 접은 상태에서만 보인다(계획 _docs/20261105_06). 펼친 메뉴면 장 단위 버튼이 리본에 그대로 있다.
const moreIf = async (p) => { if (await p.isVisible('#bMore')) await p.click('#bMore'); };
// Normalized DOM of a saved file (body, no comment block, whitespace squeezed) — compares structure and text, not byte length.
const norm = (p, html) => p.evaluate((h) => { const d = new DOMParser().parseFromString(h, 'text/html'); d.querySelectorAll('#he-comments').forEach((x) => x.remove()); return d.body.innerHTML.replace(/\s+/g, ' ').trim(); }, html);
const visible = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none' && e.offsetParent !== null; }, sel);

// ---- 2a/2b: view kind is detected, left list follows, no mode switch
{
  const p = await open(files.resume);
  const v = await p.evaluate(() => ({ view: window.HE.viewKind(), n: window.HE.slides().length, side: document.querySelector('#sideCount').textContent, cards: document.querySelector('#thumbs').contentDocument.querySelectorAll('.he-card').length }));
  t('2a A4 resume opens as A4 pages, left list shows 2 pages', v.view === 'a4' && v.n === 2 && v.cards === 2 && v.side.includes('2'));
  await moreIf(p); // 장 단위 버튼은 펼친 메뉴의 「슬라이드」 묶음, 접으면 ⋯ 메뉴 안(계획 _docs/20261105_04 2b·_06) — 메뉴를 연 채로 본다
  t('2a deck-only buttons hidden for documents, no mode switch button', await visible(p, '#bFind') && !(await visible(p, '#bSDup')) && !(await visible(p, '#bView')) && !(await visible(p, '#bGrid')) && !(await p.$('[data-view-switch],#bMode')));
  await moreIf(p);
  await p.evaluate(() => document.querySelector('#thumbs').contentDocument.querySelectorAll('.he-card')[1].click()); await p.waitForTimeout(300);
  t('2b clicking page 2 in the left list moves there', await p.evaluate(() => window.HE.S.cur === 1 && Math.abs(window.HE.slides()[1].getBoundingClientRect().top) < 30));
  await p.close();
}
{
  const p = await open(files.landing);
  const v = await p.evaluate(() => ({ view: window.HE.viewKind(), n: window.HE.slides().length }));
  t('2a landing opens as a scrolling document with 5 sections (header, 3 sections, footer)', v.view === 'page' && v.n === 5);
  await p.close();
  const q = await open(files.deck);
  await moreIf(q);
  t('2a fixed-size deck still opens as a deck with deck buttons', (await q.evaluate(() => window.HE.viewKind())) === 'deck' && await visible(q, '#bSDup') && await visible(q, '#bGrid'));
  await moreIf(q);
  await q.close();
}
// ---- 2c: same engine edits in documents, saved round trip changes only what was edited
async function roundTrip(file, sel) {
  const p = await open(file);
  const orig = await norm(p, readFileSync(file, 'utf8'));
  // text
  let c = await at(p, sel.text); await p.mouse.dblclick(c.x, c.y); await p.keyboard.press('Control+End'); await p.keyboard.press('End'); await p.keyboard.type('X1'); await p.keyboard.press('Escape');
  // table cell
  c = await at(p, sel.cell); await p.mouse.dblclick(c.x, c.y); await p.keyboard.press('End'); await p.keyboard.type('X2'); await p.keyboard.press('Escape');
  // image
  c = await at(p, sel.img); await p.mouse.click(c.x, c.y); await p.setInputFiles('#iImg', files.png); await p.waitForTimeout(250);
  // move (arrow keys on the selected element)
  c = await at(p, sel.move); await p.mouse.click(c.x, c.y); await p.keyboard.press('Shift+ArrowRight'); await p.waitForTimeout(50);
  // delete
  c = await at(p, sel.del); await p.mouse.click(c.x, c.y); await p.waitForTimeout(80);
  if (process.env.DEBUG) console.log('before delete sel:', await p.evaluate(() => window.HE.S.sel.map((e) => e.tagName + '#' + e.id)), 'focus:', await p.evaluate(() => document.activeElement.tagName + '#' + document.activeElement.id));
  await p.keyboard.press('Delete'); await p.waitForTimeout(80);
  if (process.env.DEBUG) console.log('after delete exists:', await p.evaluate((s) => !!window.HE.S.doc.querySelector(s), sel.del));
  // comment
  await p.click('#bComment'); c = await at(p, sel.text); await p.mouse.click(c.x + 20, c.y); await p.waitForFunction(() => document.activeElement && document.activeElement.id === 'popText'); await p.keyboard.type('Shorter'); await p.click('#popOk'); await p.keyboard.press('Escape');
  if (process.env.DEBUG) console.log('export before save has del:', await p.evaluate((s) => window.HE.exportText().includes('id="' + s.slice(1) + '"'), sel.del), 'exists live:', await p.evaluate((s) => !!window.HE.S.doc.querySelector(s), sel.del));
  const html = await save(p); await p.close();
  if (process.env.DEBUG) console.log('saved has del:', html.includes('id="' + sel.del.slice(1) + '"'));
  const q = await open(f('re-' + Date.now() + '.html', html));
  const after = await q.evaluate((sel) => { const d = window.HE.S.doc, g = (s) => d.querySelector(s); return { text: g(sel.text).textContent, cell: g(sel.cell).textContent, img: g(sel.img).getAttribute('src'), move: g(sel.move).getAttribute('style') || '', del: !!g(sel.del), pins: window.HE.commentCount() }; }, sel);
  const saved = await norm(q, html); await q.close();
  // revert the known edits on a copy of the saved DOM, the rest must equal the original
  const restProbe = await (async () => { const pp = await ctx.newPage(); const r = await pp.evaluate(({ a, bb, sel }) => {
    const A = new DOMParser().parseFromString('<body>' + a + '</body>', 'text/html'), B = new DOMParser().parseFromString('<body>' + bb + '</body>', 'text/html');
    for (const D of [A, B]) { D.querySelectorAll([sel.text, sel.cell, sel.img, sel.move, sel.del].join(',')).forEach((e) => e.remove()); }
    return A.body.innerHTML === B.body.innerHTML;
  }, { a: orig, bb: saved, sel }); await pp.close(); return r; })();
  return { after, html, restProbe };
}
{
  const sel = { text: '#nm', cell: '#c1', img: 'img.photo', move: '#badge', del: '#keep' };
  const r = await roundTrip(files.resume, sel);
  if (process.env.DEBUG) console.log(JSON.stringify(r.after), (r.html.match(/data-od-id=/g) || []).length, r.restProbe);
  t('2c resume: text, table cell, image, move, delete, comment all saved and reopened', r.after.text.includes('X1') && r.after.cell.includes('X2') && r.after.img.includes('mP8z') && /left:/.test(r.after.move) && !r.after.del && r.after.pins === 1);
  t('2c resume: everything else unchanged, no editor marks, other tool attributes kept', r.restProbe && !/data-he|he-cur|contenteditable|he-style/.test(r.html) && (r.html.match(/data-od-id=/g) || []).length === 3);
  t('2c A4 print kept: @page and mm sizes untouched', r.html.includes('@page{size:A4;margin:0}') && r.html.includes('width:210mm;min-height:297mm'));
}
{
  const sel = { text: '#hero', cell: '#lc', img: '#pic', move: '#lbox', del: '#tag' };
  const r = await roundTrip(files.landing, sel);
  if (process.env.DEBUG) console.log(JSON.stringify(r.after));
  t('2c landing: text, table cell, image, move, delete, comment all saved and reopened', r.after.text.includes('X1') && r.after.cell.includes('X2') && r.after.img.includes('mP8z') && /left:/.test(r.after.move) && !r.after.del && r.after.pins === 1);
  t('2c landing: everything else unchanged, no editor marks', r.restProbe && !/data-he|he-cur|contenteditable|he-style/.test(r.html));
}
// ---- 2e: very long page
{
  const p = await open(files.long);
  const st = await p.evaluate(() => ({ msg: document.querySelector('#msg').textContent, h: window.HE.S.doc.documentElement.scrollHeight }));
  t('2e long page (>20000px) shows the limit notice and the editor responds', st.h > 20000 && st.msg === await p.evaluate(() => window.HE_TT('msg.longPage')) && await p.evaluate(async () => { await window.HE.goTo(15); return window.HE.S.cur === 15; }));
  const orig = await norm(p, LONG);
  const same = await norm(p, await save(p));
  const c = await at(p, '#h7'); await p.mouse.dblclick(c.x, c.y); await p.keyboard.press('End'); await p.keyboard.type('Z'); await p.keyboard.press('Escape');
  const one = await norm(p, await save(p));
  const diff = await p.evaluate(({ a, bb }) => { const A = new DOMParser().parseFromString('<body>' + a + '</body>', 'text/html'), B = new DOMParser().parseFromString('<body>' + bb + '</body>', 'text/html'); const ea = [...A.body.querySelectorAll('*')], eb = [...B.body.querySelectorAll('*')]; if (ea.length !== eb.length) return -1; return ea.filter((x, i) => x.childElementCount === 0 && x.outerHTML !== eb[i].outerHTML).map((x) => x.id || x.tagName); }, { a: orig, bb: one });
  t('2e saving without edits keeps the full document (same DOM and text)', same === orig);
  t('2e one edit changes exactly that one element', Array.isArray(diff) && diff.length === 1 && diff[0] === 'h7');
  await p.close();
}
// ---- 3b: copy for AI
{
  const p = await open(files.resume);
  // 코멘트 입력 칸에 포커스가 간 뒤에 친다. 고정 150ms면 기기가 바쁠 때 칸이 뜨기 전에 쳐서 빈 코멘트(집계 0건)가 됐다 — 장부 「3b 간헐 실패」의 원인(2026-11-07 진단)
  const typed = (pg) => pg.waitForFunction(() => document.activeElement && document.activeElement.id === 'popText', null, { timeout: 15000 }).catch(() => {});
  await p.click('#bComment'); const c = await at(p, '#nm'); await p.mouse.click(c.x, c.y); await typed(p); await p.keyboard.type('Bigger'); await p.click('#popOk');
  // 복사가 끝나면 완료 창이 뜬다. 고정 200ms로 기다리면 기기가 바쁠 때 복사 전에 읽어 직전 복사값을 받았다(2026-11-07 진단: 상태 줄이 아직 「코멘트 모드」)
  await p.click('#bAI'); await p.waitForFunction(() => document.querySelector('#dlgCopy').open, null, { timeout: 15000 }).catch(() => {});
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  const docHead = await p.evaluate(() => window.HE_T('ai.promptDoc').split('\n')[0]);
  if (process.env.DEBUG) console.log('clip:', clip.slice(0, 120), '| head:', docHead, '| msg:', await p.textContent('#msg'), '| comments:', await p.evaluate(() => window.HE.commentCount()));
  const ok3b = clip.startsWith(docHead) && clip.includes('Jane Doe') && clip.includes('Bigger');
  // 간헐 실패(고칠 일 장부 「slide-editor 문서 시험 3b 간헐 실패」) 원인을 밝히려고, 실패하면 실제 복사값과 기대값을 남긴다
  if (!ok3b) console.log('3b 실패 진단 — 복사값 앞 200자:', JSON.stringify(clip.slice(0, 200)), '| 기대 머리말:', JSON.stringify(docHead), '| 상태 줄:', await p.textContent('#msg'), '| 코멘트 수:', await p.evaluate(() => window.HE.commentCount()));
  t('3b document copy uses the document instructions and keeps the HTML', ok3b);
  t('3b after copying, comment mode is turned off', !(await p.evaluate(() => document.body.classList.contains('cmode'))));
  await p.close();
  const q = await open(files.big);
  await q.click('#bComment'); const d = await at(q, '#t'); await q.mouse.click(d.x, d.y); await typed(q); await q.keyboard.type('Fix'); await q.click('#popOk');
  await q.click('#bAI'); await q.waitForFunction(() => document.querySelector('#dlgCopy').open, null, { timeout: 15000 }).catch(() => {});
  const big = await q.evaluate(() => navigator.clipboard.readText());
  const bigMsg = await q.textContent('#msg'), bigWant = await q.evaluate(() => window.HE_TT('msg.bigCopy'));
  const okBig = big.length < 5000 && big.includes('Fix') && !big.includes('xxxxxxxxxx') && bigMsg === bigWant;
  if (!okBig) console.log('3b(200KB) 실패 진단 — 복사값 길이:', big.length, '| 앞 200자:', JSON.stringify(big.slice(0, 200)), '| 상태 줄:', JSON.stringify(bigMsg), '| 기대 상태 줄:', JSON.stringify(bigWant));
  t('3b file over 200KB: HTML left out, attach notice in the status line', okBig);
  await q.close();
}
// ---- 3f: save state
{
  const p = await open(files.deck);
  const c = await at(p, '#t'); await p.mouse.dblclick(c.x, c.y); await p.keyboard.press('End'); await p.keyboard.type('!'); await p.keyboard.press('Escape');
  await save(p); await p.click('#bUndo'); await p.waitForTimeout(100);
  const s = await p.evaluate(() => ({ dirty: window.HE.isDirty(), state: document.querySelector('#stateText').textContent }));
  const warn = await p.evaluate(() => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
  t('3f undo after save shows unsaved and arms the leave warning', s.dirty && s.state.includes('저장 안 된') && warn);
  await p.close();
  const q = await open(files.deck);
  await q.click('#bComment'); const d = await at(q, '#t'); await q.mouse.click(d.x, d.y); await q.waitForTimeout(150); await q.keyboard.type('Note'); await q.click('#popOk');
  const warn2 = await q.evaluate(() => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
  t('3f comment-only change warns before closing', warn2);
  await q.close();
}
// ---- 3e + 3f: Save As target, overwrite protection (file system access mocked)
{
  const p = await open(files.deck);
  const r = await p.evaluate(async () => {
    const H = window.HE; let stamp = 1000, written = 0;
    const handle = { name: 'mine.html', async getFile() { return { lastModified: stamp }; }, async createWritable() { return { async write() { written += 1; }, async close() { stamp += 1; } }; } };
    window.showSaveFilePicker = async () => handle;
    await H.saveAs();
    const where = document.querySelector('#where').textContent;
    stamp = 5000; // another program (e.g. an AI) changed the file on disk
    let asked = 0; const real = window.HEUI.askConflict; window.HEUI.askConflict = async () => { asked += 1; return 'no'; };
    H.S.dirty = 1; await H.save(); const afterCancel = written;
    window.HEUI.askConflict = async () => { asked += 1; return 'go'; }; await H.save(); window.HEUI.askConflict = real;
    return { where, asked, afterCancel, written };
  });
  t('3f after Save As the status line says saves overwrite that file', r.where === await p.evaluate(() => window.HE_TT('where.overwrite')));
  t('3e file changed on disk: asks before overwriting, cancel keeps it, overwrite writes', r.asked === 2 && r.afterCancel === 1 && r.written === 2);
  await p.close();
}
// ---- 3a: comment block format — old files (no format/version) still load, saving writes version 1
{
  const old = DECK.replace('</body>', '<script type="application/json" id="he-comments">{"about":"old","comments":[{"id":"c1","slide":1,"slideId":"","x":10,"y":10,"target":"Deck","text":"Old comment"}]}</script></body>');
  const p = await open(f('old.html', old));
  const n = await p.evaluate(() => window.HE.commentCount());
  const html = await save(p);
  const j = JSON.parse(/id="he-comments">([\s\S]*?)<\/script>/.exec(html)[1]);
  t('3a old comment block (no version) loads; saved block has format + version 1', n === 1 && j.format === 'open-html-editor/comments' && j.version === 1 && j.comments[0].text === 'Old comment');
  await p.close();
}
// ---- 3f: comment-only change + overwrite conflict canceled -> still unsaved, leave warning still on
{
  const p = await open(files.deck);
  await p.click('#bComment'); const c = await at(p, '#t'); await p.mouse.click(c.x, c.y);
  await p.waitForFunction(() => document.activeElement && document.activeElement.id === 'popText'); await p.keyboard.type('Keep me'); await p.click('#popOk'); await p.keyboard.press('Escape');
  const r = await p.evaluate(async () => {
    const H = window.HE; let stamp = 1000, writes = 0;
    const handle = { name: 'mine.html', async getFile() { return { lastModified: stamp }; }, async createWritable() { return { async write() { writes += 1; }, async close() { stamp += 1; } }; } };
    window.showSaveFilePicker = async () => handle; await H.saveAs();
    H.setComment(H.S.comments[0].id, 'Changed after save'); stamp = 7000;
    window.HEUI.askConflict = async () => 'no'; await H.save();
    const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e);
    return { writes, commentChanged: H.S.commentChanged, warn: e.defaultPrevented, state: document.querySelector('#stateText').textContent };
  });
  t('3f comment-only change, overwrite canceled: comment stays unsaved and the leave warning stays on', r.writes === 1 && r.commentChanged && r.warn && r.state.includes('저장 안 된'));
  await p.close();
}
// ---- 2c A4 print: saved file prints the same number of pages as the original (Chromium PDF)
{
  const p = await open(files.resume);
  const c = await at(p, '#nm'); await p.mouse.dblclick(c.x, c.y); await p.keyboard.type('Q'); await p.keyboard.press('Escape');
  const saved = await save(p); await p.close();
  const pages = async (html) => { const q = await ctx.newPage(); await q.setContent(html); const pdf = await q.pdf({ preferCSSPageSize: true }); await q.close(); return (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length; };
  const a = await pages(RESUME), z = await pages(saved);
  t(`2c A4 print: original ${a} pages = saved ${z} pages`, a > 0 && a === z);
}
// ---- 5e: relative images when only the file is opened
{
  const p = await open(files.rel);
  t('5e file with relative images opened alone: folder hint in the status line', (await p.textContent('#msg')) === await p.evaluate(() => window.HE_TT('msg.missingImages', { n: 1 })));
  await p.close();
}
// ---- 1c: language follows the browser, switch works, editor text changes
{
  const c2 = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
  const p = await c2.newPage(); await p.goto(EDITOR);
  const en = await p.evaluate(() => ({ lang: document.documentElement.lang, drop: document.querySelector('#drop b').textContent, save: document.querySelector('#bSave').textContent.trim() }));
  await p.click('#l-globe'); await p.click('#land .lang [data-lang="ko"]'); // 첫 화면 언어 메뉴는 지구본 단추로 연다
  const ko = await p.evaluate(() => ({ lang: document.documentElement.lang, drop: document.querySelector('#drop b').textContent, save: document.querySelector('#bSave').textContent.trim(), kept: localStorage.getItem('he-lang') }));
  t('1c English browser gets English, switching to Korean changes all text and is remembered', en.lang === 'en' && en.drop === 'Open HTML File' && en.save === 'Save' && ko.lang === 'ko' && ko.drop === 'HTML 파일 열기' && ko.save === '저장' && ko.kept === 'ko');
  await c2.close();
}
// ---- 8: 받는 분 한 번에 열기(8a), 안내문 복사(8b), 다른 파일 열기(8e) — 계획 _docs/20261104_07
{
  const SITE = 'https://easy-html-editor.pages.dev';
  const BIGIMG = 'data:image/png;base64,' + Buffer.alloc(3000, 7).toString('base64');
  const b2 = Buffer.alloc(3000, 7); b2[100] = 9; const BIGIMG2 = 'data:image/png;base64,' + b2.toString('base64'); // 길이·끝 24글자가 같고 가운데만 다른 그림
  // 실행 중에 요소를 만들고 클래스를 바꾸는 스크립트 + 3KB 내장 그림: 받은 문서가 원문(스크립트 실행 전)으로 열리는지 본다
  const GEN = `<!doctype html><html><head><meta charset="utf-8"><style>.slide{width:960px;height:540px;position:relative}</style></head><body><section class="slide"><h1 id="t">Gen deck</h1><img id="big" src="${BIGIMG}" alt="b"><img id="big2" src="${BIGIMG2}" alt="b2"></section><section class="slide"><h1>Two</h1></section><script>document.body.insertAdjacentHTML('beforeend','<div class="gen">made</div>');document.querySelector('.slide').classList.add('on')</script></body></html>`;
  files.gen = f('gen.html', GEN);
  const blocks = (h) => (h.match(/<!--ohe-handoff-->/g) || []).length;
  // 공유 메뉴(계획 _docs/20261105_04 3a): 「받는 분도 바로 고칠 수 있게」는 파일을 열 때마다 켜지고, 공유용 저장에만 버튼이 들어간다. 일반 저장은 항상 버튼 없이.
  const shareMenu = async (p) => { if (!(await p.isVisible('#shareMenu'))) await p.click('#bShare'); };
  const closeMenus = (p) => p.evaluate(() => document.querySelectorAll('.menu.open').forEach((x) => x.classList.remove('open')));
  const setShare = async (p, want) => { await shareMenu(p); if ((await p.isChecked('#chkHandoff')) !== want) await p.click('#hoRow'); await closeMenus(p); };
  const turnOn = (p) => setShare(p, true);
  const saveTo = async (p, name) => { const [d] = await Promise.all([p.waitForEvent('download'), p.click('#bSave')]); const out = join(work, name); await d.saveAs(out); return out; };
  const shareTo = async (p, name) => { await shareMenu(p); const [d] = await Promise.all([p.waitForEvent('download'), p.click('#bShareSave')]); const out = join(work, name); await d.saveAs(out); return { out, suggested: d.suggestedFilename() }; };
  // 8a-0 토글: 새 문서는 켜짐, 누르면 꺼지고 메뉴는 열린 채, 다른 문서를 열면 다시 켜짐, 서버 모드는 공유 버튼을 숨김
  let p = await open(files.deck);
  const s0 = await p.evaluate(() => document.querySelector('#chkHandoff').checked && window.HE.S.shareEdit === true);
  await shareMenu(p); await p.click('#hoRow');
  const a0 = await p.evaluate(() => ({ off: !document.querySelector('#chkHandoff').checked && window.HE.S.shareEdit === false, open: document.querySelector('#shareMenu').classList.contains('open'), help: document.querySelector('#shareHelp').textContent === window.HE_TT('menu.shareHelpOff') }));
  await closeMenus(p);
  const srv = await p.evaluate(() => { const S = window.HE.S; S.server = true; window.HEUI.onOpen(); const h = document.querySelector('#bShare').parentElement.hidden; S.server = false; window.HEUI.onOpen(); return h && !document.querySelector('#bShare').parentElement.hidden; });
  await p.evaluate((h) => window.HE.openText(h, 'deck2.html', new Map()), DECK); await p.waitForTimeout(400);
  const fresh = await p.evaluate(() => document.querySelector('#chkHandoff').checked && window.HE.S.shareEdit === true);
  t('8a-0 share toggle: on for a new document, click turns it off and keeps the menu open, on again for the next document, share hidden in server mode', s0 && a0.off && a0.open && a0.help && srv && fresh);
  // 8a-1 일반 저장은 토글이 켜져 있어도 버튼 없음
  const off = readFileSync(await saveTo(p, 'off.html'), 'utf8');
  t('8a-1 plain save with the share toggle on: no handoff block', blocks(off) === 0 && !off.includes('ohe-edit'));
  // 8b-1 토글을 끄고 「안내문만 복사」 → 끌어놓기판 안내문
  await setShare(p, false); await shareMenu(p); await p.click('#bGuide'); await p.waitForTimeout(200);
  const clipOff = await p.evaluate(() => navigator.clipboard.readText()), wantOff = await p.evaluate((u) => window.HE_TT('guide.noButton', { url: u }), SITE + '/');
  t('8b-1 share menu Copy note only (toggle off): drag-and-drop guide with the site address', clipOff === wantOff && clipOff.includes(SITE + '/') && (await p.textContent('#msg')) === await p.evaluate(() => window.HE_TT('msg.guideCopied')));
  // 8a-2b 토글을 끈 채 공유용 저장 → 블록 없음
  const sOff = await shareTo(p, 'share-off.html');
  t('8a-2b share save with the toggle off: no handoff block', blocks(readFileSync(sOff.out, 'utf8')) === 0);
  // 8a-2 토글을 켜고 공유용 저장 → 블록 1·버튼 1·스크립트 1KB 이하, 화면엔 보이고 인쇄에선 숨김, 파일 이름 _공유, 버튼판 안내문 복사
  await turnOn(p);
  const sOn = await shareTo(p, 'on.html'); const onPath = sOn.out, on = readFileSync(onPath, 'utf8'); await p.waitForTimeout(200);
  const script = (on.match(/<!--ohe-handoff-->[\s\S]*?<script>([\s\S]*?)<\/script>/) || [])[1] || '';
  const clipOn = await p.evaluate(() => navigator.clipboard.readText()), wantOn = await p.evaluate((u) => window.HE_TT('guide.withButton', { url: u }), SITE + '/');
  const shareName = await p.evaluate(() => window.HE_TT('file.shareSuffix'));
  t('8b-2 share save copies the button version of the guide and names the file *_share', clipOn === wantOn && clipOn !== clipOff && sOn.suggested.endsWith(shareName + '.html'));
  const v = await ctx.newPage(); await v.goto(pathToFileURL(onPath).href); await v.waitForTimeout(300);
  const shown = await v.evaluate(() => getComputedStyle(document.getElementById('ohe-edit')).display !== 'none');
  await v.emulateMedia({ media: 'print' }); const printed = await v.evaluate(() => getComputedStyle(document.getElementById('ohe-edit')).display); await v.close();
  t(`8a-2 share save with the toggle on: one block, one button, script ${script.length} B <= 1024, visible on screen, hidden in print`, blocks(on) === 1 && (on.match(/id="ohe-edit"/g) || []).length === 1 && script.length > 0 && script.length <= 1024 && shown && printed === 'none');
  await p.close();
  // 8a-3 블록 든 파일을 다시 열면 편집 화면에 버튼 0, 토글 켜짐, 일반 저장은 블록 0, 공유용 저장은 정확히 1개
  p = await open(onPath);
  const a3 = await p.evaluate(() => ({ btn: !!window.HE.S.doc.getElementById('ohe-edit'), chk: document.querySelector('#chkHandoff').checked }));
  const plainAgain = readFileSync(await saveTo(p, 'again-plain.html'), 'utf8');
  const again = readFileSync((await shareTo(p, 'again.html')).out, 'utf8');
  t('8a-3 reopening a file with the button: no button in the editor, toggle on, plain save drops the block, share save keeps exactly one', !a3.btn && a3.chk && blocks(plainAgain) === 0 && blocks(again) === 1 && (again.match(/id="ohe-edit"/g) || []).length === 1);
  // 8b-3 공유 파일(버튼 있음)을 만든 뒤 일반 저장을 해도 「안내문만 복사」는 공유 파일에 맞는 버튼판 안내문(완료 검수 1차 지적)
  await saveTo(p, 'after-share-plain.html'); await shareMenu(p); await p.click('#bGuide'); await p.waitForTimeout(200);
  t('8b-3 Copy note only after a share save then a plain save: still the button version', (await p.evaluate(() => navigator.clipboard.readText())) === wantOn);
  await p.close();
  // 8a-4·8a-5·8a-6 받은 파일의 버튼 → 새 탭 편집기에 원문이 열림(사이트 주소는 이 레포의 public/index.html로 응답)
  const hctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ko-KR' });
  await hctx.route(SITE + '/**', (r) => { const u = new URL(r.request().url()); const fp = u.pathname.endsWith('/sw.js') ? 'public/sw.js' : 'public/index.html'; r.fulfill({ contentType: fp.endsWith('.js') ? 'text/javascript' : 'text/html', body: readFileSync(join(HERE, fp), 'utf8') }); });
  const ext = []; hctx.on('request', (r) => { const u = r.url(); if (!/^(data|blob|about|file):/.test(u) && !u.startsWith(SITE)) ext.push(u); });
  const receive = async (srcFile, savedName) => {
    const e = await open(srcFile); const out = (await shareTo(e, savedName)).out; await e.close();
    const q = await hctx.newPage(); await q.goto(pathToFileURL(out).href); await q.waitForTimeout(300);
    const [np] = await Promise.all([hctx.waitForEvent('page'), q.click('#ohe-edit')]);
    np.on('pageerror', (er) => { pageErrors += 1; console.log('page error', er.message.slice(0, 160)); });
    await np.waitForFunction(() => document.body.classList.contains('loaded') && window.HE.S.doc && window.HE.slides().length > 0, null, { timeout: 15000 }); await np.waitForTimeout(500);
    return { q, np };
  };
  {
    const { q, np } = await receive(files.gen, 'gen-saved.html');
    const r = await np.evaluate((img) => { const S = window.HE.S; return { name: S.name, title: S.doc.getElementById('t').textContent, gen: S.orig.querySelectorAll('.gen').length, on: S.orig.querySelector('.slide').classList.contains('on'), img: S.orig.getElementById('big').getAttribute('src') === img[0] && S.orig.getElementById('big2').getAttribute('src') === img[1], btn: !!S.doc.getElementById('ohe-edit'), chk: document.querySelector('#chkHandoff').checked, msg: document.querySelector('#msg').textContent, want: window.HE_TT('msg.openedHandoff'), hash: location.hash }; }, [BIGIMG, BIGIMG2]);
    t('8a-4 button in the received file opens the editor in a new tab with the document loaded (no upload, no extra requests)', r.name === 'gen-saved.html' && r.title === 'Gen deck' && !r.btn && r.chk && r.msg === r.want && r.hash === '' && ext.length === 0);
    t('8a-5 the editor gets the original source (script-made element 0, class unchanged) and two 3KB images with the same length and ending each come back as themselves', r.gen === 0 && !r.on && r.img);
    if (ext.length) console.log('external requests', ext.slice(0, 5));
    await np.close(); await q.close();
  }
  {
    const { q, np } = await receive(files.rel, 'rel-saved.html');
    t('8a-6 received document with outside images: folder hint in the status line', (await np.textContent('#msg')) === await np.evaluate(() => window.HE_TT('msg.missingImages', { n: 1 })));
    await np.close(); await q.close();
  }
  await hctx.close();
  // 8e 다른 파일 열기: 메뉴 줄·Ctrl+O로 파일 창, 변경 없으면 바로 열림
  p = await open(files.deck);
  await p.click('#bSaveMenu');
  let [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#bOpenOther')]);
  const [fc2] = await Promise.all([p.waitForEvent('filechooser'), p.keyboard.press('Control+o')]);
  t('8e-1 Open another HTML file: menu row and Ctrl+O both open the file picker', !!fc && !!fc2);
  await fc2.setFiles(files.landing); await p.waitForFunction(() => window.HE.S.name === 'landing.html'); await p.waitForTimeout(400);
  t('8e-2 no unsaved changes: the new file opens without asking', !(await p.evaluate(() => !!document.querySelector('dialog[open]'))));
  // 8e-3 변경 있음 → 확인 창: 취소 / 저장 안 하고 열기 / 저장하고 열기 / 편집 화면 끌어놓기
  const dirty = () => p.evaluate(() => { const S = window.HE.S; window.HE.setSel([S.doc.querySelector('h2,h1')]); window.HE.removeSel(); return window.HE.isDirty(); });
  const pick = async (file) => { await p.click('#bSaveMenu'); const [c] = await Promise.all([p.waitForEvent('filechooser'), p.click('#bOpenOther')]); await c.setFiles(file); await p.waitForSelector('#dlgSwitch[open]'); };
  const d1 = await dirty(); await pick(files.resume);
  const focusCancel = await p.evaluate(() => document.activeElement && document.activeElement.value === 'no');
  await p.click('#dlgSwitch button[value="no"]'); await p.waitForTimeout(300);
  const kept = await p.evaluate(() => window.HE.S.name === 'landing.html' && window.HE.isDirty());
  await pick(files.resume); await p.click('#dlgSwitch button[value="discard"]'); await p.waitForFunction(() => window.HE.S.name === 'resume.html'); await p.waitForTimeout(400);
  const d2 = await dirty(); await pick(files.deck);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#dlgSwitch button[value="save"]')]);
  await p.waitForFunction(() => window.HE.S.name === 'deck.html'); await p.waitForTimeout(400);
  const savedName = dl.suggestedFilename();
  const d3 = await dirty();
  await p.evaluate((h) => { const dt = new DataTransfer(); dt.items.add(new File([h], 'dropped.html', { type: 'text/html' })); window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); }, LANDING);
  const dropAsk = await p.waitForSelector('#dlgSwitch[open]', { timeout: 3000 }).then(() => true).catch(() => false);
  if (dropAsk) { await p.click('#dlgSwitch button[value="discard"]'); await p.waitForFunction(() => window.HE.S.name === 'dropped.html').catch(() => {}); }
  const dropped = await p.evaluate(() => window.HE.S.name === 'dropped.html');
  t('8e-3 unsaved changes: confirm (Cancel focused) — cancel keeps, discard opens, save-and-open downloads then opens, drop on the editor asks too', d1 && focusCancel && kept && d2 && savedName === 'resume_수정.html' && d3 && dropAsk && dropped);
  // 8e-4 글자 입력 중(확정 전)에 다른 파일을 고르면 확인 창이 뜨고, 취소하면 입력한 글자가 남는다
  await p.evaluate((h) => window.HE.openText(h, 'typed.html', new Map()), DECK); await p.waitForTimeout(500);
  await p.evaluate(() => { const S = window.HE.S, h = S.doc.getElementById('t'); window.HE.startText(h); const r = S.doc.createRange(); r.selectNodeContents(S.editing); r.collapse(false); const sel = S.win.getSelection(); sel.removeAllRanges(); sel.addRange(r); S.doc.execCommand('insertText', false, ' typed'); });
  const typing = await p.evaluate(() => !!window.HE.S.editing && !window.HE.isDirty());
  await pick(files.resume); await p.click('#dlgSwitch button[value="no"]'); await p.waitForTimeout(300);
  const keptText = await p.evaluate(() => window.HE.S.name === 'typed.html' && window.HE.S.doc.getElementById('t').textContent.includes('typed') && window.HE.isDirty());
  t('8e-4 typing not yet finished: choosing another file still asks, and Cancel keeps the typed text', typing && keptText);
  await p.close();
}
// PDF로 저장 — 문서(계획 _docs/20261105_04 3b): A4는 쪽 크기 그대로 한 쪽씩, 구역 문서는 너비 고정·내용 누락 없음
{
  const { inflateSync } = createRequire(import.meta.url)('node:zlib');
  const pdfInfo = (buf) => { const s = buf.toString('latin1'); const boxes = [...s.matchAll(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/g)].map((m) => [+m[1], +m[2]]); let ops = ''; for (const m of s.matchAll(/stream\r?\n/g)) { const st = m.index + m[0].length, en = s.indexOf('endstream', st); try { ops += inflateSync(Buffer.from(s.slice(st, en), 'latin1')).toString('latin1'); } catch (e) { /* 압축 안 된 줄기 */ } } return { pages: (s.match(/\/Type\s*\/Page[^s]/g) || []).length, boxes, ops }; };
  const toPdf = async (html) => { const pp = await ctx.newPage(); await pp.setContent(html); await pp.waitForTimeout(300); const buf = await pp.pdf({ preferCSSPageSize: true, printBackground: false }); await pp.close(); return pdfInfo(buf); };
  let p = await open(files.resume);
  const a4 = await p.evaluate(() => ({ kind: window.HE.viewKind(), n: window.HE.slides().length, w: window.HE.slides()[0].offsetWidth, h: window.HE.slides()[0].offsetHeight, html: window.HEUI_printDoc() }));
  const ia = await toPdf(a4.html);
  t('PDF A4: one PDF page per A4 page, page size = page size (no margin), no script', a4.kind === 'a4' && ia.pages === a4.n && ia.boxes.every(([w, h]) => Math.abs(w - a4.w * 0.75) < 1 && Math.abs(h - a4.h * 0.75) < 1) && !/<script/i.test(a4.html.replace(/<style[\s\S]*?<\/style>/g, '')));
  await p.close();
  p = await open(files.landing);
  const pg = await p.evaluate(() => { const l = window.HE.slides(); return { kind: window.HE.viewKind(), w: Math.max(...l.map((s) => s.offsetWidth)), last: l[l.length - 1].textContent.replace(/\s+/g, ' ').trim().slice(0, 20), html: window.HEUI_printDoc() }; });
  const ip = await toPdf(pg.html);
  const lastIn = await (async () => { const v = await ctx.newPage(); await v.setContent(pg.html); const ok = await v.evaluate((t) => document.body.textContent.replace(/\s+/g, ' ').includes(t), pg.last); await v.close(); return ok; })();
  t('PDF section document: page width = section width, every section in the print document', pg.kind === 'page' && ip.pages >= 1 && ip.boxes.every(([w]) => Math.abs(w - pg.w * 0.75) < 1) && lastIn);
  await p.close();
}
await b.close();
const n = Object.values(results).filter(Boolean).length, all = Object.keys(results).length;
console.log(`total ${n}/${all} pass${pageErrors ? `, page errors ${pageErrors}` : ''}`);
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(results, null, 1));
process.exit(n === all && !pageErrors ? 0 : 1);
