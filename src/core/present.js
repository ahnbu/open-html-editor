// 발표 보기 창과 발표자 노트
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
function toggleSteps() { S.stepsOpen = !S.stepsOpen; const st = S.doc.getElementById('he-style'); if (st) st.textContent = stepCss(); ui().onSlide(); }
function presentView() {
  const d = buildPatched(); stripDoc(d); rewriteView(d); const t = ser(d);
  const html = (S.bundle ? joinBundle(S.bundle, t) : t).replace(/<\/body>(?![\s\S]*<\/body>)/i, PRESENT_KIT + '</body>');
  const u = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  // 탭이 아니라 화면 크기의 새 창으로 연다. 바깥 화면(프로젝터·보조 모니터)이 있고 화면 배치 권한을 받았으면
  // 그 화면에 전체 화면 창으로 바로 띄운다(크롬의 fullscreen 팝업. 지원하지 않으면 그 화면에 꽉 찬 창).
  // 그 밖에는 지금 화면 크기의 창을 열고, 새 창에서 첫 클릭(또는 아무 키)에 전체 화면으로 바꾼다.
  const ts = otherScreen(screens);
  const r = ts ? [ts.availLeft, ts.availTop, ts.availWidth, ts.availHeight]
    : [screen.availLeft || 0, screen.availTop || 0, screen.availWidth || screen.width, screen.availHeight || screen.height];
  const w = window.open(u, 'he-present', `popup=yes,left=${r[0]},top=${r[1]},width=${r[2]},height=${r[3]}` + (ts ? ',fullscreen' : ''));
  if (!w) { window.open(u, '_blank'); return; }
  try { w.focus(); } catch (e) { /* 창이 막힘 */ }
  // 이 편집기 창은 발표자 창이 된다. 새 창을 하나 더 열면 크롬이 막으므로(한 번 누름에 창 하나) 따로 띄우지 않는다.
  ui().onPresent(w);
  // 바깥 화면이 붙어 있는데 아직 권한을 받지 않았다: 창은 이미 열었으니(팝업 차단을 피하려고 먼저 연다)
  // 권한을 물은 뒤 그 창을 바깥 화면으로 옮긴다. 다음부터는 처음부터 바깥 화면에 뜬다.
  if (!ts && screen.isExtended && 'getScreenDetails' in window) {
    loadScreens(true).then((sd) => {
      const o = otherScreen(sd); if (!o || w.closed) return;
      try { w.moveTo(o.availLeft, o.availTop); w.resizeTo(o.availWidth, o.availHeight); } catch (e) { /* 옮기기 막힘: 그 자리에 둔다 */ }
    });
  }
}
// 화면 배치 정보(Window Management API). 권한을 이미 받았으면 미리 받아 둔다 — 발표 보기를 누른 순간
// 기다리지 않고 바로 창을 열어야 팝업 차단에 걸리지 않는다. 권한 묻기는 바깥 화면이 있을 때만 한다.
let screens = null;
async function loadScreens(ask) {
  if (!('getScreenDetails' in window)) return null;
  try {
    if (!ask) { const st = await navigator.permissions.query({ name: 'window-management' }); if (st.state !== 'granted') return null; }
    screens = await window.getScreenDetails(); return screens;
  } catch (e) { return null; } // 거부·미지원: 지금 화면에 연다
}
function otherScreen(sd) {
  if (!sd || !sd.screens || sd.screens.length < 2) return null;
  const c = sd.currentScreen;
  return sd.screens.find((s) => s !== c && (s.left !== c.left || s.top !== c.top)) || null;
}
loadScreens(false);
// 청중 창이 발표자 창(이 편집기 창)과 주고받는 작은 장치. 장 찾기·이동은 편집기의 slides·curIndex·goTo와 같은 규칙이다.
// 받는 말: go(그 장으로), key(덱에 방향키를 보낸다 — 클릭 단계도 덱이 처리한다), hello(지금 장을 다시 알려 달라).
// 보내는 말: at(지금 장 번호와 장 수). 파일로 연 편집기는 주소 출처가 없어 '*'로 보낸다. 장 번호 말고는 보내지 않는다.
const PRESENT_NAV = '<script>(function(){var Q=["deck-stage > section","#deck > section.slide","section.slide",".slide","main > section","body > section","section"];'
  + 'function L(){for(var i=0;i<Q.length;i++){var r=document.querySelectorAll(Q[i]);if(r.length)return [].slice.call(r)}return []}'
  + 'function cur(){var l=L(),ds=document.querySelector("deck-stage");if(ds&&typeof ds.index==="number")return ds.index;'
  + 'for(var i=0;i<l.length;i++){var c=l[i].classList;if(c.contains("is-active")||c.contains("active")||l[i].hasAttribute("data-deck-active")||c.contains("present"))return i}'
  + 'var b=0,a=-1;l.forEach(function(e,i){var r=e.getBoundingClientRect(),w=Math.min(r.right,innerWidth)-Math.max(r.left,0),h=Math.min(r.bottom,innerHeight)-Math.max(r.top,0),v=getComputedStyle(e),s=w>0&&h>0&&v.display!=="none"&&v.visibility!=="hidden"&&+v.opacity>.05?w*h:0;if(s>a){a=s;b=i}});return b}'
  // 덱 코드가 없어 장이 위아래로 늘어선 덱(스크롤 문서)은 방향키가 듣지 않는다. 그때는 그 장으로 스크롤한다.
  + 'function tall(){var e=document.scrollingElement||document.documentElement;return e.scrollHeight>innerHeight*1.5}'
  + 'function key(k){if(tall()){var l=L(),t=l[Math.max(0,Math.min(l.length-1,cur()+(k==="ArrowLeft"?-1:1)))];if(t)t.scrollIntoView({block:"start"});return}document.body.dispatchEvent(new KeyboardEvent("keydown",{key:k,code:k,bubbles:true,cancelable:true}))}'
  + 'function go(i){var l=L();if(!l.length)return;i=Math.max(0,Math.min(l.length-1,i));var ds=document.querySelector("deck-stage");if(ds&&ds.goTo){ds.goTo(i);return}'
  + 'if(tall()){l[i].scrollIntoView({block:"start"});return}'
  + 'if(cur()!==i&&l[i].dataset.label&&/^\\d/.test(l[i].dataset.label))location.hash="#"+l[i].dataset.label;'
  + 'var n=0;(function st(){var c=cur();if(c===i||n++>l.length*3)return;key(c<i?"ArrowRight":"ArrowLeft");setTimeout(st,40)})()}'
  + 'var last=-1;function tell(){var o=window.opener;if(!o||o.closed)return;var i=cur();if(i!==last){last=i;o.postMessage({he:"at",i:i,n:L().length},"*")}}'
  + 'addEventListener("message",function(e){if(!e.source||e.source!==window.opener)return;var d=e.data||{};if(d.he==="go")go(+d.i);if(d.he==="key")key(String(d.k));if(d.he==="hello"){last=-1;tell()}});'
  + 'setInterval(tell,250);addEventListener("load",tell);})();<\/script>';
// 발표자 노트. 장(section)마다 data-speaker-notes에 둔다(강의 키트 덱과 같은 자리). 이 값이 없고 덱에
// <script id="speaker-notes"> 배열이 있으면 그 배열의 같은 순번을 읽는다(예전 방식 덱). 고치면 장에 적는다.
function oldNote(i) {
  try { const t = S.doc.getElementById('speaker-notes'); const a = t ? JSON.parse(t.textContent) : null; return Array.isArray(a) && typeof a[i] === 'string' ? a[i] : ''; } catch (e) { return ''; }
}
function noteOf(i) {
  const s = slides()[i]; if (!s) return '';
  return s.hasAttribute('data-speaker-notes') ? s.getAttribute('data-speaker-notes') : oldNote(i);
}
function setNote(i, text) {
  const s = slides()[i]; if (!s || text === noteOf(i)) return;
  // 예전 방식 노트를 비울 때는 빈 값을 남긴다. 지우면 배열의 노트가 다시 보인다.
  op(T('op.notes'), () => { if (text || oldNote(i)) s.setAttribute('data-speaker-notes', text); else s.removeAttribute('data-speaker-notes'); }, [s]);
}
// 발표 창에 넣는 작은 안내. 첫 입력은 전체 화면 전환에만 쓰고 덱으로 넘기지 않는다.
const PRESENT_KIT = '<div id="he-fs" style="position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:rgba(10,37,72,.55);font:600 20px/1.5 Pretendard,-apple-system,sans-serif;color:#fff;cursor:pointer;text-align:center">'
  + '<div style="background:#16110E;padding:28px 36px;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.35)">' + T('pv.fsStart') + '<br><span style="font-weight:400;font-size:15px;opacity:.8">' + T('pv.fsEnd') + '</span></div></div>'
  + '<script>(function(){var o=document.getElementById("he-fs");function go(e){if(!o||!e.isTrusted)return;e.preventDefault();e.stopImmediatePropagation();o.remove();o=null;var d=document.documentElement;(d.requestFullscreen||d.webkitRequestFullscreen||function(){}).call(d);removeEventListener("keydown",go,true);removeEventListener("pointerdown",go,true)}addEventListener("keydown",go,true);addEventListener("pointerdown",go,true);function done(){if(o&&document.fullscreenElement){o.remove();o=null;removeEventListener("keydown",go,true);removeEventListener("pointerdown",go,true)}}document.addEventListener("fullscreenchange",done);done();})();<\/script>' + PRESENT_NAV;
// 발표 중 편집기 창을 닫고 발표자 창으로 돌아간다. 저장 안 한 변경이 있으면 브라우저가 묻는다.
function backToDeck() {
  if (window.parent !== window) { location.href = 'about:blank'; return; } // 발표자 창 안에 뜬 경우. 발표자 창이 이 틀을 걷는다.
  try { if (window.opener) window.opener.focus(); } catch (e) { /* 창이 이미 닫힘 */ }
  window.close();
}
