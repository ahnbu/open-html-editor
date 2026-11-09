#!/usr/bin/env node
// 편집기 기능 자동 시험. 재료는 의존 없는 작은 덱을 스스로 만든다. 종료코드 0이면 전 항목 통과.
// 사용: node test-editor.mjs [결과.json] [캡처폴더]
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = createRequire(execSync('npm root -g', { encoding: 'utf8' }).trim() + '/')('playwright');
const HERE = dirname(fileURLToPath(import.meta.url)), work = mkdtempSync(join(tmpdir(), 'he-test-'));
const [outJson, capDir] = process.argv.slice(2);
const DECK = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0}.slide{display:none;position:relative;width:1000px;height:560px;overflow:hidden}.slide.on{display:block}
.t{position:absolute;left:60px;top:40px;font-size:40px}.t .em{color:#ff6b47}.box{position:absolute;left:60px;top:200px;width:300px;background:#eef}
.flow{margin:300px 0 0 60px;font-size:24px}img{position:absolute;left:600px;top:200px;width:200px;height:150px}table{position:absolute;left:60px;top:400px;border-collapse:collapse}td{border:1px solid #999;padding:6px 12px}
[data-step]{opacity:0}</style></head><body>
<section class="slide on" id="a"><h1 class="t">매출 <span class="em">증가</span> 보고</h1><div class="box">상자 글자</div><p class="flow">흐름 글자</p><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/AAAMCAQCOaXJ4AAAAAElFTkSuQmCC"><table><tr><td>가</td><td>나</td></tr><tr><td>다</td><td>라</td></tr></table><div data-step="1" class="box" style="top:500px;left:500px">숨은 단계</div></section>
<section class="slide" id="b"><h1 class="t">둘째 장</h1><div class="box">둘째 상자</div></section>
<section class="slide" id="c"><h1 class="t">셋째 장</h1></section>
<script>let i=0;const s=[...document.querySelectorAll('.slide')];function show(){s.forEach((x,n)=>x.classList.toggle('on',n===i));document.body.dataset.runtime='yes'}addEventListener('keydown',e=>{if(e.key==='ArrowRight'){i=Math.min(s.length-1,i+1);show()}if(e.key==='ArrowLeft'){i=Math.max(0,i-1);show()}});show();window.__sc=()=>i;</script></body></html>`;
const deckPath = join(work, 'deck.html'); writeFileSync(deckPath, DECK);
const pngPath = join(work, 'p.png'); writeFileSync(pngPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==', 'base64'));
// 시험은 합친 파일(public/index.html)로 한다. 사이트·키트가 쓰는 것과 같은 파일이다.
execSync('node build-single.mjs', { cwd: HERE, stdio: 'ignore' });
const EDITOR = pathToFileURL(join(HERE, 'public/index.html')).href;
const results = {};
const b = await chromium.launch({ headless: true });
// 시험 덱은 크기가 고정(1000x560)이라 화면에 맞춰 줄지 않는다. 슬라이드 아래 노트 칸까지 들어가도록 높이를 900으로 둔다.
// 화면 언어는 브라우저 언어로 정해진다. 기존 시험은 한국어 문구로 판정하므로 한국어 브라우저로 연다(영어는 아래 i18n 시험).
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, locale: 'ko-KR' });
// 기존 시험은 접힌 한 줄 막대(⋯ 메뉴)와 900 높이 무대를 전제로 한다 — 이 창은 메뉴를 접은 채로 연다. 펼친 메뉴(기본값)는 아래 「펼친 메뉴」 시험이 새 창에서 본다(계획 _docs/20261105_06 3a).
const folded = (c) => c.addInitScript(() => { try { localStorage.setItem('he-menu', 'folded'); } catch (e) { /* 저장 불가 */ } });
await folded(ctx);
let p;
async function fresh() {
  p = await ctx.newPage(); p.on('pageerror', (e) => { results.pageErrors = (results.pageErrors || 0) + 1; console.log('페이지 오류', e.message.slice(0, 160)); });
  await p.goto(EDITOR); await p.setInputFiles('#openFile', deckPath);
  await p.waitForFunction(() => window.HE.S.doc && window.HE.slides().length > 0); await p.waitForTimeout(300);
}
const at = (sel) => p.evaluate((sel) => { const S = window.HE.S, e = S.doc.querySelector(sel), f = document.querySelector('#stage').getBoundingClientRect(), r = e.getBoundingClientRect(); return { x: f.left + r.left + r.width / 2, y: f.top + r.top + r.height / 2, k: window.HE.scaleOf(e) }; }, sel);
const clickEl = async (sel) => { const c = await at(sel); await p.mouse.click(c.x, c.y); await p.waitForTimeout(80); return c; };
const dbl = async (sel) => { const c = await at(sel); await p.mouse.dblclick(c.x, c.y); await p.waitForTimeout(80); };
const saved = async () => { const [d] = await Promise.all([p.waitForEvent('download'), p.click('#bSave')]); const f = join(work, 'out' + Date.now() + '.html'); await d.saveAs(f); return readFileSync(f, 'utf8'); };
const q = (html) => new (require2('dom'))(html);
function require2() { return class { constructor(h) { this.h = h; } has(s) { return this.h.includes(s); } }; }
const more = async (id) => { if (!(await p.isVisible(id))) { await p.click('#bMore'); await p.waitForTimeout(60); } await p.click(id); };
const delSlideOk = async () => { await more('#bSDel'); await p.waitForTimeout(80); await p.click('#dlgDel button.dgbtn'); };
const test = async (name, fn) => { try { const ok = await fn(); results[name] = !!ok; console.log(ok ? '통과' : '실패', name); } catch (e) { results[name] = false; console.log('실패', name, e.message.slice(0, 200)); } };

await fresh();
await test('저장본에 편집 흔적 없음', async () => { const h = await saved(); return !/data-he|he-style|he-cur|__HE_hook|contenteditable/.test(h) && h.includes('data-step="1"') && !h.includes('data-runtime'); });
await test('수정 없으면 본문이 원문과 같음', async () => { const h = await saved(); const norm = (s) => s.replace(/\s+/g, ' ').trim(); return norm(h).includes(norm('<h1 class="t">매출 <span class="em">증가</span> 보고</h1>')) && !/class="slide[^"]*he-cur/.test(h); });
await test('글자 수정이 강조 조각을 지킴', async () => { await dbl('h1.t'); await p.evaluate(() => { const S = window.HE.S, t = S.editing.firstChild, g = S.doc.createRange(); g.setStart(t, 0); g.setEnd(t, 2); const s = S.win.getSelection(); s.removeAllRanges(); s.addRange(g); }); await p.keyboard.type('이익'); await p.keyboard.press('Escape'); const h = await saved(); return h.includes('이익 <span class="em">증가</span>'); });
await test('되돌리기로 글자 복구', async () => { await p.click('#bUndo'); await p.waitForTimeout(80); const h = await saved(); return h.includes('매출 <span class="em">증가</span>'); });
await test('다시 하기', async () => { await p.click('#bRedo'); await p.waitForTimeout(80); const h = await saved(); await p.click('#bUndo'); return h.includes('이익'); });
await test('글자색', async () => { await clickEl('.box'); await p.evaluate(() => { const i = document.querySelector('#iColor'); i.value = '#1a9e5c'; i.dispatchEvent(new Event('change', { bubbles: true })); }); const h = await saved(); return /class="box" style="[^"]*color: rgb\(26, 158, 92\)/.test(h); });
await test('글자 크기', async () => { await clickEl('.box'); await p.fill('#iSize', '33'); await p.press('#iSize', 'Tab'); const h = await saved(); return /font-size: 33px/.test(h); });
const posOf = (sel) => p.evaluate((sel) => { const e = window.HE.S.doc.querySelector(sel), cs = window.HE.CS(e); return { l: parseFloat(cs.left), t: parseFloat(cs.top) }; }, sel);
const dragWith = async (sel, dx, dy, key) => { const c = await clickEl(sel); const a = await posOf(sel); await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(c.x + 5, c.y + 1, { steps: 2 }); if (key) await p.keyboard.down(key); await p.mouse.move(c.x + 5 + dx * c.k, c.y + 1 + dy * c.k, { steps: 6 }); await p.mouse.up(); if (key) await p.keyboard.up(key); const b2 = await posOf(sel); await p.evaluate(() => window.HE.undo()); await p.waitForTimeout(100); return { dx: b2.l - a.l, dy: b2.t - a.t }; };
await test('끌기: Shift면 가로로만', async () => { const r = await dragWith('.box', 60, 20, 'Shift'); return r.dx > 50 && Math.abs(r.dy) < 0.5; });
await test('끌기: Ctrl이면 1/5만 움직임', async () => { const r = await dragWith('.box', 100, 0, 'Control'); return r.dx > 15 && r.dx < 30; });
await test('포인터: 바탕 화살표, 개체 손, 고른 개체 잡는 손, 글자 입력 중 글자 커서', async () => { await clickEl('.box'); const a = await p.evaluate(() => { const d = window.HE.S.doc, cs = (s) => window.HE.CS(d.querySelector(s)).cursor; return cs('section#a') === 'default' && cs('.flow') === 'pointer' && cs('.box') === 'grab'; }); await dbl('.flow'); const t = await p.evaluate(() => window.HE.CS(window.HE.S.doc.querySelector('.flow')).cursor === 'text'); await p.keyboard.press('Escape'); await p.waitForTimeout(80); return a && t; });
await test('요소 끌어 옮기기(절대 위치)', async () => { const c = await clickEl('.box'); await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(c.x + 40 * c.k, c.y + 20 * c.k, { steps: 4 }); await p.mouse.up(); const h = await saved(); return /inset: 220(\.0)?px auto auto 100(\.0)?px/.test(h) || (/left: 100(\.0)?px/.test(h) && /top: 220(\.0)?px/.test(h)); });
await test('요소 끌어 옮기기(흐름 배치)', async () => { const c = await clickEl('.flow'); await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(c.x + 30 * c.k, c.y, { steps: 4 }); await p.mouse.up(); const h = await saved(); return /class="flow" style="[^"]*position: relative/.test(h); });
await test('요소 복제와 되돌리기', async () => { await clickEl('.flow'); await more('#bDup'); await p.waitForTimeout(80); const n = (await saved()).split('흐름 글자').length - 1; await p.click('#bUndo'); await p.waitForTimeout(80); const m = (await saved()).split('흐름 글자').length - 1; return n === 2 && m === 1; });
await test('맨 앞', async () => { await clickEl('.flow'); await more('#mArr'); await p.click('#bFront'); const h = await saved(); await p.click('#bUndo'); return /z-index: \d/.test(h); });
await test('여러 요소 왼쪽 맞춤', async () => { const a = await at('.box'); const c = await at('h1.t'); await p.mouse.click(a.x, a.y); await p.keyboard.down('Shift'); await p.mouse.click(c.x, c.y); await p.keyboard.up('Shift'); await more('#mArr'); await p.click('#bLeft'); await p.waitForTimeout(80); const same = await p.evaluate(() => { const S = window.HE.S, x = S.doc.querySelector('.box').getBoundingClientRect().left, y = S.doc.querySelector('h1.t').getBoundingClientRect().left; return Math.abs(x - y) < 1; }); await p.click('#bUndo'); return same; });
await test('그림 바꾸기', async () => { await clickEl('img'); await p.setInputFiles('#iImg', pngPath); await p.waitForTimeout(250); const h = await saved(); await p.click('#bUndo'); await p.waitForTimeout(80); return h.includes('object-fit: contain') && h.includes('mP8z/C/HgAGgwJ/'); });
await test('그림 추가', async () => { await p.setInputFiles('#iImgAdd', pngPath); await p.waitForTimeout(250); const h = await saved(); await p.click('#bUndo'); await p.waitForTimeout(80); return (h.match(/<img/g) || []).length === 2; });
await test('크기 손잡이', async () => { await clickEl('img'); await p.waitForTimeout(100); const g = await p.evaluate(() => { const e = document.querySelector('.hd[data-h="se"]').getBoundingClientRect(); return { x: e.left + 5, y: e.top + 5 }; }); await p.mouse.move(g.x, g.y); await p.mouse.down(); await p.mouse.move(g.x - 30, g.y - 30, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(80); const h = await saved(); return /<img[^>]*style="[^"]*width: 1\d\d(\.\d)?px/.test(h); });
await test('글상자 추가', async () => { await p.click('#bText'); await p.waitForTimeout(100); const h = await saved(); await p.click('#bUndo'); await p.waitForTimeout(80); const h2 = await saved(); return h.includes('글자 입력') && !h2.includes('글자 입력'); });
await test('표 칸 고치기·행 추가·열 삭제', async () => { await dbl('td'); await p.keyboard.press('ControlOrMeta+A'); await p.keyboard.type('값'); await p.keyboard.press('Escape'); await p.waitForTimeout(80); await more('#mTbl'); await p.click('#bRowAdd'); await p.waitForTimeout(60); const c = await at('td:nth-child(2)'); await p.mouse.click(c.x, c.y); await p.waitForTimeout(60); await more('#mTbl'); await p.click('#bColDel'); await p.waitForTimeout(60); const h = await saved(); const rows = (h.match(/<tr/g) || []).length, cells = (h.match(/<td/g) || []).length; return h.includes('값') && rows === 3 && cells === 3; });
await test('표 행·열 추가', async () => { const c = await at('td'); await p.mouse.click(c.x, c.y); await p.waitForTimeout(60); await more('#mTbl'); await p.click('#bColAdd'); await p.waitForTimeout(60); const h = await saved(); return (h.match(/<td/g) || []).length === 6; });
await test('요소 삭제와 되돌리기', async () => { await clickEl('.flow'); await p.click('#bDel'); const a = await saved(); await p.click('#bUndo'); await p.waitForTimeout(80); const c = await saved(); return !a.includes('흐름 글자') && c.includes('흐름 글자'); });
await test('숨은 단계 요소를 고를 수 있음', async () => { const c = await at('[data-step]'); await p.mouse.click(c.x, c.y); await p.waitForTimeout(60); return p.evaluate(() => window.HE.S.sel[0]?.hasAttribute('data-step')); });
await test('찾아 바꾸기', async () => { await p.evaluate(() => { document.querySelector('#fa').value = '둘째'; document.querySelector('#fb').value = '두번째'; document.querySelector('#dlg').showModal(); document.querySelector('#dlg button.go').click(); }); await p.waitForTimeout(100); const h = await saved(); return h.includes('두번째 장') && h.includes('두번째 상자'); });
await test('한글 입력 상태 단축키', async () => { const u = await p.evaluate(() => window.HE.S.undo.length); await p.locator('#stage').focus(); await p.evaluate(() => { const w = window.HE.S.win; w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ㅋ', code: 'KeyZ', ctrlKey: true, bubbles: true, cancelable: true })); }); await p.waitForTimeout(80); const v = await p.evaluate(() => window.HE.S.undo.length); return v === u - 1; });
await test('Delete: 바깥 창에 포커스가 있어도 고른 개체 삭제', async () => { await clickEl('img'); await p.locator('#status').click(); await p.keyboard.press('Delete'); await p.waitForTimeout(80); const gone = await p.evaluate(() => !window.HE.S.doc.querySelector('img')); await p.evaluate(() => window.HE.undo()); await p.waitForTimeout(80); return gone && await p.evaluate(() => !!window.HE.S.doc.querySelector('img')); });
await test('맞춤: 오른쪽·중간·아래쪽', async () => {
  const r = {}; for (const how of ['right', 'middle', 'bottom']) { await p.evaluate(() => { const S = window.HE.S; window.HE.setSel([S.doc.querySelector('.box'), S.doc.querySelector('h1.t')]); }); await more('#mArr'); await p.click('#b' + how[0].toUpperCase() + how.slice(1)); await p.waitForTimeout(60);
    r[how] = await p.evaluate((how) => { const S = window.HE.S, a = S.doc.querySelector('.box').getBoundingClientRect(), b = S.doc.querySelector('h1.t').getBoundingClientRect(); return how === 'right' ? Math.abs(a.right - b.right) < 1 : how === 'bottom' ? Math.abs(a.bottom - b.bottom) < 1 : Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2) < 1; }, how); await p.evaluate(() => window.HE.undo()); await p.waitForTimeout(60); }
  return r.right && r.middle && r.bottom;
});
await test('글자색: 클래스로 색을 받은 안쪽 글자도 바뀜 + 팔레트', async () => { await clickEl('h1.t'); await p.click('#bColor'); const n = await p.locator('#pal button').count(); await p.locator('#palBase button').nth(3).click(); const c = await p.evaluate(() => window.HE.CS(window.HE.S.doc.querySelector('h1.t .em')).color); const h = await saved(); await p.evaluate(() => window.HE.undo()); return n >= 2 && c === 'rgb(28, 96, 239)' && /class="em" style="color: rgb\(28, 96, 239\)/.test(h); });
await test('파일 이름 바꾸고 저장', async () => { await p.fill('#fname', '새이름'); await p.press('#fname', 'Enter'); const [d] = await Promise.all([p.waitForEvent('download'), p.click('#bSave')]); return d.suggestedFilename() === '새이름.html'; });
await test('코멘트: 저장 파일에 남고 다시 열면 핀이 보임 + AI용 글', async () => {
  await p.click('#bComment'); const c = await at('.box'); await p.mouse.click(c.x, c.y); await p.waitForTimeout(80); await p.fill('#popText', '상자 글자를 더 크게'); await p.click('#popOk');
  const pins = await p.locator('.pin').count(); const prompt = await p.evaluate(() => window.HE.aiPrompt()); const h = await saved();
  await p.keyboard.press('Escape'); const off = await p.evaluate(() => window.HE.S.mode !== 'comment');
  await p.evaluate((h) => window.HE.openText(h, 'x.html', new Map()), h); await p.waitForTimeout(500); const again = await p.evaluate(() => window.HE.S.comments.length); const pins2 = await p.locator('.pin').count();
  const clean = await p.evaluate(() => !window.HE.S.doc.getElementById('he-comments'));
  return pins === 1 && prompt.includes('상자 글자를 더 크게') && prompt.includes('「상자 글자」') && h.includes('id="he-comments"') && off && again === 1 && pins2 === 1 && clean;
});
await test('목록 접기(메뉴는 접힌 상태: 리본 숨김·접기 버튼 aria-expanded=false)', async () => { await p.click('#bSideFold'); const b = await p.isHidden('#side'); await p.click('#bSideOpen'); return b && await p.isVisible('#side') && await p.isHidden('#ribbon') && (await p.getAttribute('#bFold', 'aria-expanded')) === 'false'; });
await test('발표 보기: 탭이 아닌 화면 크기 새 창과 전체 화면 안내', async () => {
  const [w] = await Promise.all([ctx.waitForEvent('page'), p.click('#bView')]); await w.waitForLoadState(); const kit = await w.evaluate(() => !!document.getElementById('he-fs'));
  await w.mouse.click(10, 10); await w.waitForTimeout(150); const gone = await w.evaluate(() => !document.getElementById('he-fs'));
  const feat = await p.evaluate(() => { let f = ''; const o = window.open; window.open = (u, n, x) => { f = x || ''; return { focus() {} }; }; window.HE.presentView(); window.open = o; return f; });
  await w.close(); return kit && gone && /popup=yes/.test(feat) && /width=\d+/.test(feat) && !/fullscreen/.test(feat);
});
await test('발표 보기: 바깥 화면이 있으면 그 화면으로 옮기고 다음부터는 처음부터 그 화면에 전체 화면', async () => {
  const r = await p.evaluate(async () => {
    const main = { left: 0, top: 0, availLeft: 0, availTop: 25, availWidth: 1440, availHeight: 875 };
    const ext = { left: 1440, top: 0, availLeft: 1440, availTop: 0, availWidth: 1920, availHeight: 1080 };
    const o = window.open, g = window.getScreenDetails; const log = [];
    Object.defineProperty(screen, 'isExtended', { get: () => true, configurable: true });
    window.getScreenDetails = async () => ({ screens: [main, ext], currentScreen: main });
    window.open = (u, n, x) => { log.push(['open', x]); return { focus() {}, closed: false, moveTo: (a, b) => log.push(['move', a, b]), resizeTo: (a, b) => log.push(['size', a, b]) }; };
    window.HE.presentView(); await new Promise((s) => setTimeout(s, 50));
    window.HE.presentView();
    window.open = o; window.getScreenDetails = g; delete screen.isExtended; return log;
  });
  const [a, mv, sz, b] = r;
  return a[0] === 'open' && !/fullscreen/.test(a[1]) && mv && mv[1] === 1440 && sz && sz[1] === 1920
    && b && b[0] === 'open' && /left=1440/.test(b[1]) && /width=1920/.test(b[1]) && /fullscreen/.test(b[1]);
});
await fresh();
await test('발표자 노트: 적으면 저장 파일의 그 장에 남고 되돌리기로 지워짐', async () => {
  await p.click('#notesIn'); await p.keyboard.type('여기서 질문 받기'); const html = await saved();
  const kept = /<section[^>]*id="a"[^>]*data-speaker-notes="여기서 질문 받기"|data-speaker-notes="여기서 질문 받기"[^>]*id="a"/.test(html);
  await p.click('#bUndo'); await p.waitForTimeout(100);
  const gone = await p.evaluate(() => window.HE.noteOf(0) === '' && document.querySelector('#notesIn').value === '');
  return kept && gone;
});
await test('발표자 창: 두 창이 같은 장으로 넘어가고 노트가 보이며 청중 창을 닫으면 편집으로', async () => {
  await p.evaluate(() => window.HE.setNote(1, '둘째 노트'));
  const [w] = await Promise.all([ctx.waitForEvent('page'), p.click('#bView')]); await w.waitForLoadState(); await w.mouse.click(10, 10); await p.waitForTimeout(500);
  const open = await p.isVisible('#pv');
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(700);
  const a = await w.evaluate(() => window.__sc()); const pg = await p.textContent('#pvPage'); const nt = await p.textContent('#pvNotes');
  await w.keyboard.press('ArrowRight'); await p.waitForTimeout(700); const pg2 = await p.textContent('#pvPage');
  const rail = await p.frameLocator('#pvRail').locator('.he-card').count();
  if (capDir) { mkdirSync(capDir, { recursive: true }); await p.screenshot({ path: join(capDir, '구현_발표자창.png') }); }
  const keptSel = await p.evaluate(() => window.HE.slides().length);
  await w.close(); await p.waitForTimeout(900); const back = await p.isHidden('#pv'); const cur = await p.evaluate(() => window.HE.S.cur);
  await p.click('#bUndo'); await p.waitForTimeout(100);
  return open && a === 1 && pg === '2 / 3' && nt === '둘째 노트' && pg2 === '3 / 3' && rail === 3 && keptSel === 3 && back && cur === 2;
});
await fresh();
await test('장 복제·뒤로·삭제와 되돌리기', async () => { await more('#bSDup'); await p.waitForTimeout(500); const n = await p.evaluate(() => window.HE.slides().length); await more('#bSNext'); await p.waitForTimeout(500); await delSlideOk(); await p.waitForTimeout(500); const m = await p.evaluate(() => window.HE.slides().length); await p.click('#bUndo'); await p.waitForTimeout(500); const k = await p.evaluate(() => window.HE.slides().length); return n === 4 && m === 3 && k === 4; });
await test('여러 장 보기 끌어 순서 변경', async () => { await p.click('#bGrid'); await p.waitForTimeout(500); const G = p.frameLocator('#gridFrame'); const cards = await G.locator('.he-card').count(); if (capDir) { mkdirSync(capDir, { recursive: true }); await p.screenshot({ path: join(capDir, '구현_여러장.png') }); } await G.locator('.he-card').nth(0).dragTo(G.locator('.he-card').nth(2)); await p.waitForTimeout(800); const first = await p.evaluate(() => window.HE.slides().map((s) => s.textContent.trim().slice(0, 8))); await p.click('#gridClose'); return cards === 4 && !first[0].startsWith('매출'); });
await test('여러 장 보기: Ctrl+Z로 순서 변경 취소·Ctrl+Y로 다시', async () => {
  const order = () => p.evaluate(() => window.HE.slides().map((s) => s.textContent.trim().slice(0, 4)).join('|'));
  await p.click('#bGrid'); await p.waitForTimeout(500); const G = p.frameLocator('#gridFrame');
  const a = await order(); await G.locator('.he-card').nth(0).dragTo(G.locator('.he-card').nth(1)); await p.waitForTimeout(800); const b2 = await order();
  await G.locator('#he-wrap').focus().catch(() => {}); await p.frameLocator('#gridFrame').locator('body').press('Control+z'); await p.waitForTimeout(900); const c2 = await order();
  await p.frameLocator('#gridFrame').locator('body').press('Control+y'); await p.waitForTimeout(900); const d2 = await order(); const open = await p.evaluate(() => document.querySelector('#grid').classList.contains('open'));
  await p.click('#gridClose'); return a !== b2 && c2 === a && d2 === b2 && open;
});
await test('여러 장 보기: 덱의 같은 이름 클래스가 틀에 안 입혀지고 스크롤됨', async () => {
  await p.evaluate(() => { const d = window.HE.S.doc; const st = d.createElement('style'); st.id = 'tst'; st.textContent = '.card,.num{background:rgb(1,2,3)!important;padding:40px}html,body{overflow:hidden}'; d.head.appendChild(st); });
  await p.click('#bGrid'); await p.waitForTimeout(600);
  const ok = await p.evaluate(() => { const dd = document.querySelector('#gridFrame').contentDocument, c = dd.querySelector('.he-card'), n = dd.querySelector('.he-num'); return getComputedStyle(c).backgroundColor !== 'rgb(1, 2, 3)' && getComputedStyle(n).backgroundColor !== 'rgb(1, 2, 3)' && getComputedStyle(dd.body).overflow === 'auto'; });
  await p.click('#gridClose'); await p.evaluate(() => window.HE.S.doc.getElementById('tst').remove()); return ok;
});
await fresh();
if (capDir) { // 상태별 캡처
  mkdirSync(capDir, { recursive: true });
  await clickEl('h1.t'); await p.waitForTimeout(150); await p.screenshot({ path: join(capDir, '구현_글자선택.png') });
  await clickEl('img'); await p.waitForTimeout(150); await p.screenshot({ path: join(capDir, '구현_그림선택.png') });
  await clickEl('td'); await p.waitForTimeout(150); await p.screenshot({ path: join(capDir, '구현_표선택.png') });
}
// 겹친 요소: 그림 위 글자, 글자를 덮은 그림
{
  const PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==';
  const over = join(work, 'over.html');
  writeFileSync(over, `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}.slide{position:relative;width:1000px;height:560px;overflow:hidden}.a{position:absolute}</style></head><body><section class="slide" id="o"><img id="bg" class="a" src="${PX}" style="left:0;top:0;width:500px;height:300px"><div id="ontop" class="a" style="left:100px;top:100px;width:200px;height:60px;font-size:30px">위 글자</div><div id="under" class="a" style="left:600px;top:100px;width:200px;height:60px;font-size:30px">덮인 글자</div><img id="cover" class="a" src="${PX}" style="left:580px;top:80px;width:260px;height:120px"></section></body></html>`);
  const q2 = await ctx.newPage(); q2.on('pageerror', (e) => { results.pageErrors = (results.pageErrors || 0) + 1; console.log('페이지 오류', e.message.slice(0, 160)); });
  await q2.goto(EDITOR); await q2.setInputFiles('#openFile', over);
  await q2.waitForFunction(() => window.HE.S.doc && window.HE.slides().length > 0); await q2.waitForTimeout(500);
  const at = (id) => q2.evaluate((id) => { const f = document.querySelector('#stage').getBoundingClientRect(), r = window.HE.S.doc.getElementById(id).getBoundingClientRect(); return { x: f.left + r.left + r.width / 2, y: f.top + r.top + r.height / 2 }; }, id);
  const selected = () => q2.evaluate(() => window.HE.S.sel[0]?.id || null);
  const c = await at('ontop');
  await q2.mouse.click(c.x, c.y); await q2.waitForTimeout(500);
  const first = await selected();
  await q2.mouse.click(c.x, c.y); await q2.waitForTimeout(500);
  const second = await selected();
  results['겹침: 다시 누르면 아래 그림'] = first === 'ontop' && second === 'bg';
  await q2.mouse.move(c.x, c.y); await q2.mouse.down(); await q2.mouse.move(c.x + 20, c.y + 20, { steps: 4 }); await q2.mouse.move(c.x + 40, c.y + 40, { steps: 4 }); await q2.mouse.up(); await q2.waitForTimeout(150);
  const moved = await q2.evaluate(() => { const d = window.HE.S.doc; return { bg: d.getElementById('bg').style.left, top: d.getElementById('ontop').style.left, sel: window.HE.S.sel[0]?.id }; });
  results['겹침: 아래 그림을 끌어 옮김'] = moved.sel === 'bg' && moved.bg !== '0px' && moved.top === '100px';
  await q2.waitForTimeout(500);
  const u = await at('under');
  await q2.mouse.dblclick(u.x, u.y); await q2.waitForTimeout(200);
  results['겹침: 더블클릭은 덮인 글자'] = await q2.evaluate(() => window.HE.S.editing?.id === 'under');
  await q2.keyboard.press('Escape'); await q2.close();
  for (const k of ['겹침: 다시 누르면 아래 그림', '겹침: 아래 그림을 끌어 옮김', '겹침: 더블클릭은 덮인 글자']) console.log(results[k] ? '통과' : '실패', k);
  // 글자 아래 글자: 다시 눌러 내려간 글자를 더블클릭하면 맨 위 글자가 아니라 그 글자를 고친다.
  const stack = join(work, 'stack.html');
  writeFileSync(stack, `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}.slide{position:relative;width:1000px;height:560px;overflow:hidden}.a{position:absolute;left:100px;top:100px;width:300px;height:80px;font-size:30px}</style></head><body><section class="slide" id="o"><div id="lo" class="a">아래 글자</div><div id="hi" class="a">위 글자</div></section></body></html>`);
  const q3 = await ctx.newPage(); q3.on('pageerror', (e) => { results.pageErrors = (results.pageErrors || 0) + 1; console.log('페이지 오류', e.message.slice(0, 160)); });
  await q3.goto(EDITOR); await q3.setInputFiles('#openFile', stack);
  await q3.waitForFunction(() => window.HE.S.doc && window.HE.slides().length > 0); await q3.waitForTimeout(500);
  const m = await q3.evaluate(() => { const f = document.querySelector('#stage').getBoundingClientRect(), r = window.HE.S.doc.getElementById('lo').getBoundingClientRect(); return { x: f.left + r.left + r.width / 2, y: f.top + r.top + r.height / 2 }; });
  await q3.mouse.click(m.x, m.y); await q3.waitForTimeout(500);
  const hint = await q3.textContent('#msg');
  results['겹침: 안내를 상태 칸에 띄움'] = hint.includes('아래 요소');
  await q3.mouse.click(m.x, m.y); await q3.waitForTimeout(500);
  const low = await q3.evaluate(() => window.HE.S.sel[0]?.id);
  await q3.mouse.dblclick(m.x, m.y); await q3.waitForTimeout(200);
  results['겹침: 내려간 글자를 더블클릭하면 그 글자'] = low === 'lo' && await q3.evaluate(() => window.HE.S.editing?.id === 'lo');
  await q3.keyboard.press('Escape'); await q3.close();
  // 고른 적 없는 자리의 더블클릭은 지금처럼 그 자리 맨 위 글자다.
  const q4 = await ctx.newPage(); await q4.goto(EDITOR); await q4.setInputFiles('#openFile', stack);
  await q4.waitForFunction(() => window.HE.S.doc && window.HE.slides().length > 0); await q4.waitForTimeout(500);
  await q4.mouse.dblclick(m.x, m.y); await q4.waitForTimeout(200);
  results['겹침: 처음 더블클릭은 맨 위 글자'] = await q4.evaluate(() => window.HE.S.editing?.id === 'hi');
  await q4.close();
  for (const k of ['겹침: 안내를 상태 칸에 띄움', '겹침: 내려간 글자를 더블클릭하면 그 글자', '겹침: 처음 더블클릭은 맨 위 글자']) console.log(results[k] ? '통과' : '실패', k);
}
// 주소로 여는 경우: 발표 중 편집과 처음 장 지정. 주소가 없으면 그대로인지도 본다.
{
  const q5 = await ctx.newPage(); q5.on('pageerror', (e) => { results.pageErrors = (results.pageErrors || 0) + 1; console.log('페이지 오류', e.message.slice(0, 160)); });
  await q5.goto(EDITOR + '?live=1&slide=b'); await q5.setInputFiles('#openFile', deckPath);
  await q5.waitForFunction(() => window.HE.S.doc && window.HE.slides().length > 0); await q5.waitForTimeout(500);
  results['주소: slide로 그 장을 연다'] = await q5.evaluate(() => window.HE.slides()[window.HE.S.cur]?.id === 'b');
  results['주소: live면 장 버튼이 꺼진다'] = await q5.evaluate(() => ['#bSDup', '#bSPrev', '#bSNext', '#bSDel'].every((s) => document.querySelector(s).disabled));
  results['주소: live면 돌아가기 문구'] = (await q5.textContent('#viewLabel')).replace(/\s/g, '') === '발표복귀';
  const n0 = await q5.evaluate(async () => { await window.HE.dupSlide(); return window.HE.slides().length; });
  results['주소: live면 장 복제가 안 된다'] = n0 === 3;
  let chooser = 0; q5.on('filechooser', () => { chooser += 1; });
  await q5.click('#bImgAdd'); await q5.waitForTimeout(300);
  results['주소: live면 파일 창을 열지 않고 붙여넣기 안내'] = chooser === 0 && (await q5.textContent('#msg')).includes('Ctrl+V');
  console.log(results['주소: live면 파일 창을 열지 않고 붙여넣기 안내'] ? '통과' : '실패', '주소: live면 파일 창을 열지 않고 붙여넣기 안내');
  await q5.close();
  const q6 = await ctx.newPage(); await q6.goto(EDITOR);
  results['주소 없음: 발표 보기 그대로'] = (await q6.textContent('#viewLabel')).replace(/\s/g, '') === '발표보기' && await q6.evaluate(() => !document.querySelector('#bSDup').disabled);
  await q6.close();
  // 서버가 실패로 답하면 완료로 보이지 않고 변경 표시가 남는다. 알림도 가지 않는다.
  const q7 = await ctx.newPage();
  await q7.goto(EDITOR + '?deck=%2Fx&live=1'); await q7.setInputFiles('#openFile', deckPath);
  await q7.waitForFunction(() => window.HE.S.doc && window.HE.slides().length > 0); await q7.waitForTimeout(300);
  const failed2 = await q7.evaluate(async () => {
    const H = window.HE, S = H.S; S.server = true; S.dirty = 2; let told = 0;
    const c = new BroadcastChannel('deck-sync:/x'); c.onmessage = () => { told += 1; };
    const real = window.fetch; window.fetch = async () => new Response(JSON.stringify({ error: '조립 중단: 시험' }), { status: 500 });
    await H.save(); window.fetch = real; await new Promise((r) => setTimeout(r, 100));
    return { dirty: S.dirty, msg: document.querySelector('#msg').textContent, state: document.querySelector('#stateText').textContent, told };
  });
  results['저장 실패: 변경 표시 유지와 이유'] = failed2.dirty === 2 && failed2.msg.includes('조립 중단: 시험') && failed2.state.includes('저장 안 된') && failed2.told === 0;
  // 사이트 파일: 받은 덱 외에 밖으로 나가는 요청이 없다.
  execSync('node build-single.mjs', { cwd: HERE });
  const q8 = await ctx.newPage(); const out = []; q8.on('request', (r) => { if (/^https?:/.test(r.url())) out.push(r.url()); });
  await q8.goto(pathToFileURL(join(HERE, 'public/index.html')).href); await q8.setInputFiles('#openFile', deckPath);
  await q8.waitForFunction(() => window.HE.S.doc && window.HE.slides().length > 0); await q8.waitForTimeout(300);
  results['사이트 파일: 외부 요청 없음'] = out.length === 0; if (out.length) console.log(out.slice(0, 5));
  await q8.close();
  for (const k of ['주소: slide로 그 장을 연다', '주소: live면 장 버튼이 꺼진다', '주소: live면 돌아가기 문구', '주소: live면 장 복제가 안 된다', '주소 없음: 발표 보기 그대로', '저장 실패: 변경 표시 유지와 이유', '사이트 파일: 외부 요청 없음']) console.log(results[k] ? '통과' : '실패', k);
  await q7.close();
}
// ---- 2026-11-05 한 줄 막대·빈 코멘트·장 삭제 확인·모아보기 세로선·무대 비율·PDF(계획 _docs/20261105_04_미니멀편집-공유-PDF_계획_초안.md)
{
  const { inflateSync } = createRequire(import.meta.url)('node:zlib');
  const shot = async (pg, name) => { if (capDir) { mkdirSync(capDir, { recursive: true }); await pg.screenshot({ path: join(capDir, name) }); } };
  // PDF의 쪽 수·쪽 크기(pt)·쪽마다 풀어 낸 그리기 명령
  const pdfInfo = (buf) => { const s = buf.toString('latin1'); const boxes = [...s.matchAll(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/g)].map((m) => [+m[1], +m[2]]); const streams = []; for (const m of s.matchAll(/stream\r?\n/g)) { const st = m.index + m[0].length, en = s.indexOf('endstream', st); try { streams.push(inflateSync(Buffer.from(s.slice(st, en), 'latin1')).toString('latin1')); } catch (e) { /* 압축 안 된 줄기 */ } } return { pages: (s.match(/\/Type\s*\/Page[^s]/g) || []).length, boxes, ops: streams.join('\n') }; };
  await fresh();
  await test('막대: 리본 기능 버튼이 막대나 ⋯ 메뉴에 모두 있음', async () => p.evaluate(() => ['bUndo', 'bRedo', 'bFind', 'bBold', 'bColor', 'bSize', 'bAlignL', 'bAlignC', 'bAlignR', 'bText', 'bDup', 'mArr', 'bFront', 'bBack', 'bLeft', 'bCenter', 'bRight', 'bTop', 'bMiddle', 'bBottom', 'bDel', 'bImg', 'bImgAdd', 'mTbl', 'bRowAdd', 'bColAdd', 'bRowDel', 'bColDel', 'bGrid', 'bSDup', 'bSPrev', 'bSNext', 'bSteps', 'bSDel', 'bComment', 'bAI', 'bView', 'bSave', 'bSaveMenu', 'bSave2', 'bSaveAs', 'bPdf', 'bOpenOther', 'bShare', 'bShareSave', 'bGuide', 'chkHandoff'].every((id) => { const e = document.getElementById(id); return !!e && !!e.closest('#title'); })));
  await test('막대: 아이콘 누름 영역 40px 이상·이름 있음', async () => p.evaluate(() => [...document.querySelectorAll('#bar .ib')].every((b) => { const r = b.getBoundingClientRect(); const named = (b.getAttribute('aria-label') || '').trim() || b.querySelector('input[aria-label]'); return r.width >= 40 && r.height >= 40 && !!named; })));
  await test('막대: 굵게 켜짐 표시', async () => { await clickEl('.box'); const off = await p.getAttribute('#bBold', 'aria-pressed'); await p.click('#bBold'); await p.waitForTimeout(80); const on = await p.getAttribute('#bBold', 'aria-pressed'); await p.click('#bUndo'); await p.waitForTimeout(80); return off === 'false' && on === 'true'; });
  await test('막대: ⋯ 안 하위 메뉴를 열어도 ⋯ 메뉴는 열린 채', async () => { await clickEl('.box'); await p.click('#bMore'); await p.click('#mArr'); await p.waitForTimeout(80); const ok = await p.evaluate(() => document.querySelector('#moreMenu').classList.contains('open') && document.querySelector('#arrMenu').classList.contains('open') && document.querySelector('#bMore').getAttribute('aria-expanded') === 'true'); await shot(p, 'more_order_1280.png'); await p.mouse.click(5, 895); return ok; });
  await test('코멘트: 글 없이 세 곳을 눌러도 핀은 하나, Esc 뒤 0', async () => {
    await p.click('#bComment'); const f = await p.$eval('#stage', (e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    for (const [a, c] of [[0.5, 0.5], [0.3, 0.4], [0.7, 0.6]]) { await p.mouse.click(f.x + f.w * a, f.y + f.h * c); await p.waitForTimeout(150); }
    const n1 = await p.$$eval('.pin', (x) => x.length); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    const n2 = await p.$$eval('.pin', (x) => x.length), badge = await p.isHidden('#cCount');
    if (await p.evaluate(() => window.HE.S.mode === 'comment')) await p.click('#bComment');
    return n1 <= 1 && n2 === 0 && badge;
  });
  await test('코멘트: 말풍선 윗줄은 「코멘트 N」만, 핀은 이름 있는 버튼, AI용 글에는 위치 그대로', async () => {
    await p.click('#bComment'); const c = await at('.box'); await p.mouse.click(c.x, c.y); await p.waitForTimeout(150); await p.fill('#popText', '시험 코멘트');
    const who = await p.textContent('#popWho'); await shot(p, 'comment_1280.png'); await p.click('#popOk'); await p.waitForTimeout(100);
    const ai = await p.evaluate(() => window.HE.aiPrompt()), pinBtn = await p.$eval('.pin', (e) => e.tagName === 'BUTTON' && !!e.getAttribute('aria-label'));
    await p.click('#bComment'); await p.evaluate(() => { for (const cm of [...window.HE.S.comments]) window.HE.delComment(cm.id); });
    return who.trim() === '코멘트 1' && !/장|%/.test(who) && /%/.test(ai) && ai.includes('시험 코멘트') && pinBtn;
  });
  await test('장 삭제: 확인 창 — 취소면 그대로, 삭제면 한 장 줄고 되돌리기로 복구', async () => {
    const n0 = await p.evaluate(() => window.HE.slides().length); await more('#bSDel'); await p.waitForTimeout(100); await shot(p, 'del_confirm_1280.png');
    const open = await p.evaluate(() => document.querySelector('#dlgDel').open); await p.click('#dlgDel button[value=no]'); await p.waitForTimeout(300);
    const n1 = await p.evaluate(() => window.HE.slides().length); await delSlideOk(); await p.waitForTimeout(600);
    const n2 = await p.evaluate(() => window.HE.slides().length); await p.click('#bUndo'); await p.waitForTimeout(600); const n3 = await p.evaluate(() => window.HE.slides().length);
    return open && n1 === n0 && n2 === n0 - 1 && n3 === n0;
  });
  await test('모아보기: 둘째 카드 오른쪽 절반에 놓으면 첫 장이 둘째로, 그 사이에 세로선', async () => {
    const order = () => p.evaluate(() => window.HE.slides().map((s) => s.id).join(','));
    const a = await order(); await p.click('#bGrid'); await p.waitForTimeout(700);
    const fire = (type) => p.evaluate((type) => { const dd = document.querySelector('#gridFrame').contentDocument, cs = dd.querySelectorAll('.he-card'), r = cs[1].getBoundingClientRect(), dt = new DataTransfer(); dt.setData('text/plain', '0'); if (type === 'dragstart') cs[0].dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt })); else cs[1].dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, clientX: r.left + r.width * 0.8, clientY: r.top + 20, dataTransfer: dt })); return cs[1].classList.contains('ins-r'); }, type);
    await fire('dragstart'); const line = await fire('dragover'); await shot(p, 'grid_drag_1280.png'); await fire('drop'); await p.waitForTimeout(900);
    const b2 = await order(); await p.click('#gridClose'); await p.click('#bUndo'); await p.waitForTimeout(600);
    const [x, y, ...rest] = a.split(','); return line && b2 === [y, x, ...rest].join(',');
  });
  await test('무대: 장 크기가 px로 고정된 덱은 장 비율(1000×560)', async () => p.evaluate(() => { const r = document.querySelector('#stage').getBoundingClientRect(); return Math.abs(r.width / r.height - 1000 / 560) < 0.02; }));
  await test('PDF: 덱 — 쪽 수 = 장 수, 쪽 크기 = 장 크기(여백 0), 스크립트·인라인 이벤트·외부 요청 없음', async () => {
    await p.evaluate(() => window.HE.S.doc.querySelector('.box').setAttribute('onclick', 'fetch("https://example.com/x")'));
    const html = await p.evaluate(() => window.HEUI_printDoc()); await p.evaluate(() => window.HE.S.doc.querySelector('.box').removeAttribute('onclick'));
    const pp = await ctx.newPage(); const reqs = []; pp.on('request', (r) => { if (/^https?:/.test(r.url())) reqs.push(r.url()); });
    await pp.setContent(html); await pp.waitForTimeout(300); const buf = await pp.pdf({ preferCSSPageSize: true, printBackground: false }); await pp.close();
    const info = pdfInfo(buf), n = await p.evaluate(() => window.HE.slides().length);
    const sized = info.boxes.length === n && info.boxes.every(([w, h]) => Math.abs(w - 750) < 1 && Math.abs(h - 420) < 1); // 1000×560px = 750×420pt
    const body = html.replace(/<style[\s\S]*?<\/style>/g, '');
    return info.pages === n && sized && !/<script/i.test(body) && !/ onclick=/i.test(html) && html.indexOf('Content-Security-Policy') < html.indexOf('<section') && reqs.length === 0;
  });
  await test('PDF: Ctrl+P — 바깥 화면·편집 틀 안·글자 입력 중 모두 같은 인쇄 문서로', async () => {
    const calls = []; await p.exposeFunction('__pdfCall', (h) => { calls.push(h); });
    await p.evaluate(() => { const real = window.HEUI_printDoc; window.HEUI_printDoc = real; HTMLIFrameElement.prototype.__p = 1; const orig = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow').get; Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', { configurable: true, get() { const w = orig.call(this); if (this.id === 'printFrame' && w) { try { w.print = () => window.__pdfCall(this.srcdoc.length); } catch (e) { /* 무시 */ } } return w; } }); });
    const want = (await p.evaluate(() => window.HEUI_printDoc())).length;
    await p.mouse.click(5, 895); await p.keyboard.press('ControlOrMeta+p'); await p.waitForTimeout(600);
    await clickEl('.box'); await p.evaluate(() => window.HE.S.win.focus()); await p.keyboard.press('ControlOrMeta+p'); await p.waitForTimeout(600);
    await dbl('.flow'); await p.keyboard.press('ControlOrMeta+p'); await p.waitForTimeout(600); await p.keyboard.press('Escape');
    const other = await p.evaluate(() => document.querySelector('#saveMenu').contains(document.querySelector('#bPdf')));
    return calls.length === 3 && calls.every((l) => Math.abs(l - want) < 200) && other;
  });
  if (capDir) { // 계획 「화면 검수」 표의 구현 캡처(편집 화면은 예시 덱으로)
    const e = await ctx.newPage(); await e.goto(EDITOR); await e.click('#bExample'); await e.waitForFunction(() => window.HE.S.doc && window.HE.slides().length > 0); await e.waitForTimeout(800);
    await shot(e, 'editor_1280.png');
    const sel = await e.evaluate(() => { const d = window.HE.S.doc, el = d.querySelector('h1.t') || d.querySelector('[data-demo="title"]'), f = document.querySelector('#stage').getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: f.left + r.left + r.width / 2, y: f.top + r.top + r.height / 2 }; });
    await e.mouse.click(sel.x, sel.y); await e.waitForTimeout(200); await shot(e, 'selected_1280.png');
    await e.click('#bColor'); await e.waitForTimeout(150); await shot(e, 'color_menu_1280.png'); await e.mouse.click(5, 895);
    await e.click('#bMore'); await e.waitForTimeout(150); await shot(e, 'more_1280.png'); await e.mouse.click(5, 895);
    await e.click('#bShare'); await e.waitForTimeout(150); await shot(e, 'share_1280.png'); await e.mouse.click(5, 895);
    await e.click('#bSaveMenu'); await e.waitForTimeout(150); await shot(e, 'savemenu_1280.png'); await e.mouse.click(5, 895);
    for (const [i, name] of [[1, 'example_s2_1280.png'], [2, 'example_s3_1280.png']]) { await e.evaluate((i) => window.HE.goTo(i), i); await e.waitForTimeout(500); await shot(e, name); }
    await e.close();
    const t = await ctx.newPage(); await t.goto(EDITOR); await t.setInputFiles('#openFile', deckPath); await t.waitForFunction(() => window.HE.S.doc && window.HE.slides().length > 0); await t.waitForTimeout(400);
    const td = await t.evaluate(() => { const d = window.HE.S.doc, el = d.querySelector('td'), f = document.querySelector('#stage').getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: f.left + r.left + r.width / 2, y: f.top + r.top + r.height / 2 }; });
    await t.mouse.click(td.x, td.y); await t.waitForTimeout(150); await t.click('#bMore'); await t.click('#mTbl'); await t.waitForTimeout(150); await shot(t, 'more_table_1280.png'); await t.close();
    const en = await b.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1.25, locale: 'en-US' }); // 캡처 폭 1280 = 화면 검수 기준 폭
    await folded(en);
    const ep = await en.newPage(); await ep.goto(EDITOR + '?lang=en'); await ep.click('#bExample'); await ep.waitForTimeout(900); await shot(ep, 'editor_1024_en.png');
    await en.close();
  }
  // 막대 한 줄 지키기(접힌 상태): 1024·1280 폭, 한국어·영어에서 막대 요소끼리 겹치지 않고 제목 막대 높이가 한 줄(52px 안팎)
  for (const [w, lang] of [[1024, 'en'], [1024, 'ko'], [1280, 'en'], [1280, 'ko']]) {
    const c2 = await b.newContext({ viewport: { width: w, height: 768 }, locale: lang === 'en' ? 'en-US' : 'ko-KR' }); await folded(c2); const pg = await c2.newPage(); await pg.goto(EDITOR + '?lang=' + lang); await pg.click('#bExample'); await pg.waitForTimeout(900);
    const fit = await pg.evaluate(() => { const vis = [...document.querySelectorAll('#title > *, #bar > *, #bar .bgrp > *, #bar .menuwrap > .ib')].filter((e) => e.offsetWidth > 0 && !e.classList.contains('menu') && e.id !== 'bar' && !e.classList.contains('bgrp')); const rs = vis.filter((e) => e.parentElement.id === 'title' || e.closest('#bar')).filter((e) => !(e.classList.contains('menuwrap') && e.closest('#bar'))).map((e) => e.getBoundingClientRect()); let overlap = false; for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i], b2 = rs[j]; if (a.left < b2.right - 1 && b2.left < a.right - 1 && a.top < b2.bottom - 1 && b2.top < a.bottom - 1) overlap = true; } const t = document.querySelector('#title').getBoundingClientRect(); return { overlap, h: t.height, sw: document.documentElement.scrollWidth <= innerWidth }; });
    // 긴 파일 이름(완료 검수 1차 지적): 이름 칸이 남은 자리까지만 넓어져 ⋯·저장 버튼 가운데를 누르면 그 버튼이 눌린다
    await pg.fill('#fname', '2026년_3분기_성과보고_최종_공유용_슬라이드_수정본_최종최종'); await pg.waitForTimeout(150);
    const hit = await pg.evaluate(() => ['bMore', 'bSave', 'bShare', 'bView'].every((id) => { const e = document.getElementById(id), r = e.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return top && (top === e || e.contains(top)); }) && document.querySelector('#title').getBoundingClientRect().height <= 56);
    results[`막대: ${w} ${lang} 한 줄·겹침 없음(긴 파일 이름 포함)`] = !fit.overlap && fit.h <= 56 && fit.sw && hit; await c2.close();
  }
  await ribbonTests(shot);
  // 예시 덱(1920×1080 고정) 무대 16:9, 창을 따르는 덱(100vw·90vw)은 무대 그대로
  {
    const e = await ctx.newPage(); await e.goto(EDITOR); await e.click('#bExample'); await e.waitForFunction(() => window.HE.S.doc && window.HE.slides().length > 0); await e.waitForTimeout(800);
    const r1 = await e.evaluate(() => { const r = document.querySelector('#stage').getBoundingClientRect(); return r.width / r.height; });
    const free = async (html) => { await e.evaluate((h) => window.HE.openText(h, 'v.html', new Map()), html); await e.waitForTimeout(700); return e.evaluate(() => { const s = document.querySelector('#stage').getBoundingClientRect(), w = document.querySelector('#stageWrap').getBoundingClientRect(); return { fill: Math.abs(s.width - w.width) <= 2 && Math.abs(s.height - w.height) <= 2, ratio: window.HE.slideRatio() }; }); };
    // 20261109_03: 무대를 스크롤 칸(#stageWrap)에 담고 맞춤 크기를 늘 지정하므로, 「창을 따르는 덱」은 칸을 꽉 채우는지로 본다(옛 판정: 크기 미지정)
    const demo = await free(readFileSync(join(HERE, 'tools/demo-deck.html'), 'utf8'));
    const vw = await free('<!doctype html><html><head><style>body{margin:0}.slide{width:90vw;height:50vw;display:none}.slide:first-of-type{display:block}</style></head><body><section class="slide"><h1>A</h1></section><section class="slide"><h1>B</h1></section></body></html>');
    results['무대: 예시 덱은 16:9, 창을 따르는 덱(100vw·90vw)은 그대로'] = r1 > 1.76 && r1 < 1.79 && demo.fill && demo.ratio === 0 && vw.fill && vw.ratio === 0;
    // 예시 덱 PDF: 2장(남색 바탕)이 배경 출력을 끈 채로도 남색으로 칠해진다(print-color-adjust), 쪽 크기 = 1920×1080px
    await e.evaluate(() => window.HE.openText(window.HE_EXAMPLE, 'ex.html', new Map())); await e.waitForTimeout(800);
    const html = await e.evaluate(() => window.HEUI_printDoc()); const pp = await ctx.newPage(); await pp.setContent(html); await pp.waitForTimeout(300);
    const buf = await pp.pdf({ preferCSSPageSize: true, printBackground: false }); if (capDir) writeFileSync(join(capDir, 'example.pdf'), buf); await pp.close();
    const info = pdfInfo(buf);
    // 남색(#0A2548 = .0392 .1451 .2824)은 1장 제목 글자에도 쓰여, 색 보존 규칙을 뺀 같은 문서와 비교한다 — 규칙이 있을 때만 바탕 칠하기가 더 생겨야 한다
    const navy = (ops) => (ops.match(/(^|\s)0?\.0392\d* 0?\.1451\d* 0?\.2824\d* rg/g) || []).length;
    const pq = await ctx.newPage(); await pq.setContent(html.replace('*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}', '')); await pq.waitForTimeout(300);
    const plain = pdfInfo(await pq.pdf({ preferCSSPageSize: true, printBackground: false })); await pq.close();
    results['PDF: 예시 덱 3쪽·1920×1080·남색 바탕 장이 배경 출력 꺼도 칠해짐'] = info.pages === 3 && info.boxes.every(([w, h]) => Math.abs(w - 1440) < 1 && Math.abs(h - 810) < 1) && navy(info.ops) > navy(plain.ops);
    await e.close();
  }
  // 문서(A4·구역) PDF는 test-docs.mjs
  await p.close();
}

// 펼친 메뉴(계획 _docs/20261105_06): 처음 열면 펼친 메뉴, 「메뉴 접기」로 한 줄 막대, 기억, 키보드, 하위 메뉴 자리, 좁은 폭
async function ribbonTests(shot) {
  const IDS = ['bUndo', 'bRedo', 'bFind', 'bText', 'bImgAdd', 'bBold', 'bColor', 'bSize', 'bAlignMenu', 'bDup', 'mArr', 'bImg', 'mTbl', 'bDel', 'bSDup', 'bSPrev', 'bSNext', 'bSDel', 'bSteps', 'bComment', 'bAI', 'bGrid', 'bView'];
  const GROUPS = { edit: ['bUndo', 'bRedo', 'bFind'], insert: ['bText', 'bImgAdd'], text: ['bBold', 'bColor', 'bSize', 'bAlignMenu'], object: ['bDup', 'mArr', 'bImg', 'mTbl', 'bDel'], slide: ['bSDup', 'bSPrev', 'bSNext', 'bSDel'], review: ['bComment', 'bAI'], view: ['bGrid', 'bView', 'bSteps'] };
  const rc = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ko-KR' });
  const r = await rc.newPage(); r.on('pageerror', (e) => { results.pageErrors = (results.pageErrors || 0) + 1; console.log('페이지 오류', e.message.slice(0, 160)); });
  await r.goto(EDITOR); await r.setInputFiles('#openFile', deckPath); await r.waitForFunction(() => window.HE.S.doc && window.HE.slides().length > 0); await r.waitForTimeout(400);
  const ids1 = () => r.evaluate((ids) => ids.every((id) => document.querySelectorAll('#' + id).length === 1), IDS);
  const pt = async (sel) => r.evaluate((sel) => { const e = window.HE.S.doc.querySelector(sel), f = document.querySelector('#stage').getBoundingClientRect(), b = e.getBoundingClientRect(); return { x: f.left + b.left + b.width / 2, y: f.top + b.top + b.height / 2 }; }, sel);
  const pick = async (sel) => { const c = await pt(sel); await r.mouse.click(c.x, c.y); await r.waitForTimeout(120); };
  const away = () => r.mouse.click(1270, 890);
  await test('펼친 메뉴: 처음 열면 펼침(리본 보임·한 줄 막대 숨김·「메뉴 접기」)', async () => { await shot(r, 'ribbon_1280.png'); return r.evaluate(() => document.body.classList.contains('rb-open') && !document.querySelector('#ribbon').hidden && document.querySelector('#ribbon').offsetHeight > 60 && document.querySelector('#bar').offsetWidth === 0 && document.querySelector('#bFold').getAttribute('aria-expanded') === 'true' && document.querySelector('#bFold .fl').textContent === '메뉴 접기'); });
  await test('펼친 메뉴: 묶음 7개와 묶음별 버튼(같은 요소, id 하나씩)', async () => await ids1() && r.evaluate((G) => Object.entries(G).every(([slot, ids]) => { const box = document.querySelector('#ribbon [data-slot="' + slot + '"]'); const got = [...box.children].map((e) => (e.matches('.menuwrap,.sub') ? e.firstElementChild.id : e.id)).filter(Boolean); return JSON.stringify(got) === JSON.stringify(ids); }) && document.querySelectorAll('#ribbon .rg').length === 7, GROUPS));
  await test('펼친 메뉴: 버튼 누름 영역 44px 이상·보이는 이름', async () => r.evaluate((ids) => ids.every((id) => { const e = document.getElementById(id), b = e.getBoundingClientRect(), rl = e.querySelector('.rl'); return b.width >= 44 && b.height >= 44 && rl && rl.offsetWidth > 0 && rl.textContent.trim().length > 0; }), IDS));
  await test('펼친 메뉴: 꺼짐 — 고른 것 없으면 굵게 꺼짐(색 #7A726A, 따뜻한 회색 톤, 불투명도 1), 고르면 켜짐', async () => { const off = await r.evaluate(() => { const e = document.querySelector('#bBold'), cs = getComputedStyle(e); return e.disabled && cs.color === 'rgb(122, 114, 106)' && cs.opacity === '1'; }); await pick('.box'); await shot(r, 'ribbon_selected_1280.png'); const on = await r.evaluate(() => !document.querySelector('#bBold').disabled); return off && on; });
  const menuOk = (menuId) => r.evaluate((id) => { const m = document.getElementById(id), b = m.getBoundingClientRect(), op = document.querySelector('[data-menu="' + id + '"]'); const top = document.elementFromPoint(b.left + b.width / 2, b.top + Math.min(20, b.height / 2)); return m.classList.contains('open') && b.width > 0 && b.right <= innerWidth && b.bottom <= innerHeight && b.left >= 0 && !!top && m.contains(top) && op.getAttribute('aria-expanded') === 'true'; }, menuId);
  await test('펼친 메뉴: 글자색·정렬·순서·맞춤 메뉴가 버튼 아래 화면 안에 뜸', async () => {
    await pick('.box'); await r.click('#bColor'); await r.waitForTimeout(150); const c = await menuOk('colorMenu'); await shot(r, 'ribbon_color_1280.png'); await away();
    await pick('.box'); await r.click('#bAlignMenu'); await r.waitForTimeout(150); const a = await menuOk('alignMenu'); await shot(r, 'ribbon_align_1280.png');
    await r.click('#bAlignC'); await r.waitForTimeout(150); const aligned = await r.evaluate(() => window.HE.CS(window.HE.S.doc.querySelector('.box')).textAlign === 'center'); await r.click('#bUndo');
    await pick('.box'); await r.click('#mArr'); await r.waitForTimeout(150); const o = await menuOk('arrMenu'); await shot(r, 'ribbon_arr_1280.png'); await away();
    return c && a && aligned && o;
  });
  await test('펼친 메뉴: 표 칸을 고르면 표 메뉴가 화면 안에 뜸', async () => { await pick('td'); await r.click('#mTbl'); await r.waitForTimeout(150); const ok = await menuOk('tblMenu'); await shot(r, 'ribbon_table_1280.png'); await away(); return ok; });
  await test('펼친 메뉴: Esc로 메뉴를 닫으면 연 버튼으로 초점', async () => { await pick('.box'); await r.click('#mArr'); await r.waitForTimeout(120); await r.keyboard.press('Escape'); await r.waitForTimeout(120); return r.evaluate(() => !document.querySelector('#arrMenu').classList.contains('open') && document.activeElement && document.activeElement.id === 'mArr'); });
  // 판정은 우리 코드의 일(Enter → 파일 입력 #iImgAdd를 연다)로 한다. 브라우저의 파일 창 이벤트는 전체 실행 중 1회 늦게 온 적이 있어(단독 8회 재현 실패) 오지 않으면 기록만 남긴다.
  await test('펼친 메뉴: 「그림」에 초점 두고 Enter → 파일 창', async () => { await r.evaluate(() => { window.__imgOpen = 0; document.querySelector('#iImgAdd').addEventListener('click', () => { window.__imgOpen++; }); }); await r.focus('#bImgAdd'); const focused = await r.evaluate(() => document.activeElement.id === 'bImgAdd'); const [fc] = await Promise.all([r.waitForEvent('filechooser', { timeout: 3000 }).catch(() => null), r.keyboard.press('Enter')]); const opened = await r.evaluate(() => window.__imgOpen); if (!fc) console.log('참고: 파일 창 이벤트 없음(입력 열기 호출 수', opened, ')'); return focused && opened === 1; });
  await test('언어 버튼: 「한 | EN」, 읽기 이름 한국어·English', async () => r.evaluate(() => { const k = document.querySelector('#title .lang [data-lang=ko]'), e = document.querySelector('#title .lang [data-lang=en]'); return k.textContent.trim() === '한' && k.getAttribute('aria-label') === '한국어' && e.textContent.trim() === 'EN' && e.getAttribute('aria-label') === 'English' && document.querySelector('#land .lang [data-lang=ko]').textContent.trim() === '한국어'; }));
  await test('메뉴 접기: 누르면 한 줄 막대·⌄만, 다시 누르면 펼침, 무대가 캔버스 안', async () => {
    await away(); await r.click('#bFold'); await r.waitForTimeout(300); await shot(r, 'folded_1280.png');
    const f = await r.evaluate(() => { const st = document.querySelector('#stage').getBoundingClientRect(), cv = document.querySelector('#canvas').getBoundingClientRect(); return document.querySelector('#ribbon').hidden && document.querySelector('#bar').offsetWidth > 0 && document.querySelector('#bFold').getAttribute('aria-expanded') === 'false' && document.querySelector('#bFold .fl').textContent === '' && document.querySelector('#bFold').getAttribute('aria-label') === '메뉴 펼치기' && st.bottom <= cv.bottom + 1 && st.top >= cv.top - 1; });
    const ids = await ids1(); await r.click('#bMore'); await r.waitForTimeout(150); await shot(r, 'folded_more_1280.png'); const more = await r.evaluate(() => ['bFind', 'bDup', 'mArr', 'bSDup', 'bSteps', 'bAlignL'].every((id) => document.getElementById(id).closest('#moreMenu'))); await away();
    await r.click('#bFold'); await r.waitForTimeout(300); const back = await r.evaluate(() => !document.querySelector('#ribbon').hidden && document.querySelector('#bAlignL').closest('#alignMenu') && document.querySelector('#bSteps').closest('#ribbon'));
    return f && ids && more && back;
  });
  await test('메뉴 접기: Enter로 전환·초점은 접기 버튼에', async () => { await r.focus('#bFold'); await r.keyboard.press('Enter'); await r.waitForTimeout(200); const a = await r.evaluate(() => document.querySelector('#ribbon').hidden && document.activeElement.id === 'bFold'); await r.keyboard.press('Enter'); await r.waitForTimeout(200); const b2 = await r.evaluate(() => !document.querySelector('#ribbon').hidden && document.activeElement.id === 'bFold'); return a && b2; });
  await test('메뉴 접기: 접은 상태를 새로 고침 뒤에도 기억, 기억값이 없으면 펼침', async () => { await r.click('#bFold'); await r.waitForTimeout(150); await r.reload(); await r.waitForTimeout(400); const kept = await r.evaluate(() => !document.body.classList.contains('rb-open') && document.querySelector('#ribbon').hidden); await r.evaluate(() => localStorage.removeItem('he-menu')); await r.reload(); await r.waitForTimeout(400); const def = await r.evaluate(() => document.body.classList.contains('rb-open')); return kept && def; });
  // 문서(A4): 슬라이드·보기 묶음 숨김
  await test('펼친 메뉴: A4 문서면 슬라이드·보기 묶음 숨김', async () => {
    const a4 = '<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:0}body{margin:0}.page{width:210mm;min-height:297mm;padding:20mm;box-sizing:border-box}</style></head><body><div class="page"><h1 id="nm">Jane Doe</h1><p>One</p></div><div class="page"><p>Two</p></div></body></html>';
    await r.evaluate((h) => window.HE.openText(h, 'a4.html', new Map()), a4); await r.waitForTimeout(700); await shot(r, 'doc_a4_ribbon_1280.png');
    return r.evaluate(() => window.HE.viewKind() === 'a4' && document.querySelector('[data-slot="slide"]').offsetWidth === 0 && document.querySelector('[data-slot="view"]').offsetWidth === 0 && document.querySelector('[data-slot="edit"]').offsetWidth > 0);
  });
  await rc.close();
  // 좁은 폭·영어: 펼친 메뉴와 접힌 막대 모두 페이지 가로 넘침 없음, 제목 막대 한 줄·겹침 없음, 리본은 안에서 가로 스크롤로 끝까지 닿음
  for (const [w, lang] of [[1024, 'en'], [1024, 'ko'], [1280, 'en'], [1280, 'ko']]) {
    const c3 = await b.newContext({ viewport: { width: w, height: 768 }, deviceScaleFactor: w === 1024 ? 1.25 : 1, locale: lang === 'en' ? 'en-US' : 'ko-KR' }); const pg = await c3.newPage();
    await pg.goto(EDITOR + '?lang=' + lang); await pg.click('#bExample'); await pg.waitForTimeout(900);
    const check = () => pg.evaluate(() => { const kids = [...document.querySelectorAll('#title > *')].filter((e) => e.offsetWidth > 0).map((e) => e.getBoundingClientRect()); let overlap = false; for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) { const a = kids[i], c = kids[j]; if (a.left < c.right - 1 && c.left < a.right - 1) overlap = true; } return { overlap, h: document.querySelector('#title').getBoundingClientRect().height, sw: document.documentElement.scrollWidth <= innerWidth }; });
    const o = await check(); const reach = await pg.evaluate(() => { const rb = document.querySelector('#ribbon'), s = document.querySelector('#bSteps'); s.scrollIntoView({ inline: 'end' }); const b = s.getBoundingClientRect(); return b.right <= innerWidth + 1 && b.left >= 0 && rb.scrollWidth >= rb.clientWidth; });
    if (w === 1024 && lang === 'en') await pg.evaluate(() => { document.querySelector('#ribbon').scrollLeft = 0; }), await shot(pg, 'ribbon_1024_en.png');
    await pg.click('#bFold'); await pg.waitForTimeout(300); const f = await check(); if (w === 1024 && lang === 'en') await shot(pg, 'folded_1024_en.png');
    results[`펼친 메뉴: ${w} ${lang} 펼침·접힘 모두 넘침·겹침 없음, 리본 끝까지 닿음`] = !o.overlap && o.h <= 56 && o.sw && reach && !f.overlap && f.h <= 56 && f.sw;
    console.log(results[`펼친 메뉴: ${w} ${lang} 펼침·접힘 모두 넘침·겹침 없음, 리본 끝까지 닿음`] ? '통과' : '실패', `펼친 메뉴: ${w} ${lang}`, JSON.stringify({ o, f, reach }));
    await c3.close();
  }
}

// ---------- 20261109_03: 굵게 해제·장표 확대 축소·빈 곳 클릭 선택 해제 (계획 _docs/20261109_03) ----------
{
  const EVD = join(HERE, '_docs/20261109_03_근거'); mkdirSync(EVD, { recursive: true });
  const D3 = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}.slide{position:relative;width:1000px;height:560px;overflow:hidden}
p{position:absolute;left:60px;margin:0;font-size:30px;font-weight:400}#p1{top:40px}#p2{top:140px}#p3{top:240px}#p4{top:340px}.heavy{font-weight:700}</style></head><body>
<section class="slide"><p id="p1">일반 <b id="bw">굵은</b> 글자</p><p id="p2">보통 <strong id="sw">강조</strong> 끝</p><p id="p3">앞 <em style="color:#cc0000">빨강 <span class="heavy" id="hv">클래스굵기</span></em> 뒤</p><p id="p4">평범한 단어 둘</p></section></body></html>`;
  const d3Path = join(work, 'd3.html'); writeFileSync(d3Path, D3);
  const open3 = async (c, url = EDITOR) => { const pg = await c.newPage(); pg.on('pageerror', (e) => { results.pageErrors = (results.pageErrors || 0) + 1; console.log('페이지 오류', e.message.slice(0, 160)); }); await pg.goto(url); await pg.setInputFiles('#openFile', d3Path); await pg.waitForFunction(() => window.HE.S.doc && window.HE.slides().length > 0); await pg.waitForTimeout(400); return pg; };
  // 글자 고치기를 시작하고 범위를 고른다: id 요소의 글자 전체, 또는 [텍스트 노드 순번, 시작, 끝]
  const pickText = (pg, boxId, target) => pg.evaluate(([boxId, target]) => { const H = window.HE, d = H.S.doc; H.startText(d.getElementById(boxId)); const r = d.createRange(); if (typeof target === 'string') r.selectNodeContents(d.getElementById(target)); else { const w = d.createTreeWalker(d.getElementById(boxId), 4); let t, i = 0; while ((t = w.nextNode())) { if (i === target[0]) break; i++; } r.setStart(t, target[1]); r.setEnd(t, target[2]); } const s = H.S.win.getSelection(); s.removeAllRanges(); s.addRange(r); }, [boxId, target]);
  const wOf = (pg, text) => pg.evaluate((text) => { const d = window.HE.S.doc, w = d.createTreeWalker(d.body, 4); let t; while ((t = w.nextNode())) if (t.data.includes(text)) return { w: +window.HE.CS(t.parentElement).fontWeight, color: window.HE.CS(t.parentElement).color }; return null; }, text);
  const savedOf = async (pg) => { const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#bSave')]); const f = join(work, 'd3out' + Date.now() + '.html'); await dl.saveAs(f); return f; };
  // 저장물을 새 창에 열어 글자의 계산 굵기·색을 잰다
  const reopen = async (f, texts) => { const v = await ctx.newPage(); await v.goto(pathToFileURL(f).href); const out = await v.evaluate((texts) => texts.map((x) => { const w = document.createTreeWalker(document.body, 4); let t; while ((t = w.nextNode())) if (t.data.includes(x)) { const cs = getComputedStyle(t.parentElement); return { w: +cs.fontWeight, color: cs.color }; } return null; }), texts); const txt = await v.evaluate(() => [...document.querySelectorAll('p')].map((p) => p.textContent)); await v.close(); return { out, txt }; };
  const c3 = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, locale: 'ko-KR' });
  let g = await open3(c3);
  await test('T1 글자 범위 굵게 해제(b 단어·클래스 굵기 중첩) — 화면·저장물', async () => {
    await pickText(g, 'p1', 'bw'); await g.click('#bBold'); await g.waitForTimeout(100); const a = await wOf(g, '굵은');
    await g.keyboard.press('Escape'); await g.waitForTimeout(100);
    await pickText(g, 'p3', 'hv'); await g.click('#bBold'); await g.waitForTimeout(100); const c = await wOf(g, '클래스굵기');
    await g.keyboard.press('Escape'); await g.waitForTimeout(150); await g.screenshot({ path: join(EVD, '구현_굵게해제_1280.png') });
    const f = await savedOf(g); const s = await reopen(f, ['굵은', '클래스굵기', '일반', '빨강']);
    console.log('  T1', JSON.stringify({ a, c, s }));
    return a.w < 600 && c.w < 600 && c.color === 'rgb(204, 0, 0)' && s.out[0].w < 600 && s.out[1].w < 600 && s.out[1].color === 'rgb(204, 0, 0)' && s.out[2].w < 600 && s.out[3].color === 'rgb(204, 0, 0)' && s.txt[0] === '일반 굵은 글자' && s.txt[2] === '앞 빨강 클래스굵기 뒤';
  });
  await test('T2 보통 단어만 골라 굵게(회귀)', async () => { await pickText(g, 'p4', [0, 0, 3]); await g.click('#bBold'); await g.waitForTimeout(100); const a = await wOf(g, '평범한'); await g.keyboard.press('Escape'); return a.w >= 600; });
  await g.close(); g = await open3(c3);
  await test('T3 굵은 단어 + 보통 단어를 함께 고르면 모두 굵게', async () => { await g.evaluate(() => { const H = window.HE, d = H.S.doc, p = d.getElementById('p1'); H.startText(p); const r = d.createRange(); r.setStart(p.firstChild, 0); r.setEnd(d.getElementById('bw').firstChild, 2); const s = H.S.win.getSelection(); s.removeAllRanges(); s.addRange(r); }); await g.click('#bBold'); await g.waitForTimeout(100); const a = await wOf(g, '일반'), c = await wOf(g, '굵은'); await g.keyboard.press('Escape'); return a.w >= 600 && c.w >= 600; });
  await test('T4b 굵은 단어를 고르면 굵게 버튼 눌림 표시', async () => { await pickText(g, 'p2', 'sw'); await g.waitForTimeout(150); const on = await g.getAttribute('#bBold', 'aria-pressed'); await pickText(g, 'p2', [0, 0, 2]); await g.waitForTimeout(150); const off = await g.getAttribute('#bBold', 'aria-pressed'); await g.keyboard.press('Escape'); return on === 'true' && off === 'false'; });
  await test('T4 상자 전체 굵게 끄기 — 안쪽 strong까지, 되돌리기 1번, 저장물', async () => {
    await g.evaluate(() => { const H = window.HE; H.finishText(); H.setSel([H.S.doc.getElementById('p2')]); }); await g.waitForTimeout(80);
    await g.click('#bBold'); await g.waitForTimeout(80); const on = [await wOf(g, '보통'), await wOf(g, '강조')];
    await g.click('#bBold'); await g.waitForTimeout(80); const off = [await wOf(g, '보통'), await wOf(g, '강조')];
    await g.click('#bUndo'); await g.waitForTimeout(80); const un = [await wOf(g, '보통'), await wOf(g, '강조')];
    await g.click('#bRedo'); await g.waitForTimeout(80);
    const f = await savedOf(g); const s = await reopen(f, ['보통', '강조']);
    console.log('  T4', JSON.stringify({ on, off, un, s: s.out }));
    return on.every((x) => x.w >= 600) && off.every((x) => x.w < 600) && un.every((x) => x.w >= 600) && s.out.every((x) => x.w < 600);
  });
  await g.close(); g = await open3(c3);
  const selN = (pg) => pg.evaluate(() => window.HE.S.sel.length);
  const grayPoint = (pg) => pg.evaluate(() => { const w = document.querySelector('#stageWrap').getBoundingClientRect(), s = document.querySelector('#stage').getBoundingClientRect(); const c = document.querySelector('#canvas').getBoundingClientRect(); return s.right + 20 < w.right ? { x: (s.right + w.right) / 2, y: s.top + 50 } : { x: c.left + 5, y: c.top + 5 }; });
  await test('T5 회색 영역 클릭 → 선택 해제, 노트 칸·손잡이는 유지, 글자 고치기 끝', async () => {
    const pickP1 = () => g.evaluate(() => window.HE.setSel([window.HE.S.doc.getElementById('p1')]));
    await pickP1(); await g.waitForTimeout(80); await g.click('#notesIn'); await g.waitForTimeout(80); const keepNotes = await selN(g);
    await pickP1(); await g.waitForTimeout(150); const hd = await g.evaluate(() => { const h = document.querySelector('#overlay .hd[data-h="se"]').getBoundingClientRect(); return { x: h.left + h.width / 2, y: h.top + h.height / 2 }; }); await g.mouse.click(hd.x, hd.y); await g.waitForTimeout(80); const keepHd = await selN(g);
    const gp = await grayPoint(g); await g.mouse.click(gp.x, gp.y); await g.waitForTimeout(120); const cleared = await selN(g);
    await g.screenshot({ path: join(EVD, '구현_빈곳해제_1280.png') });
    await pickText(g, 'p4', [0, 0, 2]); await g.mouse.click(gp.x, gp.y); await g.waitForTimeout(120); const ed = await g.evaluate(() => !!window.HE.S.editing);
    console.log('  T5', JSON.stringify({ keepNotes, keepHd, cleared, ed }));
    return keepNotes === 1 && keepHd === 1 && cleared === 0 && !ed;
  });
  await test('T6 Ctrl+휠: 회색 영역·무대 안 모두 기본 동작 막고 배율 변경, Ctrl 없는 휠은 그대로', async () => {
    const r = await g.evaluate(() => { const S = window.HE.S, z0 = S.zoom || 1; const ev = (o) => new WheelEvent('wheel', Object.assign({ deltaY: -100, bubbles: true, cancelable: true, clientX: 300, clientY: 200 }, o));
      const outer = !document.querySelector('#stageWrap').dispatchEvent(ev({ ctrlKey: true })); const z1 = S.zoom; const inner = !S.doc.getElementById('p1').dispatchEvent(ev({ ctrlKey: true })); const z2 = S.zoom; const plain = !S.doc.getElementById('p1').dispatchEvent(ev({})); return { z0, outer, z1, inner, z2, plain }; });
    await g.click('#zoomFit'); console.log('  T6', JSON.stringify(r));
    return r.outer && r.inner && !r.plain && r.z1 > r.z0 && r.z2 > r.z1;
  });
  const stageW = (pg) => pg.evaluate(() => document.querySelector('#stage').getBoundingClientRect().width);
  await test('T7 조절기 + 두 번 → 120%, 맞춤 → 100%', async () => { const w0 = await stageW(g); await g.click('#zoomIn'); await g.click('#zoomIn'); await g.waitForTimeout(100); const t1 = await g.textContent('#zoomPct'), w1 = await stageW(g); await g.click('#zoomFit'); await g.waitForTimeout(100); const t2 = await g.textContent('#zoomPct'), w2 = await stageW(g); console.log('  T7', JSON.stringify({ w0, t1, w1, t2, w2 })); return t1 === '120%' && Math.abs(w1 - w0 * 1.2) <= 2 && t2 === '100%' && Math.abs(w2 - w0) <= 2; });
  // 무대 안 요소의 화면 좌표 — 편집기 변환 코드와 따로, CSS px(offset 값) × 배율로 계산한다(장은 무대 왼쪽 위 0,0, 글상자는 장 기준 절대 위치)
  const outerOf = (pg, id) => pg.evaluate((id) => { const st = document.querySelector('#stage').getBoundingClientRect(), z = window.HE.S.zoom || 1, e = window.HE.S.doc.getElementById(id), l = e.offsetLeft, t = e.offsetTop, w = e.offsetWidth, h = e.offsetHeight; return { x: st.left + l * z, y: st.top + t * z, w: w * z, h: h * z, cx: st.left + (l + w / 2) * z, cy: st.top + (t + h / 2) * z }; }, id);
  const boxRect = (pg) => pg.evaluate(() => { const b = document.querySelector('#overlay .box'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width }; });
  await test('T8 150%: 클릭·선택 상자·손잡이 30px→20px·코멘트 핀·스크롤·잘림·코멘트 창', async () => {
    for (let i = 0; i < 5; i++) await g.click('#zoomIn'); await g.waitForTimeout(150); const pct = await g.textContent('#zoomPct');
    // 가운데 기준으로 커지므로 왼쪽 위 글상자가 보이게 스크롤을 처음으로 돌린다
    await g.evaluate(() => { const w = document.querySelector('#stageWrap'); w.scrollLeft = 0; w.scrollTop = 0; }); await g.waitForTimeout(150);
    const o2 = await outerOf(g, 'p2'); await g.mouse.click(o2.cx, o2.cy); await g.waitForTimeout(120); const picked = await g.evaluate(() => (window.HE.S.sel[0] || {}).id);
    const bx = await boxRect(g), boxOk = bx && Math.abs(bx.x - o2.x) <= 2 && Math.abs(bx.y - o2.y) <= 2;
    const before = await g.evaluate(() => { const e = window.HE.S.doc.getElementById('p2'); return { w: e.offsetWidth, l: parseFloat(window.HE.CS(e).left) }; });
    const eh = await g.evaluate(() => { const h = document.querySelector('#overlay .hd[data-h="e"]').getBoundingClientRect(); return { x: h.left + h.width / 2, y: h.top + h.height / 2 }; });
    await g.mouse.move(eh.x, eh.y); await g.mouse.down(); await g.mouse.move(eh.x + 15, eh.y, { steps: 4 }); await g.mouse.move(eh.x + 30, eh.y, { steps: 4 }); await g.mouse.up(); await g.waitForTimeout(100);
    const after = await g.evaluate(() => { const e = window.HE.S.doc.getElementById('p2'); return { w: e.offsetWidth, l: parseFloat(window.HE.CS(e).left) }; });
    const resizeOk = Math.abs(after.w - before.w - 20) <= 2 && Math.abs(after.l - before.l) <= 1;
    // 코멘트 핀: 코멘트 모드에서 p4 오른쪽 빈 곳을 눌러 단다
    const o4 = await outerOf(g, 'p4'); await g.click('#bComment'); await g.waitForTimeout(80); const px = o4.x + o4.w + 40, py = o4.cy; await g.mouse.click(px, py); await g.waitForTimeout(200);
    const pin = await g.evaluate(() => { const p = [...document.querySelectorAll('#overlay .pin')].pop(); if (!p) return null; const r = p.getBoundingClientRect(); return { x: r.left, y: r.top }; });
    const pinOk = pin && Math.abs(pin.x - px) <= 30 && Math.abs(pin.y - py) <= 30;
    await g.fill('#popText', '확대 시험 코멘트'); await g.click('#popOk'); await g.click('#bComment'); await g.waitForTimeout(80);
    // 스크롤 200px 뒤에도 선택 상자가 요소에 붙어 있음
    await g.evaluate(() => window.HE.setSel([window.HE.S.doc.getElementById('p2')])); await g.evaluate(() => { document.querySelector('#stageWrap').scrollTop = 200; }); await g.waitForTimeout(200);
    const o2s = await outerOf(g, 'p2'), bxs = await boxRect(g), scrollOk = bxs && Math.abs(bxs.x - o2s.x) <= 2 && Math.abs(bxs.y - o2s.y) <= 2;
    await g.screenshot({ path: join(EVD, '구현_확대150_1280.png') });
    // 맨 위 p1을 고르고 끝까지 내리면 p1 상자는 무대 칸 보이는 영역 위로 나가 잘린다
    await g.evaluate(() => window.HE.setSel([window.HE.S.doc.getElementById('p1')])); await g.evaluate(() => { const w = document.querySelector('#stageWrap'); w.scrollTop = w.scrollHeight; }); await g.waitForTimeout(200);
    const clip = await g.evaluate(() => { const o = document.querySelector('#overlay'), w = document.querySelector('#stageWrap'), c = document.querySelector('#canvas').getBoundingClientRect(), r = w.getBoundingClientRect(), m = /inset\(([\d.]+)px/.exec(o.style.clipPath || ''); const b = o.querySelector('.box').getBoundingClientRect(); return { clipTop: m ? +m[1] : -1, wrapTop: r.top - c.top + w.clientTop, boxBottom: b.bottom - c.top }; });
    const clipOk = Math.abs(clip.clipTop - clip.wrapTop) <= 1 && clip.boxBottom <= clip.clipTop + 1;
    // 코멘트 창을 연 채 맨 위로 올렸다가 핀이 보이지 않게 내리면 창이 닫힘
    await g.evaluate(() => { document.querySelector('#stageWrap').scrollTop = 0; }); await g.waitForTimeout(150); await g.evaluate(() => { const p = [...document.querySelectorAll('#overlay .pin')].pop(); p.click(); }); await g.waitForTimeout(150);
    const popOpen = await g.evaluate(() => !document.querySelector('.pop').hidden);
    await g.evaluate(() => { const w = document.querySelector('#stageWrap'); w.scrollTop = w.scrollHeight; w.scrollLeft = w.scrollWidth; }); await g.waitForTimeout(200);
    const pinVis = await g.evaluate(() => { const p = [...document.querySelectorAll('#overlay .pin')].pop(), w = document.querySelector('#stageWrap').getBoundingClientRect(), r = p.getBoundingClientRect(); return r.top >= w.top && r.bottom <= w.bottom && r.left >= w.left && r.right <= w.right; });
    const popAfter = await g.evaluate(() => !document.querySelector('.pop').hidden);
    const popOk = popOpen && (pinVis ? popAfter : !popAfter);
    console.log('  T8', JSON.stringify({ pct, picked, bx, o2, boxOk, before, after, resizeOk, pin, px, py, pinOk, scrollOk, clip, clipOk, popOpen, pinVis, popAfter }));
    return pct === '150%' && picked === 'p2' && boxOk && resizeOk && pinOk && scrollOk && clipOk && popOk;
  });
  await test('T9 150%에서 저장해도 문서에 배율이 섞이지 않음', async () => { const f = await savedOf(g); const h = readFileSync(f, 'utf8'); return !/zoom/i.test(h); });
  await g.close(); await c3.close();
  // T8b·T8c 상태 줄 배치와 영어 화면
  const barCheck = (pg) => pg.evaluate(() => { const z = document.querySelector('#zoomBox').getBoundingClientRect(), kids = [...document.querySelectorAll('#zoomBox > *')].map((e) => e.getBoundingClientRect()); const inView = kids.every((r) => r.left >= 0 && r.right <= innerWidth && r.width > 0); const btnH = [...document.querySelectorAll('#zoomBox button')].every((b) => b.getBoundingClientRect().height >= 28); const ov = (sel) => { const e = document.querySelector(sel); if (!e || !e.offsetWidth) return false; const r = e.getBoundingClientRect(); return r.left < z.right - 1 && z.left < r.right - 1; }; return { inView, btnH, overR: ov('#status .r'), overWhere: ov('#where'), rShown: document.querySelector('#status .r').offsetWidth > 0, sw: document.documentElement.scrollWidth <= innerWidth }; });
  for (const w of [1280, 1366, 1024]) await test(`T8b 상태 줄 ${w}: 조절기 보임·안내와 안 겹침·버튼 28px`, async () => { const c = await b.newContext({ viewport: { width: w, height: 768 }, acceptDownloads: true, locale: 'ko-KR' }); const pg = await open3(c); const r = await barCheck(pg); await pg.screenshot({ path: join(EVD, `구현_상태줄_${w}.png`) }); await c.close(); console.log(`  T8b ${w}`, JSON.stringify(r)); return r.inView && r.btnH && !r.overR && !r.overWhere && r.sw && (w <= 1200 ? !r.rShown : true); });
  await test('T8c 영어 화면 조절기 문구', async () => { const c = await b.newContext({ viewport: { width: 1280, height: 768 }, acceptDownloads: true, locale: 'en-US' }); const pg = await open3(c, EDITOR + '?lang=en'); const r = await pg.evaluate(() => ({ out: document.querySelector('#zoomOut').getAttribute('aria-label'), inn: document.querySelector('#zoomIn').getAttribute('aria-label'), fit: document.querySelector('#zoomFit').textContent, tip: document.querySelector('#zoomFit').title, grp: document.querySelector('#zoomBox').getAttribute('aria-label') })); await pg.screenshot({ path: join(EVD, '구현_상태줄_en_1280.png') }); const bc = await barCheck(pg); await c.close(); console.log('  T8c', JSON.stringify({ r, bc })); return r.out === 'Zoom out' && r.inn === 'Zoom in' && r.fit === 'Fit' && r.tip === 'Fit to screen' && r.grp === 'Zoom controls' && bc.inView && !bc.overR; });
}

await b.close();
const failed =Object.entries(results).filter(([k, v]) => v === false).map(([k]) => k);
if (outJson) writeFileSync(outJson, JSON.stringify({ results, failed }, null, 1));
console.log(`합계 ${Object.values(results).filter((v) => v === true).length} 통과, 실패 ${failed.length}`, failed.join(', '));
void q; process.exit(failed.length || results.pageErrors ? 1 : 0);
