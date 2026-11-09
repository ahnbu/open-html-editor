// 첫 화면: 열기 단추·끌어다 놓기·예시·언어 메뉴와 움직임(승인 시안 _docs/20261105_16_첫화면-발산/1_거대타이포_v2/b.html의 site.js를 옮김)
// 이 파일은 단독 모듈이 아니다. build-single.mjs가 src/ui 조각을 정해진 순서로 한 함수 안에 이어 붙인다(같은 범위를 쓴다).
// 움직임은 GSAP(src/landing/vendor/gsap.min.js, build-single.mjs가 따로 넣는다). 스크롤 감지는 #land 안에서 IntersectionObserver로 한다.
// 움직임 줄이기 설정이면 움직이지 않고 끝난 장면을 그린다. 편집기가 열리면(he-loaded) 모든 움직임을 멈춘다.
{
const L = $('#land'), G = window.gsap, still = matchMedia('(prefers-reduced-motion: reduce)').matches, mob = matchMedia('(max-width:720px)');
const css = (n) => getComputedStyle(L).getPropertyValue(n).trim();

// ── 열기: 「HTML 파일 열기」(위·아래 두 곳)는 파일 고르기, 「샘플로 바로 둘러보기」는 예시 덱(HE_EXAMPLE, 외부 요청 없음)
const pick = () => $('#openFile').click();
$('#drop').addEventListener('click', pick);
L.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', pick));
[$('#bExample'), ...L.querySelectorAll('[data-example]')].forEach((b) => {
  if (!window.HE_EXAMPLE) b.hidden = true;
  else b.addEventListener('click', () => H.openText(window.HE_EXAMPLE, t('land.exName'), new Map()));
});

// ── 언어 메뉴(지구본). 고르는 단추는 [data-lang]이라 i18n.js가 언어를 바꾼다
const globe = $('#l-globe'), menu = $('#l-langMenu');
const closeMenu = () => { menu.classList.remove('l-open'); globe.setAttribute('aria-expanded', 'false'); };
globe.addEventListener('click', (e) => { e.stopPropagation(); globe.setAttribute('aria-expanded', String(menu.classList.toggle('l-open'))); });
document.addEventListener('click', (e) => { if (!globe.contains(e.target)) closeMenu(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('l-open')) { closeMenu(); globe.focus(); } });

// ── 제목: land.h1을 두 줄(<br>)로 나누고, 둘째 줄은 <wbr>에서 다시 둘로 나눈다(폰에서 각각 한 줄). 첫 줄의 「HTML」이 고쳐지는 낱말
const stage = $('#l-stage'), h1 = $('#l-h1');
function buildH1() {
  const [l1 = '', l2 = ''] = t('land.h1').split(/<br\s*\/?>/i), [a = '', b = ''] = l2.split(/<wbr\s*\/?>/i), i = l1.indexOf('HTML');
  const w = i < 0 ? `<span class="l-w" id="l-wA">${l1}</span>` : `${l1.slice(0, i)}<span class="l-w" id="l-wA">HTML</span>${l1.slice(i + 4)}`;
  h1.innerHTML = `<span class="l-row"><span class="fit" id="l-r1">${w}</span><i class="wipe"></i></span>`
    + ` <span class="l-row l-row2"><span class="fit" id="l-r2"><span class="l-a" id="l-r2a">${a.trim()}</span> <span class="l-b" id="l-r2b">${b.trim()}</span></span><i class="wipe"></i></span>`;
}
// 줄마다 화면 폭에 꽉 맞춘다(폰은 둘째 줄을 둘로 나눠 각각 맞춤)
function fitOne(el, W, max) { el.style.fontSize = '100px'; const w = el.getBoundingClientRect().width; if (w) el.style.fontSize = Math.min(max, 100 * W / w * .995) + 'px'; }
function fit() {
  const W = stage.clientWidth, Hh = L.clientHeight, r1 = $('#l-r1'), r2 = $('#l-r2'), r2a = $('#l-r2a'), r2b = $('#l-r2b');
  fitOne(r1, W, Math.min(220, Hh * .24));
  if (mob.matches) { r2.style.fontSize = ''; fitOne(r2a, W, 120); fitOne(r2b, W, 120); }
  else { r2a.style.fontSize = ''; r2b.style.fontSize = ''; fitOne(r2, W, Math.min(130, Hh * .13)); }
}
const R = (el) => { const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }; };
const hl = $('#l-hl'), sel = $('#l-sel'), bar = $('#l-bar'), cur = $('#l-cur'), tC = $('#l-tC');
const P = {};
function place() {
  const W = stage.clientWidth, r1 = $('#l-r1'), a = R($('#l-wA')), fs = parseFloat(getComputedStyle(r1).fontSize), px = fs * .04;
  P.A = { x: a.x - px, y: a.y + fs * .08, w: a.w + px * 2, h: fs * .86 };
  G.set([hl, sel], { left: P.A.x, top: P.A.y, width: P.A.w, height: P.A.h });
  const bw = bar.offsetWidth, bh = bar.offsetHeight;
  const room = stage.getBoundingClientRect().top - $('#l-hero header').getBoundingClientRect().bottom;
  let by = P.A.y - bh - 14; if (by < -room + 4) by = P.A.y + P.A.h + 12;
  const bx = Math.max(0, Math.min(W - bw, P.A.x + P.A.w / 2 - bw / 2));
  G.set(bar, { left: bx, top: by });
  const c = R(tC); P.tC = { x: c.x + c.w * .5, y: c.y + c.h * .55 };
  P.home = { x: W * .92, y: stage.offsetHeight * 1.1 };
}

// ── 편집기 창: 1200×750 좌표를 칸 폭에 맞춘다. 폰에서도 왼쪽 장 목록까지 창 전체를 보인다
const wwrap = $('#l-wwrap'), wcam = $('#l-wcam'), win = $('#l-win');
function fitWin() {
  const k = wwrap.clientWidth / 1200;
  wcam.style.transform = `scale(${k})`; wwrap.style.height = 750 * k + 'px';
}

// ── 시연 장표: 실제 강의 덱의 장(window.HE_LANDDECK, tools/landing-deck.html). 첫 장이 시연 장, 나머지는 목록 그림에만 쓴다
const sframe = $('#l-sframe'), DK = {};
function prepDeck() {
  // 영어 화면이면 영어판 장(HE_LANDDECK_EN), 없거나 한국어 화면이면 한국어 장
  const en = window.HE_LANG && window.HE_LANG.get() === 'en' && window.HE_LANDDECK_EN;
  const secs = ((en ? window.HE_LANDDECK_EN : window.HE_LANDDECK) || '').split(/(?=<section[\s>])/).filter((s) => s.startsWith('<section'))
    .map((s) => s.replace(/font-family:\s*Paperlogy/g, 'font-family: LPaperlogy, Paperlogy').replace(/font-family:\s*Pretendard/g, 'font-family: LPretendard, Pretendard'));
  if (!secs.length) return false;
  sframe.innerHTML = `<div class="l-dk" style="transform:scale(${1017 / 1920})">${secs[0]}</div>`;
  win.querySelectorAll('.th .tv').forEach((tv, i) => { if (secs[i]) tv.innerHTML = `<div class="l-tvi">${secs[i]}</div>`; });
  const title = sframe.querySelector('[data-demo="title"]');
  DK.fix = sframe.querySelector('[data-demo="fix"]'); DK.color = sframe.querySelector('[data-demo="color"]');
  if (!title || !DK.fix || !DK.color) return false;
  DK.word = DK.fix.textContent; DK.typo = DK.fix.dataset.typo || DK.word; DK.ink = getComputedStyle(DK.color).color;
  [DK.fix, DK.color].forEach((e) => e.classList.add('l-w'));
  DK.end = document.createElement('span'); title.appendChild(DK.end);
  return true;
}
// 목록 그림은 칸 폭에 맞춰 줄인다(창 좌표 기준이라 창 크기가 바뀌어도 그대로)
function fitThumbs() { win.querySelectorAll('.th .tv').forEach((tv) => { const v = tv.firstElementChild; if (v) v.style.transform = `scale(${tv.offsetWidth / 1920})`; }); }
let hasDeck = prepDeck();

// ── 보이는 동안만 돈다(#land가 스크롤 상자다)
const io = [];
const watch = (el, margin, fn) => { if (!('IntersectionObserver' in window)) { fn(true); return; } const o = new IntersectionObserver((es) => es.forEach((e) => fn(e.isIntersecting, o, e.target)), { root: L, rootMargin: margin }); o.observe(el); io.push(o); };

let seen = false; try { seen = !!localStorage.getItem('he-intro'); localStorage.setItem('he-intro', '1'); } catch (e) { /* private mode */ }
let introTl = null, heroTl = null, demoTl = null, heroOn = true, demoOn = false, stopped = false;

buildH1();
if (G && !still) L.classList.add('l-anim');

function intro() {
  const tl = G.timeline();
  // 등장: 선택 막대가 줄마다 쓸고 지나가며 제목을 드러낸다
  h1.querySelectorAll('.l-row').forEach((row, i) => {
    const wipe = row.querySelector('.wipe'), f = row.querySelector('.fit');
    G.set(wipe, { width: f.getBoundingClientRect().width });
    const at = i * .22;
    tl.fromTo(wipe, { scaleX: 0, transformOrigin: '0 50%' }, { scaleX: 1, duration: .5, ease: 'power3.inOut' }, at)
      .set(f, { visibility: 'visible' }, at + .5)
      .to(wipe, { scaleX: 0, transformOrigin: '100% 50%', duration: .5, ease: 'power3.inOut' }, at + .52);
  });
  tl.from('#l-foot > *', { y: 22, opacity: 0, duration: .8, stagger: .08, ease: 'expo.out' }, '-=.35')
    .from('#l-hero header', { opacity: 0, duration: .6 }, '<');
  if (seen) tl.timeScale(3);
  tl.eventCallback('onComplete', () => { L.classList.remove('l-anim'); introTl = null; G.delayedCall(seen ? .2 : .5, startHero); });
  introTl = tl;
}

// ── 첫 화면 장면: 「HTML」 선택 → 글자색 바꾸기, 이 두 동작만 반복
const click = (tl, c) => tl.to(c, { scale: .82, duration: .09, transformOrigin: '4px 2px' }).to(c, { scale: 1, duration: .12 });
function heroLoop() {
  const fg = css('--fg'), ed = css('--edit'), selFg = css('--selFg'), wA = $('#l-wA');
  const tl = G.timeline({ repeat: -1, repeatDelay: .2 });
  tl.call(() => { G.set([hl, sel, bar], { opacity: 0 }); G.set(wA, { color: fg }); tC.classList.remove('l-on'); G.set(cur, { x: P.home.x, y: P.home.y, opacity: 0 }); })
    .to(cur, { opacity: 1, duration: .3 })
    .to(cur, { x: () => P.A.x + P.A.w * .5, y: () => P.A.y + P.A.h * .92, duration: .9, ease: 'power2.inOut' });
  click(tl, cur); click(tl, cur);
  tl.to(hl, { opacity: 1, duration: .12 }, '-=.05')
    .set(wA, { color: selFg }, '<')
    .fromTo(sel, { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: .3, ease: 'back.out(2)' }, '<')
    .fromTo(bar, { opacity: 0, y: 10, scale: .94 }, { opacity: 1, y: 0, scale: 1, duration: .4, ease: 'back.out(1.8)' }, '<.1')
    .to(cur, { x: () => P.tC.x, y: () => P.tC.y, duration: .6, ease: 'power2.inOut' }, '+=.4');
  click(tl, cur);
  tl.call(() => tC.classList.add('l-on'))
    .to(hl, { opacity: 0, duration: .25 })
    .to(wA, { color: ed, duration: .4, ease: 'power2.out' }, '<')
    .call(() => tC.classList.remove('l-on'), null, '+=.3')
    .to(cur, { x: () => P.home.x, y: () => P.home.y, opacity: 0, duration: .8, ease: 'power2.in' }, '+=.3')
    .to([bar, sel], { opacity: 0, duration: .4 }, '<.2')
    .to({}, { duration: 2.2 })
    .to(wA, { color: fg, duration: .5 });
  if (!heroOn) tl.pause();
  return tl;
}
function startHero() { if (stopped) return; if (heroTl) heroTl.kill(); heroTl = heroLoop(); }

// ── 아래 시연(한 장 안에서만, 장 넘김 없음): 오타 낱말 고치기 → 다른 낱말 글자색 → 제목 끝에 코멘트(작은 입력창). 장이나 화면을 덮는 카드는 없다
const wcur = $('#l-wcur'), pin = $('#l-pin'), pop = $('#l-pop'), ta = $('#l-ta'), stT = $('#l-stT');
// 창(1200×750) 좌표. 장은 줄여 놓았으므로 화면 위치를 창 배율로 되돌린다
const at = (el, fx = .5, fy = .5) => { const w = win.getBoundingClientRect(), r = el.getBoundingClientRect(), s = w.width / 1200 || 1; return { x: (r.left - w.left + r.width * fx) / s, y: (r.top - w.top + r.height * fy) / s }; };
const items = [...document.querySelectorAll('#steps li')];
function step(i, d) {
  items.forEach((li, j) => { li.classList.toggle('l-on', j === i); li.style.setProperty('--p', j < i ? '100%' : '0%'); });
  if (i >= 0 && d) { const o = { p: 0 }; G.to(o, { p: 100, duration: d, ease: 'none', onUpdate: () => items[i].style.setProperty('--p', o.p + '%') }); }
}
// 핀은 제목 끝, 입력창은 핀 오른쪽(장 오른쪽 위 빈자리). 장 밖으로 넘치지 않게 오른쪽 끝에서 멈춘다
function placePin() {
  const e = at(DK.end, 0, .1), right = 1178 - 8;
  G.set(pin, { left: e.x + 6, top: e.y - 30 });
  G.set(pop, { left: Math.min(e.x + 48, right - 240), top: 138 });
}
// 미리보기: 끌어다 놓을 파일 카드(STEP 1)
// 처음엔 실제 첫 화면처럼 「HTML 파일 열기」 단추만 있는 화면. 파일을 그 단추에 놓으면 편집기가 열린다
const mland = document.createElement('div'); mland.className = 'l-mland'; mland.innerHTML = '<div class="l-mbtn"><svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/></svg><b></b></div>'; win.appendChild(mland);
const mbtn = mland.firstChild;
const fileCard = document.createElement('div'); fileCard.className = 'l-file'; fileCard.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg><span></span>'; win.appendChild(fileCard);
function demoReset() {
  DK.fix.classList.remove('l-pick'); DK.fix.textContent = DK.typo;
  DK.color.classList.remove('l-pick'); G.set(DK.color, { color: DK.ink });
  stT.textContent = t('land.dmClean'); ta.textContent = ''; $('#l-ok2').classList.remove('hot');
  ['#l-bTc', '#l-bCm'].forEach((s) => $(s).classList.remove('hot'));
  G.set([pin, pop], { opacity: 0 });
  G.set(wcur, { x: 1080, y: 690, opacity: 0 });
  fileCard.lastChild.textContent = t('land.exName');
  G.set(fileCard, { x: 1010, y: 640, opacity: 0, scale: 1 });
  mbtn.lastChild.textContent = t('land.drop'); mbtn.classList.remove('over'); G.set(mland, { opacity: 1, display: 'flex' });
  G.set([sframe, ...win.querySelectorAll('.th .tv')], { opacity: 0, scale: 1 });
}
function demoStill() {
  // 움직임 줄이기: 첫 화면 덮개·파일 카드 없이 편집 끝난 장표만 보인다
  G.set(mland, { display: 'none' }); G.set(fileCard, { opacity: 0 });
  G.set([sframe, ...win.querySelectorAll('.th .tv')], { opacity: 1, scale: 1 });
  DK.fix.textContent = DK.word; G.set(DK.color, { color: css('--or') || '#FF5B14' });
  stT.textContent = t('land.dmEdits', { n: 2 }); $('#l-who').textContent = t('cm.who', { i: 1 }); ta.textContent = t('land.dmNoteMsg');
  placePin(); G.set([pin, pop], { opacity: 1 });
  items.forEach((li) => li.style.setProperty('--p', '100%'));
}
// 글자 하나씩 넣기(입력하는 모습)
const typeIn = (tl, el, text, cps, pre = '') => { const o = { n: 0 }, ch = [...text]; tl.to(o, { n: ch.length, duration: ch.length / cps, ease: 'none', onStart: () => { o.n = 0; }, onUpdate: () => { const e = pre ? el.querySelector(pre) : el; if (e) e.textContent = ch.slice(0, Math.round(o.n)).join(''); } }); };
function demo() {
  demoReset();
  const F = DK.fix, C = DK.color, msg = t('land.dmNoteMsg');
  const tl = G.timeline({ repeat: -1, repeatDelay: .4, paused: true, defaults: { ease: 'power2.inOut' } });
  // 0) 파일을 끌어다 놓기 → 바로 열림
  tl.call(() => { demoReset(); placePin(); step(0, 1.9); })
    .to(fileCard, { opacity: 1, duration: .3 })
    .set(wcur, { x: 1080, y: 690 }, '<')
    .to(wcur, { opacity: 1, duration: .3 }, '<')
    .to([fileCard, wcur], { x: (i) => (i ? 615 : 530), y: (i) => (i ? 395 : 345), duration: 1.2, ease: 'power2.inOut' })
    .call(() => mbtn.classList.add('over'), null, '-=.25')
    .to(fileCard, { scale: .85, opacity: 0, duration: .3 }, '+=.15')
    .call(() => step(1, 1.1))
    .to(mland, { opacity: 0, duration: .35 })
    .set(mland, { display: 'none' })
    .fromTo(sframe, { opacity: 0, scale: .97 }, { opacity: 1, scale: 1, duration: .6, ease: 'power3.out' })
    .to(win.querySelectorAll('.th .tv'), { opacity: 1, duration: .3, stagger: .1 }, '<.2')
    .to({}, { duration: .4 })
    .call(() => step(2, 6.4))
    .to(wcur, { x: () => at(F, .45).x, y: () => at(F, .65).y, duration: .8 });
  // 1) 오타 낱말 더블클릭 → 골라진 뒤 한 글자씩 지우고 다시 입력
  click(tl, wcur); click(tl, wcur);
  tl.call(() => { F.classList.add('l-pick'); F.innerHTML = '<mark></mark>'; F.firstChild.textContent = DK.typo; })
    .to({}, { duration: .5 })
    .call(() => { F.innerHTML = '<span class="l-tw"></span><span class="caret"></span>'; F.firstChild.textContent = DK.typo; });
  { const o = { n: 0 }, ch = [...DK.typo]; tl.to(o, { n: ch.length, duration: ch.length / 6, ease: 'none', onStart: () => { o.n = 0; }, onUpdate: () => { const e = F.querySelector('.l-tw'); if (e) e.textContent = ch.slice(0, ch.length - Math.round(o.n)).join(''); } }); }
  tl.to({}, { duration: .2 });
  typeIn(tl, F, DK.word, 12, '.l-tw');
  tl.call(() => { F.textContent = DK.word; F.classList.remove('l-pick'); stT.textContent = t('land.dmEdits', { n: 1 }); }, null, '+=.3')
  // 2) 다른 낱말을 골라 글자색
    .to(wcur, { x: () => at(C, .5).x, y: () => at(C, .65).y, duration: .7 });
  click(tl, wcur);
  tl.call(() => C.classList.add('l-pick'))
    .to(wcur, { x: () => at($('#l-bTc')).x, y: () => at($('#l-bTc')).y, duration: .7 }, '+=.2');
  click(tl, wcur);
  tl.call(() => $('#l-bTc').classList.add('hot'))
    .to(C, { color: () => css('--or') || '#FF5B14', duration: .35 })
    .call(() => { $('#l-bTc').classList.remove('hot'); C.classList.remove('l-pick'); stT.textContent = t('land.dmEdits', { n: 2 }); }, null, '+=.35')
  // 3) 코멘트: 단추 → 제목 끝을 누르면 핀과 작은 입력창
    .call(() => step(3, 5.6))
    .to(wcur, { x: () => at($('#l-bCm')).x, y: () => at($('#l-bCm')).y, duration: .7 });
  click(tl, wcur);
  tl.call(() => $('#l-bCm').classList.add('hot'))
    .to(wcur, { x: () => at(DK.end, 0).x + 18, y: () => at(DK.end, 0, .4).y, duration: .8 });
  click(tl, wcur);
  tl.call(() => { $('#l-bCm').classList.remove('hot'); placePin(); $('#l-who').textContent = t('cm.who', { i: 1 }); })
    .fromTo(pin, { opacity: 0, y: -18, scale: .4 }, { opacity: 1, y: 0, scale: 1, duration: .4, ease: 'back.out(2.4)' })
    .fromTo(pop, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: .3, ease: 'power3.out' }, '<.15');
  typeIn(tl, ta, msg, 12);
  tl.to(wcur, { x: () => at($('#l-ok2')).x, y: () => at($('#l-ok2')).y, duration: .6 }, '+=.3');
  click(tl, wcur);
  tl.call(() => $('#l-ok2').classList.add('hot'))
    .to(pop, { opacity: 0, duration: .25 }, '+=.15')
    .to(wcur, { opacity: 0, duration: .4 }, '+=.4')
    .to(pin, { opacity: 0, duration: .4 }, '+=1.6')
    .call(() => step(-1));
  if (demoOn && !stopped) tl.play();
  return tl;
}
function startDemo() { if (demoTl) demoTl.kill(); step(-1); demoTl = demo(); }

function start() {
  if (stopped) return;
  fit(); place(); fitWin(); fitThumbs();
  if (still) { G.set([hl, sel, bar], { opacity: 1 }); if (hasDeck) demoStill(); return; }
  intro();
  if (hasDeck) startDemo();
  watch($('#l-hero'), '0px', (on) => { heroOn = on; if (heroTl) on ? heroTl.resume() : heroTl.pause(); });
  watch($('#l-real'), '-20% 0px -30% 0px', (on) => { demoOn = on; if (demoTl) on ? demoTl.play() : demoTl.pause(); });
  const rise = [...L.querySelectorAll('.steps li, .claims h2')];
  G.set(rise, { y: 26, opacity: 0 });
  rise.forEach((el) => watch(el, '0px 0px -10% 0px', (on, o, target) => { if (!on) return; o.unobserve(target); G.to(target, { y: 0, opacity: 1, duration: .8, ease: 'power3.out' }); }));
}

let rz; addEventListener('resize', () => { if (!G || stopped) return; clearTimeout(rz); rz = setTimeout(() => { fit(); place(); fitWin(); }, 80); });
// 언어를 바꾸면 제목을 다시 만들고 장면을 처음부터
if (window.HE_LANG) window.HE_LANG.onChange(() => {
  if (stopped) return;
  if (demoTl) { demoTl.kill(); demoTl = null; }
  hasDeck = prepDeck(); fitThumbs(); // 시연 장도 화면 언어에 맞춰 바꾼다
  if (!G) return;
  if (introTl) { introTl.kill(); introTl = null; L.classList.remove('l-anim'); G.set('#l-foot > *, #l-hero header', { clearProps: 'opacity,transform' }); }
  buildH1(); fit(); place(); fitWin();
  if (still) { G.set([hl, sel, bar], { opacity: 1 }); if (hasDeck) demoStill(); return; }
  G.set([hl, sel, bar, cur], { opacity: 0 }); startHero(); if (hasDeck) startDemo();
});
// 편집기가 열리면 첫 화면 움직임을 모두 멈춘다(가벼움 예산 ⑤c)
document.addEventListener('he-loaded', () => { stopped = true; io.forEach((o) => o.disconnect()); if (G) { G.globalTimeline.clear(); G.ticker.sleep(); } });

if (G) { fitWin(); (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start); }
else L.classList.remove('l-anim');
}
// 끌어다 놓기: 첫 화면 어디에 놓아도 열린다. 편집 중에 놓으면 다른 파일 열기(⑧e)와 같다 — 저장 안 한 변경이 있으면 묻는다
const D=$('#drop');addEventListener('dragover',(e)=>{e.preventDefault();D.classList.add('over')});addEventListener('dragleave',()=>D.classList.remove('over'));
addEventListener('drop',async(e)=>{e.preventDefault();D.classList.remove('over');const out=await dropFiles(e.dataTransfer);if(!out.length)return;if(document.body.classList.contains('loaded'))switchTo(out);else openFiles(out)});
async function dropFiles(dt){const items=[...dt.items].map((i)=>i.webkitGetAsEntry&&i.webkitGetAsEntry()).filter(Boolean);const out=[];const walk=async(en,p)=>{if(en.isFile){const f=await new Promise((r)=>en.file(r));Object.defineProperty(f,'webkitRelativePath',{value:p+f.name});out.push(f)}else{const rd=en.createReader();let b;do{b=await new Promise((r)=>rd.readEntries(r));for(const x of b)await walk(x,p+en.name+'/')}while(b.length)}};if(!items.length)return[...(dt.files||[])];for(const en of items)await walk(en,'');return out}
