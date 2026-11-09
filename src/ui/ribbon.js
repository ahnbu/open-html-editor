// 위 한 줄 막대: 버튼 이름·켜고 끄기, 메뉴 열림 표시
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/ui 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// 2단 리본과 「메뉴 접기」는 2026-11-05 한 줄 막대로 바꿨다(계획 _docs/20261105_04 2a). 자주 안 쓰는 기능은 ⋯ 메뉴(#moreMenu)에 있다.
const H=window.HE,S=H.S,$=(s)=>document.querySelector(s);
// 화면 문구: t는 꾸밈(<br>) 포함, tt는 글자만
const t=(k,v)=>window.HE_T(k,v),tt=(k,v)=>window.HE_TT(k,v);
const REASON={el:'need.el',many:'need.many',img:'need.img',cell:'need.cell'};
const msg=(t)=>{$('#msg').textContent=t};
// 언어에 따라 바뀌는 버튼 이름. 막대 아이콘은 글자가 없어 말풍선(title)과 aria-label이 이름이다.
function aiLabels(){const k=S.server?'btn.aiApply':'btn.aiCopy';$('#aiLabel').innerHTML=t(k);const tip=tt(S.server?'btn.aiApplyTip':'btn.aiCopyTip');$('#bAI').title=tip;$('#bAI').setAttribute('aria-label',tt(k));$('#bAI').dataset.t=tip}
aiLabels();
// 메뉴 열림 표시: 메뉴를 여는 버튼마다 aria-expanded를 메뉴 상태에 맞춘다
function syncMenus(){document.querySelectorAll('[data-menu]').forEach((b)=>{const m=$('#'+b.dataset.menu);if(m)b.setAttribute('aria-expanded',m.classList.contains('open')?'true':'false')})}
new MutationObserver(syncMenus).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
// 꺼진 버튼은 이유를 말풍선으로, 켜진 버튼은 원래 이름을 말풍선으로 돌려놓는다
const tipOf=(b)=>b.dataset.t||b.getAttribute('aria-label')||'';
function setNeed(){const e=S.sel[0];const has={el:!!e,many:S.sel.length>1,img:!!H.imgTarget(),cell:!!e&&!!e.closest&&!!e.closest('td,th')};
 document.querySelectorAll('[data-need]').forEach((b)=>{const ok=has[b.dataset.need];if(b.tagName==='BUTTON')b.disabled=!ok;else{b.classList.toggle('off',!ok);b.style.pointerEvents=ok?'':'none'}b.title=ok?tipOf(b):tt(REASON[b.dataset.need])});
 if(e){$('#iSize').value=Math.round(H.mainSize(e)||0)}else $('#iSize').value='';
 // 굵게 켜짐 표시: 글자를 고르는 중이면 그 글자, 아니면 고른 상자 안 글자 전체가 굵은지(계획 _docs/20261109_03 1번)
 let bold=false;try{bold=!!e&&H.boldState()}catch(x){}$('#bBold').setAttribute('aria-pressed',bold?'true':'false');
 $('#bUndo').disabled=!S.undo.length;$('#bRedo').disabled=!S.redo.length;$('#gUndo').disabled=!S.undo.length;$('#gRedo').disabled=!S.redo.length;}
// 예전 접힌 막대를 맞추던 자리. 부르는 곳이 남아 있어 빈 함수로 둔다.
function syncMini(){}
// 펼친 메뉴(계획 _docs/20261105_06): 처음 열면 펼친 메뉴(#ribbon), 「메뉴 접기」를 누르면 한 줄 막대(#bar).
// 같은 버튼 요소를 리본 칸과 원래 자리(주석 표시) 사이로 옮긴다 — 복제하지 않으므로 id·동작·꺼짐 상태가 하나로 유지된다.
const RB={edit:['#bUndo','#bRedo','#bFind'],insert:['#bText','#bImgAdd'],text:['#bBold',()=>$('#bColor').parentElement,'#bSize','#alignWrap'],
 object:['#bDup',()=>$('#mArr').parentElement,'#bImg',()=>$('#mTbl').parentElement,'#bDel'],slide:['#bSDup','#bSPrev','#bSNext','#bSDel'],
 review:['#bComment','#bAI'],view:['#bGrid','#bView','#bSteps'],align:['#bAlignL','#bAlignC','#bAlignR']};
// AI용 복사·발표 보기는 이름이 상황에 따라 바뀐다(로컬 「AI 반영」, 발표 창 「돌아가기」). 숨은 이름표(#aiLabel·#viewLabel)를 한 줄 글자로 옮겨 리본 이름으로 쓴다.
for(const id of ['aiLabel','viewLabel']){const src=document.getElementById(id),r=document.createElement('span');r.className='rl';src.parentElement.appendChild(r);
 const copy=()=>{r.textContent=src.innerHTML.replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').trim()};copy();new MutationObserver(copy).observe(src,{childList:true,characterData:true,subtree:true})}
const rbMoves=[];
for(const [slot,list] of Object.entries(RB))for(const s of list){const el=typeof s==='function'?s():$(s);const ph=document.createComment('rb');el.parentNode.insertBefore(ph,el);rbMoves.push({el,ph,slot})}
const rbSlot=(slot)=>slot==='align'?$('#alignMenu'):document.querySelector('#ribbon [data-slot="'+slot+'"]');
const rbOpen=()=>document.body.classList.contains('rb-open');
function foldLabel(){const open=rbOpen(),b=$('#bFold'),n=tt(open?'menu.foldMenu':'menu.unfoldMenu');b.querySelector('.fl').textContent=open?n:'';b.title=n;b.setAttribute('aria-label',n);b.setAttribute('aria-expanded',String(open))}
function setRibbon(open,save){
 document.querySelectorAll('.menu.open').forEach((x)=>x.classList.remove('open'));
 for(const m of rbMoves){if(open)rbSlot(m.slot).appendChild(m.el);else m.ph.parentNode.insertBefore(m.el,m.ph)}
 document.body.classList.toggle('rb-open',open);$('#ribbon').hidden=!open;foldLabel();if(typeof placeRibbonMenus==='function')placeRibbonMenus();
 if(save){try{localStorage.setItem('he-menu',open?'open':'folded')}catch(e){}}
 // 무대 높이가 바뀌므로 장 크기·목록 표시를 다시 맞춘다(왼쪽 목록 접기와 같은 방식)
 setTimeout(()=>{try{fitName()}catch(e){}try{if(S.doc){sync();markThumb()}}catch(e){}},30)}
{let open=true;try{open=localStorage.getItem('he-menu')!=='folded'}catch(e){}setRibbon(open,false)}
$('#bFold').addEventListener('click',()=>setRibbon(!rbOpen(),true));
window.HE_LANG.onChange(foldLabel);
// 리본 안 메뉴는 화면 기준(fixed)으로 띄운다 — 리본의 가로 스크롤 영역에 잘리지 않고, 화면 오른쪽·아래로 넘치지 않게 자리를 당긴다
// 접어서 막대·⋯ 메뉴로 돌아간 메뉴는 원래 배치(CSS)로 되돌린다
function placeRibbonMenus(){['colorMenu','alignMenu','arrMenu','tblMenu'].map((id)=>document.getElementById(id)).forEach((m)=>{if(!m.classList.contains('open')||!m.closest('#ribbon')){m.style.position=m.style.left=m.style.top='';return}
 const op=document.querySelector('[data-menu="'+m.id+'"]');if(!op)return;const r=op.getBoundingClientRect();m.style.position='fixed';m.style.left='0px';m.style.top='0px';
 const w=m.offsetWidth,h=m.offsetHeight;let x=r.left,y=r.bottom+4;if(x+w>innerWidth-8)x=Math.max(8,innerWidth-8-w);if(y+h>innerHeight-8)y=Math.max(8,innerHeight-8-h);m.style.left=Math.round(x)+'px';m.style.top=Math.round(y)+'px'})}
new MutationObserver(placeRibbonMenus).observe($('#ribbon'),{subtree:true,attributes:true,attributeFilter:['class']});
const closeRibbonMenus=()=>document.querySelectorAll('#ribbon .menu.open').forEach((x)=>x.classList.remove('open'));
$('#ribbon').addEventListener('scroll',closeRibbonMenus);addEventListener('resize',closeRibbonMenus);
