// 선택 상자·크기 손잡이
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/ui 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// 좌표 변환은 여기 한 곳(계획 _docs/20261109_03 2번): 무대 안 좌표 → 덧씌움(#canvas 기준) 좌표 = 무대 위치 + 안쪽 좌표 × 배율(stageZoom, view-mode.js).
// 무대 안에서 잰 좌표가 CSS px의 몇 배로 보이는지. 크롬·파이어폭스는 1, 사파리(webkit)는 확대된 iframe 안 좌표를 배율로 한 번 더 나눠 돌려준다(1/배율, 2026-11-09 실측).
// 계산은 본체 H.rectK(input.js) 한 곳 — 배율 1일 때를 기준으로 삼아 덱 자체의 zoom은 1로 남긴다
function innerRectScale(){return H.rectK?H.rectK():1}
// 무대 안 좌표 1 → 바깥 화면 px. 크롬 = 배율, 사파리 = 배율²
function stageFactor(){return stageZoom()/innerRectScale()}
function stageOrigin(){const f=$('#stage').getBoundingClientRect(),c=$('#canvas').getBoundingClientRect();return {ox:f.left-c.left,oy:f.top-c.top,z:stageFactor()}}
function toCanvas(r){const {ox,oy,z}=stageOrigin();return {left:ox+r.left*z,top:oy+r.top*z,width:r.width*z,height:r.height*z,right:ox+r.right*z,bottom:oy+r.bottom*z}}
// 덧씌움은 #canvas 전체를 덮으므로, 무대 칸(#stageWrap)의 보이는 영역 밖(노트 칸·회색 여백)에 그려진 것은 잘라 낸다
function clipOverlay(o){const w=$('#stageWrap'),c=$('#canvas').getBoundingClientRect(),r=w.getBoundingClientRect();const t=r.top-c.top+w.clientTop,l=r.left-c.left+w.clientLeft;o.style.clipPath=`inset(${Math.max(0,t)}px ${Math.max(0,c.width-(l+w.clientWidth))}px ${Math.max(0,c.height-(t+w.clientHeight))}px ${Math.max(0,l)}px)`}
function sync(){const o=$('#overlay');o.innerHTML='';if(!S.doc)return;clipOverlay(o);drawPins(o);if(!S.sel.length)return;
 S.sel.forEach((e,idx)=>{if(!e.isConnected)return;const r=toCanvas(e.getBoundingClientRect());const b=document.createElement('div');b.className='box';b.style.cssText=`left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;o.appendChild(b);
  if(idx===0&&S.sel.length===1){if(!S.editing){const tag=document.createElement('div');tag.className='tag';const img=e.tagName==='IMG';tag.textContent=tt(img?'tag.image':'tag.text');const top=r.top-28;tag.style.cssText=`left:${r.left}px;top:${top<2?r.bottom+6:top}px`;o.appendChild(tag);
    if(!e.closest('td,th'))for(const [n,x,y] of [['nw',0,0],['ne',1,0],['sw',0,1],['se',1,1],['e',1,.5]]){const h=document.createElement('div');h.className='hd';/* 손잡이는 요소 바깥에 둔다. 얇은 글자 줄의 클릭을 막지 않게 한다. */h.style.left=Math.max(0,Math.min(o.clientWidth-12,r.left+r.width*x+(x===1?2:-12)))+'px';h.style.top=Math.max(0,Math.min(o.clientHeight-12,r.top+r.height*y+(y===0?-12:y===1?2:-5)))+'px';h.style.cursor=n+'-resize';h.dataset.h=n;o.appendChild(h)}}}});}
// 크기 손잡이: 손잡이는 바깥 화면에서 끌므로 이동량을 「배율 × 덱 내부 배율」로 나눠 문서 안 거리로 바꾼다.
// 시작 폭·높이와 위치 고정 계산은 무대 안 좌표(요소의 getBoundingClientRect)와 덱 내부 배율(rz.s)로만 한다.
let rz=null;$('#overlay').addEventListener('pointerdown',(e)=>{const n=e.target.dataset&&e.target.dataset.h;if(!n)return;e.preventDefault();const el=S.sel[0],r=el.getBoundingClientRect(),s=H.scaleOf(el);rz={n,el,x:e.clientX,y:e.clientY,w:r.width/s,h:r.height/s,s,k:s*stageFactor(),ratio:r.width/r.height,lx:0,ly:0,l:r.left,t:r.top};H.begin();$('#overlay').style.pointerEvents='auto';});
addEventListener('pointermove',(e)=>{if(!rz)return;const dx=(e.clientX-rz.x)/rz.k,dy=(e.clientY-rz.y)/rz.k;let w=rz.w,h=rz.h,mx=0,my=0;if(rz.n.includes('e'))w=rz.w+dx;if(rz.n.includes('w')){w=rz.w-dx;mx=dx}if(rz.n.includes('s'))h=rz.h+dy;if(rz.n.includes('n')){h=rz.h-dy;my=dy}
 if(rz.el.tagName==='IMG'&&rz.n.length===2){h=w/rz.ratio;if(rz.n.includes('n'))my=rz.h-h}
 H.resizeTo(rz.el,Math.max(8,w),rz.n==='e'?null:Math.max(8,h),mx-rz.lx,my-rz.ly);rz.lx=mx;rz.ly=my;if(!/[nw]/.test(rz.n)){const q=rz.el.getBoundingClientRect(),ax=(rz.l-q.left)/rz.s,ay=(rz.t-q.top)/rz.s;if(Math.abs(ax)>.5||Math.abs(ay)>.5)H.moveBy([rz.el],ax,ay);}sync();});
addEventListener('pointerup',()=>{if(!rz)return;const el=rz.el;rz=null;$('#overlay').style.pointerEvents='';H.end(tt('op.resize'),[el]);sync();});
