// 찾아 바꾸기와 글자 직접 고치기
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// 찾아 바꾸기
function replaceAll(a, b) {
  if (!a) return 0; let n = 0; const root = S.doc.body; const w = S.doc.createTreeWalker(root, 4 /* 글자 */); const hits = [];
  for (let t = w.nextNode(); t; t = w.nextNode()) { const pn = t.parentElement; if (pn && pn.closest('script,style,noscript')) continue; if (t.data.includes(a)) hits.push(t); }
  if (!hits.length) return 0;
  S.textOp = true; op(T('op.replace'), () => hits.forEach((t) => { n += t.data.split(a).length - 1; t.data = t.data.split(a).join(b); })); S.textOp = false; return n;
}
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
