// 문서 자동 인식의 화면 쪽(계획 ②). 덱 전용 버튼(.deck-only: 모아보기·장 복제·순서·발표·노트)만 숨기고 나머지 메뉴는 그대로 쓴다.
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/ui 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
const LONG_PAGE = 20000; // 이보다 긴 문서는 상태 줄에 한계 안내를 띄운다(②e)
function applyView(){const v=H.viewKind();document.body.classList.toggle('doc-mode',v!=='deck');document.body.dataset.view=v;S.stageRatio=H.slideRatio();fitStage()}
// 무대 비율(계획 _docs/20261105_04 1e): 장 크기가 고정된 덱은 무대를 장 비율로 맞춰 가운데 둔다(예: 1920×1080 → 16:9).
// 창을 따라 변하는 덱·문서는 지금처럼 남은 칸을 다 쓴다.
// 장표 확대·축소(계획 _docs/20261109_03 2번): 「맞춤」 크기를 정한 뒤 무대(iframe) 요소에만 CSS zoom을 준다. 문서 안은 손대지 않아 저장물에 배율이 섞이지 않는다.
// 무대 안 좌표(요소의 getBoundingClientRect)는 배율과 무관하고, 바깥 화면 좌표 = 무대 왼쪽 + 안쪽 좌표 × 배율이다.
const ZMIN=0.25,ZMAX=3,ZSTEP=0.1;
function stageZoom(){return S.zoom||1}
function fitStage(){const st=$('#stage'),wrap=$('#stageWrap'),r=S.stageRatio,z=stageZoom();st.style.width='';st.style.height='';st.style.flex='';st.style.alignSelf='';st.style.zoom='';if(!S.doc)return;
 const avail=wrap.getBoundingClientRect();let w=avail.width,h=avail.height;if(r){h=w/r;if(h>avail.height){h=avail.height;w=h*r}}
 // 문서(구역·쪽)는 틀이 아니라 문서 안쪽에 배율을 준다(계획 _docs/20261110_01 8번): 틀 안 스크롤막대가 배율을 타지 않고, 축소하면 문서가 더 많이 보인다.
 // 문서 안 배율은 편집기 스타일(#he-style, 저장본에 없음)이 S.zoom을 읽어 넣는다. 덱은 지금처럼 틀에 zoom.
 st.style.flex='0 0 auto';st.style.width=Math.floor(w)+'px';st.style.height=Math.floor(h)+'px';if(H.isDoc())H.refreshEditorCss();else if(z!==1)st.style.zoom=String(z);zoomLabel()}
// 바깥 틀에 걸린 배율(문서는 늘 1 — 배율이 문서 안에 있다)
function outerZoom(){return H.isDoc()?1:stageZoom()}
function zoomLabel(){const z=stageZoom();$('#zoomPct').textContent=Math.round(z*100)+'%';$('#zoomOut').disabled=!S.doc||z<=ZMIN+1e-6;$('#zoomIn').disabled=!S.doc||z>=ZMAX-1e-6;$('#zoomFit').disabled=!S.doc||Math.abs(z-1)<1e-6}
// 배율을 바꾸고, (ax,ay) 화면 점 아래의 장표 자리가 그대로 남도록 스크롤을 맞춘다. 점이 없으면 무대 가운데 기준.
function setZoom(nz,ax,ay){if(!S.doc)return;H.rectK();/* 배율 1의 기준값을 바꾸기 전에 잡아 둔다 */const wrap=$('#stageWrap'),z0=stageZoom();nz=Math.round(Math.min(ZMAX,Math.max(ZMIN,nz))*100)/100;if(Math.abs(nz-z0)<1e-6)return;
 const wr=wrap.getBoundingClientRect(),st=$('#stage').getBoundingClientRect();if(ax==null){ax=wr.left+wr.width/2;ay=wr.top+wr.height/2}
 // 문서: 틀은 그대로이고 문서 안이 커지므로, 기준점 아래 문서 자리가 남게 문서 안 스크롤을 맞춘다
 if(H.isDoc()){const w=S.win,ix=ax-st.left,iy=ay-st.top,dx=(ix+w.scrollX)/z0,dy=(iy+w.scrollY)/z0;S.zoom=nz;S.docPin=null;fitStage();w.scrollTo(dx*nz-ix,dy*nz-iy);closePopIfHidden();sync();return}
 const cx=(ax-st.left)/z0,cy=(ay-st.top)/z0;S.zoom=nz;fitStage();
 const st2=$('#stage').getBoundingClientRect();wrap.scrollLeft+=st2.left+cx*nz-ax;wrap.scrollTop+=st2.top+cy*nz-ay;closePopIfHidden();sync()}
function zoomFit(){if(!S.doc)return;if(H.isDoc()){setZoom(1);return}S.zoom=1;fitStage();const w=$('#stageWrap');w.scrollLeft=0;w.scrollTop=0;closePopIfHidden();sync()}
// 휠: 마우스 한 칸(대략 deltaY 100)마다 10%p. 트랙패드 집기는 작은 값이 여러 번 오므로 모아서 바꾼다.
let zAcc=0;
function zoomWheel(dy,mode,ax,ay){zAcc+=mode===1?dy*33:mode===2?dy*400:dy;if(Math.abs(zAcc)<40)return;const n=Math.max(1,Math.min(3,Math.round(Math.abs(zAcc)/100)))*Math.sign(zAcc);zAcc=0;setZoom(stageZoom()-n*ZSTEP,ax,ay)}
$('#zoomOut').addEventListener('click',()=>setZoom(stageZoom()-ZSTEP));
$('#zoomIn').addEventListener('click',()=>setZoom(stageZoom()+ZSTEP));
$('#zoomFit').addEventListener('click',zoomFit);
// 회색 영역에서 Ctrl(Cmd)+휠 — 브라우저 확대를 막고 장표만. 무대 안의 휠은 본체(input.js)가 받아 onZoomWheel로 넘긴다.
$('#canvas').addEventListener('wheel',(e)=>{if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();zoomWheel(e.deltaY,e.deltaMode,e.clientX,e.clientY)},{passive:false});
// 무대 안 휠: 안쪽 좌표를 화면 좌표로 바꿔 같은 기준점으로 키운다
function zoomWheelInner(e){const st=$('#stage').getBoundingClientRect(),z=stageFactor();zoomWheel(e.deltaY,e.deltaMode,st.left+e.clientX*z,st.top+e.clientY*z)}
$('#stageWrap').addEventListener('scroll',()=>{closePopIfHidden();sync()});
zoomLabel();
// 무대 칸(#stageWrap) 크기가 바뀌면(창 크기·노트 칸 접기) 맞춤 크기를 다시 잰다. 배율로 무대가 커져도 칸 크기는 그대로라 되풀이되지 않는다.
{let ft=0;new ResizeObserver(()=>{cancelAnimationFrame(ft);ft=requestAnimationFrame(()=>{if(S.doc){fitStage();sync()}})}).observe($('#stageWrap'))}
// 열기 직후 상태 줄: 덱·A4 문서·구역 문서 중 무엇으로 열렸는지 알린다
function openedMsg(){if(S.kind==='bundle')return tt('msg.openedBundle');if(S.missing.size)return tt('msg.missingImages',{n:S.missing.size});const v=H.viewKind();return tt(v==='a4'?'msg.openedA4':v==='page'?'msg.openedPage':'msg.opened',{n:H.slides().length})}
function longPageNotice(){if(!H.isDoc()||!S.doc)return;const h=S.doc.documentElement.scrollHeight;if(h>LONG_PAGE)msg(tt('msg.longPage'))}
// 언어를 바꾸면 그때그때 만든 글자도 다시 쓴다
window.HE_LANG.onChange(()=>{aiLabels();handoffRow();if(S.doc){state();markThumb();msg('')}});
