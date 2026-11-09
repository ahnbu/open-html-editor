// 모아보기
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/ui 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// 여러 장 보기
function grid(){const f=$('#gridFrame');f.onload=()=>{const dd=f.contentDocument;
 // 여러 장 보기 안에서도 Ctrl+Z / Ctrl+Y가 순서 변경을 되돌린다
 dd.addEventListener('keydown',(e)=>{const m=e.ctrlKey||e.metaKey;if(m&&e.code==='KeyZ'){e.preventDefault();gridUndo(e.shiftKey)}else if(m&&e.code==='KeyY'){e.preventDefault();gridUndo(true)}else if(e.code==='Escape')$('#grid').classList.remove('open')});
 // 끌어 옮기기: 카드의 왼쪽 절반 위면 그 카드 앞, 오른쪽 절반이면 뒤 — 들어갈 사이에 파란 세로선을 그린다(사장 피드백, 계획 _docs/20261105_04 1d)
 const clear=()=>dd.querySelectorAll('.ins-l,.ins-r').forEach((x)=>x.classList.remove('ins-l','ins-r'));
 const sideOf=(c,e)=>{const r=c.getBoundingClientRect();return e.clientX<r.left+r.width/2?'l':'r'};
 dd.querySelectorAll('.he-card').forEach((c,i)=>{c.classList.toggle('cur',i===S.cur);c.onclick=()=>{$('#grid').classList.remove('open');H.goTo(i)};if(S.live)return;c.ondragstart=(e)=>{e.dataTransfer.setData('text/plain',String(i))};c.ondragend=clear;
  c.ondragover=(e)=>{e.preventDefault();const s=sideOf(c,e);if(!c.classList.contains('ins-'+s)){clear();c.classList.add('ins-'+s)}};
  c.ondrop=(e)=>{e.preventDefault();const s=sideOf(c,e);clear();const from=+e.dataTransfer.getData('text/plain'),gap=s==='l'?i:i+1,to=from<gap?gap-1:gap;if(to!==from)H.reorderSlides(from,to).then(grid)}})};f.srcdoc=miniDoc(230,5,!S.live)}
async function gridUndo(re){if(re?!S.redo.length:!S.undo.length)return;await(re?H.redo():H.undo());if($('#grid').classList.contains('open'))grid()}
window.HEUI_gridUndo=gridUndo;
on('#bGrid',()=>{grid();$('#grid').classList.add('open')});on('#gridClose',()=>$('#grid').classList.remove('open'));
