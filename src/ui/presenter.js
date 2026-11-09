// 발표자 창
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/ui 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// ---------- 발표자 창 ----------
// 청중 창은 바깥 화면(없으면 이 화면)에 따로 뜨고, 이 편집기 창은 발표자 창으로 바뀐다. 두 창은 장 번호만 주고받는다.
// 청중 창에서 넘겨도(리모컨·방향키) 따라오고, 여기서 넘기면 청중 창이 넘어간다. 청중 창을 닫으면 편집으로 돌아온다.
let pvWin=null,pvAt=0,pvStart=0,pvPaused=0,pvStop=null,pvTick=0;
const pvSend=(m)=>{try{if(pvWin&&!pvWin.closed)pvWin.postMessage(m,'*')}catch(e){}};
function pvFrame(f,cb){const [W,Hh]=slideWH();f.onload=cb;f.srcdoc='<!doctype html><html><head><meta charset="utf-8">'+baseTag()+deckCss()+'<style>html,body{margin:0!important;padding:0!important;background:transparent!important;overflow:hidden!important;width:100%!important;height:100%!important;display:block!important;min-height:0!important}'+zCss(W,Hh)+'.he-z *{pointer-events:none!important}</style></head><body><div class="he-z" id="he-z"></div></body></html>'}
function pvPaint(f,sec,mark){const d=f.contentDocument,z=d&&d.getElementById('he-z');if(!z)return;z.innerHTML=sec?cloneSec(sec).outerHTML:'';const [W,Hh]=slideWH(),fw=f.clientWidth,fh=f.clientHeight,k=Math.min(fw/W,fh/Hh)||1;z.style.width=W+'px';z.style.height=Hh+'px';z.style.background=sec?'#fff':'transparent';z.style.transform='translate('+(fw-W*k)/2+'px,'+(fh-Hh*k)/2+'px) scale('+k+')';if(mark&&z.firstElementChild){z.firstElementChild.style.setProperty('outline',(3/k)+'px solid #FF6B47','important');z.firstElementChild.style.setProperty('outline-offset',(-3/k)+'px','important')}}
function pvRender(){if(!pvWin)return;const l=H.slides();if(!l.length)return;pvAt=Math.max(0,Math.min(l.length-1,pvAt));pvPaint($('#pvCur'),l[pvAt],true);pvPaint($('#pvNxt'),l[pvAt+1],false);$('#pvNotes').textContent=H.noteOf(pvAt);$('#pvPage').textContent=(pvAt+1)+' / '+l.length;
 const dd=$('#pvRail').contentDocument;if(dd&&dd.getElementById('he-wrap')){const cs=dd.querySelectorAll('.he-card');cs.forEach((c,i)=>c.classList.toggle('cur',i===pvAt));const c=cs[pvAt];/* scrollIntoView는 바깥 창까지 굴려 위 막대가 가려진다. 장 목록만 옆으로 민다 */if(c&&dd.scrollingElement)dd.scrollingElement.scrollLeft=c.offsetLeft-(dd.documentElement.clientWidth-c.offsetWidth)/2}}
function pvTime(){const t=Math.floor(((pvStop||Date.now())-pvStart-pvPaused)/1000);$('#pvTimer').textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');$('#pvClock').textContent=new Date().toLocaleTimeString(window.HE_LANG.get()==='ko'?'ko-KR':'en-US',{hour:'numeric',minute:'2-digit'});if(pvWin&&pvWin.closed)pvClose()}
function pvOpen(w){if(!w||typeof w.postMessage!=='function'||!H.slides().length)return;closePop();noteSave();pvWin=w;pvAt=S.cur;pvStart=Date.now();pvPaused=0;pvStop=null;$('#pvPause').textContent=tt('pv.pause');
 const [W,Hh]=slideWH();$('#pvNxtBox').style.aspectRatio=W+'/'+Hh;$('#pv').hidden=false;if(document.activeElement)document.activeElement.blur();$('#pv').focus();
 pvFrame($('#pvCur'),pvRender);pvFrame($('#pvNxt'),pvRender);
 const r=$('#pvRail');r.onload=()=>{const dd=r.contentDocument;const st=dd.createElement('style');st.textContent='html,body{background:transparent!important;overflow-x:auto!important;overflow-y:hidden!important}#he-wrap{padding:4px 2px!important;justify-content:start!important}.he-num{color:#FFE4D6!important}.he-card.cur .he-mini{outline:3px solid #FF6B47!important;outline-offset:1px}';dd.head.appendChild(st);dd.addEventListener('click',(e)=>{const c=e.target.closest('.he-card');if(c)pvSend({he:'go',i:+c.dataset.i})});pvRender()};r.srcdoc=miniDoc(150,H.slides().length,false);
 clearInterval(pvTick);pvTick=setInterval(pvTime,500);pvTime();pvSend({he:'hello'})}
// 끝내면 마지막으로 보던 장에서 편집을 이어 간다
function pvClose(){if(!pvWin)return;const w=pvWin;pvWin=null;clearInterval(pvTick);$('#pv').hidden=true;try{if(!w.closed)w.close()}catch(e){}H.goTo(pvAt)}
addEventListener('message',(e)=>{if(!pvWin||e.source!==pvWin)return;const d=e.data||{};if(d.he==='at'&&Number.isFinite(+d.i)){pvAt=+d.i;pvRender()}});
on('#pvPrev',()=>pvSend({he:'key',k:'ArrowLeft'}));on('#pvNext',()=>pvSend({he:'key',k:'ArrowRight'}));on('#pvEnd',pvClose);
on('#pvReset',()=>{pvStart=Date.now();pvPaused=0;if(pvStop)pvStop=Date.now();pvTime()});
on('#pvPause',(e)=>{if(pvStop){pvPaused+=Date.now()-pvStop;pvStop=null;e.target.textContent=tt('pv.pause')}else{pvStop=Date.now();e.target.textContent=tt('pv.resume')}});
// 단추에 포커스가 남은 채 Space를 누르면 단추도 눌려 두 번 넘어간다
$('#pv').addEventListener('click',(e)=>{const b=e.target.closest('button');if(b){b.blur();$('#pv').focus()}});
addEventListener('resize',()=>{if(pvWin)pvRender()});
// 발표자 창이 떠 있는 동안 키는 청중 창으로 보낸다. 편집 단축키(삭제·되돌리기 등)는 듣지 않는다.
addEventListener('keydown',(e)=>{if(!pvWin)return;e.stopImmediatePropagation();if(e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key;let m=null;
 if(['ArrowRight','ArrowDown','PageDown',' ','Enter'].includes(k))m={he:'key',k:'ArrowRight'};
 else if(['ArrowLeft','ArrowUp','PageUp','Backspace'].includes(k))m={he:'key',k:'ArrowLeft'};
 else if(k==='Home')m={he:'go',i:0};else if(k==='End')m={he:'go',i:H.slides().length-1};
 if(m){e.preventDefault();pvSend(m)}},true);
