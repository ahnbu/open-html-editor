// 파일 열기와 편집 틀(iframe) 띄우기
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// ---------- 덱 띄우기 ----------
async function openText(text, name, files) {
  // 받는 분 블록은 편집 대상에서 뺀다(편집 화면에 버튼이 안 보인다). 공유 토글은 새 파일·다른 파일·받은 문서 모두 켠 채 시작한다(계획 _docs/20261105_04 3a-1).
  text = stripHandoff(text).text; S.shareEdit = true; S.handoffNext = false; S.lastShareText = '';
  const rc = readComments(text); text = rc.text; S.comments = rc.list; S.commentChanged = false; S.saveName = ''; S.handle = null;
  S.name = name || 'deck.html'; S.doctype = doctypeOf(text); S.nextId = 1; S.undo = []; S.redo = [];
  S.files = files || new Map(); S.back = new Map(); S.missing = new Set(); S.cur = 0; S.dirty = 0; S.saveLost = false; S.handleStamp = 0;
  for (const [p, f] of S.files) {
    if (/\.css$/i.test(p)) continue;
    const url = URL.createObjectURL(f); S.files.set(p, { url, file: f }); S.back.set(url, p);
  }
  for (const [p, f] of [...S.files]) if (/\.css$/i.test(p) && f instanceof Blob) {
    const dir = p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) : '';
    const css = (await f.text()).replace(/url\((['"]?)([^'")]+)\1\)/g, (a, q, u) => { const hit = isRel(u) && S.files.get(normPath(dir + u)); return hit && hit.url ? `url(${q}${hit.url}${q})` : a; });
    const url = URL.createObjectURL(new Blob([css], { type: 'text/css' })); S.files.set(p, { url, file: f }); S.back.set(url, p);
  }
  S.bundle = splitBundle(text); S.kind = S.bundle ? 'bundle' : 'plain';
  S.orig = parse(S.bundle ? S.bundle.template : text);
  addIds(S.orig);
  await render(0);
  document.body.classList.add('loaded'); document.dispatchEvent(new Event('he-loaded'));
  ui().onOpen();
  return { missing: [...S.missing], kind: S.kind };
}
// 편집 틀에만 붙이는 보안 정책(저장본에는 넣지 않는다). 문서 속 코드의 직접 전송 통로(fetch·XHR·WebSocket·sendBeacon·폼 전송)를 막는다.
// 그림·서체·스타일·스크립트 불러오기는 막지 않는다(AI가 만든 HTML은 CDN을 많이 써서 막으면 모양이 깨진다). 한계는 README 「보안」 절.
const CSP = `<meta http-equiv="Content-Security-Policy" content="connect-src 'none'; form-action 'none'">`;
const HOOK = '<script data-he-hook>try{parent.__HE_hook(window)}catch(e){}<\/script>';
const HEAD_IN = CSP + HOOK;
function viewHtml() {
  const d = parse(ser(S.orig)); rewriteView(d);
  const html = ser(d).replace(/<head([^>]*)>/i, `<head$1>${HEAD_IN}`);
  if (!S.bundle) return html;
  return joinBundle({ before: S.bundle.before.replace(/<head([^>]*)>/i, `<head$1>${HEAD_IN}`), after: S.bundle.after }, html);
}
function render(index) {
  // 다시 읽는 동안 들어온 장 이동·장 작업은 끝날 때까지 기다린다. 안 그러면 엉뚱한 장을 지운다.
  const p = new Promise((res) => {
    S.sel = []; S.editing = null; S.touched = new Map(); S.styleTouched = new Map();
    const f = $('#stage'); S.pendingIndex = index; S.resolveLoad = res;
    S.win = null; S.doc = null;
    f.srcdoc = viewHtml();
  }).then(() => { if (S.rendering === p) S.rendering = null; });
  S.rendering = p;
  return p;
}
window.__HE_hook = function (win) {
  S.win = win; hookEvents(win); hideIds(win); freezable(win);
  // 틀 안에서는 주소를 못 바꾼다. 덱의 주소 기록이 멈추지 않게 조용히 넘긴다.
  try { win.history.replaceState = function () {}; win.history.pushState = function () {}; } catch (e) { /* 일부 환경은 막혀 있다 */ }
};
// ⓑ 편집기 번호표(data-he)를 문서 속 코드가 읽지 못하게 한다(계획 _docs/20261107_02 ⓑ, 결정 기록).
// 문서 코드가 innerHTML·outerHTML을 읽어 글자로 다시 쓰면 번호표가 제목 글자로 찍혔다(해커톤 15차 2위). 읽을 때만 지우고 요소에는 그대로 둔다 — 저장·변경 기록은 지금처럼 번호표로 짝을 맞춘다.
const HE_ATTR = / data-he(?:-new|-sel)?="[^"]*"/g;
function hideIds(win) {
  try {
    const P = win.Element.prototype;
    for (const k of ['innerHTML', 'outerHTML']) {
      const d = Object.getOwnPropertyDescriptor(P, k); if (!d || !d.get) continue;
      Object.defineProperty(P, k, { configurable: true, enumerable: d.enumerable, set: d.set, get() { return d.get.call(this).replace(HE_ATTR, ''); } });
    }
    const X = win.XMLSerializer && win.XMLSerializer.prototype, sts = X && X.serializeToString;
    if (sts) X.serializeToString = function (n) { return sts.call(this, n).replace(HE_ATTR, ''); };
  } catch (e) { /* 막힌 환경: 번호표가 보일 수 있지만 편집은 된다 */ }
}
// ⓐ 편집 중에는 문서의 움직임을 멈춘다(계획 _docs/20261107_02 ⓐ). 고르던 글자가 장면 전환으로 사라지지 않게 한다.
// 멈추는 것: 화면 그리기 순번(requestAnimationFrame — GSAP·three.js·자체 재생 시계가 여기에 기대어 돈다), 반복 타이머(setInterval) 틱,
// CSS·웹 애니메이션(한 번 도는 것은 끝 상태로, 끝없는 것은 그 자리에), GSAP 진행 중 트윈(끝 상태로), 영상, 문서가 내놓은 motionPlayer.
// 원문에는 아무것도 넣지 않는다 — 편집 틀 안 실행에만 건다. 발표 보기·저장본은 원래대로 돈다.
function freezable(win) {
  const F = { on: false, held: new Map(), n: 0, videos: [], mp: false, sweep: 0 };
  win.__heFreeze = F;
  try {
    const raf = win.requestAnimationFrame.bind(win), caf = win.cancelAnimationFrame.bind(win);
    win.requestAnimationFrame = function (cb) { if (!F.on) return raf(cb); const id = -(++F.n); F.held.set(id, cb); return id; };
    win.cancelAnimationFrame = function (id) { if (id < 0) F.held.delete(id); else caf(id); };
    F.raf = raf;
    const si = win.setInterval.bind(win);
    win.setInterval = function (fn, ms, ...a) { if (typeof fn !== 'function') return si(fn, ms, ...a); return si(function (...b) { if (!F.on) return fn.apply(this, b); }, ms, ...a); };
  } catch (e) { /* 막힌 환경은 그대로 돈다 */ }
}
// 한 번 도는 애니메이션은 끝 상태로(시작 전 투명 상태에서 멈추면 글자가 안 보인다), 끝없는 것은 그 자리에서 멈춘다.
function settleAnims(win, d) {
  let list = []; try { list = d.getAnimations(); } catch (e) { return; }
  for (const a of list) {
    try {
      if (a.playState === 'finished' || a.__heDone) continue;
      const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null;
      if (t && Number.isFinite(t.endTime)) a.finish(); else a.pause();
      a.__heDone = true;
    } catch (e) { /* 일부 애니메이션은 끝낼 수 없다 */ }
  }
}
function freezeNow() {
  const win = S.win, d = S.doc, F = win && win.__heFreeze; if (!F || F.on || !d) return;
  F.on = true;
  // GSAP: 반복하지 않고 스크롤에 묶이지 않은 트윈은 아직 시작 전이어도 끝 상태로 보낸다(로딩 화면을 걷는 트윈이 시작 전에 멈추면 화면이 가려진 채 남는다 — 아틀라스 대시보드).
  // 끝내면서 다음 트윈이 생기므로(onComplete) 몇 차례 되풀이한다. 끝없이 도는 것은 그 자리에서 멈춘다.
  try {
    const g = win.gsap;
    if (g && g.globalTimeline) {
      for (let pass = 0; pass < 5; pass++) {
        let n = 0;
        // 맨 위 단위(트윈·타임라인)째로 끝낸다 — 타임라인 안 트윈만 끝내면 타임라인 재생 위치가 그대로라 다시 앞 상태로 그린다
        for (const t of g.globalTimeline.getChildren(false, true, true)) { try { if (t.progress() < 1 && t.repeat() === 0 && !t.scrollTrigger) { t.progress(1); n++; } } catch (e) { /* 트윈마다 다르다 */ } }
        if (!n) break;
      }
      g.globalTimeline.pause(); F.gsap = true;
    }
  } catch (e) { /* GSAP 없음 */ }
  try { const mp = win.motionPlayer; if (mp && mp.state && mp.state.playing && typeof mp.pause === 'function') { mp.pause(); F.mp = true; } } catch (e) { /* 제어 기능 없음 */ }
  F.videos = [...d.querySelectorAll('video')].filter((v) => !v.paused); F.videos.forEach((v) => { try { v.pause(); } catch (e) { /* 무시 */ } });
  settleAnims(win, d);
  // 멈춘 동안 새로 생기는 애니메이션(장 표시·클래스 변화)도 같은 방식으로 정리한다
  F.sweep = setInterval(() => { if (S.win === win && F.on) settleAnims(win, d); }, 250);
}
function thaw() {
  const win = S.win, F = win && win.__heFreeze; if (!F || !F.on) return;
  F.on = false; clearInterval(F.sweep);
  try { if (F.gsap && win.gsap) win.gsap.globalTimeline.resume(); } catch (e) { /* 무시 */ } F.gsap = false;
  try { if (F.mp && win.motionPlayer) win.motionPlayer.play(); } catch (e) { /* 무시 */ } F.mp = false;
  F.videos.forEach((v) => { try { const p = v.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* 무시 */ } }); F.videos = [];
  try { (S.doc ? S.doc.getAnimations() : []).forEach((a) => { if (a.__heDone && a.playState === 'paused') a.play(); a.__heDone = false; }); } catch (e) { /* 무시 */ }
  const held = [...F.held.values()]; F.held.clear(); held.forEach((cb) => F.raf(cb));
}
// 문서가 조용해지면(글자·요소 변화가 1초 없거나 최대 기다림이 지나면) 멈춘다. 장 이동·문서 스크롤 뒤에도 다시 부른다.
let freezeTimer = 0;
function freezeWhenQuiet(maxMs) {
  clearInterval(freezeTimer); const t0 = Date.now(), win = S.win;
  freezeTimer = setInterval(() => {
    if (S.win !== win || !S.doc) { clearInterval(freezeTimer); return; }
    if (Date.now() - (S.lastMut || 0) > 1000 || Date.now() - t0 > maxMs) { clearInterval(freezeTimer); freezeNow(); }
  }, 100);
}
api.freezeState = () => !!(S.win && S.win.__heFreeze && S.win.__heFreeze.on);
function attachDoc() {
  const f = $('#stage'), d = f.contentDocument; if (!d || !d.body) return false;
  S.win = f.contentWindow; S.doc = d;
  if (S.mo) S.mo.disconnect();
  S.buf = [];
  S.mo = new S.win.MutationObserver((list) => {
    if (S.opOpen) S.buf.push(...list);
    // 멈춤 시점 판단용: 문서 코드가 글자·요소를 바꾸는 중인가(편집기 자신의 작업과 속성 변화는 세지 않는다)
    else if (list.some((r) => r.type !== 'attributes')) S.lastMut = Date.now();
  });
  S.mo.observe(d.documentElement, { subtree: true, childList: true, characterData: true, characterDataOldValue: true, attributes: true, attributeOldValue: true });
  if (!d.getElementById('he-style')) {
    const st = d.createElement('style'); st.id = 'he-style'; st.textContent = stepCss(); (d.head || d.documentElement).appendChild(st);
  }
  return true;
}
// 단계 요소는 덱이 숨기고 클릭도 막아 둔다. 편집 중에는 펼치고 눌리게 한다. 저장본에는 영향이 없다.
// 포인터 모양(사장 피드백 2026-11-05, 계획 _docs/20261105_04 1c): 바탕은 화살표, 고를 수 있는 개체 위는 손(누를 수 있음),
// 고른 개체 위는 잡는 손, 누른 채 끄는 동안은 쥔 손(:active — 편집 문서에 표시 속성을 달지 않아 변경 기록·저장본에 섞이지 않는다), 글자 입력 중은 글자 커서.
const ROOTS = 'html,body,main,#deck,deck-stage,.s-body,section,.slide';
const stepCss = () => (S.stepsOpen ? '.he-cur [data-step],.he-cur [data-exit],.he-cur .fragment,.he-cur [data-step] *,.he-cur [data-exit] *{opacity:1!important;visibility:visible!important;pointer-events:auto!important}' : '')
  + '*{user-select:none!important}body *{cursor:pointer!important}' + ROOTS + '{cursor:default!important}'
  + '[data-he-sel],[data-he-sel] *{cursor:grab!important}[data-he-sel]:active,[data-he-sel]:active *{cursor:grabbing!important}'
  + '[contenteditable=true],[contenteditable=true] *{outline:none;cursor:text!important;user-select:text!important}';
// 고른 요소에 표시를 달아 잡는 손 모양 포인터를 보인다. 저장본에서는 clean이 지운다.
function markSel() { if (!S.doc) return; S.doc.querySelectorAll('[data-he-sel]').forEach((x) => x.removeAttribute('data-he-sel')); S.sel.forEach((e) => { if (e.setAttribute && !e.closest('td,th')) e.setAttribute('data-he-sel', '1'); }); }
// 문서를 스크롤하면 지금 보는 쪽·구역을 따라간다(덱은 덱 코드가 장을 넘긴다)
let scrollTimer = 0;
// 스크롤에 맞춰 나타나는 효과(ScrollTrigger 등)가 돌 수 있게 스크롤하는 동안만 움직임을 풀었다가 멈추면 다시 멈춘다.
function onDocScroll() { if (!isDoc()) return; thaw(); freezeWhenQuiet(1500); clearTimeout(scrollTimer); scrollTimer = setTimeout(() => { const i = docIndex(); if (i !== S.cur) { S.cur = i; ui().onSlide(); } else ui().syncOverlay(); }, 60); ui().syncOverlay(); }
function onFrameLoad() {
  let tries = 0;
  S.units = null; S.view = 'deck';
  // 장이 보이면 바로 덱으로 연다. 장이 없으면 잠깐 기다렸다가(덱 코드가 장을 만드는 중일 수 있다) 문서로 연다.
  const settle = S.kind === 'bundle' ? 200 : 8;
  const t = setInterval(() => {
    tries += 1;
    if (attachDoc() && (deckCandidates(S.doc).length || tries > settle)) {
      clearInterval(t);
      detectView();
      S.win.addEventListener('scroll', onDocScroll, { passive: true });
      const done = S.resolveLoad; S.resolveLoad = null;
      if (S.startSlide) { const k = slides().findIndex((s) => s.id === S.startSlide); if (k >= 0) S.pendingIndex = k; S.startSlide = null; }
      goToNow(S.pendingIndex || 0).then(() => { freezeWhenQuiet(2000); ui().onLoaded(); if (done) done(); });
    }
  }, 50);
}
