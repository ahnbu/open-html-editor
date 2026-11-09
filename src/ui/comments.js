// 코멘트 핀과 입력 창
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/ui 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// ---------- 코멘트 ----------
// 핀은 sync 때마다 다시 그린다. 입력 창은 지워지지 않게 따로 둔다.
// 덱은 지금 장의 코멘트만, 문서는 쪽·구역마다 제 자리에 모두 그린다(스크롤하면 따라간다)
function slideBox(k){const sec=H.slides()[k==null?S.cur:k];if(!sec)return null;const f=$('#stage').getBoundingClientRect(),c=$('#canvas').getBoundingClientRect(),r=sec.getBoundingClientRect();return {x:f.left-c.left+r.left,y:f.top-c.top+r.top,w:r.width,h:r.height}}
const pinBox=(cm)=>H.isDoc()?slideBox(cm.slide-1):(cm.slide===S.cur+1?slideBox():null);
// 핀은 키보드로도 닿게 button으로 그린다(흐름 점검 지적, 계획 _docs/20261105_04 2c)
function drawPins(o){S.comments.forEach((cm,i)=>{const b=pinBox(cm);if(!b)return;const p=document.createElement('button');p.type='button';p.className='pin'+(cm.text&&cm.text.trim()?'':' empty');p.textContent=String(i+1);p.setAttribute('aria-label',tt('cm.pin',{i:i+1}));p.onclick=(e)=>{e.stopPropagation();if(e.detail===0)openPop(cm.id)};p.style.left=(b.x+b.w*cm.x/100)+'px';p.style.top=(b.y+b.h*cm.y/100)+'px';p.title=cm.text||'';p.onpointerdown=(e)=>{e.stopPropagation();e.preventDefault();openPop(cm.id)};o.appendChild(p)})}
const pop=document.createElement('div');pop.className='pop';pop.hidden=true;
pop.innerHTML='<div class="who" id="popWho"></div><textarea id="popText" data-i18n-attr="placeholder:cm.placeholder"></textarea><div class="row"><button class="dg" id="popDel" data-i18n="cm.delete"></button><button id="popOk" data-i18n="cm.done"></button></div>';
window.HE_LANG.apply(pop);
let popId=null;
// 다른 핀을 열거나 새 자리를 누르면 열려 있던 말풍선을 먼저 닫는다 — 빈 코멘트는 그때 지워진다(사장 지적: 빈 코멘트가 계속 쌓임)
// 윗줄은 「코멘트 N」만. 장 번호·id·원문·좌표는 AI용 복사 글에만 들어간다(src/core/comments.js aiPrompt).
function openPop(id){if(popId!=null&&popId!==id)closePop();const cm=S.comments.find((x)=>x.id===id);const b=cm&&pinBox(cm);if(!cm||!b)return;popId=id;$('#canvas').appendChild(pop);pop.hidden=false;const i=S.comments.indexOf(cm)+1;$('#popWho').textContent=tt('cm.who',{i});$('#popText').value=cm.text||'';
 const cw=$('#canvas').clientWidth,ch=$('#canvas').clientHeight;let x=b.x+b.w*cm.x/100+34,y=b.y+b.h*cm.y/100-26;if(x+270>cw)x=Math.max(4,x-300);if(y+150>ch)y=Math.max(4,ch-160);pop.style.left=x+'px';pop.style.top=y+'px';setTimeout(()=>$('#popText').focus(),0)}
function closePop(){if(popId==null)return;const id=popId;popId=null;pop.hidden=true;if(pop.contains(document.activeElement))document.activeElement.blur();const cm=S.comments.find((x)=>x.id===id);if(cm){const t=$('#popText').value;if(!t.trim())H.delComment(id);else H.setComment(id,t)}}
pop.addEventListener('keydown',(e)=>{e.stopPropagation();if(e.code==='Escape'||((e.ctrlKey||e.metaKey)&&e.code==='Enter')){e.preventDefault();closePop()}});
pop.addEventListener('pointerdown',(e)=>e.stopPropagation());
pop.querySelector('#popOk').onclick=closePop;pop.querySelector('#popDel').onclick=()=>{const id=popId;popId=null;pop.hidden=true;H.delComment(id)};
function setCommentMode(on){if(!on)closePop();S.mode=on?'comment':null;document.body.classList.toggle('cmode',on);$('#bComment').classList.toggle('on',on);$('#bComment').classList.toggle('cmt',on);if(on){S.sel=[];H.setSel([]);msg(tt('msg.commentMode'))}else msg('');syncMini()}
function comments(){const n=H.commentCount();const b=$('#cCount');b.hidden=!n;b.textContent=n;state();sync()}
