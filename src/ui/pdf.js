// PDF로 저장(계획 _docs/20261105_04 3b, 승인 시안 _docs/20261105_03_피드백-재분류/시안/시안_D.png)
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/ui 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// 왼쪽 목록 미리보기와 같은 방식으로 「실행 코드 없는 인쇄 문서」를 만든다: 덱의 스타일만 가져오고, 장 복사본에서 스크립트·인라인 이벤트를 지우고,
// 보안 정책(script-src·connect-src·form-action 'none')을 내용보다 먼저 둔다. 서버로 보내지 않고 브라우저 인쇄 창에서 「PDF로 저장」을 고른다.
// 덱: 장 크기 그대로 한 장 = 한 쪽, 여백 0. A4 문서: 쪽 크기 그대로. 구역 문서(page): 너비 고정, 쪽 나눔은 브라우저가 한다.
function noHandlers(c){for(const x of [c,...c.querySelectorAll('*')])for(const a of [...x.attributes])if(/^on/i.test(a.name))x.removeAttribute(a.name);return c}
function printDoc(){const l=H.slides();if(!l.length)return'';const vk=H.viewKind(),[W,Hh]=slideWH();
 let page,body;
 if(vk==='deck'){page='@page{size:'+W+'px '+Hh+'px;margin:0}';body=l.map((s)=>'<div class="he-p" style="width:'+W+'px;height:'+Hh+'px"><div class="he-z" style="width:'+W+'px;height:'+Hh+'px">'+noHandlers(cloneSec(s)).outerHTML+'</div></div>').join('')}
 else if(vk==='a4'){const w=l[0].offsetWidth||794,h=l[0].offsetHeight||1123;page='@page{size:'+w+'px '+h+'px;margin:0}';body=l.map((s)=>'<div class="he-p" style="width:'+w+'px;height:'+h+'px"><div class="he-z he-doc" style="width:'+w+'px;height:'+h+'px">'+noHandlers(cloneSec(s)).outerHTML+'</div></div>').join('')}
 else{const w=Math.max(...l.map((s)=>s.offsetWidth||0))||1280;page='@page{size:'+w+'px '+Math.round(w*1.414)+'px;margin:0}';body='<div class="he-flow" style="width:'+w+'px">'+l.map((s)=>noHandlers(cloneSec(s)).outerHTML).join('')+'</div>'}
 return '<!doctype html><html><head><meta charset="utf-8">'+baseTag()+deckCss()+'<style>'+zCss(W,Hh)+page
  +'html,body{margin:0!important;padding:0!important;background:#fff!important;overflow:visible!important;height:auto!important;width:auto!important;min-height:0!important;display:block!important;transform:none!important}'
  +'*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}'
  +'.he-p{position:relative;overflow:hidden;break-after:page;page-break-after:always;break-inside:avoid}.he-p:last-child{break-after:auto;page-break-after:auto}'
  +'.he-flow>*{position:relative!important;transform:none!important}</style></head><body>'+body+'</body></html>'}
window.HEUI_printDoc=printDoc;
// 숨은 틀에 인쇄 문서를 넣고, 그림·서체가 준비된 뒤 인쇄 창을 연다
async function printPdf(){if(!S.doc||!H.slides().length)return;document.querySelectorAll('.menu.open').forEach((x)=>x.classList.remove('open'));if(S.editing)H.finishText();
 const html=printDoc();const old=$('#printFrame');if(old)old.remove();
 const f=document.createElement('iframe');f.id='printFrame';f.setAttribute('aria-hidden','true');f.tabIndex=-1;f.style.cssText='position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';document.body.appendChild(f);
 await new Promise((r)=>{f.onload=r;f.srcdoc=html});
 const d=f.contentDocument;try{await Promise.all([...d.images].map((i)=>i.decode().catch(()=>{})))}catch(e){/* 못 읽은 그림은 빈 채로 인쇄 */}try{await d.fonts.ready}catch(e){/* 서체 대기 실패는 무시 */}
 msg(tt('msg.pdfOpen'));f.contentWindow.focus();f.contentWindow.print()}
