// 새로고침해도 편집을 잇는다: 탭마다 지금 문서 상태(편집·코멘트 포함)를 이 브라우저의 IndexedDB에 둔다. 어디에도 보내지 않는다.
// 탭 구분은 sessionStorage의 탭 번호 — 새로고침에는 남고 새 탭·새 창에는 없다. 그래서 다른 탭의 작업을 엉뚱하게 열지 않는다.
// 실행 취소 기록과 「같은 파일에 덮어쓰기」 권한(파일 핸들)은 되살리지 않는다. 저장 안 한 변경이 있었으면 되살린 뒤에도 변경 있음으로 둔다.
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
const DRAFT_DB = 'openditor', DRAFT_STORE = 'drafts', DRAFT_KEEP_MS = 3 * 864e5;
function draftTab() {
  try { let id = sessionStorage.getItem('he-tab'); if (!id) { id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); sessionStorage.setItem('he-tab', id); } return id; }
  catch (e) { return null; }
}
function draftDb() {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') { rej(new Error('no indexedDB')); return; }
    const r = indexedDB.open(DRAFT_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(DRAFT_STORE);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function draftTx(mode, fn) {
  const db = await draftDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(DRAFT_STORE, mode); let out;
    const r = fn(tx.objectStore(DRAFT_STORE)); if (r) r.onsuccess = () => { out = r.result; };
    tx.oncomplete = () => { db.close(); res(out); }; tx.onerror = () => { db.close(); rej(tx.error); };
  });
}
let draftTimer = 0, draftOff = false;
// 저장 대상 밖: 내 맥 연결(키트 서버)·발표 창은 원본이 따로 있다
const draftable = () => !!S.orig && !S.server && !S.live;
async function draftWrite() {
  const id = draftTab(); if (!id || !draftable()) return;
  if (S.editing) return; // 입력 중인 글자는 확정된 뒤(변경 기록) 다시 불린다
  const files = [...S.files].map(([p, v]) => [p, v && v.file ? v.file : v]).filter(([, f]) => f instanceof Blob);
  const rec = { v: 1, time: Date.now(), name: S.name, saveName: S.saveName || '', dirty: isDirty() || !!S.commentChanged, text: withComments(exportText()), files };
  await draftTx('readwrite', (st) => st.put(rec, id));
  // 새로고침 때 editor.html 머리가 IndexedDB를 기다리지 않고 첫 화면을 건너뛸지 정하는 표시
  try { sessionStorage.setItem('he-draft', '1'); } catch (e) { /* 표시를 못 남기면 예전처럼 첫 화면이 잠깐 보인다 */ }
  // 오래된 다른 탭의 기록은 지운다(탭을 닫으면 sessionStorage가 사라져 다시 쓰이지 않는다)
  draftTx('readwrite', (st) => { const c = st.openCursor(); c.onsuccess = () => { const cur = c.result; if (!cur) return; if (cur.key !== id && Date.now() - (cur.value && cur.value.time || 0) > DRAFT_KEEP_MS) cur.delete(); cur.continue(); }; return null; }).catch(() => {});
}
api.draftSoon = () => { if (draftOff || !draftable()) return; clearTimeout(draftTimer); draftTimer = setTimeout(() => { draftWrite().catch(() => {}); }, 500); };
api.draftNow = () => { clearTimeout(draftTimer); if (draftOff) return Promise.resolve(); return draftWrite().catch(() => {}); };
// 첫 화면으로 나갈 때 — 새로고침이 다시 편집기를 열지 않게 지운다
api.draftClear = async () => {
  draftOff = true; clearTimeout(draftTimer); try { sessionStorage.removeItem('he-draft'); } catch (e) { /* 없음 */ }
  const id = draftTab(); if (!id) return;
  try { await draftTx('readwrite', (st) => st.delete(id)); } catch (e) { /* 저장소를 못 쓰면 지울 것도 없다 */ }
};
api.draftRead = async () => {
  const id = draftTab(); if (!id) return null;
  try { const rec = await draftTx('readonly', (st) => st.get(id)); return rec && rec.v === 1 && Date.now() - rec.time <= DRAFT_KEEP_MS ? rec : null; }
  catch (e) { return null; }
};
api.draftRestore = async (rec) => {
  const r = await openText(rec.text, rec.name, new Map(rec.files || []));
  S.saveName = rec.saveName || ''; if (rec.dirty) S.saveLost = true;
  return r;
};
