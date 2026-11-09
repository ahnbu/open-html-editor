// 보기 종류 자동 인식(계획 ②a). 사람이 고르는 버튼은 없다. 파일을 연 뒤 모양을 보고 정한다.
//   deck : 크기가 고정된 장을 한 장씩 보는 덱(지금까지의 슬라이드 동작)
//   a4   : 세로 쪽(A4 비율)이 이어지는 문서 — 왼쪽 목록은 쪽
//   page : 높이가 제각각인 구역이 이어지는 문서(랜딩·보고서) — 왼쪽 목록은 구역
// 문서(a4·page)는 원래 모양 그대로 세로로 스크롤하고, 편집 동작은 덱과 같은 엔진을 쓴다. 장 복제·순서·발표만 끈다.
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
const DECK_Q = ['deck-stage > section', '#deck > section.slide', 'section.slide', '.slide', 'main > section', 'body > section', 'section'];
S.view = 'deck'; S.units = null;
function deckCandidates(d) {
  for (const q of DECK_Q) { const r = [...d.querySelectorAll(q)]; if (r.length) return r; }
  return [];
}
const SKIP_TAG = /^(SCRIPT|STYLE|LINK|META|TEMPLATE|NOSCRIPT|BR)$/;
// 문서의 큰 덩어리: body 바로 아래(겉 틀 하나뿐이면 그 안) 보이는 블록들
function topBlocks(d) {
  let root = d.body;
  const kids = (r) => [...r.children].filter((e) => !SKIP_TAG.test(e.tagName) && e.offsetHeight > 8 && e.offsetWidth > 8);
  for (let k = 0; k < 3; k++) { const c = kids(root); if (c.length === 1 && kids(c[0]).length > 1) root = c[0]; else break; }
  return kids(root);
}
const ratioOf = (e) => e.offsetWidth / (e.offsetHeight || 1);
const sameSize = (list) => { const w0 = list[0].offsetWidth, h0 = list[0].offsetHeight; return list.every((e) => Math.abs(e.offsetWidth - w0) <= w0 * 0.02 && Math.abs(e.offsetHeight - h0) <= Math.max(2, h0 * 0.02)); };
const portrait = (list) => list.length > 0 && list.every((e) => { const r = ratioOf(e); return r > 0.6 && r < 0.8 && e.offsetWidth >= 400; });
function detectView() {
  const d = S.doc; S.view = 'deck'; S.units = null; if (!d || !d.body) return S.view;
  const list = deckCandidates(d);
  if (list.length) {
    if (d.querySelector('deck-stage')) return S.view;
    const shown = list.filter((e) => { const cs = S.win.getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && e.offsetHeight > 0; });
    if (list.length > 1 && shown.length <= 1) return S.view; // 한 장만 보이고 나머지는 숨긴 덱
    const r = ratioOf(list[0]);
    if (sameSize(list) && r >= 1.2 && r <= 2.4) return S.view; // 같은 크기의 가로 장이 세로로 놓인 덱
    if (sameSize(list) && portrait(list)) { S.view = 'a4'; S.units = list; return S.view; }
  }
  const blocks = topBlocks(d);
  S.view = portrait(blocks) ? 'a4' : 'page';
  S.units = blocks.length ? blocks : [d.body];
  return S.view;
}
const isDoc = () => S.view !== 'deck';
// 장 크기가 고정된 덱인가(계획 _docs/20261105_04 1e): 첫 장의 width·height가 px로 선언됐으면 그 비율을 돌려준다.
// vw·%·선언 없음(창을 따라 변하는 덱)이나 읽을 수 없는 스타일이면 0 — 무대를 지금처럼 남은 칸에 맞춘다.
const PX = /^\d+(\.\d+)?px$/;
function declared(el, prop) {
  let v = el.style.getPropertyValue(prop).trim();
  if (!v) for (const sh of el.ownerDocument.styleSheets) {
    let rs; try { rs = sh.cssRules; } catch (e) { continue; }
    for (const r of rs) { if (!r.style || !r.selectorText) continue; let m = false; try { m = el.matches(r.selectorText); } catch (e) { m = false; } if (m) { const x = r.style.getPropertyValue(prop).trim(); if (x) v = x; } }
  }
  return v;
}
function slideRatio() {
  if (isDoc() || !S.doc || S.doc.querySelector('deck-stage')) return 0;
  const s = slides()[0]; if (!s) return 0;
  const w = declared(s, 'width'), h = declared(s, 'height');
  if (!PX.test(w) || !PX.test(h)) return 0;
  const r = parseFloat(w) / parseFloat(h); return r > 0.3 && r < 4 ? r : 0;
}
api.slideRatio = slideRatio;
api.viewKind = () => S.view;
api.isDoc = isDoc;
// 문서에서 지금 보고 있는 덩어리: 화면 위쪽 1/3 지점을 덮는 것
function docIndex() {
  const l = S.units || []; const y = S.win.innerHeight / 3; let best = 0;
  l.forEach((e, i) => { const r = e.getBoundingClientRect(); if (r.top <= y) best = i; });
  return best;
}
// 문서 덩어리 중 화면 좌표 y를 품은 것(코멘트 위치 계산용)
function unitAt(y) { const l = slides(); const i = l.findIndex((e) => { const r = e.getBoundingClientRect(); return y >= r.top && y <= r.bottom; }); return i >= 0 ? i : (isDoc() ? docIndex() : S.cur); }
