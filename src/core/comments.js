// 코멘트 달기와 AI용 글 만들기
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// 코멘트가 가리키는 요소: 장 번호·장 id와 요소의 글자 일부, 장 안 위치(%)를 함께 남긴다. AI가 어디인지 찾을 수 있게 한다.
// 문서(a4·page)에서는 누른 자리를 품은 쪽·구역이 기준이다. slide 칸은 덱의 장·문서의 쪽·구역 순번(1부터)이다(docs/comment-format.md).
function addComment(x, y, el) {
  const k = isDoc() ? unitAt(y) : S.cur;
  const sec = slides()[k]; if (!sec) return null; const r = sec.getBoundingClientRect();
  const c = { id: 'c' + Date.now().toString(36), slide: k + 1, view: S.view, slideId: sec.id || '', x: +(((x - r.left) / r.width) * 100).toFixed(1), y: +(((y - r.top) / r.height) * 100).toFixed(1), target: el ? (el.textContent || el.getAttribute('alt') || el.tagName.toLowerCase()).replace(/\s+/g, ' ').trim().slice(0, 80) : '', text: '' };
  S.comments.push(c); return c;
}
const commentsDirty = () => ui().onComments();
api.addComment = addComment;
api.setComment = (id, text) => { const c = S.comments.find((x) => x.id === id); if (!c) return; if (c.text !== text) { c.text = text; S.commentChanged = true; } commentsDirty(); };
api.delComment = (id) => { S.comments = S.comments.filter((x) => x.id !== id); S.commentChanged = true; commentsDirty(); };
// 사이트용: 덱 전체와 코멘트, 고치는 방법을 한 덩어리 글로 만든다. 클로드·챗GPT에 붙여 넣는다.
// 파일이 크면(200KB 초과) HTML 전문을 빼고 코멘트와 지시만 복사한다. 파일은 대화창에 첨부하게 안내한다(③b).
const BIG_COPY = 200 * 1024;
const TR = (k, v) => (window.HE_T ? window.HE_T(k, v) : k); // 꾸밈을 지우지 않는 원문(프롬프트 안의 태그·HTML을 지키려고)
function aiPrompt() {
  const list = cleanComments(); const html = withComments(exportText());
  const doc = isDoc(), big = new Blob([html]).size > BIG_COPY; S.lastCopyBig = big;
  const lines = list.map((c, i) => TR(doc ? 'ai.lineDoc' : 'ai.line', { i: i + 1, n: c.slide, id: c.slideId ? TR('ai.lineId', { id: c.slideId }) : '', target: c.target ? TR('ai.lineTarget', { t: c.target }) : '', x: c.x, y: c.y, text: c.text.trim() }));
  return TR(big ? 'ai.promptNoHtml' : doc ? 'ai.promptDoc' : 'ai.prompt', { n: list.length, lines: lines.join('\n'), file: fileName(), html });
}
api.aiPrompt = aiPrompt;
api.commentCount = () => cleanComments().length;
// 개인 로컬 모드: 서버가 내 맥의 클로드를 불러 코멘트대로 원본을 고치고 다시 조립한다.
async function aiApply() {
  if (!S.server) return { error: T('ai.errLocal') };
  const list = cleanComments(); if (!list.length) return { error: T('ai.errNone') };
  if (isDirty()) { const j = await save(); if (j && j.error) return j; }
  let res; try { res = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ comments: list }) }).then((r) => r.json()); } catch (e) { return { error: e.message }; }
  if (res.error) return res;
  for (;;) {
    await sleep(2000); let st; try { st = await fetch('/api/ai?job=' + encodeURIComponent(res.job)).then((r) => r.json()); } catch (e) { continue; }
    ui().onAiProgress(st);
    if (st.state === 'done' || st.state === 'error') {
      if (st.state === 'done') { S.comments = []; const j = await fetch('/api/deck').then((r) => r.json()); await openText(j.html, j.name, new Map()); }
      return st;
    }
  }
}
api.aiApply = aiApply;
