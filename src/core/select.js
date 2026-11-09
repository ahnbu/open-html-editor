// 요소 고르기
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// ---------- 고르기 ----------
const CS = (e) => S.win.getComputedStyle(e);
function isSlideRoot(e) { return !e || e === S.doc.body || e === S.doc.documentElement || slides().includes(e) || e.matches('deck-stage,.s-body,main,#deck'); }
function pick(t) {
  if (!t || t.nodeType !== 1) return null;
  if (t.closest('svg')) { let s = t.closest('svg'); while (s.parentElement && s.parentElement.closest('svg')) s = s.parentElement.closest('svg'); t = s; }
  if (t.closest('td,th')) return t.closest('td,th');
  let e = t;
  while (e && !isSlideRoot(e)) {
    const cs = CS(e);
    if (e.tagName === 'IMG' || e.tagName === 'SVG' || e.tagName === 'svg' || (cs.display !== 'inline' && cs.display !== 'contents')) {
      const r = e.getBoundingClientRect();
      if (r.width > 1 && r.height > 1) return e;
    }
    e = e.parentElement;
  }
  return null;
}
function clearSel() { S.sel = []; markSel(); ui().onSelect(); }
function setSel(list) { S.sel = list.filter(Boolean); markSel(); ui().onSelect(); }
api.selectEl = (e) => setSel([e]);
