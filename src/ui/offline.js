// 인터넷 없이도 다시 열리게(계획 ⑤b). 사이트(https·localhost)에서만 서비스 워커(public/sw.js, build-single.mjs가 만든다)를 단다.
// 인터넷이 되면 늘 새 판을 받고(네트워크 먼저), 끊기면 마지막으로 받은 판을 연다. 파일로 연 편집기(file://)와 개인 키트 서버에는 달지 않는다.
// 캐시에서 연 옛 판인데 새 판이 들어오면 상태 줄에 새로고침을 안내한다(새 화면 요소는 없다).
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/ui 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// 샌드박스 창(폰 미리보기 등)은 navigator.serviceWorker를 읽기만 해도 오류를 던진다 — 감싸서 뒤 코드가 멈추지 않게 한다.
try{const site=location.protocol==='https:'||/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
 if('serviceWorker' in navigator&&site&&!document.querySelector('meta[name="he-server"]')){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
  navigator.serviceWorker.addEventListener('message',(e)=>{const d=e.data||{};if(d.type==='he-version'&&d.version&&window.HE_BUILD&&d.version!==window.HE_BUILD)msg(tt('msg.newVersion'))});
  navigator.serviceWorker.ready.then((r)=>{if(r.active)r.active.postMessage({type:'he-version?'})}).catch(()=>{});
  navigator.serviceWorker.addEventListener('controllerchange',()=>{const c=navigator.serviceWorker.controller;if(c)c.postMessage({type:'he-version?'})});
 }}catch(e){/* 서비스 워커를 쓸 수 없는 환경 — 오프라인 저장 없이 계속 */}
