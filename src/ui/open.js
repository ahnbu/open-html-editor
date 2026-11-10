// 파일·폴더 열기, 편집 중 다른 파일 열기, 받은 문서 열기(받는 분 한 번에 열기 — 계획 _docs/20261104_07)
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/ui 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// 열기
async function openFiles(files){const list=[...files];const htmls=list.filter((f)=>/\.html?$/i.test(f.name));if(!htmls.length){msg(tt('msg.noHtml'));return}
 const rel=(f)=>f.webkitRelativePath||f.name;const top=(p)=>p.split('/').length;htmls.sort((a,b)=>top(rel(a))-top(rel(b))||(/index\.html?$/i.test(b.name)-/index\.html?$/i.test(a.name))||b.size-a.size);const main=htmls[0];const rootDir=rel(main).includes('/')?rel(main).slice(0,rel(main).lastIndexOf('/')+1):'';
 const map=new Map();for(const f of list){const r=rel(f);if(f===main)continue;map.set(r.startsWith(rootDir)?r.slice(rootDir.length):r,f)}
 await H.openText(await main.text(),main.name,map)}
$('#openFile').addEventListener('change',(e)=>openFiles(e.target.files));$('#openDir').addEventListener('change',(e)=>openFiles(e.target.files));
// ⑧e 편집 중 다른 파일 열기: 파일을 먼저 고르고(파일 창·끌어놓기) 저장 안 한 변경이 있으면 묻는다.
// 먼저 고르는 이유: 저장 뒤에 파일 창을 띄우면 브라우저가 사용자 동작 없는 창 열기로 막을 수 있다.
const loaded=()=>document.body.classList.contains('loaded');
function openPick(){document.querySelectorAll('.menu.open').forEach((x)=>x.classList.remove('open'));(loaded()?$('#openOther'):$('#openFile')).click()}
function askSwitch(){return new Promise((res)=>{const d=$('#dlgSwitch');d.onclose=()=>res(d.returnValue||'no');d.returnValue='';d.showModal()})}
async function switchTo(files){
 if(!loaded())return openFiles(files);
 // 글자 입력 중이면 먼저 확정한다 — 확정 전에는 변경으로 세지 않아 묻지 않고 잃는다(완료 검수 1차 지적)
 if(S.editing)H.finishText();
 if(H.isDirty()||S.commentChanged){
  const how=await askSwitch();
  if(how==='save'){const r=await H.save();if(!r||r.canceled||r.error)return}
  else if(how!=='discard')return;
 }
 return openFiles(files)}
$('#bOpenOther').addEventListener('click',openPick);
$('#openOther').addEventListener('change',(e)=>{const f=[...e.target.files];e.target.value='';if(f.length)switchTo(f)});
// 공유 메뉴(계획 _docs/20261105_04 3a): 「받는 분도 바로 고칠 수 있게」 토글(파일을 열 때마다 켬) → 공유용 파일 저장 + 안내문 복사.
// 일반 「저장」은 버튼 없이 원본만 저장한다. 메뉴 안을 눌러도 메뉴는 닫히지 않는다(버튼 동작 뒤에만 닫는다).
$('#shareMenu').addEventListener('click',(e)=>e.stopPropagation());
const shareOn=()=>!!S.shareEdit&&H.handoffSupported;
function shareHelp(){$('#shareHelp').textContent=tt(shareOn()?'menu.shareHelp':'menu.shareHelpOff')}
$('#chkHandoff').addEventListener('change',(e)=>{S.shareEdit=e.target.checked;shareHelp()});
// 키트 서버 모드는 원본 md에 반영하는 저장이라 공유 파일이 없다 → 공유 버튼을 숨긴다. 압축을 못 하는 브라우저는 토글을 끄고 잠근다.
function handoffRow(){$('#bShare').parentElement.hidden=!!S.server;const c=$('#chkHandoff');c.disabled=!H.handoffSupported;c.checked=shareOn();shareHelp()}
async function copyText(text){try{await navigator.clipboard.writeText(text);return true}catch(e){const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy')}catch(e2){ok=false}ta.remove();return ok}}
// 안내문: 보낼 파일에 받는 분 버튼이 있는지에 따라 다르다(공유용 저장을 했으면 그 결과, 아니면 지금 토글)
const guideText=(withBtn)=>tt(withBtn?'guide.withButton':'guide.noButton',{url:H.HANDOFF_SITE+'/'});
function showGuide(){}
const closeMenus=()=>document.querySelectorAll('.menu.open').forEach((x)=>x.classList.remove('open'));
$('#bGuide').addEventListener('click',async()=>{const ok=await copyText(guideText(S.lastShareText?!!S.lastShareHandoff:shareOn()));closeMenus();msg(ok?tt('msg.guideCopied'):tt('msg.copyFailed'))});
$('#bShareSave').addEventListener('click',async()=>{const r=await H.shareSave();const ok=await copyText(guideText(r.handoff));closeMenus();msg(tt(ok?'msg.shareSaved':'msg.shareSavedNoCopy',{file:r.file}))});
// ⑧a 받는 쪽: 받은 파일의 「이 문서 고치기」가 이 탭을 #handoff로 열었다. 준비 신호를 보내고 문서를 한 번만 받는다.
// 로컬 파일에서 연 창은 출처가 "null"이라 출처로 거를 수 없다 → 이 탭을 연 창(opener)이 보낸 것만 받는다. 이 편집기는 받기만 하고 어디에도 보내지 않는다.
if(location.hash==='#handoff'){
 try{history.replaceState(null,'',location.pathname+location.search)}catch(e){/* 주소를 못 바꿔도 받기는 한다 */}
 if(window.opener&&H.handoffSupported){
  let got=false;
  addEventListener('message',async(e)=>{const d=e.data;if(got||e.source!==window.opener||!d||d.t!=='ohe-doc'||typeof d.gz!=='string'||!d.gz)return;got=true;
   try{const r=await H.receiveHandoff(d);if(r.lost)msg(tt('msg.handoffLostImages',{n:r.lost}));else if(!S.missing.size&&S.kind!=='bundle')msg(tt('msg.openedHandoff'))}catch(err){got=false;console.warn('handoff',err)}});
  try{window.opener.postMessage('ohe-ready','*')}catch(e){/* 보낸 창이 닫혔다 */}
 }
}
// 로고 → 첫 화면(계획 _docs/20261110_01 5번). 입력 중 글자는 먼저 확정해 변경으로 센다. 저장 안 한 변경이 있으면 묻는다(취소·저장 실패면 편집 그대로).
// 첫 화면으로는 주소의 #app을 뗀 같은 주소를 다시 연다 — 편집 상태를 깨끗이 비우는 가장 확실한 길이다. 내 맥 연결 모드·발표 모드에는 첫 화면이 없어 로고가 단추가 아니다.
function homeOff(){return !!(S.server||S.live)}
function askHome(){return new Promise((res)=>{const d=$('#dlgHome');d.onclose=()=>res(d.returnValue||'no');d.returnValue='';d.showModal()})}
async function goHome(){if(homeOff())return;if(S.editing)H.finishText();
 if(loaded()&&(H.isDirty()||S.commentChanged)){const how=await askHome();if(how==='save'){const r=await H.save();if(!r||r.canceled||r.error)return}else if(how!=='discard')return}
 S.leaving=true;location.href=location.pathname+location.search}
$('#bHome').addEventListener('click',goHome);
function homeState(){const b=$('#bHome');b.disabled=homeOff();b.classList.toggle('off',homeOff())}
homeState();
// 바로가기 주소 html.planninghigh.com/#app(계획 _docs/20261110_01 6번): 첫 화면을 건너뛰고 빈 편집기와 열기 안내를 보인다. 파일을 열면(loaded) 보통 편집기가 된다.
if(location.hash==='#app')document.body.classList.add('app-empty');
$('#eoOpen').addEventListener('click',()=>$('#openFile').click());
$('#eoSample').addEventListener('click',()=>{const b=$('#bExample');if(b&&!b.hidden)b.click()});
if(!window.HE_EXAMPLE)$('#eoSample').hidden=true;
// 파일 끌기 덮개(계획 _docs/20261110_01 9번): 파일을 끌고 들어오는 동안 화면 전체를 덮고 놓으면 어떻게 되는지 알린다.
// dragover는 끄는 동안 계속 오므로, 마지막 dragover 뒤 잠깐 조용하면 덮개를 내린다(자식 요소 사이를 지날 때 깜박이지 않는다). 글자·장 끌기(파일 아님)에는 뜨지 않는다.
// 편집 무대(iframe) 안의 끌기는 본체(input.js)가 onFileDrag로 알려 준다.
let dcT=0;
function fileDrag(on){const c=$('#dropCover');clearTimeout(dcT);if(!on){c.hidden=true;return}
 const sw=loaded();$('#dcTitle').textContent=tt(sw?'drop.switchTitle':'drop.title');$('#dcSub').textContent=tt(sw?'drop.switchSub':'drop.sub');c.hidden=false;dcT=setTimeout(()=>{c.hidden=true},180)}
const hasFileDrag=(e)=>e.dataTransfer&&[...e.dataTransfer.types].includes('Files');
addEventListener('dragover',(e)=>{if(hasFileDrag(e))fileDrag(true)});
addEventListener('drop',()=>fileDrag(false));addEventListener('dragleave',(e)=>{if(e.clientX<=0||e.clientY<=0||e.clientX>=innerWidth||e.clientY>=innerHeight)fileDrag(false)});
