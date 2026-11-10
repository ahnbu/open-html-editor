// 사용성 9건 시험(계획 _docs/20261110_01): test-editor.mjs가 부른다. 화면 캡처는 계획 「화면 검수」 표의 경로(_docs/20261110_01_근거/구현_*.png)에 찍는다.
// 재료는 스스로 만든다: 구역 7개짜리 문서(끝 3개는 55·55·67px, 「본사」 5곳)와 test-editor의 작은 덱.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DOC = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;font:16px/1.6 sans-serif;color:#222}
header,section,details,footer{display:block;margin:0;padding:0 40px;box-sizing:border-box}
#u1{height:40px;background:#eee}#u2{height:400px;background:#fafafa}#u3{height:500px;background:#f2f2ff}#u4{height:500px;background:#fff8f0}
#u5,#u6{height:55px;background:#eef6ee}#u7{height:67px;background:#ddd}
.box{position:absolute;left:60px;top:120px;width:260px;background:#ffe;padding:0}#u2{position:relative}
</style></head><body>
<header id="u1">머리 줄</header>
<section id="u2"><h1 id="ttl">본사 안내</h1><p id="txt">12월 1일 이후 발생한 재해부터 적용합니다.</p><div class="box" id="bx">본사 상자 글자</div></section>
<section id="u3"><p>셋째 구역 글자</p></section>
<section id="u4"><p>본사 첫째</p><p>본사 둘째</p><p>본사 셋째</p></section>
<details id="u5"><summary>확인 필요 사항</summary></details>
<details id="u6"><summary>조회 원본</summary></details>
<footer id="u7">꼬리말</footer>
</body></html>`;

export async function usabilityTests({ b, EDITOR, work, test, here, deckPath, results }) {
  // 캡처: 원본 레포는 계획의 근거 폴더에, 기록 폴더(_docs)가 없는 공개 레포는 임시 작업 폴더에 둔다
  const EV = existsSync(join(here, '_docs')) ? join(here, '_docs/20261110_01_근거') : join(work, 'shots'); mkdirSync(EV, { recursive: true });
  const docPath = join(work, 'u-doc.html'); writeFileSync(docPath, DOC);
  const ctxOf = (o = {}) => b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, acceptDownloads: true, locale: 'ko-KR', reducedMotion: 'reduce', ...o });
  const watch = (pg) => pg.on('pageerror', (e) => { results.pageErrors = (results.pageErrors || 0) + 1; console.log('페이지 오류', e.message.slice(0, 160)); });
  const openDoc = async (c, file = docPath, url = EDITOR) => { const pg = await c.newPage(); watch(pg); await pg.goto(url); await pg.setInputFiles('#openFile', file); await pg.waitForFunction(() => window.HE.S.doc && window.HE.slides().length > 0); await pg.waitForTimeout(500); return pg; };
  const savedOf = async (pg) => { const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#bSave')]); const f = join(work, 'uout' + Date.now() + '.html'); await dl.saveAs(f); return readFileSync(f, 'utf8'); };
  const shot = (pg, name) => pg.screenshot({ path: join(EV, name) });
  const groups = (pg) => pg.$$eval('#ribbon .rg', (l) => l.filter((g) => getComputedStyle(g).display !== 'none').map((g) => g.querySelector('.rn').textContent.trim()));
  // 무대 안 요소의 바깥 화면 좌표(가운데)
  const at = (pg, sel) => pg.evaluate((sel) => { const f = document.querySelector('#stage').getBoundingClientRect(), r = window.HE.S.doc.querySelector(sel).getBoundingClientRect(); return { x: f.left + r.left + r.width / 2, y: f.top + r.top + r.height / 2, r: { l: f.left + r.left, t: f.top + r.top, w: r.width, h: r.height } }; }, sel);

  // ── 1번 메뉴 순서
  {
    const c = await ctxOf(); const pg = await openDoc(c);
    await test('U1 리본 순서: 문서 편집·글자·개체·넣기·검토', async () => { const g = await groups(pg); await shot(pg, '구현_리본순서_문서_1280.png'); console.log('  U1', g.join('·')); return g.join('·') === '편집·글자·개체·넣기·검토'; });
    await pg.close();
    const pd = await openDoc(c, deckPath);
    await test('U1 리본 순서: 덱 편집·글자·개체·넣기·장·검토·보기', async () => { const g = await groups(pd); await shot(pd, '구현_리본순서_덱_1280.png'); console.log('  U1d', g.join('·')); return g.join('·') === '편집·글자·개체·넣기·슬라이드·검토·보기'; });
    // 4번 리본 복사 아이콘(사이트 모드)·연결 모드 반짝이
    await test('U4 AI용 복사 아이콘: 사이트는 복사, 연결 모드는 반짝이', async () => {
      const r = await pd.evaluate(() => { const b = document.querySelector('#bAI'), vis = (s) => getComputedStyle(b.querySelector(s)).display !== 'none'; const site = vis('.ai-copy') && !vis('.ai-apply'); b.classList.add('apply'); const srv = !vis('.ai-copy') && vis('.ai-apply'); b.classList.remove('apply'); return { site, srv }; });
      await pd.locator('#bAI').scrollIntoViewIfNeeded().catch(() => {}); await shot(pd, '구현_복사아이콘_1280.png'); return r.site && r.srv;
    });
    await pd.close(); await c.close();
  }
  // ── 첫 화면: 시연 창 순서·복사 아이콘·끌기 전 안내
  {
    for (const [lang, w, h, name, text] of [['ko', 1280, 800, '구현_끌기전신호_ko_1280.png', '파일 끌어다 놓기'], ['en', 1280, 800, '구현_끌기전신호_en_1280.png', 'Drop here'], ['ko', 390, 844, '구현_끌기전신호_ko_390.png', '파일 끌어다 놓기']]) {
      const c = await ctxOf({ viewport: { width: w, height: h }, locale: lang === 'en' ? 'en-US' : 'ko-KR' }); const pg = await c.newPage(); watch(pg); await pg.goto(EDITOR + '?lang=' + lang); await pg.waitForTimeout(900);
      await test(`U9b 끌기 전 안내 ${lang} ${w}: 버튼 아래 한 줄·겹침 없음`, async () => {
        const r = await pg.evaluate(() => { const hnt = document.querySelector('#land .l-hint'), btns = [...document.querySelectorAll('#l-foot .cta .l-btn')].map((e) => e.getBoundingClientRect()), hr = hnt.getBoundingClientRect(); return { text: hnt.textContent.trim(), h: hr.height, below: btns.every((x) => hr.top >= x.bottom - 1), shown: getComputedStyle(hnt).display !== 'none', sw: document.querySelector('#land').scrollWidth <= innerWidth }; });
        await shot(pg, name); console.log('  U9b', lang, w, JSON.stringify(r)); return r.shown && r.text === text && r.h < 30 && r.below && r.sw;
      });
      if (lang === 'ko' && w === 1280) {
        await test('U4 첫 화면 히어로·시연 창 「AI용 복사」도 복사 아이콘', async () => { const n = await pg.evaluate(() => [...document.querySelectorAll('#land use')].filter((u) => /l-spark/.test(u.getAttribute('href'))).length + '/' + [...document.querySelectorAll('#land use')].filter((u) => u.getAttribute('href') === '#l-copy').length); await shot(pg, '구현_첫화면복사아이콘_1280.png'); return n === '0/2'; });
        await test('U1 첫 화면 시연 창 메뉴 순서', async () => { await pg.evaluate(() => document.querySelector('#l-real').scrollIntoView({ block: 'start' })); await pg.waitForTimeout(500); const g = await pg.$$eval('#l-win .l-grp .gl', (l) => l.map((x) => x.textContent.trim())); await shot(pg, '구현_시연창순서_1280.png'); console.log('  U1l', g.join('·')); return g.slice(0, 4).join('·') === '편집·글자·개체·넣기'; });
      }
      await c.close();
    }
  }
  // ── 2번 구역 이동(클릭 고정)·끝 여백
  {
    const c = await ctxOf(); const pg = await openDoc(c); const th = pg.frameLocator('#thumbs');
    await test('U2 구역 1~7 클릭: 그 구역이 화면 위 1/3 안·번호·왼쪽 강조 유지', async () => {
      const out = [];
      for (let i = 0; i < 7; i++) {
        await th.locator('.he-card').nth(i).click(); await pg.waitForTimeout(400);
        const r = await pg.evaluate((i) => { const S = window.HE.S, u = window.HE.slides()[i].getBoundingClientRect(); return { top: Math.round(u.top), lim: S.win.innerHeight / 3, cur: S.cur, pos: document.querySelector('#pos').textContent }; }, i);
        const card = await th.locator('.he-card.cur').getAttribute('data-i');
        if (i === 6) await shot(pg, '구현_구역이동_1280.png');
        out.push({ i, ...r, card, ok: r.top >= -2 && r.top <= r.lim && r.cur === i && r.pos.startsWith((i + 1) + ' /') && +card === i });
      }
      console.log('  U2', JSON.stringify(out.map((o) => [o.i, o.top, o.cur, o.card, o.ok]))); return out.every((o) => o.ok);
    });
    // 맨 위로 직접 굴리면 고정이 풀리고 화면 기준 번호(docIndex — 위 1/3 지점에 걸린 구역)를 다시 따른다. 머리 줄이 40px라 맨 위에서는 2번 구역이 그 지점에 걸린다.
    await test('U2 직접 스크롤하면 번호가 화면 기준으로 다시 바뀜', async () => { await pg.evaluate(() => window.HE.S.win.scrollTo(0, 0)); await pg.waitForTimeout(400); const r = await pg.evaluate(() => ({ cur: window.HE.S.cur, pin: window.HE.S.docPin, pos: document.querySelector('#pos').textContent })); console.log('  U2s', JSON.stringify(r)); return r.cur === 1 && !r.pin && r.pos.startsWith('2 /'); });
    await test('U2 저장본에 끝 여백·표시 흔적 없음', async () => { const h = await savedOf(pg); return !/padding-bottom:\s*calc\(100vh/.test(h) && !h.includes('he-find') && !h.includes('unitFlash'); });
    // ── 3번 찾기 막대(문서)
    await test('U3 찾기 막대: Ctrl+F·개수·다음·이전·화면 안·한 곳·되돌리기·모두·빈 입력', async () => {
      await pg.locator('#status').click(); await pg.keyboard.press('ControlOrMeta+f'); await pg.waitForTimeout(100);
      const opened = await pg.evaluate(() => !document.querySelector('#findBar').hidden && document.activeElement.id === 'fa');
      await pg.fill('#fa', '본사'); await pg.waitForTimeout(400); const c1 = await pg.textContent('#fCount');
      await pg.click('#fNext'); await pg.click('#fNext'); await pg.waitForTimeout(200); const c3 = await pg.textContent('#fCount');
      const vis = await pg.evaluate(() => { const S = window.HE.S, r = [...S.win.CSS.highlights.get('he-find-cur')][0].getBoundingClientRect(); return r.top >= 0 && r.bottom <= S.win.innerHeight; });
      await pg.click('#fPrev'); await pg.waitForTimeout(200); const c2 = await pg.textContent('#fCount'); await shot(pg, '구현_찾기_1280.png');
      await pg.fill('#fb', '지사'); await pg.click('#fRep'); await pg.waitForTimeout(250); const n4 = await pg.evaluate(() => window.HE.findAll('본사').length);
      await pg.click('#bUndo'); await pg.waitForTimeout(250); const n5 = await pg.evaluate(() => window.HE.findAll('본사').length);
      await pg.click('#fRepAll'); await pg.waitForTimeout(250); const n0 = await pg.evaluate(() => window.HE.findAll('본사').length), offAll = await pg.evaluate(() => document.querySelector('#fRep').disabled && document.querySelector('#fRepAll').disabled);
      await pg.fill('#fa', ''); await pg.waitForTimeout(250); const offEmpty = await pg.evaluate(() => document.querySelector('#fRep').disabled && document.querySelector('#fRepAll').disabled);
      await pg.click('#bUndo'); await pg.waitForTimeout(150); await pg.keyboard.press('Escape'); await pg.click('#fClose').catch(() => {});
      const r = { opened, c1, c3, vis, c2, n4, n5, n0, offAll, offEmpty }; console.log('  U3', JSON.stringify(r));
      return opened && c1 === '1/5' && c3 === '3/5' && vis && c2 === '2/5' && n4 === 4 && n5 === 5 && n0 === 0 && offAll && offEmpty;
    });
    await test('U3 저장본에 칠하기 흔적 없음', async () => { const h = await savedOf(pg); return !/highlight|he-find/.test(h); });
    // 완료 검수 1회차 지적: 찾기 막대를 연 채 다른 문단을 실제로 입력하고 바꾸기·모두 바꾸기를 누르면 입력이 저장에서 빠졌다
    for (const [btn, label] of [['#fRep', '한 곳'], ['#fRepAll', '모두']]) {
      await test(`U3 다른 문단 입력 중 ${label} 바꾸기 → 입력과 바꾼 글자 모두 저장`, async () => {
        await pg.evaluate(() => window.HE.goTo(1)); await pg.waitForTimeout(150);
        await pg.locator('#status').click(); await pg.keyboard.press('ControlOrMeta+f'); await pg.fill('#fa', '본사'); await pg.fill('#fb', '지사'); await pg.waitForTimeout(300);
        const c = await at(pg, '#txt'); await pg.mouse.dblclick(c.x, c.y); await pg.waitForTimeout(150); await pg.keyboard.press('End'); await pg.keyboard.type(' 입력함' + label); await pg.waitForTimeout(100);
        await pg.click(btn); await pg.waitForTimeout(300); await pg.click('#fClose');
        const h = await savedOf(pg); const r = { typed: h.includes('입력함' + label), replaced: h.includes('지사') };
        await pg.evaluate(() => { while (window.HE.S.undo.length) window.HE.undo(); }); await pg.waitForTimeout(150);
        console.log('  U3t', label, JSON.stringify(r)); return r.typed && r.replaced;
      });
    }
    await test('U3 검색어 입력 직후 막대를 닫으면 칠하기가 다시 생기지 않음', async () => {
      await pg.locator('#status').click(); await pg.keyboard.press('ControlOrMeta+f'); await pg.fill('#fa', ''); await pg.type('#fa', '본사'); await pg.click('#fClose'); await pg.waitForTimeout(400);
      return pg.evaluate(() => { const h = window.HE.S.win.CSS.highlights; return document.querySelector('#findBar').hidden && !(h.get('he-find') && h.get('he-find').size) && !(h.get('he-find-cur') && h.get('he-find-cur').size); });
    });
    // ── 7번 글자 크기
    await test('U7 고른 범위 크기 표시: 30 입력·화살표 증감·섞이면 빈칸', async () => {
      await pg.evaluate(() => window.HE.goTo(1)); await pg.waitForTimeout(200);
      const pick = (a, z) => pg.evaluate(([a, z]) => { const H = window.HE, d = H.S.doc, p = d.getElementById('txt'); if (H.S.editing !== p) H.startText(p); const w = d.createTreeWalker(p, 4); const t = w.nextNode(); const r = d.createRange(); r.setStart(t, a); r.setEnd(t, z); const s = H.S.win.getSelection(); s.removeAllRanges(); s.addRange(r); }, [a, z]);
      await pick(0, 4); await pg.waitForTimeout(150); const v0 = await pg.inputValue('#iSize');
      await pg.fill('#iSize', '30'); await pg.press('#iSize', 'Enter'); await pg.waitForTimeout(200); const v1 = await pg.inputValue('#iSize');
      const sz = () => pg.evaluate(() => { const sp = [...window.HE.S.doc.querySelectorAll('#txt span')].pop(); return sp ? Math.round(parseFloat(window.HE.CS(sp).fontSize)) : 0; });
      const s1 = await sz(); await pg.focus('#iSize'); await pg.keyboard.press('ArrowUp'); await pg.waitForTimeout(150); const v2 = await pg.inputValue('#iSize'), s2 = await sz();
      await pg.keyboard.press('ArrowUp'); await pg.waitForTimeout(150); const v3 = await pg.inputValue('#iSize'), s3 = await sz();
      await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(150); const v4 = await pg.inputValue('#iSize'), s4 = await sz();
      await shot(pg, '구현_글자크기_1280.png');
      // 섞인 범위: 큰 글자 + 뒤 보통 글자
      const mixed = await pg.evaluate(() => { const H = window.HE, d = H.S.doc, p = d.getElementById('txt'), sp = [...p.querySelectorAll('span')].pop(), r = d.createRange(); r.setStart(sp.firstChild || sp, 0); const w = d.createTreeWalker(p, 4); let t, last; while ((t = w.nextNode())) last = t; r.setEnd(last, last.data.length); const s = H.S.win.getSelection(); s.removeAllRanges(); s.addRange(r); return true; });
      await pg.waitForTimeout(150); const vm = await pg.inputValue('#iSize');
      await pg.evaluate(() => window.HE.finishText()); await pg.waitForTimeout(100);
      const r = { v0, v1, s1, v2, s2, v3, s3, v4, s4, mixed, vm }; console.log('  U7', JSON.stringify(r));
      return v0 === '16' && v1 === '30' && s1 === 30 && v2 === String(s2) && v3 === String(s3) && v4 === String(s4) && s3 === s2 + 1 && s4 === s2 && vm === '';
    });
    await pg.close(); await c.close();
  }
  // ── 8번 문서 배율
  {
    const c = await ctxOf(); const pg = await openDoc(c);
    const m = () => pg.evaluate(() => { const S = window.HE.S, st = document.querySelector('#stage').getBoundingClientRect(); const n = window.HE.slides().filter((u) => { const r = u.getBoundingClientRect(); return r.bottom > 0 && r.top < S.win.innerHeight; }).length; return { w: Math.round(st.width), h: Math.round(st.height), sh: S.doc.documentElement.scrollHeight, seen: n, pct: document.querySelector('#zoomPct').textContent, iz: getComputedStyle(document.querySelector('#stage')).zoom }; });
    const z100 = await m();
    for (let k = 0; k < 3; k++) await pg.click('#zoomOut'); await pg.waitForTimeout(300); const z70 = await m(); await shot(pg, '구현_문서축소70_1280.png');
    // 「더 많이 보임」 = 같은 틀 높이로 문서 전체 중 보이는 비율이 커짐(틀 높이 ÷ 문서 스크롤 높이)
    await test('U8 문서 70%: 틀 크기 그대로·스크롤 높이 줄어듦·더 많이 보임', async () => { console.log('  U8 70', JSON.stringify({ z100, z70 })); return z70.pct === '70%' && z70.w === z100.w && z70.h === z100.h && z70.sh < z100.sh * 0.75 && z70.h / z70.sh > z100.h / z100.sh && (z70.iz === '1' || z70.iz === 'normal'); });
    // 배율 z에서 선택 상자·끌기·크기 손잡이·코멘트 핀이 요소에 맞는지(70%·130% 각각 — 완료 검수 1회차 지적으로 70%도)
    const edits = async (z, cap) => {
      await pg.evaluate(() => window.HE.goTo(1)); await pg.waitForTimeout(200);
      const c0 = await at(pg, '#bx'); await pg.mouse.click(c0.x, c0.y); await pg.waitForTimeout(150);
      const box = await pg.evaluate(() => { const o = document.querySelector('#overlay .box').getBoundingClientRect(); return { l: o.left, t: o.top, w: o.width }; });
      const boxOk = Math.abs(box.l - c0.r.l) <= 2 && Math.abs(box.t - c0.r.t) <= 2 && Math.abs(box.w - c0.r.w) <= 2;
      if (cap) await shot(pg, cap);
      const l0 = await pg.evaluate(() => window.HE.S.doc.getElementById('bx').offsetLeft);
      await pg.mouse.move(c0.x, c0.y); await pg.mouse.down(); await pg.mouse.move(c0.x + 25, c0.y, { steps: 4 }); await pg.mouse.move(c0.x + 52, c0.y, { steps: 4 }); await pg.mouse.up(); await pg.waitForTimeout(150);
      const l1 = await pg.evaluate(() => window.HE.S.doc.getElementById('bx').offsetLeft), moveOk = Math.abs((l1 - l0) - 52 / z) <= 2;
      const c1 = await at(pg, '#bx'); await pg.mouse.click(c1.x, c1.y); await pg.waitForTimeout(150);
      const hd = await pg.evaluate(() => { const e = document.querySelector('.hd[data-h="e"]').getBoundingClientRect(); return { x: e.left + 5, y: e.top + 5 }; });
      const w0 = await pg.evaluate(() => window.HE.S.doc.getElementById('bx').getBoundingClientRect().width);
      await pg.mouse.move(hd.x, hd.y); await pg.mouse.down(); await pg.mouse.move(hd.x + 39, hd.y, { steps: 5 }); await pg.mouse.up(); await pg.waitForTimeout(150);
      const w1 = await pg.evaluate(() => window.HE.S.doc.getElementById('bx').getBoundingClientRect().width), sizeOk = Math.abs((w1 - w0) - 39) <= 3;
      await pg.keyboard.press('Escape'); await pg.click('#bComment'); const t = await at(pg, '#ttl'); await pg.mouse.click(t.x, t.y); await pg.waitForTimeout(200);
      const pin = await pg.evaluate(() => { const p = [...document.querySelectorAll('#overlay .pin')].pop(); if (!p) return null; const r = p.getBoundingClientRect(); return { x: r.left, y: r.top }; });
      const pinOk = !!pin && Math.abs(pin.x - t.x) <= 30 && Math.abs(pin.y - t.y) <= 30; // 덱 확대 시험(T8)과 같은 기준 — 핀은 누른 점 바로 위에 그려진다
      await pg.keyboard.press('Escape'); await pg.click('#bComment').catch(() => {});
      await pg.evaluate(() => { while (window.HE.S.undo.length) window.HE.undo(); }); await pg.waitForTimeout(150); // 다음 배율 시험이 같은 자리에서 시작하게
      const r = { z, box, c0: c0.r, boxOk, l0, l1, moveOk, w0, w1, sizeOk, pin, t: [t.x, t.y], pinOk }; console.log('  U8 edits', JSON.stringify(r));
      return boxOk && moveOk && sizeOk && pinOk;
    };
    await test('U8 문서 70%: 선택 상자·끌기·손잡이·코멘트 핀이 요소에 맞음', () => edits(0.7));
    await pg.click('#zoomFit'); for (let k = 0; k < 3; k++) await pg.click('#zoomIn'); await pg.waitForTimeout(300); const z130 = await m();
    await test('U8 문서 130%: 선택 상자·끌기·손잡이·코멘트 핀이 요소에 맞음', async () => z130.pct === '130%' && z130.w === z100.w && z130.sh > z100.sh && await edits(1.3, '구현_문서확대130_1280.png'));
    await test('U8 문서 배율 상태로 저장해도 zoom 없음', async () => { const h = await savedOf(pg); return !/zoom/i.test(h); });
    await pg.close(); await c.close();
  }
  // ── 5번 로고 → 첫 화면
  {
    const c = await ctxOf();
    await test('U5 변경 없으면 로고로 바로 첫 화면', async () => { const pg = await openDoc(c, docPath, EDITOR + '#app'); await pg.click('#bHome'); await pg.waitForLoadState('load'); await pg.waitForTimeout(600); const r = await pg.evaluate(() => ({ land: getComputedStyle(document.querySelector('#land')).display !== 'none', hash: location.hash, loaded: document.body.classList.contains('loaded') })); await pg.close(); return r.land && r.hash === '' && !r.loaded; });
    await test('U5 입력 중 글자도 변경으로 셈 → 확인창 · 취소면 편집 그대로', async () => {
      const pg = await openDoc(c); await pg.evaluate(() => { const H = window.HE, p = H.S.doc.getElementById('txt'); H.startText(p); p.firstChild.data = '고친 ' + p.firstChild.data; });
      await pg.click('#bHome'); await pg.waitForTimeout(200); const open = await pg.evaluate(() => document.querySelector('#dlgHome').open); await shot(pg, '구현_홈확인창_1280.png');
      await pg.click('#dlgHome button[value="no"]'); await pg.waitForTimeout(200);
      const r = await pg.evaluate(() => ({ loaded: document.body.classList.contains('loaded'), dirty: window.HE.isDirty() })); await pg.close(); return open && r.loaded && r.dirty;
    });
    await test('U5 저장하고 이동 → 내려받은 뒤 첫 화면 · 저장 실패면 편집 그대로', async () => {
      const pg = await openDoc(c); await pg.evaluate(() => { const H = window.HE, p = H.S.doc.getElementById('txt'); H.startText(p); p.firstChild.data = '고친 ' + p.firstChild.data; H.finishText(); });
      await pg.evaluate(() => { window.__realSave = window.HE.save; window.HE.save = async () => ({ canceled: true }); });
      await pg.click('#bHome'); await pg.waitForTimeout(150); await pg.click('#dlgHome button[value="save"]'); await pg.waitForTimeout(300); const stay = await pg.evaluate(() => document.body.classList.contains('loaded'));
      await pg.evaluate(() => { window.HE.save = window.__realSave; });
      await pg.click('#bHome'); await pg.waitForTimeout(150);
      const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#dlgHome button[value="save"]')]); await pg.waitForLoadState('load'); await pg.waitForTimeout(600);
      const land = await pg.evaluate(() => getComputedStyle(document.querySelector('#land')).display !== 'none' && !document.body.classList.contains('loaded'));
      await pg.close(); return stay && !!dl && land;
    });
    await test('U5 저장 안 하고 이동 → 첫 화면', async () => {
      const pg = await openDoc(c); await pg.evaluate(() => { const H = window.HE, p = H.S.doc.getElementById('txt'); H.startText(p); p.firstChild.data = '고친 ' + p.firstChild.data; H.finishText(); });
      await pg.click('#bHome'); await pg.waitForTimeout(150); await pg.click('#dlgHome button[value="discard"]'); await pg.waitForLoadState('load'); await pg.waitForTimeout(600);
      const land = await pg.evaluate(() => getComputedStyle(document.querySelector('#land')).display !== 'none'); await pg.close(); return land;
    });
    await c.close();
  }
  // ── 6번 #app 빈 편집기 + 9번 끌기 덮개
  {
    const c = await ctxOf();
    const fileDrag = (pg, inner, types = 'file') => pg.evaluate(([inner, types]) => { const w = inner ? window.HE.S.win : window; const dt = new w.DataTransfer(); if (types === 'file') dt.items.add(new w.File(['<p>x</p>'], 'x.html', { type: 'text/html' })); else dt.setData('text/plain', 'x'); const tgt = inner ? w.document.body : document.body; tgt.dispatchEvent(new w.DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true, clientX: 300, clientY: 300 })); }, [inner, types]);
    const cover = (pg) => pg.evaluate(() => ({ on: !document.querySelector('#dropCover').hidden, t: document.querySelector('#dcTitle').textContent }));
    // 끄는 동안의 화면을 찍는다: 실제 끌기처럼 dragover를 계속 보내는 동안 찍고 멈춘다(덮개는 dragover가 끊기면 180ms 뒤 내려간다 — 완료 검수 2회차 지적: 캡처에 덮개가 빠짐)
    const dragShot = async (pg, inner, name) => {
      await pg.evaluate((inner) => { const w = inner ? window.HE.S.win : window, tgt = inner ? w.document.body : document.body; window.__dg = setInterval(() => { const dt = new w.DataTransfer(); dt.items.add(new w.File(['<p>x</p>'], 'x.html', { type: 'text/html' })); tgt.dispatchEvent(new w.DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true, clientX: 300, clientY: 300 })); }, 40); }, inner);
      await pg.waitForTimeout(150); const on = (await cover(pg)).on; await shot(pg, name); const after = (await cover(pg)).on;
      await pg.evaluate(() => clearInterval(window.__dg)); await pg.waitForTimeout(300); return on && after;
    };
    const pl = await c.newPage(); watch(pl); await pl.goto(EDITOR); await pl.waitForTimeout(800);
    await test('U9 첫 화면에 파일을 끌면 덮개·「여기에 놓으면 바로 열립니다」, 멈추면 사라짐, 글자 끌기는 안 뜸', async () => {
      await fileDrag(pl, false); await pl.waitForTimeout(60); const a = await cover(pl); const capOk = await dragShot(pl, false, '구현_드롭첫화면_1280.png'); a.on = a.on && capOk;
      await fileDrag(pl, false); await pl.waitForTimeout(100); await fileDrag(pl, false); await pl.waitForTimeout(100); const keep = await cover(pl);
      await pl.waitForTimeout(400); const gone = await cover(pl); await fileDrag(pl, false, 'text'); await pl.waitForTimeout(50); const txt = await cover(pl);
      console.log('  U9 land', JSON.stringify({ a, keep, gone, txt })); return a.on && a.t === '여기에 놓으면 바로 열립니다' && keep.on && !gone.on && !txt.on;
    });
    await pl.close();
    const pa = await c.newPage(); watch(pa); await pa.goto(EDITOR + '#app'); await pa.waitForTimeout(800);
    await test('U6 #app: 첫 화면 없이 빈 편집기와 열기 안내', async () => { const r = await pa.evaluate(() => ({ land: getComputedStyle(document.querySelector('#land')).display, eo: getComputedStyle(document.querySelector('#emptyOpen')).display, title: getComputedStyle(document.querySelector('#title')).visibility })); await shot(pa, '구현_빈편집기_1280.png'); console.log('  U6', JSON.stringify(r)); return r.land === 'none' && r.eo !== 'none' && r.title === 'visible'; });
    await test('U9 빈 편집기에 파일을 끌면 같은 덮개', async () => { await fileDrag(pa, false); await pa.waitForTimeout(60); const a = await cover(pa); const capOk = await dragShot(pa, false, '구현_드롭빈편집기_1280.png'); return a.on && capOk && a.t === '여기에 놓으면 바로 열립니다'; });
    await test('U6 빈 편집기에서 놓기로 파일 열기 → 보통 편집기', async () => {
      await pa.evaluate((html) => { const dt = new DataTransfer(); dt.items.add(new File([html], 'u-doc.html', { type: 'text/html' })); window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); }, DOC);
      await pa.waitForFunction(() => document.body.classList.contains('loaded'), null, { timeout: 8000 }).catch(() => {}); await pa.waitForTimeout(500);
      return pa.evaluate(() => document.body.classList.contains('loaded') && getComputedStyle(document.querySelector('#emptyOpen')).display === 'none' && window.HE.slides().length === 7);
    });
    await test('U9 편집 중 무대 안에서 파일을 끌면 「놓으면 새 파일로 바꿔 엽니다」', async () => { await fileDrag(pa, true); await pa.waitForTimeout(60); const a = await cover(pa); const capOk = await dragShot(pa, true, '구현_드롭편집중_1280.png'); return a.on && capOk && a.t === '놓으면 새 파일로 바꿔 엽니다'; });
    await test('U9 변경이 있을 때 놓으면 기존 확인창 · 취소면 편집 그대로', async () => {
      await pa.waitForTimeout(300); await pa.evaluate(() => { const H = window.HE, p = H.S.doc.getElementById('txt'); H.startText(p); p.firstChild.data = '고친 ' + p.firstChild.data; H.finishText(); });
      await pa.evaluate((html) => { const w = window.HE.S.win, dt = new w.DataTransfer(); dt.items.add(new w.File([html], 'other.html', { type: 'text/html' })); w.document.body.dispatchEvent(new w.DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); }, DOC);
      await pa.waitForTimeout(500); const open = await pa.evaluate(() => document.querySelector('#dlgSwitch').open); await pa.click('#dlgSwitch button[value="no"]').catch(() => {}); await pa.waitForTimeout(200);
      const r = await pa.evaluate(() => window.HE.isDirty() && window.HE.S.doc.getElementById('txt').textContent.startsWith('고친')); return open && r;
    });
    await pa.close(); await c.close();
  }
}
