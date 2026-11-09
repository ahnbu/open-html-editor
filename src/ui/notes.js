// 발표자 노트 입력 칸
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/ui 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// ---------- 발표자 노트 입력 ----------
// 쓰다가 잠깐 멈추거나 칸을 벗어나면 그 장에 적는다. 되돌리기 한 번에 그만큼 돌아간다.
const nIn=$('#notesIn');let nAt=-1,nTimer=0;
function noteLoad(){if(document.activeElement===nIn&&nAt===S.cur)return;nAt=S.cur;nIn.value=S.doc?H.noteOf(S.cur):''}
function noteSave(){clearTimeout(nTimer);if(nAt<0||!S.doc)return;H.setNote(nAt,nIn.value)}
nIn.addEventListener('input',()=>{clearTimeout(nTimer);nTimer=setTimeout(noteSave,700)});
nIn.addEventListener('blur',noteSave);
nIn.addEventListener('keydown',(e)=>{e.stopPropagation();if(e.code==='Escape'){e.preventDefault();nIn.blur()}if((e.ctrlKey||e.metaKey)&&e.code==='KeyS'){e.preventDefault();noteSave();if(e.shiftKey)H.saveAs();else H.save()}});
on('#bNotesFold',()=>{const off=!document.body.classList.contains('notes-off');fold('notes-off',off,'notes');notesLabel()});
if(pref('notes')==='1')document.body.classList.add('notes-off');
function notesLabel(){const off=document.body.classList.contains('notes-off');$('#bNotesFold').textContent=tt(off?'notes.unfold':'notes.fold');$('#bNotesFold').title=tt(off?'notes.unfoldTip':'notes.foldTip')}
notesLabel();window.HE_LANG.onChange(notesLabel);
