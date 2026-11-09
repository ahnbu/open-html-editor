// 장(슬라이드) 찾기와 이동
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// ---------- 장 찾기와 이동 ----------
// 덱이면 장, 문서(view-mode.js)면 쪽·구역을 돌려준다. 이후 목록·이동·코멘트는 모두 이 목록을 쓴다.
function slides() {
  const d = S.doc; if (!d) return [];
  if (S.units) return S.units.filter((e) => e.isConnected);
  return deckCandidates(d);
}
function curIndex() {
  if (isDoc()) return docIndex();
  const list = slides(), d = S.doc, ds = d.querySelector('deck-stage');
  if (ds && typeof ds.index === 'number') return ds.index;
  const a = list.findIndex((e) => e.classList.contains('is-active') || e.classList.contains('active') || e.hasAttribute('data-deck-active') || e.classList.contains('present'));
  if (a >= 0) return a;
  let best = 0, area = -1;
  list.forEach((e, i) => { const r = e.getBoundingClientRect(), w = Math.min(r.right, S.win.innerWidth) - Math.max(r.left, 0), h = Math.min(r.bottom, S.win.innerHeight) - Math.max(r.top, 0), v = getComputedStyle(e); const s = w > 0 && h > 0 && v.display !== 'none' && v.visibility !== 'hidden' && +v.opacity > 0.05 ? w * h : 0; if (s > area) { area = s; best = i; } });
  return best;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function pressRaw(code, key) { S.bypass = true; S.doc.body.dispatchEvent(new S.win.KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true })); S.bypass = false; }
async function goTo(i) { while (S.rendering) await S.rendering; return goToNow(i); }
async function goToNow(i) {
  const list = slides(); if (!list.length) return;
  i = Math.max(0, Math.min(list.length - 1, i));
  const ds = S.doc.querySelector('deck-stage');
  if (isDoc()) { list[i].scrollIntoView({ block: 'start' }); S.cur = i; if (S.mo) S.mo.takeRecords(); clearSel(); ui().onSlide(); return; }
  // 장 넘기기는 덱 코드가 한다. 멈춰 둔 움직임을 잠깐 풀고 넘긴 뒤 조용해지면 다시 멈춘다(계획 _docs/20261107_02 ⓐ).
  const wasFrozen = api.freezeState(); if (wasFrozen) thaw();
  try { await navTo(i, ds, list); } finally { if (wasFrozen) freezeWhenQuiet(1500); }
  S.cur = curIndex();
  slides().forEach((s, n) => s.classList.toggle('he-cur', n === S.cur)); if (S.mo) S.mo.takeRecords();
  clearSel(); ui().onSlide();
}
async function navTo(i, ds, list) {
  if (ds && ds.goTo) { ds.goTo(i); await sleep(30); }
  else {
    if (curIndex() !== i && list[i].dataset.label && /^\d/.test(list[i].dataset.label)) { S.win.location.hash = '#' + list[i].dataset.label; await sleep(60); }
    for (let n = 0; n < list.length * 3 && curIndex() !== i; n++) { const c = curIndex(); pressRaw(c < i ? 'ArrowRight' : 'ArrowLeft', c < i ? 'ArrowRight' : 'ArrowLeft'); await sleep(40); }
  }
}
const sectionOf = (el) => { const l = slides(); return l.find((s) => s.contains(el)) || null; };
const scaleOf = (el) => { const s = sectionOf(el) || S.doc.body; const r = s.getBoundingClientRect(); return (r.width / (s.offsetWidth || r.width)) || 1; };
