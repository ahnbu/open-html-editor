// 편집기 상태(S)와 공용 상수. 원칙: 저장은 받은 원문에 수정만 입힌다. 덱 코드가 실행 중 바꾼 것은 저장에 섞지 않는다.
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
const ID = 'data-he', NEW = 'data-he-new';
const ALLOW_ATTR = new Set(['src', 'alt', 'srcset', 'data-speaker-notes']);
const $ = (s) => document.querySelector(s);
const S = {
  src: null, orig: null, nextId: 1, kind: 'plain', bundle: null, name: 'deck.html', files: new Map(), back: new Map(),
  win: null, doc: null, mo: null, sel: [], editing: null, undo: [], redo: [], touched: new Map(), styleTouched: new Map(),
  clip: null, stepsOpen: true, cur: 0, dirty: 0, server: false, baseHref: '', opOpen: false, lastSaved: '',
};
const api = (window.HE = { S });
// 화면 문구는 사전(src/i18n)에서 읽는다. 본체는 꾸밈 없는 글자만 쓴다.
const T = (k, v) => (window.HE_TT ? window.HE_TT(k, v) : k);
