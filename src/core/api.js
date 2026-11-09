// 바깥(화면 층)에 내놓는 함수 목록
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/core·src/save 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
api.noteOf = noteOf; api.setNote = setNote;
const NOOP_UI = { onPresent() {}, onOpen() {}, onLoaded() {}, onSlide() {}, onSelect() {}, onChange() {}, onSaved() {}, onSaveFailed() {}, onLayers() {}, onEditing() {}, syncOverlay() {}, onComments() {}, onAiProgress() {}, onEsc() {}, onOpenKey() {}, onPrintKey() {}, onDropFiles() {}, askName: async (n) => n, askConflict: async () => 'go' };
const ui = () => Object.assign({}, NOOP_UI, window.HEUI || {});
api.onKey = onKey; api.onPaste = onPaste;
api.handoffSupported = handoffSupported; api.receiveHandoff = receiveHandoff; api.HANDOFF_SITE = HANDOFF_SITE;
Object.assign(api, { saveAs, backToDeck, openText, onFrameLoad, slides, goTo, curIndex, setColor, setSize, toggleBold, align, removeSel, moveBy, resizeTo, zOrder, alignMany, addTextBox, replaceImage, addImage, dupEl, copyEl, pasteEl, rowAdd, colAdd, rowDel, colDel, replaceAll, startText, finishText, undo, redo, save, dupSlide, delSlide, moveSlide, reorderSlides, toggleSteps, presentView, op, begin, end, scaleOf, sectionOf, CS, setSel, cellOf, ser, parse, clean, ID });
