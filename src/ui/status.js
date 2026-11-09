// 위 막대 저장 상태와 아래 상태 줄
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/ui 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
function state(){const d=H.isDirty()||!!S.commentChanged;$('#title').classList.toggle('dirty',d);$('#stateText').textContent=H.isDirty()?tt('state.dirty',{n:H.unsavedCount()}):(S.commentChanged?tt('state.dirtyComments'):(S.savedOnce?tt('state.saved'):tt('state.clean')));
 $('#where').textContent=tt(S.server?'where.server':(S.handle?'where.overwrite':'where.download'));setNeed();}
