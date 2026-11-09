// 본체가 부르는 화면 함수(HEUI)
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/ui 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
window.HEUI={
 onPresent(w){pvOpen(w)},
 onEsc(){setCommentMode(false)},
 onComments(id){comments();if(id)openPop(id)},
 onAiProgress(st){msg(tt('msg.aiProgress',{sec:st.elapsed?tt('msg.sec',{n:Math.round(st.elapsed/1000)}):'',note:st.note?' · '+st.note:''}))},
 askName(n){return new Promise((res)=>{const d=$('#dlgName');$('#nameIn').value=n.replace(/\.html?$/i,'');d.onclose=()=>res(d.returnValue==='go'?$('#nameIn').value:null);d.showModal()})},
 askConflict(){return new Promise((res)=>{const d=$('#dlgConflict');d.onclose=()=>res(d.returnValue||'no');d.showModal()})},
 // 키트 서버 저장은 장 파일(md)에 반영하는데 md에는 노트 자리가 없다. 적어도 사라지므로 칸을 숨긴다
 onOpen(){$('#notesBar').style.display=S.server?'none':'';$('#fname').value=H.fileName().replace(/\.html?$/i,'');fitName();aiLabels();comments();handoffRow();msg(openedMsg());longPageNotice();state()},
 onLoaded(){applyView();loadThumbs();state();sync();nAt=-1;noteLoad();if(!H.slides().length)msg(tt('msg.noSlides'));else if(!S.doc.querySelector('['+H.ID+']')){msg(tt('msg.saveDisabled'));$('#bSave').disabled=true}},
 onSlide(){markThumb();sync();setNeed();noteLoad()},
 onSelect(){setNeed();sync()},
 onChange(t){msg(t);state();refreshThumb();markThumb();sync();noteLoad()},
 onSaved(j){S.savedOnce=true;state();if(j.file){$('#fname').value=H.fileName().replace(/\.html?$/i,'');fitName();msg(tt(j.inPlace?'msg.savedInPlace':'msg.downloaded',{file:j.file})+(S.lastSaveHandoff?tt('msg.savedHandoffSuffix'):''));showGuide()}else msg(tt('msg.savedServer',{n:j.changed||0,backup:j.backup||''}))},
 onOpenKey(){openPick()},
 onPrintKey(){printPdf()},
 async onDropFiles(dt){const out=await dropFiles(dt);if(out.length)switchTo(out)},
 onSaveFailed(why){state();msg(tt('msg.saveFailed',{why}))},
 onLayers(){msg(tt('msg.layers'))},
 onEditing(on){msg(on?tt('msg.editing'):'');sync()},
 syncOverlay:sync,
};
$('#stage').addEventListener('load',()=>H.onFrameLoad());
addEventListener('resize',sync);setInterval(()=>{if(S.sel.length)sync()},400);
