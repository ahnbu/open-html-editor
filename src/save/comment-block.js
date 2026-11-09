// 코멘트 블록 형식(저장 파일 끝 JSON). 규격은 docs/comment-format.md
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// ---------- 코멘트 ----------
// 코멘트는 저장 파일 끝의 JSON 한 덩어리로 남는다. 덱 동작에는 영향이 없고, AI는 이 덩어리를 읽어 고친다.
const COMMENT_FORMAT_VERSION = 1;
const CBLOCK = /\s*<script type="application\/json" id="he-comments">[\s\S]*?<\/script>/i;
S.comments = [];
const cleanComments = () => S.comments.filter((c) => c.text && c.text.trim());
function withComments(text) {
  text = text.replace(CBLOCK, ''); const list = cleanComments(); if (!list.length) return text;
  // version 1 = docs/comment-format.md. 판 번호가 없는 옛 파일도 그대로 읽는다(readComments).
  const block = '\n<script type="application/json" id="he-comments">' + JSON.stringify({ format: 'open-html-editor/comments', version: COMMENT_FORMAT_VERSION, about: 'Open HTML Editor comments (docs/comment-format.md). Apply each item, then delete this block.', comments: list }, null, 1).replace(/<\//g, '<\\/') + '</script>\n';
  return /<\/body>/i.test(text) ? text.replace(/<\/body>(?![\s\S]*<\/body>)/i, block + '</body>') : text + block;
}
function readComments(text) {
  const m = CBLOCK.exec(text); if (!m) return { text, list: [] };
  try { const j = JSON.parse(m[0].replace(/^[\s\S]*?>/, '').replace(/<\/script>\s*$/i, '')); return { text: text.replace(CBLOCK, ''), list: Array.isArray(j.comments) ? j.comments : [] }; } catch (e) { return { text, list: [] }; }
}
