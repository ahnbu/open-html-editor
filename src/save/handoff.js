// 받는 분 한 번에 열기(계획 _docs/20261104_07 ⑧a): 저장할 때 켜면 저장 HTML에 「이 문서 고치기」 버튼과 원문 압축본을 넣는다.
// 받은 사람이 버튼을 누르면 편집기 사이트를 새 탭으로 열고 압축본을 postMessage로 넘긴다(업로드 없음).
// 지금 화면(outerHTML)을 넘기지 않는 이유: 문서 속 스크립트가 바꾼 상태가 원문으로 굳는다(계획 1-2 실측).
// 그림 데이터(2KB 넘는 data:…;base64)는 압축본에서 빼고 자리표만 남긴다 — 받는 쪽이 보낸 쪽 화면 HTML에서 되찾는다.
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// ---------- 받는 분 한 번에 열기 ----------
const HANDOFF_SITE = 'https://easy-html-editor.pages.dev'; // ⑦에서 주소가 바뀌면 여기만 고친다(이미 퍼진 파일은 옛 주소로 열린다)
const HANDOFF_BLOCK = /\n?<!--ohe-handoff-->[\s\S]*?<!--\/ohe-handoff-->\n?/g;
const handoffSupported = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';
// 공유 메뉴의 「받는 분도 바로 고칠 수 있게」. 파일을 열 때마다 켠다(사장 지시: 기본 포함, 끌 수 있음 — 계획 _docs/20261105_04 3a-1).
// 일반 저장은 이 값과 상관없이 블록 없이 저장하고, 공유용 저장만 이 값을 본다.
S.shareEdit = true;
function stripHandoff(text) { let had = false; text = text.replace(HANDOFF_BLOCK, () => { had = true; return ''; }); return { text, had }; }
const BIG_DATA = /data:[\w\/+.-]+;base64,[A-Za-z0-9+\/=]{2048,}/g;
const ANY_DATA = /data:[\w\/+.-]+;base64,[A-Za-z0-9+\/=]+/g;
// 그림 식별값: 길이 + 전체 내용으로 계산한 해시 2개(씨앗이 다른 53비트 cyrb53). 길이·끝부분이 같은 다른 그림도 갈린다(완료 검수 1차 지적).
function cyrb53(s, seed) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}
const dataKey = (u) => u.length + ':' + cyrb53(u, 1) + cyrb53(u, 7);
const packSource = (t) => t.replace(BIG_DATA, (u) => 'ohe-data:' + dataKey(u));
function unpackSource(t, live) {
  const map = new Map(); (live.match(ANY_DATA) || []).forEach((u) => { if (u.length >= 2048) map.set(dataKey(u), u); });
  let lost = 0;
  const text = t.replace(/ohe-data:(\d+:[0-9a-f]{28})/g, (a, k) => { const u = map.get(k); if (u) return u; lost += 1; return a; });
  return { text, lost };
}
async function gz64(str) {
  const buf = new Uint8Array(await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(bin);
}
async function ungz64(b64) {
  const bin = atob(b64), buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
}
const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
// 보내는 쪽 스크립트(1KB 안쪽). 문서 내용은 대상 출처를 HANDOFF_SITE로 고정해 보낸다 — 새 탭이 다른 곳으로 바뀌었으면 브라우저가 버린다.
const handoffScript = () => `(function(){var S='${HANDOFF_SITE}',b=document.getElementById('ohe-edit');if(!b)return;b.addEventListener('click',function(e){e.preventDefault();var w=window.open(S+'/#handoff','_blank');if(!w)return;function f(m){if(m.source!==w||m.origin!==S||m.data!=='ohe-ready')return;removeEventListener('message',f);var g=document.getElementById('ohe-src'),n=decodeURIComponent(location.pathname.split('/').pop()||'')||'document.html';w.postMessage({t:'ohe-doc',v:1,name:n,gz:g?g.textContent.replace(/\\s/g,''):'',live:document.documentElement.outerHTML},S)}addEventListener('message',f)})})();`;
const HANDOFF_CSS = '#ohe-edit{position:fixed!important;right:18px!important;bottom:18px!important;z-index:2147483647!important;display:inline-flex!important;align-items:center;gap:6px;margin:0!important;font:600 14px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;color:#1C60EF!important;background:#fff!important;border:1px solid #DBE8FE!important;border-radius:999px!important;padding:10px 16px!important;box-shadow:0 4px 14px rgba(10,37,72,.18)!important;text-decoration:none!important;cursor:pointer}#ohe-edit:hover{background:#F2F6FF!important}#ohe-edit:focus-visible{outline:2px solid #1C60EF!important;outline-offset:3px}@media print{#ohe-edit{display:none!important}}:fullscreen #ohe-edit{display:none!important}';
// 저장 문자열(코멘트 포함)에 블록을 넣는다. on이 아니거나 압축을 못 하는 브라우저면 블록을 뺀 채 돌려준다.
async function withHandoff(text, on) {
  text = stripHandoff(text).text;
  S.lastSaveHandoff = false;
  if (!on || !handoffSupported) return text;
  const gz = await gz64(packSource(text));
  const block = '\n<!--ohe-handoff--><a id="ohe-edit" href="' + HANDOFF_SITE + '/" target="_blank" title="' + escHtml(T('handoff.badgeTitle')) + '">✎ ' + escHtml(T('handoff.badge')) + '</a>'
    + '<style>' + HANDOFF_CSS + '</style><script>' + handoffScript() + '<\/script>'
    + '<script type="application/x-ohe-source" id="ohe-src">' + gz + '<\/script><!--/ohe-handoff-->\n';
  S.lastSaveHandoff = true;
  return /<\/body>/i.test(text) ? text.replace(/<\/body>(?![\s\S]*<\/body>)/i, () => block + '</body>') : text + block;
}
// 받는 쪽: 압축본을 풀고 그림 데이터를 되찾아 연다. 받은 문서는 받는 분 버튼이 켜진 채 시작한다(퍼짐 유지, 끌 수 있음).
async function receiveHandoff(d) {
  const u = unpackSource(await ungz64(d.gz), String(d.live || ''));
  let name = String(d.name || '').split(/[\\/]/).pop().replace(/[:*?"<>|]/g, '').trim() || 'document.html';
  if (!/\.html?$/i.test(name)) name += '.html';
  S.handoffNext = true;
  await openText(u.text, name, new Map());
  return { lost: u.lost, name };
}
