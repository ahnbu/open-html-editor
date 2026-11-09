// 문서 자동 인식의 화면 쪽(계획 ②). 덱 전용 버튼(.deck-only: 모아보기·장 복제·순서·발표·노트)만 숨기고 나머지 메뉴는 그대로 쓴다.
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/ui 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
const LONG_PAGE = 20000; // 이보다 긴 문서는 상태 줄에 한계 안내를 띄운다(②e)
function applyView(){const v=H.viewKind();document.body.classList.toggle('doc-mode',v!=='deck');document.body.dataset.view=v;S.stageRatio=H.slideRatio();fitStage()}
// 무대 비율(계획 _docs/20261105_04 1e): 장 크기가 고정된 덱은 무대를 장 비율로 맞춰 가운데 둔다(예: 1920×1080 → 16:9).
// 창을 따라 변하는 덱·문서는 지금처럼 남은 칸을 다 쓴다.
function fitStage(){const st=$('#stage'),r=S.stageRatio;st.style.width='';st.style.height='';st.style.flex='';st.style.alignSelf='';if(!r||!S.doc)return;
 const avail=st.getBoundingClientRect();let w=avail.width,h=w/r;if(h>avail.height){h=avail.height;w=h*r}
 st.style.flex='0 0 auto';st.style.width=Math.floor(w)+'px';st.style.height=Math.floor(h)+'px';st.style.alignSelf='center'}
{let ft=0;new ResizeObserver(()=>{cancelAnimationFrame(ft);ft=requestAnimationFrame(()=>{if(S.stageRatio){fitStage();sync()}})}).observe($('#canvas'))}
// 열기 직후 상태 줄: 덱·A4 문서·구역 문서 중 무엇으로 열렸는지 알린다
function openedMsg(){if(S.kind==='bundle')return tt('msg.openedBundle');if(S.missing.size)return tt('msg.missingImages',{n:S.missing.size});const v=H.viewKind();return tt(v==='a4'?'msg.openedA4':v==='page'?'msg.openedPage':'msg.opened',{n:H.slides().length})}
function longPageNotice(){if(!H.isDoc()||!S.doc)return;const h=S.doc.documentElement.scrollHeight;if(h>LONG_PAGE)msg(tt('msg.longPage'))}
// 언어를 바꾸면 그때그때 만든 글자도 다시 쓴다
window.HE_LANG.onChange(()=>{aiLabels();handoffRow();if(S.doc){state();markThumb();msg('')}});
