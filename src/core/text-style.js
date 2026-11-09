// 글자 서식: 색·크기·굵게·정렬과 덱 대표색
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// ---------- 요소 작업 ----------
const sel1 = () => S.sel[0];
const textTargets = (el) => { const r = [el]; el.querySelectorAll('*').forEach((c) => { if (c.style && (c.style.color || c.style.fontSize || c.childNodes.length)) r.push(c); }); return r; };
const hasRange = () => { if (!S.editing) return false; const s = S.win.getSelection(); return s && !s.isCollapsed && S.editing.contains(s.anchorNode); };
function withRange(style) {
  const s = S.win.getSelection(), rng = s.getRangeAt(0); const sp = S.doc.createElement('span');
  for (const k in style) sp.style[k] = style[k];
  sp.appendChild(rng.extractContents()); rng.insertNode(sp); s.removeAllRanges(); const r2 = S.doc.createRange(); r2.selectNodeContents(sp); s.addRange(r2);
}
function setColor(c) {
  if (hasRange()) { S.textOp = true; withRange({ color: c }); return; }
  const list = S.sel; if (!list.length) return;
  // 안쪽 글자가 덱의 클래스로 색을 따로 받으면 바깥에만 칠해서는 안 바뀐다. 글자를 직접 가진 안쪽 요소에도 칠한다.
  const ownsText = (k) => [...k.childNodes].some((n) => n.nodeType === 3 && n.data.trim());
  op(T('op.color'), () => list.forEach((el) => { setStyle(el, 'color', c); el.querySelectorAll('*').forEach((k) => { if (k.nodeType !== 1 || !k.style || k.closest('svg')) return; if (k.style.color) setStyleDeep(el, k, 'color', c); else if (ownsText(k) && CS(k).color !== CS(el).color) setStyle(k, 'color', c); }); }), list);
  markContentIfDeep(list);
}
// 덱에서 많이 쓴 색. 글자색과 면색을 세어 비슷한 색은 묶는다. 팔레트로 바로 고르게 한다.
function palette(max = 10) {
  if (!S.doc) return []; const count = new Map();
  const hex = (c) => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(c || ''); if (!m || (m[4] != null && +m[4] < 0.5)) return null; return '#' + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, '0')).join('').toUpperCase(); };
  const add = (h, w) => { if (h) count.set(h, (count.get(h) || 0) + w); };
  for (const sec of slides()) sec.querySelectorAll('*').forEach((e) => {
    if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') return; const cs = CS(e);
    const txt = [...e.childNodes].reduce((n, x) => n + (x.nodeType === 3 ? x.data.trim().length : 0), 0);
    if (txt) add(hex(cs.color), 2 + Math.min(txt, 40) / 10);
    if (e.offsetWidth * e.offsetHeight > 400) add(hex(cs.backgroundColor), 1);
  });
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), near = (a, b) => { const x = rgb(a), y = rgb(b); return Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]) + Math.abs(x[2] - y[2]) < 40; };
  const out = []; for (const [h] of [...count].sort((a, b) => b[1] - a[1])) { if (!out.some((o) => near(o, h))) out.push(h); if (out.length >= max) break; }
  return out;
}
api.palette = palette;
function setStyleDeep(root, k, p, v) { k.style.setProperty(p, v); }
function markContentIfDeep(list) { for (const el of list) if (el.querySelector && el.querySelector('[style]')) { const id = el.getAttribute(ID); if (id) { const t = S.touched.get(id) || { attrs: new Set() }; t.content = true; S.touched.set(id, t); } } }
// 요소 안에서 글자가 가장 많은 조각의 크기. 화면에 보이는 크기와 맞추는 기준이다.
function mainSize(el) {
  const w = S.doc.createTreeWalker(el, 4); let best = 0, size = 0;
  for (let t = w.nextNode(); t; t = w.nextNode()) { const n = t.data.trim().length; if (n > best) { best = n; size = parseFloat(CS(t.parentElement).fontSize); } }
  return size || parseFloat(CS(el).fontSize);
}
api.mainSize = mainSize;
function setSize(px) {
  if (hasRange()) { S.textOp = true; withRange({ fontSize: px + 'px' }); return; }
  const list = S.sel; if (!list.length) return;
  op(T('op.size'), () => list.forEach((el) => {
    const base = mainSize(el) || px; const ratio = px / base; setStyle(el, 'font-size', px + 'px');
    el.querySelectorAll('*').forEach((k) => { if (k.style && k.style.fontSize) k.style.fontSize = (parseFloat(CS(k).fontSize) * ratio).toFixed(1) + 'px'; });
  }), list);
  markContentIfDeep(list); ui().onSelect();
}
// 굵게 판정(계획 _docs/20261109_03 1번): 고른 글자가 전부 굵으면 끄고, 하나라도 아니면 켠다. 워드·파워포인트와 같은 규칙.
const isBoldText = (t) => +CS(t.parentElement).fontWeight >= 600;
function textsIn(root, rng) {
  const out = [], w = S.doc.createTreeWalker(root, 4);
  for (let t = w.nextNode(); t; t = w.nextNode()) if (t.data.trim() && (!rng || rng.intersectsNode(t)) && !t.parentElement.closest('svg')) out.push(t);
  return out;
}
const allBold = (list) => list.length > 0 && list.every(isBoldText);
function rangeAllBold() {
  const s = S.win.getSelection(); if (!s || !s.rangeCount) return false; const rng = s.getRangeAt(0);
  const c = rng.commonAncestorContainer, root = c.nodeType === 1 ? c : c.parentElement;
  return allBold(textsIn(root, rng));
}
// 고른 글자의 실제 굵기를 끈다. b·strong은 풀고(글자는 남김), CSS 클래스 등으로 굵던 요소에는 인라인 400을 준다(인라인이 클래스보다 우선).
// 색·크기·링크 같은 다른 서식과 범위 밖 글자는 건드리지 않는다.
function unboldRange() {
  const s = S.win.getSelection(), rng = s.getRangeAt(0), c = rng.commonAncestorContainer, root = c.nodeType === 1 ? c : c.parentElement;
  const MARK = 'data-he-unb', marked = [];
  root.querySelectorAll('*').forEach((e) => { if (rng.intersectsNode(e) && +CS(e).fontWeight >= 600) { e.setAttribute(MARK, ''); marked.push(e); } });
  const frag = rng.extractContents();
  marked.forEach((e) => e.removeAttribute(MARK)); // 범위 밖에 남은 쪽(반만 고른 요소의 원본)은 표시만 지운다
  frag.querySelectorAll('b,strong').forEach((b) => b.replaceWith(...b.childNodes));
  frag.querySelectorAll(`[${MARK}]`).forEach((e) => { e.style.fontWeight = '400'; e.removeAttribute(MARK); });
  const sp = S.doc.createElement('span'); sp.style.fontWeight = '400'; sp.appendChild(frag); rng.insertNode(sp);
  s.removeAllRanges(); const r2 = S.doc.createRange(); r2.selectNodeContents(sp); s.addRange(r2);
}
// 굵게 버튼 눌림 표시: 글자를 고르는 중이면 그 글자, 아니면 고른 상자 안 글자 전체가 기준
function boldState() {
  if (hasRange()) return rangeAllBold();
  return S.sel.length > 0 && S.sel.every((el) => allBold(textsIn(el)));
}
api.boldState = boldState;
function toggleBold() {
  if (hasRange()) { S.textOp = true; if (rangeAllBold()) unboldRange(); else withRange({ fontWeight: '800' }); ui().onSelect(); return; }
  const list = S.sel; if (!list.length) return; const on = boldState();
  // 상자 단위: 상자와 안쪽 글자를 함께 켜고 끈다(안쪽 b·strong·클래스 굵기가 남지 않게). 되돌리기 한 번에 함께 돌아간다.
  op(T('op.bold'), () => list.forEach((el) => {
    setStyle(el, 'font-weight', on ? '400' : '800');
    el.querySelectorAll('*').forEach((k) => { if (k.nodeType !== 1 || !k.style || k.closest('svg')) return; const b = +CS(k).fontWeight >= 600; if (on ? b : !b && [...k.childNodes].some((n) => n.nodeType === 3 && n.data.trim())) setStyleDeep(el, k, 'font-weight', on ? '400' : '800'); });
  }), list);
  markContentIfDeep(list); ui().onSelect();
}
const align = (v) => S.sel.length && op(T('op.textAlign'), () => S.sel.forEach((el) => setStyle(el, 'text-align', v)), S.sel);
