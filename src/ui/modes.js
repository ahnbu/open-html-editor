// 발표 중 편집·원본 반영(로컬 서버) 모드
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/ui 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// 발표 중 편집: 장을 늘리거나 옮기는 버튼을 끄고, 발표 보기 자리를 돌아가기로 쓴다
if(S.live){for(const id of ['#bSDup','#bSPrev','#bSNext','#bSDel'])$(id).disabled=true;$('#viewLabel').dataset.i18n='btn.viewBack';window.HE_LANG.apply($('#bView'));
 // 파일 고르기 창은 크롬이 청중 창의 전체화면을 푼다. 그림은 붙여넣기로 넣는다.
 for(const id of ['#bImg','#bImgAdd'])$(id).addEventListener('click',(e)=>{e.preventDefault();msg(tt('msg.liveNoFile'))})}
// 원본 반영 모드: 서버가 덱을 준다. 개인 키트 서버가 머리에 he-server 표시를 넣었을 때만 묻는다(공개 사이트는 요청을 보내지 않는다).
if(location.protocol.startsWith('http')&&document.querySelector('meta[name="he-server"]'))fetch('/api/deck').then((r)=>r.ok?r.json():null).then((j)=>{if(!j)return;S.server=true;S.baseHref=j.base;H.openText(j.html,j.name,new Map())}).catch(()=>{});
