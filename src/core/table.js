// 표 행·열
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// 표
const cellOf = () => { const e = sel1(); return e && e.closest && e.closest('td,th'); };
const tableOf = () => { const e = sel1(); return e && e.closest && e.closest('table'); };
function rowAdd() {
  const c = cellOf(); if (!c) return; const tr = c.parentElement, n = tr.cloneNode(true);
  n.querySelectorAll(`[${ID}]`).forEach((e) => e.removeAttribute(ID)); n.removeAttribute(ID); n.setAttribute(NEW, '1'); n.querySelectorAll('td,th').forEach((x) => { x.textContent = ''; });
  op(T('op.rowAdd'), () => tr.after(n));
}
function colAdd() {
  const c = cellOf(); if (!c) return; const i = c.cellIndex, t = tableOf();
  op(T('op.colAdd'), () => [...t.rows].forEach((r) => { const o = r.cells[Math.min(i, r.cells.length - 1)]; const x = o.cloneNode(false); x.removeAttribute(ID); x.setAttribute(NEW, '1'); x.textContent = ''; o.after(x); }));
}
function rowDel() { const c = cellOf(); if (!c) return; const tr = c.parentElement; begin(); tr.remove(); end(T('op.rowDel')); clearSel(); }
function colDel() { const c = cellOf(); if (!c) return; const i = c.cellIndex, t = tableOf(); begin(); [...t.rows].forEach((r) => { if (r.cells[i]) r.cells[i].remove(); }); end(T('op.colDel')); clearSel(); }
