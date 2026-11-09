// 수정 기록: 되돌리기·다시 하기와 고친 곳 표시
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// ---------- 수정 기록 ----------
// 저장 시점에서 몇 걸음 떨어졌나(③f). 되돌리기로 저장 시점보다 앞으로 가면 음수가 되고,
// 그 상태에서 새로 고치면 저장본으로 돌아갈 길이 없어진다(saveLost). 0 밑으로 막지 않는다.
function bumpDirty() { if (S.dirty < 0) S.saveLost = true; S.dirty += 1; }
const isDirty = () => S.dirty !== 0 || !!S.saveLost;
api.isDirty = isDirty;
api.unsavedCount = () => Math.max(1, Math.abs(S.dirty));
function begin() { if (S.mo) S.mo.takeRecords(); S.buf = []; S.opOpen = true; }
function end(label, scope) {
  S.opOpen = false;
  let recs = [...S.buf, ...S.mo.takeRecords()]; S.buf = [];
  recs = recs.filter((r) => {
    if (r.type === 'attributes' && !(r.attributeName === 'style' || ALLOW_ATTR.has(r.attributeName))) return false;
    if (scope && !scope.some((s) => s.contains(r.target) || r.target.contains(s))) return false;
    return true;
  });
  if (!recs.length) return;
  S.undo.push({ type: 'dom', recs, label }); S.redo = []; bumpDirty(); markTouched(recs); ui().onChange(label);
}
function op(label, fn, scope) { begin(); const r = fn(); end(label, scope); return r; }
const idOf = (n) => { const e = n.nodeType === 1 ? n : n.parentElement; const h = e && e.closest(`[${ID}],[${NEW}]`); return h; };
function markTouched(recs) {
  for (const r of recs) {
    const h = idOf(r.target); if (!h) continue;
    if (h.hasAttribute(NEW)) continue;
    const id = h.getAttribute(ID); const t = S.touched.get(id) || { attrs: new Set(), content: false, struct: false, depth: 0 };
    if (r.type === 'attributes') t.attrs.add(r.attributeName);
    else if (r.type === 'characterData') t.content = true;
    else if (r.type === 'childList') {
      const onlyEl = [...r.addedNodes, ...r.removedNodes].every((n) => n.nodeType === 1 && (n.hasAttribute(NEW) || n.hasAttribute(ID)));
      if (onlyEl && !S.textOp) t.struct = true; else t.content = true;
      for (const n of r.removedNodes) if (n.nodeType === 1 && n.hasAttribute(ID)) { const i = n.getAttribute(ID); const x = S.touched.get(i) || { attrs: new Set() }; x.removed = true; S.touched.set(i, x); }
    }
    S.touched.set(id, t);
  }
}
function applyRecs(recs, reverse) {
  S.mo.takeRecords();
  const list = reverse ? [...recs].reverse() : recs; const redoVals = [];
  for (const r of list) {
    if (r.type === 'attributes') {
      const cur = r.target.getAttribute(r.attributeName); redoVals.push(cur);
      const val = reverse ? r.oldValue : r._new;
      if (val == null) r.target.removeAttribute(r.attributeName); else r.target.setAttribute(r.attributeName, val);
      if (reverse) r._new = cur;
    } else if (r.type === 'characterData') {
      const cur = r.target.data; if (reverse) { r._new = cur; r.target.data = r.oldValue; } else r.target.data = r._new;
    } else {
      const add = reverse ? r.removedNodes : r.addedNodes, rem = reverse ? r.addedNodes : r.removedNodes;
      rem.forEach((n) => n.remove());
      add.forEach((n) => r.target.insertBefore(n, r.nextSibling && r.nextSibling.parentNode === r.target ? r.nextSibling : null));
    }
  }
  S.mo.takeRecords();
}
// MutationRecord는 읽기 전용이라 값을 옮겨 담아 쓴다.
const plainRecs = (recs) => recs.map((r) => ({ type: r.type, target: r.target, attributeName: r.attributeName, oldValue: r.oldValue, addedNodes: [...r.addedNodes], removedNodes: [...r.removedNodes], nextSibling: r.nextSibling, _new: null }));
const endRaw = end;
async function undo() {
  finishText();
  const e = S.undo.pop(); if (!e) return;
  if (e.type === 'doc') { S.redo.push({ type: 'doc', text: ser(S.orig), index: S.cur, label: e.label }); S.orig = parse(e.text); await render(e.index); }
  else { const p = e.plain || (e.plain = plainRecs(e.recs)); applyRecs(p, true); S.redo.push(e); }
  S.dirty -= 1; ui().onChange(T('msg.undone', { label: e.label }));
}
async function redo() {
  finishText();
  const e = S.redo.pop(); if (!e) return;
  if (e.type === 'doc') { S.undo.push({ type: 'doc', text: ser(S.orig), index: S.cur, label: e.label }); S.orig = parse(e.text); await render(e.index); }
  else { applyRecs(e.plain, false); S.undo.push(e); }
  S.dirty += 1; ui().onChange(T('msg.redone', { label: e.label }));
}
function setStyle(el, prop, val) {
  el.style.setProperty(prop, val);
  if (el.hasAttribute(NEW)) return;
  const h = idOf(el); if (!h || h !== el) return;
  const id = el.getAttribute(ID); const set = S.styleTouched.get(id) || new Set(); set.add(prop); S.styleTouched.set(id, set);
}
