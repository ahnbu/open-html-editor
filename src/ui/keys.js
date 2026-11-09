// 바깥 창 단축키·붙여넣기·나가기 경고
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/ui 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// 바깥에서도 단축키가 듣게
// 개체를 누른 뒤 포커스가 바깥 창에 남아도 Delete·화살표·Esc 등이 같은 규칙으로 듣는다
// Ctrl+P는 브라우저 인쇄 대신 「PDF로 저장」(여백 없는 인쇄 문서)으로 보낸다 — 편집 틀 안은 src/core/input.js onKey가 같은 함수로 보낸다
addEventListener('keydown',(e)=>{if((e.ctrlKey||e.metaKey)&&e.code==='KeyO'&&!e.shiftKey&&!e.altKey&&!e.isComposing){e.preventDefault();if(!document.querySelector('dialog[open]'))openPick();return}if((e.ctrlKey||e.metaKey)&&e.code==='KeyP'&&!e.shiftKey&&!e.altKey&&!e.isComposing&&S.doc&&document.body.classList.contains('loaded')){e.preventDefault();if(!document.querySelector('dialog[open]'))printPdf();return}if(e.target.closest&&e.target.closest('input,textarea,dialog,select,.pop'))return;
 // 초점이 메뉴·막대 버튼에 있으면 Enter·Space는 그 버튼을 누른다 — 고른 개체의 글자 편집(Enter)으로 가로채지 않는다(계획 _docs/20261105_06 2e)
 if((e.key==='Enter'||e.key===' ')&&e.target.closest&&e.target.closest('button,label[tabindex]'))return;if(!S.doc)return;if(e.code==='Escape'&&S.mode==='comment'&&!S.sel.length){e.preventDefault();setCommentMode(false);return}if(e.code==='Escape'){const open=[...document.querySelectorAll('.menu.open')];if(open.length){
 // 메뉴를 Esc로 닫으면 그 메뉴를 연 버튼으로 초점을 돌린다(하위 메뉴가 열려 있으면 가장 안쪽 것) — 계획 _docs/20261105_06 2e
 // 이때 Esc는 메뉴만 닫는다 — 선택까지 풀면 고른 것이 있어야 켜지는 버튼(순서·맞춤 등)이 꺼져 초점이 사라진다
 const openers=open.map((m)=>document.querySelector('[data-menu="'+m.id+'"]')).filter(Boolean);open.forEach((x)=>x.classList.remove('open'));const back=openers[openers.length-1];if(back)back.focus();e.preventDefault();return}}H.onKey(e)});
addEventListener('paste',(e)=>{if(e.target.closest&&e.target.closest('input,textarea,dialog,.pop'))return;if(S.doc)H.onPaste(e)});
addEventListener('beforeunload',(e)=>{if((H.isDirty()||S.commentChanged)&&!(S.live&&window.parent!==window)){e.preventDefault();e.returnValue=''}});
