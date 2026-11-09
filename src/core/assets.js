// 그림 등 상대 경로 파일을 미리 보기용 주소로 바꾸고, 저장 전에 되돌린다
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// ---------- 그림 등 파일 경로 ----------
const isRel = (u) => u && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(u);
const normPath = (p) => { const out = []; for (const x of decodeURI(p.split(/[?#]/)[0]).split('/')) { if (x === '..') out.pop(); else if (x && x !== '.') out.push(x); } return out.join('/'); };
function blobFor(rel) {
  if (!isRel(rel)) return null;
  // 파일 하나만 열었는데 상대 경로 그림·파일이 있으면 화면에 안 보인다. 세어 두었다가 「폴더째 열기」를 안내한다(⑤e).
  if (!S.files.size) { if (rel.trim()) S.missing.add(rel); return null; }
  const hit = S.files.get(normPath(rel));
  if (!hit) { S.missing.add(rel); return null; }
  return hit.url;
}
const rewriteCss = (css) => css.replace(/url\((['"]?)([^'")]+)\1\)/g, (a, q, u) => { const b = blobFor(u); return b ? `url(${q}${b}${q})` : a; });
function rewriteView(d) {
  if (S.server) { const b = d.createElement('base'); b.href = S.baseHref; d.head.prepend(b); return; }
  d.querySelectorAll('img[src],source[src],video[src],audio[src],script[src],link[href]').forEach((e) => {
    const at = e.hasAttribute('src') ? 'src' : 'href', b = blobFor(e.getAttribute(at));
    if (b) e.setAttribute(at, b);
  });
  d.querySelectorAll('[style]').forEach((e) => { const v = e.getAttribute('style'); if (v.includes('url(')) e.setAttribute('style', rewriteCss(v)); });
  d.querySelectorAll('style').forEach((e) => { if (e.textContent.includes('url(')) e.textContent = rewriteCss(e.textContent); });
}
// 미리 보기에만 쓴 주소를 저장 전에 원래 경로로 되돌린다.
const unblob = (s) => { if (!s || !s.includes('blob:')) return s; for (const [u, p] of S.back) s = s.split(u).join(p); return s; };
