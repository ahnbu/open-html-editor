// 원문 다루기: 읽기·직렬화·편집용 번호 붙이기·번들 형식(__bundler/template) 나누기
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// ---------- 원문 다루기 ----------
const parse = (t) => new DOMParser().parseFromString(t, 'text/html');
const doctypeOf = (t) => (/^\s*<!doctype/i.test(t) ? '<!DOCTYPE html>\n' : '');
const ser = (d) => S.doctype + d.documentElement.outerHTML;
function addIds(d) {
  d.body.querySelectorAll('*').forEach((e) => { if (!e.hasAttribute(ID)) e.setAttribute(ID, String(S.nextId++)); });
  if (!d.body.hasAttribute(ID)) d.body.setAttribute(ID, String(S.nextId++));
}
const stripDoc = (d) => { d.querySelectorAll(`[${ID}],[${NEW}]`).forEach((e) => { e.removeAttribute(ID); e.removeAttribute(NEW); }); return d; };

function splitBundle(text) {
  const m = /<script[^>]*type="__bundler\/template"[^>]*>/.exec(text);
  if (!m) return null;
  const start = m.index + m[0].length, end = text.indexOf('</script>', start);
  return { before: text.slice(0, start), after: text.slice(end), template: JSON.parse(text.slice(start, end)) };
}
const joinBundle = (b, tpl) => b.before + JSON.stringify(tpl).replace(/<\//g, '<\\u002F') + b.after;
