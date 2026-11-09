// 장 단위 작업(복제·삭제·순서)
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// ---------- 장 단위 작업: 원문에 적용하고 다시 띄운다 ----------
async function docOp(label, fn) {
  if (S.live || isDoc()) return; // 발표 중에는 장을 늘리거나 옮기지 않는다(청중 창과 번호로 맞추는 구조가 흔들린다). 문서는 장 작업이 없다.
  while (S.rendering) await S.rendering;
  const before = ser(S.orig), idx = S.cur, out = buildPatched();
  const list = sourceSlides(out); const r = fn(out, list, idx);
  S.undo = S.undo.filter((e) => e.type === 'doc'); S.undo.push({ type: 'doc', text: before, index: idx, label }); S.redo = [];
  S.orig = out; bumpDirty(); addIds(S.orig);
  await render(r == null ? idx : r); ui().onChange(label);
}
function sourceSlides(d) {
  const ids = slides().map((s) => s.getAttribute(ID)).filter(Boolean);
  if (ids.length) return ids.map((i) => d.querySelector(`[${ID}="${i}"]`)).filter(Boolean);
  return [...d.querySelectorAll('section')];
}
const dupSlide = () => docOp(T('op.slideDup'), (d, l, i) => {
  const c = l[i].cloneNode(true); c.querySelectorAll(`[${ID}]`).forEach((e) => e.removeAttribute(ID)); c.removeAttribute(ID);
  c.classList.remove('is-active', 'is-prev', 'active', 'present'); if (c.id) c.id = c.id + '-copy' + (S.nextId++);
  l[i].after(c); return i + 1;
});
const delSlide = () => { if (slides().length < 2) return; return docOp(T('op.slideDel'), (d, l, i) => { l[i].remove(); return Math.max(0, i - (i === l.length - 1 ? 1 : 0)); }); };
const moveSlide = (dir) => docOp(dir < 0 ? T('op.slidePrev') : T('op.slideNext'), (d, l, i) => {
  const j = i + dir; if (j < 0 || j >= l.length) return i;
  if (dir < 0) l[j].before(l[i]); else l[j].after(l[i]); return j;
});
const reorderSlides = (from, to) => docOp(T('op.slideOrder'), (d, l) => { if (from === to) return to; if (from < to) l[to].after(l[from]); else l[to].before(l[from]); return to; });
