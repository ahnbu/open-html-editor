// 찾아 바꾸기와 글자 직접 고치기
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// 찾아 바꾸기
function replaceAll(a, b) {
  if (!a) return 0; let n = 0; const root = S.doc.body; const w = S.doc.createTreeWalker(root, 4 /* 글자 */); const hits = [];
  for (let t = w.nextNode(); t; t = w.nextNode()) { const pn = t.parentElement; if (pn && pn.closest('script,style,noscript')) continue; if (t.data.includes(a)) hits.push(t); }
  if (!hits.length) return 0;
  S.textOp = true; op(T('op.replace'), () => hits.forEach((t) => { n += t.data.split(a).length - 1; t.data = t.data.split(a).join(b); })); S.textOp = false; return n;
}
// 찾기(계획 _docs/20261110_01 3번): 문서 글자에서 q가 나오는 자리를 문서 순서대로 범위(Range)로 돌려준다. 문서는 바꾸지 않는다.
function findAll(q) {
  const out = []; if (!q || !S.doc || !S.doc.body) return out;
  const w = S.doc.createTreeWalker(S.doc.body, 4);
  for (let t = w.nextNode(); t; t = w.nextNode()) {
    const pn = t.parentElement; if (pn && pn.closest('script,style,noscript,template')) continue;
    for (let i = t.data.indexOf(q); i >= 0; i = t.data.indexOf(q, i + q.length)) { const r = S.doc.createRange(); r.setStart(t, i); r.setEnd(t, i + q.length); out.push(r); }
  }
  return out;
}
// 찾은 자리 칠하기: CSS Highlight API — 문서 DOM에 표시를 넣지 않으므로 변경 기록·저장본에 섞이지 않는다. 색은 편집기 스타일(#he-style)에 있다.
function setFindHighlight(list, cur) {
  const H2 = S.win && S.win.CSS && S.win.CSS.highlights; if (!H2 || !S.win.Highlight) return;
  H2.set('he-find', new S.win.Highlight(...list.filter((_, i) => i !== cur)));
  H2.set('he-find-cur', new S.win.Highlight(...(list[cur] ? [list[cur]] : [])));
}
function clearFind() { const H2 = S.win && S.win.CSS && S.win.CSS.highlights; if (H2) { H2.delete('he-find'); H2.delete('he-find-cur'); } }
// 찾은 자리 한 곳만 바꾼다(되돌리기 한 번에 돌아간다)
function replaceOne(r, b) {
  const t = r.startContainer; if (!t || t.nodeType !== 3 || r.endContainer !== t) return false;
  const s = r.startOffset, e = r.endOffset;
  S.textOp = true; op(T('op.replace'), () => { t.data = t.data.slice(0, s) + b + t.data.slice(e); }); S.textOp = false; return true;
}
// 찾은 자리를 보이게: 덱이면 그 장으로 넘기고, 문서면 그 자리를 화면 가운데쯤으로 굴린다
async function revealRange(r) {
  const el = r.startContainer.parentElement; if (!el) return;
  const k = slides().findIndex((s) => s.contains(el));
  if (!isDoc()) { if (k >= 0 && k !== S.cur) await goTo(k); return; }
  const rr = r.getBoundingClientRect(), y = S.win.scrollY + rr.top - S.win.innerHeight / 3;
  if (rr.top < 0 || rr.bottom > S.win.innerHeight) { S.docPin = null; S.win.scrollTo({ top: Math.max(0, y), behavior: 'instant' }); }
}
Object.assign(api, { findAll, setFindHighlight, clearFind, replaceOne, revealRange });
// 글자 편집
function startText(el) {
  if (S.editing === el) return; finishText();
  S.editing = el; begin(); S.textOp = true; el.setAttribute('contenteditable', 'true'); el.focus(); setSel([el]); ui().onEditing(true);
}
function finishText() {
  const el = S.editing; if (!el) return; S.editing = null; el.removeAttribute('contenteditable');
  end(T('op.textEdit'), [el]); S.textOp = false; const s = S.win.getSelection(); if (s) s.removeAllRanges(); ui().onEditing(false);
}
const finishRangeOp = (label) => { if (S.editing) { /* 입력 중 범위 서식은 글자 수정에 함께 기록된다 */ ui().onChange(label); } };
