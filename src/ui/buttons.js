// 위 막대·메뉴 버튼 연결
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/ui 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// 버튼. ⋯ 메뉴 안의 하위 메뉴(순서·맞춤, 표 편집)를 열 때는 바깥 ⋯ 메뉴를 닫지 않는다.
document.querySelectorAll('[data-menu]').forEach((b)=>b.addEventListener('click',(e)=>{e.stopPropagation();if(b.disabled)return;const m=$('#'+b.dataset.menu),o=m.classList.contains('open');document.querySelectorAll('.menu.open').forEach((x)=>{if(!x.contains(b))x.classList.remove('open')});if(!o)m.classList.add('open')}));
addEventListener('click',()=>document.querySelectorAll('.menu.open').forEach((x)=>x.classList.remove('open')));
const on=(id,fn)=>$(id).addEventListener('click',(e)=>{fn(e)});
on('#bUndo',()=>H.undo());on('#bRedo',()=>H.redo());on('#bSave',()=>H.save());on('#bView',()=>{if(!S.live)H.presentView();else if(H.isDirty())$('#dlgBack').showModal();else H.backToDeck()});
// 브라우저 확인 창도 청중 창의 전체화면을 풀어서 화면 안 창으로 묻는다
$('#dlgBack').addEventListener('close',()=>{if($('#dlgBack').returnValue==='go'){S.dirty=0;S.saveLost=false;H.backToDeck()}});
on('#bBold',()=>H.toggleBold());on('#bDel',()=>H.removeSel());on('#bDup',()=>H.dupEl());on('#bFront',()=>H.zOrder(true));on('#bBack',()=>H.zOrder(false));
for(const [id,how] of [['#bLeft','left'],['#bCenter','center'],['#bRight','right'],['#bTop','top'],['#bMiddle','middle'],['#bBottom','bottom']])on(id,()=>H.alignMany(how));on('#bText',()=>H.addTextBox());
// 저장 방법
on('#bSave2',()=>H.save());on('#bSaveAs',()=>H.saveAs());on('#bPdf',()=>printPdf());
// 파일 이름: 고친 이름으로 저장한다
// 한글은 영문보다 넓어 글자 수로 재면 잘린다. 실제 글자 폭을 재서 맞춘다.
const measure=document.createElement('canvas').getContext('2d');
// 한 줄 막대(계획 _docs/20261105_04 2a)라 이름 칸은 남은 자리까지만 넓힌다 — 긴 이름이 ⋯·저장 버튼을 덮지 않게(완료 검수 1차 지적). 길면 칸 안에서 가로로 밀린다.
function fitName(){const f=$('#fname'),cs=getComputedStyle(f);measure.font=cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;const w=measure.measureText(f.value||' ').width+parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight)+6;
 const t=$('#title'),tc=getComputedStyle(t),gap=parseFloat(tc.columnGap)||8,kids=[...t.children].filter((e)=>e!==f&&e.offsetWidth>0);
 const used=kids.reduce((s,e)=>s+(e.id==='bar'?e.scrollWidth+16:e.getBoundingClientRect().width),0)+gap*kids.length+parseFloat(tc.paddingLeft)+parseFloat(tc.paddingRight);
 const free=Math.floor(t.clientWidth-used);f.style.width=Math.max(90,Math.min(420,Math.ceil(w),free))+'px'}
$('#fname').addEventListener('input',fitName);addEventListener('resize',fitName);$('#fname').addEventListener('keydown',(e)=>{e.stopPropagation();if(e.key==='Enter'||e.key==='Escape'){if(e.key==='Escape')e.target.value=H.fileName().replace(/\.html?$/i,'');e.target.blur()}});
$('#fname').addEventListener('change',(e)=>{e.target.value=H.rename(e.target.value).replace(/\.html?$/i,'');fitName();msg(tt('msg.fileName',{name:H.fileName()}))});
// 왼쪽 목록 접기: 고른 상태는 이 브라우저에 기억한다(메뉴 접기·펼치기는 ribbon.js, 기억값 he-menu)
const pref=(k,v)=>{try{if(v===undefined)return localStorage.getItem('he-'+k);localStorage.setItem('he-'+k,v)}catch(e){return null}};
function fold(cls,on,k){document.body.classList.toggle(cls,on);pref(k,on?'1':'0');setTimeout(()=>{sync();markThumb()},30)}
on('#bSideFold',()=>fold('side-off',true,'side'));on('#bSideOpen',()=>fold('side-off',false,'side'));
if(pref('side')==='1')document.body.classList.add('side-off');
// 글자색 팔레트: 덱의 대표색 + 기본색
const BASE=['#111827','#FFFFFF','#5A5570','#1C60EF','#0A2548','#FF6B47','#E11D48','#059669','#F59E0B','#8B5CF6'];
function swatches(box,list){box.innerHTML='';list.forEach((c)=>{const b=document.createElement('button');b.type='button';b.style.background=c;b.title=c;b.onclick=(e)=>{e.stopPropagation();pickColor(c)};box.appendChild(b)})}
function pickColor(c){$('#chip').style.background=c;$('#iColor').value=c.length===7?c.toLowerCase():c;H.setColor(c);document.querySelectorAll('.menu.open').forEach((x)=>x.classList.remove('open'));msg(tt('msg.color',{c}))}
$('#bColor').addEventListener('click',()=>{const p=H.palette(10);swatches($('#pal'),p.length?p:BASE.slice(0,5));swatches($('#palBase'),BASE)});
$('#colorMenu').addEventListener('click',(e)=>e.stopPropagation());
on('#bColorMore',()=>{const i=$('#iColor');try{i.showPicker()}catch(e){i.click()}});
// 코멘트와 AI
on('#bComment',()=>setCommentMode(S.mode!=='comment'));
on('#bAI',async()=>{closePop();const n=H.commentCount();if(!n){msg(tt('msg.needComment'));setCommentMode(true);return}
 if(S.server){$('#bAI').disabled=true;msg(tt('msg.aiStart',{n}));const r=await H.aiApply();$('#bAI').disabled=false;if(r.error)msg(tt('msg.aiFail',{e:r.error}));else{setCommentMode(false);msg(tt('msg.aiDone',{summary:r.summary?': '+r.summary:'',backup:String(r.backup||'').split(/[\\/]/).pop()}))}comments();return}
 // ③b: 복사가 실제로 됐을 때만 「복사했습니다」. 복사 뒤 코멘트 모드는 끈다. 큰 파일은 HTML 없이 복사됐다고 상태 줄에 알린다.
 const text=H.aiPrompt();let ok=false;
 try{await navigator.clipboard.writeText(text);ok=true}catch(e){const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();try{ok=document.execCommand('copy')}catch(e2){ok=false}ta.remove()}
 if(!ok){msg(tt('msg.copyFailed'));return}
 setCommentMode(false);if(S.lastCopyBig)msg(tt('msg.bigCopy'));$('#dlgCopy').showModal()});
on('#gUndo',()=>gridUndo(false));on('#gRedo',()=>gridUndo(true));
on('#bRowAdd',()=>H.rowAdd());on('#bColAdd',()=>H.colAdd());on('#bRowDel',()=>H.rowDel());on('#bColDel',()=>H.colDel());
// 슬라이드 삭제는 확인 창을 거친다(되돌리기는 Ctrl+Z). 한 장뿐이면 지우지 않는다(delSlide와 같음).
on('#bSDup',()=>H.dupSlide());on('#bSDel',()=>{const total=H.slides().length;if(total<2)return;$('#delBody').textContent=tt('dlg.delBody',{n:S.cur+1,total});const d=$('#dlgDel');d.returnValue='';d.showModal()});
$('#dlgDel').addEventListener('close',()=>{if($('#dlgDel').returnValue==='go')H.delSlide()});on('#bSPrev',()=>H.moveSlide(-1));on('#bSNext',()=>H.moveSlide(1));
on('#bSteps',()=>{H.toggleSteps();$('#bSteps').classList.toggle('on',S.stepsOpen);$('#bSteps').setAttribute('aria-pressed',String(!!S.stepsOpen))});
// 글자 정렬: 누를 때마다 바뀌던 한 버튼 대신 ⋯ 메뉴의 세 항목(누른 대로 된다 — 흐름 점검 지적)
for(const b of document.querySelectorAll('[data-align]'))b.addEventListener('click',()=>{const v=b.dataset.align;H.align(v);msg(tt('msg.align',{v:tt({left:'msg.alignLeft',center:'msg.alignCenter',right:'msg.alignRight'}[v])}))});
$('#iColor').addEventListener('input',(e)=>{$('#chip').style.background=e.target.value});$('#iColor').addEventListener('change',(e)=>H.setColor(e.target.value));
$('#iSize').addEventListener('change',(e)=>{const v=+e.target.value;if(v>0)H.setSize(v)});
$('#iImg').addEventListener('change',(e)=>{if(e.target.files[0])H.replaceImage(e.target.files[0]);e.target.value=''});
// 「그림」은 label이라 키보드로는 파일 창이 안 열린다 — Enter·Space로 연다(계획 _docs/20261105_06 2e)
$('#bImgAdd').addEventListener('keydown',(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();$('#iImgAdd').click()}});
$('#iImgAdd').addEventListener('change',(e)=>{if(e.target.files[0])H.addImage(e.target.files[0]);e.target.value=''});
// 찾기 막대(계획 _docs/20261110_01 3번, 승인 시안 _docs/20261110_01_근거/시안/찾기막대_1280.png): 무대 오른쪽 위에 겹쳐 뜬다. 결과를 보며 문서를 계속 만질 수 있다.
// 입력하는 대로 모든 자리를 칠하고(노랑), 지금 자리(주황)로 옮긴다. Ctrl/Cmd+F는 바깥 창·문서 안 모두 H.onKey → onFindKey로 온다.
const F={list:[],cur:-1};let fTimer=0;
function openFind(){if(!S.doc)return;if(S.editing)H.finishText();const b=$('#findBar');b.hidden=false;const a=$('#fa');a.focus();a.select();if(a.value)runFind()}
function closeFind(){clearTimeout(fTimer);$('#findBar').hidden=true;H.clearFind();F.list=[];F.cur=-1}
function findCount(){const q=$('#fa').value,n=F.list.length;$('#fCount').textContent=q?(n?(F.cur+1)+'/'+n:tt('find.none')):'';$('#fCount').classList.toggle('none',!!q&&!n);
 for(const id of ['#fPrev','#fNext'])$(id).disabled=!n;for(const id of ['#fRep','#fRepAll'])$(id).disabled=!q||!n}
async function showFind(i){if($('#findBar').hidden)return;/* 닫힌 뒤 늦게 도착한 검색은 칠하지 않는다(완료 검수 1회차 지적) */const n=F.list.length;if(!n){F.cur=-1;H.setFindHighlight([],-1);findCount();return}F.cur=((i%n)+n)%n;await H.revealRange(F.list[F.cur]);H.setFindHighlight(F.list,F.cur);findCount()}
function runFind(keep){F.list=H.findAll($('#fa').value);return showFind(keep==null?0:Math.min(keep,F.list.length-1))}
on('#bFind',openFind);
$('#fa').addEventListener('input',()=>{clearTimeout(fTimer);fTimer=setTimeout(()=>runFind(),120)});
$('#fa').addEventListener('keydown',(e)=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();showFind(F.cur+(e.shiftKey?-1:1))}else if(e.key==='Escape'){e.preventDefault();closeFind()}});
$('#fb').addEventListener('keydown',(e)=>{if(e.key==='Escape'){e.preventDefault();closeFind()}else if(e.key==='Enter'&&!e.isComposing){e.preventDefault();$('#fRep').click()}});
on('#fNext',()=>showFind(F.cur+1));on('#fPrev',()=>showFind(F.cur-1));on('#fClose',closeFind);
on('#fToggle',()=>{const b=$('#findBar'),o=!b.classList.contains('rep');b.classList.toggle('rep',o);$('#fToggle').setAttribute('aria-expanded',String(o))});
// 바꾸기 전에 입력 중인 글자를 먼저 확정한다 — 확정 전 입력은 바꾸기의 새 변경 기록에 밀려 저장에서 빠졌다(완료 검수 1회차 지적). 확정하면 글자가 바뀌므로 다시 찾은 뒤 바꾼다.
function settleTyping(){if(!S.editing)return false;H.finishText();F.list=H.findAll($('#fa').value);F.cur=Math.min(Math.max(0,F.cur),F.list.length-1);return true}
on('#fRep',()=>{settleTyping();const r=F.list[F.cur],k=F.cur;if(r&&H.replaceOne(r,$('#fb').value)){runFind(k);msg(tt('msg.replaced',{n:1}))}});
on('#fRepAll',()=>{settleTyping();const n=H.replaceAll($('#fa').value,$('#fb').value);runFind();msg(tt('msg.replaced',{n}))});
// 문서를 고치면(되돌리기 포함) 찾은 자리가 달라질 수 있다 — 막대가 열려 있으면 다시 찾는다(hooks.js onChange가 부른다)
function refreshFind(){if(!$('#findBar').hidden&&$('#fa').value)runFind(Math.max(0,F.cur))}
