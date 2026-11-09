// 개체 작업: 삭제·이동·크기·순서·맞춤·글상자·그림·복제·붙여넣기
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
function removeSel() {
  const list = S.sel.slice(); if (!list.length) return;
  begin(); list.forEach((e) => e.remove()); end(T('op.delete'));
  clearSel();
}
function moveBy(list, dx, dy) {
  list.forEach((el) => {
    const cs = CS(el);
    if (cs.position === 'static') { setStyle(el, 'position', 'relative'); }
    const pos = CS(el).position;
    const left = parseFloat(cs.left) || 0, top = parseFloat(cs.top) || 0;
    setStyle(el, 'left', (left + dx).toFixed(1) + 'px'); setStyle(el, 'top', (top + dy).toFixed(1) + 'px');
    if (pos !== 'relative') { if (cs.right !== 'auto') setStyle(el, 'right', 'auto'); if (cs.bottom !== 'auto') setStyle(el, 'bottom', 'auto'); }
  });
}
function resizeTo(el, w, h, dx, dy) {
  if (el.tagName === 'IMG' && /flex|grid/.test(CS(el.parentElement).display)) { setStyle(el, 'flex', '0 0 auto'); setStyle(el, 'align-self', 'flex-start'); setStyle(el, 'justify-self', 'start'); setStyle(el, 'min-height', '0'); setStyle(el, 'max-height', 'none'); }
  if (w != null) setStyle(el, 'width', w.toFixed(1) + 'px');
  if (h != null) setStyle(el, 'height', h.toFixed(1) + 'px');
  if (dx || dy) moveBy([el], dx || 0, dy || 0);
}
function zOrder(front) {
  if (!S.sel.length) return; const sec = sectionOf(S.sel[0]); const zs = [...sec.querySelectorAll('*')].map((e) => parseInt(CS(e).zIndex, 10)).filter((n) => !Number.isNaN(n));
  const v = front ? Math.max(0, ...zs) + 1 : Math.min(0, ...zs) - 1;
  op(front ? T('op.front') : T('op.back'), () => S.sel.forEach((el) => { if (CS(el).position === 'static') setStyle(el, 'position', 'relative'); setStyle(el, 'z-index', String(v)); }), S.sel);
}
// 파워포인트와 같은 여섯 가지 맞춤. 가로: left·center·right, 세로: top·middle·bottom
function alignMany(how) {
  if (S.sel.length < 2) return; const rs = S.sel.map((e) => e.getBoundingClientRect()); const s = scaleOf(S.sel[0]);
  const L = Math.min(...rs.map((r) => r.left)), TOP = Math.min(...rs.map((r) => r.top)), R = Math.max(...rs.map((r) => r.right)), B = Math.max(...rs.map((r) => r.bottom));
  const to = { left: (r) => [L - r.left, 0], center: (r) => [(L + R) / 2 - (r.left + r.right) / 2, 0], right: (r) => [R - r.right, 0], top: (r) => [0, TOP - r.top], middle: (r) => [0, (TOP + B) / 2 - (r.top + r.bottom) / 2], bottom: (r) => [0, B - r.bottom] }[how];
  if (!to) return;
  op(T('op.align'), () => S.sel.forEach((el, i) => { const [dx, dy] = to(rs[i]); if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) moveBy([el], dx / s, dy / s); }), S.sel);
}
function hostOf() { const sec = slides()[S.cur]; return (sec && sec.querySelector(':scope > .s-body')) || sec || S.doc.body; }
function placeNew(el, x, y) {
  el.setAttribute(NEW, '1'); el.style.position = 'absolute'; el.style.left = x + 'px'; el.style.top = y + 'px';
  op(T('op.new'), () => hostOf().appendChild(el)); setSel([el]); return el;
}
function addTextBox(text) {
  const sec = slides()[S.cur]; const w = sec.offsetWidth || 1280; const t = S.doc.createElement('div');
  t.textContent = text || T('obj.newText'); t.style.fontSize = Math.round(w / 40) + 'px'; t.style.color = '#111827'; t.style.zIndex = '50';
  t.style.width = Math.round(w * 0.3) + 'px';
  return placeNew(t, Math.round(w * 0.1), Math.round((sec.offsetHeight || 720) * 0.15));
}
const toData = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
// 그림 위에 덧씌운 요소를 골랐어도 그 아래 그림을 대상으로 삼는다.
function imgTarget() {
  const e = sel1(); if (!e) return null; if (e.tagName === 'IMG') return e;
  const r = e.getBoundingClientRect();
  return S.doc.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).find((x) => x.tagName === 'IMG') || null;
}
api.imgTarget = imgTarget;
async function replaceImage(file) {
  const el = imgTarget(); if (!el) return; const url = await toData(file); const r = el.getBoundingClientRect(), s = scaleOf(el);
  op(T('op.imgChange'), () => { setStyle(el, 'width', (r.width / s).toFixed(1) + 'px'); setStyle(el, 'height', (r.height / s).toFixed(1) + 'px'); setStyle(el, 'object-fit', 'contain'); el.setAttribute('src', url); }, [el]);
}
async function addImage(file) {
  const sec = slides()[S.cur], w = sec.offsetWidth || 1280; const url = await toData(file); const im = S.doc.createElement('img'); im.src = url; im.style.width = Math.round(w * 0.3) + 'px'; im.style.zIndex = '50';
  return placeNew(im, Math.round(w * 0.35), Math.round((sec.offsetHeight || 720) * 0.25));
}
function dupEl() {
  const el = sel1(); if (!el || !el.parentElement) return; const c = el.cloneNode(true); c.querySelectorAll(`[${ID}]`).forEach((e) => e.removeAttribute(ID)); c.removeAttribute(ID); c.setAttribute(NEW, '1');
  const cs = CS(el); op(T('op.dup'), () => { el.after(c); if (cs.position === 'static') c.style.position = 'relative'; c.style.left = (parseFloat(cs.left) || 0) + 24 + 'px'; c.style.top = (parseFloat(cs.top) || 0) + 24 + 'px'; }); setSel([c]);
}
function copyEl() { const el = sel1(); if (el) S.clip = clean(el.outerHTML); }
function pasteEl() {
  if (!S.clip) return; const box = S.doc.createElement('div'); box.innerHTML = S.clip; const c = box.firstElementChild; c.setAttribute(NEW, '1');
  c.style.left = (parseFloat(c.style.left) || 0) + 24 + 'px'; c.style.top = (parseFloat(c.style.top) || 0) + 24 + 'px';
  if (!c.style.position) c.style.position = 'absolute';
  op(T('op.paste'), () => hostOf().appendChild(c)); setSel([c]);
}
