// 새로고침해도 편집 이어 하기(본체 src/save/draft.js). 편집 중이던 탭을 새로고침하면 첫 화면 대신 그 문서를 다시 연다.
// 받은 문서(#handoff)를 여는 중이거나, 내 맥 연결(키트 서버)·발표 창이면 하지 않는다 — 그쪽은 문서를 따로 받는다.
// 주소의 #handoff는 open.js가 곧바로 지우므로, 그보다 먼저 읽어 둔다(그래서 이 파일이 open.js 앞에 붙는다).
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/ui 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
const bootHandoff = location.hash === '#handoff';
// editor.html 머리가 첫 화면을 건너뛰게 했는데(html.he-boot) 열 문서가 없으면 첫 화면을 되돌린다
const bootDone = () => document.documentElement.classList.remove('he-boot');
(async () => {
  if (bootHandoff) return; // 받는 쪽은 open.js가 맡는다
  if (document.querySelector('meta[name="he-server"]') || S.live) { bootDone(); return; }
  const rec = await H.draftRead();
  if (!rec) { try { sessionStorage.removeItem('he-draft'); } catch (e) { /* 없음 */ } }
  if (!rec || document.body.classList.contains('loaded')) { bootDone(); return; } // 그 사이 사용자가 다른 파일을 열었으면 그대로 둔다
  try { await H.draftRestore(rec); msg(tt('msg.restoredDraft')); } catch (e) { console.warn('draft', e); bootDone(); }
})();
// 탭을 닫거나 새로고침하는 순간에도 마지막 상태를 한 번 더 남긴다(기다려 주지 않으므로 평소의 잦은 저장이 본 장치다)
addEventListener('pagehide', () => { H.draftNow(); });
