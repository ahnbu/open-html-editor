// 저장: 고친 곳만 원문에 입혀 내보내기, 파일 쓰기
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// ---------- 저장 ----------
function clean(html) { return unblob(html).replace(/ data-he(?:-new|-sel)?="[^"]*"/g, '').replace(/ contenteditable="[^"]*"/g, ''); }
function buildPatched() {
  finishText();
  const out = parse(ser(S.orig));
  const live = (id) => S.doc.querySelector(`[${ID}="${id}"]`), oOf = (id) => out.querySelector(`[${ID}="${id}"]`);
  // 1 스타일: 고친 속성만
  for (const [id, props] of S.styleTouched) {
    const l = live(id), o = oOf(id); if (!l || !o) continue;
    for (const p of props) { const v = l.style.getPropertyValue(p); if (v) o.style.setProperty(p, unblob(v), l.style.getPropertyPriority(p)); else o.style.removeProperty(p); }
  }
  // 2 속성(그림 주소 등)
  for (const [id, t] of S.touched) {
    const l = live(id), o = oOf(id); if (!l || !o || !t.attrs) continue;
    for (const a of t.attrs) if (ALLOW_ATTR.has(a)) { const v = l.getAttribute(a); if (v == null) o.removeAttribute(a); else o.setAttribute(a, unblob(v)); }
  }
  // 3 새로 넣은 요소
  S.doc.querySelectorAll(`[${NEW}]`).forEach((n) => {
    if (n.parentElement.closest(`[${NEW}]`)) return;
    const parentLive = n.parentElement.closest(`[${ID}]`); if (!parentLive) return;
    const p = oOf(parentLive.getAttribute(ID)); if (!p) return;
    const tmp = out.createElement(p.tagName === 'TR' ? 'tbody' : 'div');
    tmp.innerHTML = n.tagName === 'TR' ? `<table><tbody>${clean(n.outerHTML)}</tbody></table>` : clean(n.outerHTML);
    const node = n.tagName === 'TR' ? tmp.querySelector('tr') : (n.tagName === 'TD' || n.tagName === 'TH') ? null : tmp.firstElementChild;
    let inserted = node;
    if (n.tagName === 'TD' || n.tagName === 'TH') { const r = out.createElement('tr'); r.innerHTML = clean(n.outerHTML); inserted = r.firstElementChild; }
    let next = n.nextElementSibling; while (next && !next.hasAttribute(ID)) next = next.nextElementSibling;
    const anchor = next ? oOf(next.getAttribute(ID)) : null;
    if (anchor && anchor.parentNode === p) p.insertBefore(inserted, anchor); else p.appendChild(inserted);
  });
  // 4 내용: 바깥 요소가 안쪽을 덮으므로 깊은 것부터
  const content = [...S.touched].filter(([, t]) => t.content).map(([id]) => id).filter((id) => live(id));
  content.map((id) => [id, depth(live(id))]).sort((a, b) => b[1] - a[1]).forEach(([id]) => {
    const o = oOf(id); if (!o) return; const had = o.innerHTML.includes('&nbsp;'); let v = clean(live(id).innerHTML);
    if (!had) v = v.replace(/&nbsp;/g, ' '); // 입력 칸이 넣은 줄바꿈 금지 공백을 원문대로 되돌린다
    o.innerHTML = v;
  });
  // 5 지운 요소
  for (const [id, t] of S.touched) if (t.removed && !live(id)) { const o = oOf(id); if (o) o.remove(); }
  return out;
}
const depth = (e) => { let n = 0; while (e) { n += 1; e = e.parentElement; } return n; };
function exportText(doc) {
  const d = doc || buildPatched(); const t = ser(stripDoc(d));
  return S.bundle ? joinBundle(S.bundle, t) : t;
}
api.exportText = () => exportText();
// 장 파일 반영에 쓰는 장별 값. 키트 canvas 장만 해당한다.
function chapterData(doc) {
  const out = [];
  doc.querySelectorAll('section.slide').forEach((s) => {
    const body = s.querySelector(':scope > .s-body'); if (!body) { out.push({ id: s.id, skip: true }); return; }
    const b = body.cloneNode(true); const h1 = b.querySelector(':scope > h1.s-title'), msg = b.querySelector(':scope > .s-msg');
    const runs = (x) => { const inner = x && x.querySelector(':scope > span'); return inner ? [...inner.childNodes].map((n) => (n.nodeType === 3 ? { t: n.data } : { t: n.textContent, size: n.style && n.style.fontSize, color: n.style && n.style.color, cls: n.className || '' })) : null; };
    const ti = runs(h1), me = runs(msg);
    const hs = h1 && h1.getAttribute('style');
    if (h1) h1.remove(); if (msg) msg.remove();
    out.push({ id: s.id, cls: s.className, title: ti, titleStyle: hs, message: me, body: unblob(b.innerHTML).replace(/ data-he(?:-new|-sel)?="[^"]*"/g, '').trim(), bg: s.getAttribute('style') || '' });
  });
  return out;
}
// 주소로 받는 값. 사이트는 아무것도 받지 않으므로 지금과 같다. deck은 저장 뒤 알릴 발표 창의 주소다.
const params = new URLSearchParams(location.search);
S.live = params.get('live') === '1'; S.startSlide = params.get('slide'); S.deckPath = params.get('deck');
function announceSaved(j) {
  if (!S.deckPath || typeof BroadcastChannel === 'undefined') return;
  const c = new BroadcastChannel('deck-sync:' + S.deckPath);
  c.postMessage({ type: 'deck-updated', live: S.live, changed: j.changedIds || [], orderChanged: !!j.orderChanged }); c.close();
}
// 저장이 실제로 끝났을 때만 변경 표시(편집·코멘트)를 끈다. 취소·실패면 그대로 남겨 닫기 경고가 계속 듣게 한다.
const savedNow = () => { S.dirty = 0; S.saveLost = false; S.commentChanged = false; };
async function save() {
  const d = buildPatched();
  const clone = parse(ser(d)); stripDoc(clone);
  const text = exportText(d);
  S.lastSaved = text;
  if (S.server) {
    // 실패를 완료로 보이면 고친 내용을 잃는다. 변경 표시를 남기고 갱신 알림을 보내지 않는다.
    let j, ok = false;
    try { const res = await fetch('/api/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ html: text, chapters: chapterData(clone) }) }); j = await res.json(); ok = res.ok && !j.error; }
    catch (e) { j = { error: e.message }; }
    if (!ok) { ui().onSaveFailed(j.error || ''); return j; }
    savedNow(); ui().onSaved(j); announceSaved(j); return j;
  }
  return saveLocal(await withHandoff(withComments(text), false), false);
}
// 공유용 파일: 공유 메뉴 토글이 켜져 있으면 받는 분 버튼을 넣어 <이름>_공유.html로 내려받는다.
// 원본 저장과 따로다 — 같은 파일 덮어쓰기·저장 상태·파일 이름은 바꾸지 않는다.
async function shareSave() {
  const text = await withHandoff(withComments(exportText()), S.shareEdit);
  const name = (S.saveName || S.name.replace(/\.html?$/i, '')) + T('file.shareSuffix') + '.html';
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/html' })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  // 마지막 공유 파일에 버튼이 들어갔는지는 따로 둔다 — 그 뒤 일반 저장이 lastSaveHandoff를 바꿔도 「안내문만 복사」가 공유 파일에 맞게(완료 검수 1차 지적)
  S.lastShareText = text; S.lastShareHandoff = S.lastSaveHandoff;
  return { file: name, handoff: S.lastShareHandoff };
}
api.shareSave = shareSave;
// 저장할 파일 이름. 처음에는 원본 이름 뒤에 _수정을 붙여 원본을 덮지 않는다. 제목 막대에서 바꾼다.
const fileName = () => (S.saveName || S.name.replace(/\.html?$/i, '') + T('file.suffix')).replace(/\.html?$/i, '') + '.html';
api.fileName = fileName;
api.rename = (n) => { n = String(n || '').trim().replace(/[\\/:*?"<>|]/g, '').replace(/\.html?$/i, ''); if (!n) return fileName(); S.saveName = n; if (S.handle && S.handle.name !== n + '.html') { S.handle = null; S.handleStamp = 0; } return fileName(); };
// 다른 이름으로 저장으로 고른 파일이 있으면 그 파일에 바로 쓰고, 없으면 내려받는다.
async function saveLocal(text, ask) {
  if (ask && window.showSaveFilePicker) {
    try { S.handle = await window.showSaveFilePicker({ suggestedName: fileName(), types: [{ description: 'HTML', accept: { 'text/html': ['.html', '.htm'] } }] }); S.saveName = S.handle.name.replace(/\.html?$/i, ''); }
    catch (e) { if (e.name === 'AbortError') { ui().onSaveFailed(T('msg.saveCanceled')); return { canceled: true }; } S.handle = null; }
  }
  if (S.handle) {
    // ③e 덮어쓰기 보호: 이 파일에 마지막으로 쓴 뒤 디스크의 파일이 바뀌었으면(AI가 고친 경우 등) 덮어쓰기 전에 묻는다
    if (!ask && S.handleStamp) {
      let now = 0; try { now = (await S.handle.getFile()).lastModified; } catch (e) { /* 읽기 권한이 없으면 묻지 않고 진행 */ }
      if (now && now !== S.handleStamp) {
        const how = await ui().askConflict();
        if (how === 'as') return saveAs();
        if (how !== 'go') { ui().onSaveFailed(T('msg.saveCanceled')); return { canceled: true }; }
      }
    }
    try { const w = await S.handle.createWritable(); await w.write(text); await w.close(); try { S.handleStamp = (await S.handle.getFile()).lastModified; } catch (e) { S.handleStamp = 0; } savedNow(); ui().onSaved({ file: S.handle.name, inPlace: true }); return { file: S.handle.name }; }
    catch (e) { S.handle = null; S.handleStamp = 0; /* 권한이 사라졌으면 내려받기로 */ }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/html' })); a.download = fileName(); document.body.appendChild(a); a.click(); a.remove();
  savedNow(); ui().onSaved({ file: a.download }); return { file: a.download };
}
async function saveAs() {
  if (!window.showSaveFilePicker) { const n = await ui().askName(fileName()); if (n == null) return { canceled: true }; api.rename(n); }
  return saveLocal(await withHandoff(withComments(exportText()), false), true);
}
