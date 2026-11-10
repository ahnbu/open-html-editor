// 마우스·키보드 입력
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// ---------- 입력 ----------
// 투명한 덧씌움(클릭 영역 등) 아래 보이는 요소를 고른다.
function visibleBox(e) {
  if (e.tagName === 'IMG' || e.tagName.toLowerCase() === 'svg' || e.closest('svg')) return true;
  if ([...e.childNodes].some((n) => n.nodeType === 3 && n.data.trim())) return true;
  const cs = CS(e); if (cs.backgroundImage !== 'none') return true;
  const bg = cs.backgroundColor; if (bg && bg !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(bg)) return true;
  return parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none';
}
function under(e) {
  const stack = S.doc.elementsFromPoint(e.clientX, e.clientY);
  const empty = (x) => !x.textContent.trim() && !x.querySelector('img,svg') && x.tagName !== 'IMG' && x.tagName.toLowerCase() !== 'svg';
  const holds = (x) => x.tagName === 'IMG' || x.tagName.toLowerCase() === 'svg' || [...x.childNodes].some((n) => n.nodeType === 3 && n.data.trim());
  let first = null;
  for (const x of stack) { if (isSlideRoot(x)) break; if (!visibleBox(x)) continue; if (!first) { first = x; if (!empty(x)) return x; } else if (holds(x)) return x; }
  return first || e.target;
}
// 그 자리에 겹친 요소를 위에서부터. 같은 자리를 다시 누르면 다음 요소로 내려간다.
function layersAt(x, y) {
  const out = [];
  for (const n of S.doc.elementsFromPoint(x, y)) { if (isSlideRoot(n)) break; if (!visibleBox(n)) continue; const p = pick(n); if (p && !out.includes(p)) out.push(p); }
  return out;
}
// 더블클릭: 위에 그림이 덮여 있어도 그 자리의 글자를 고른다.
function textAt(e) {
  for (const n of S.doc.elementsFromPoint(e.clientX, e.clientY)) {
    if (isSlideRoot(n)) break;
    if ([...n.childNodes].some((c) => c.nodeType === 3 && c.data.trim())) { const p = pick(n); if (p && p.tagName !== 'IMG') return p; }
  }
  return null;
}
// ⓒ 문서가 클릭을 막아 둔 글자(pointer-events:none — 지구본·영상 위에 얹은 제목 등)는 elementsFromPoint에 잡히지 않는다(해커톤 15차 2위 제목).
// 그 자리를 덮는 보이는 글자 요소 중 가장 작은 것을 고른다. 더블클릭에서 위 방법으로 못 찾았을 때만 쓴다.
function textByBox(x, y) {
  const shown = (e) => { for (let n = e; n && n !== S.doc.body; n = n.parentElement) { const cs = CS(n); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false; } return true; };
  // 글자를 품은 요소 중 그 자리를 덮는 가장 작은 것(줄 사이 빈자리를 눌러도 제목 전체가 잡히게 글자 노드가 아니라 요소로 본다)
  let best = null, area = Infinity;
  for (const e of S.doc.body.querySelectorAll('*')) {
    if (isSlideRoot(e) || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|svg|SVG|CANVAS|VIDEO|IMG)$/.test(e.tagName) || e.closest('svg')) continue;
    const r = e.getBoundingClientRect(); if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
    const a = r.width * r.height; if (a >= area || !e.textContent.trim()) continue;
    if (shown(e)) { area = a; best = e; }
  }
  const p = best && pick(best); return p && p.tagName !== 'IMG' ? p : null;
}
api.layersAt = layersAt;
// 장표 확대(계획 _docs/20261109_03 2번)의 엔진 차이 보정. 사파리(webkit)는 확대된 무대 안에서 요소 위치(getBoundingClientRect·elementsFromPoint)를
// 마우스 이벤트 좌표(clientX)보다 1/배율 작은 단위로 준다(2026-11-09 실측). 크롬·파이어폭스는 둘이 같아 1이다.
// 배율 1일 때의 「요소 위치 ÷ CSS 크기」를 기준으로 잡아, 덱 자체에 zoom이 걸린 문서도 기준이 같아 1로 남는다.
function rectK() {
  // 문서(구역·쪽)는 배율을 문서 안 html에 준다 — 요소 좌표와 마우스 좌표가 같은 화면 단위라 보정이 없다(계획 _docs/20261110_01 8번 실측)
  if (isDoc()) return 1;
  const de = S.doc && S.doc.documentElement; if (!de || !de.offsetWidth) return 1;
  const r = de.getBoundingClientRect().width / de.offsetWidth || 1;
  if ((S.zoom || 1) === 1) { S.rectBase = r; return 1; }
  return r / (S.rectBase || 1);
}
api.rectK = rectK;
// 무대 안 이벤트의 좌표를 요소 위치 단위로 바꾼 것(배율 1·크롬·파이어폭스는 그대로)
const pt = (e) => { const k = rectK(); return k === 1 ? e : { clientX: e.clientX * k, clientY: e.clientY * k, target: e.target }; };
function hookEvents(win) {
  if (win.__heHooked) return; win.__heHooked = true;
  // ⑧e 편집 화면에 파일을 끌어다 놓으면 다른 파일 열기와 같다(틀 안의 놓기는 바깥 창에 오지 않는다). 글자 끌기는 그대로 둔다.
  const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  // 파일을 끄는 동안 화면 쪽 덮개를 띄운다(계획 _docs/20261110_01 9번) — 틀 안의 끌기는 바깥 창에 오지 않아 여기서 알린다
  win.addEventListener('dragover', (e) => { if (hasFiles(e)) { e.preventDefault(); const u = ui(); if (u.onFileDrag) u.onFileDrag(true); } }, true);
  win.addEventListener('drop', (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.stopImmediatePropagation(); const u = ui(); if (u.onFileDrag) u.onFileDrag(false); u.onDropFiles(e.dataTransfer); }, true);
  const block = (e) => { if (S.bypass || S.mode === 'view') return false; e.stopImmediatePropagation(); return true; };
  let dragging = null, press = null, lastUp = 0, cycledFrom = null;
  win.addEventListener('pointerdown', (e) => {
    if (!block(e)) return; if (S.editing && S.editing.contains(e.target)) return;
    const q = pt(e);
    // 코멘트 모드: 누른 자리에 코멘트를 단다. 요소는 옮기지 않는다.
    if (S.mode === 'comment') { e.preventDefault(); finishText(); const c = addComment(q.clientX, q.clientY, pick(under(q))); if (c) ui().onComments(c.id); return; }
    finishText(); let t = pick(under(q));
    // 아래로 내려가 고른 요소는 그 자리에서 다시 눌러도 유지해야 끌어 옮길 수 있다.
    const low = S.sel.length === 1 && S.cycled === S.sel[0] && layersAt(q.clientX, q.clientY).includes(S.sel[0]) ? S.sel[0] : null;
    if (low) t = low;
    if (!t) { clearSel(); S.cycled = null; press = null; return; }
    e.preventDefault();
    if (e.shiftKey) { setSel(S.sel.includes(t) ? S.sel.filter((x) => x !== t) : [...S.sel, t]); S.cycled = null; press = null; return; }
    press = { x: q.clientX, y: q.clientY, again: S.sel.length === 1 && S.sel[0] === t };
    if (!S.sel.includes(t)) { setSel([t]); S.cycled = null; }
    if (t.closest('td,th')) return;
    dragging = { x: q.clientX, y: q.clientY, moved: false, els: S.sel.slice(), last: { x: 0, y: 0 }, s: scaleOf(t) };
  }, true);
  win.addEventListener('pointermove', (e) => {
    if (S.mode === 'view') return; e.stopImmediatePropagation();
    if (!dragging) return;
    const q = pt(e);
    if (!dragging.moved && Math.abs(q.clientX - dragging.x) + Math.abs(q.clientY - dragging.y) < 4) return;
    if (!dragging.moved) { dragging.moved = true; dragging.px = dragging.x; dragging.py = dragging.y; dragging.ax = 0; dragging.ay = 0; begin(); }
    // Ctrl(맥은 Cmd)·Alt를 누르면 마우스의 1/5만 움직인다. 누르고 떼도 튀지 않게 조금씩 더한다.
    const fine = e.ctrlKey || e.metaKey || e.altKey ? 0.2 : 1;
    dragging.ax += (q.clientX - dragging.px) / dragging.s * fine; dragging.ay += (q.clientY - dragging.py) / dragging.s * fine; dragging.px = q.clientX; dragging.py = q.clientY;
    let dx = dragging.ax, dy = dragging.ay;
    // Shift를 누르면 많이 움직인 쪽(가로 또는 세로)으로만 옮긴다.
    if (e.shiftKey) { if (Math.abs(dx) >= Math.abs(dy)) dy = 0; else dx = 0; }
    moveBy(dragging.els, dx - dragging.last.x, dy - dragging.last.y); dragging.last = { x: dx, y: dy }; ui().syncOverlay();
  }, true);
  const up = (e) => {
    if (S.mode === 'view') return; e.stopImmediatePropagation();
    const moved = dragging && dragging.moved;
    if (moved) end(T('op.move'), dragging.els); dragging = null;
    // 이미 고른 요소를 움직이지 않고 다시 누르면 아래 요소로. 더블클릭의 두 번째 누름은 빼고 센다.
    const now = e.timeStamp, quick = now - lastUp < 400; lastUp = now;
    if (e.type === 'pointerup' && press && press.again && !moved && !quick && !S.editing && S.sel.length === 1) {
      const list = layersAt(press.x, press.y), i = list.indexOf(S.sel[0]);
      // 더블클릭의 첫 누름도 여기로 온다. 내려가 고른 글자를 더블클릭하면 그 글자를 고쳐야 하므로 직전 요소를 기억한다.
      if (list.length > 1 && i >= 0) { cycledFrom = S.cycled === S.sel[0] ? { el: S.sel[0], at: now } : null; const next = list[(i + 1) % list.length]; setSel([next]); S.cycled = next; }
    } else if (e.type === 'pointerup' && press && !press.again && !moved && !S.editing && S.sel.length === 1 && layersAt(press.x, press.y).length > 1) ui().onLayers();
    press = null;
  };
  win.addEventListener('pointerup', up, true); win.addEventListener('pointercancel', up, true);
  // Ctrl(맥 Cmd)+휠·트랙패드 집기는 브라우저 전체가 아니라 장표만 확대·축소한다(계획 _docs/20261109_03 2번). 화면 층이 배율을 바꾼다.
  win.addEventListener('wheel', (e) => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); e.stopImmediatePropagation(); const u = ui(); if (u.onZoomWheel) u.onZoomWheel(e); }, { capture: true, passive: false });
  // 글자를 고르는 동안 굵게 눌림 표시를 고른 글자 기준으로 맞춘다
  win.document.addEventListener('selectionchange', () => { if (S.editing) ui().onSelect(); });
  for (const t of ['mousedown', 'mouseup', 'click', 'auxclick', 'touchstart', 'touchend', 'wheel', 'contextmenu', 'dragstart', 'submit']) {
    win.addEventListener(t, (e) => { if (S.bypass || S.mode === 'view') return; if (S.editing && S.editing.contains(e.target)) { e.stopImmediatePropagation(); return; } e.stopImmediatePropagation(); if (t !== 'wheel' && t !== 'mousedown') e.preventDefault(); }, { capture: true, passive: false });
  }
  win.addEventListener('dblclick', (e) => {
    if (S.mode === 'view') return; e.stopImmediatePropagation(); e.preventDefault();
    // 다시 눌러 아래 글자까지 내려갔으면 맨 위 글자가 아니라 그 글자를 고친다.
    const q = pt(e);
    const hit = layersAt(q.clientX, q.clientY), down = [cycledFrom && e.timeStamp - cycledFrom.at < 600 ? cycledFrom.el : null, S.cycled].find((x) => x && hit.includes(x) && x.tagName !== 'IMG' && x.tagName.toLowerCase() !== 'svg' && x.textContent.trim());
    cycledFrom = null;
    const t = down || textAt(q) || textByBox(q.clientX, q.clientY) || pick(under(q));
    if (t && t.tagName !== 'IMG' && t.tagName.toLowerCase() !== 'svg' && t.textContent.trim()) startText(t);
  }, true);
  for (const t of ['keydown', 'keyup', 'keypress']) win.addEventListener(t, (e) => { if (S.bypass || S.mode === 'view') return; e.stopImmediatePropagation(); if (t === 'keydown') onKey(e); }, true);
  win.addEventListener('paste', onPaste, true);
}
async function onPaste(e) {
  if (S.mode === 'view') return; const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
  if (item) { e.preventDefault(); const f = item.getAsFile(); if (sel1() && sel1().tagName === 'IMG') await replaceImage(f); else await addImage(f); return; }
  if (S.editing) { e.preventDefault(); const t = e.clipboardData.getData('text/plain'); S.doc.execCommand('insertText', false, t); return; }
  if (S.clip) { e.preventDefault(); pasteEl(); }
}
// 한글 입력 상태에서도 듣도록 key가 아니라 code로 판정한다.
function onKey(e) {
  if (e.isComposing) return; const mod = e.ctrlKey || e.metaKey, c = e.code;
  if (mod && c === 'KeyS') { e.preventDefault(); if (e.shiftKey) saveAs(); else save(); return; }
  if (mod && c === 'KeyO' && !e.shiftKey && !e.altKey) { e.preventDefault(); ui().onOpenKey(); return; } // ⑧e 다른 파일 열기(브라우저 기본 열기를 막는다)
  if (mod && c === 'KeyP' && !e.shiftKey && !e.altKey) { e.preventDefault(); ui().onPrintKey(); return; } // PDF로 저장 — 글자 입력 중에도(계획 _docs/20261105_04 3b)
  if (mod && c === 'KeyF' && !e.shiftKey && !e.altKey) { e.preventDefault(); if (ui().onFindKey) ui().onFindKey(); return; } // 찾기 막대(계획 _docs/20261110_01 3번) — 문서 안 키는 여기서만 받는다
  if (S.editing) { if (c === 'Escape') { e.preventDefault(); finishText(); } return; }
  if (mod && c === 'KeyZ') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if (mod && c === 'KeyY') { e.preventDefault(); redo(); return; }
  if (mod && c === 'KeyC') { copyEl(); return; }
  if (mod && c === 'KeyD') { e.preventDefault(); dupEl(); return; }
  if (c === 'Delete' || c === 'Backspace') { e.preventDefault(); removeSel(); return; }
  if (c === 'Escape') { if (S.mode === 'comment' && !S.sel.length) { ui().onEsc(); return; } clearSel(); return; }
  if (c === 'Enter' && sel1()) { e.preventDefault(); if (sel1().textContent.trim() && sel1().tagName !== 'IMG') startText(sel1()); return; }
  const arrow = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[c];
  if (arrow) {
    e.preventDefault(); const k = e.shiftKey ? 10 : 1;
    if (S.sel.length) { op(T('op.move'), () => moveBy(S.sel, arrow[0] * k, arrow[1] * k), S.sel); ui().syncOverlay(); }
    else goTo(S.cur + (arrow[0] || arrow[1]));
    return;
  }
  if (c === 'PageDown') { e.preventDefault(); goTo(S.cur + 1); } if (c === 'PageUp') { e.preventDefault(); goTo(S.cur - 1); }
}
