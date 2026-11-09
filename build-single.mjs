#!/usr/bin/env node
// Builds the single-file editor: editor.html + src/ -> public/index.html.
// That one file is the whole app. Double-clicking it works offline, and it is what the site serves.
//
// src/core + src/save files are fragments of ONE function scope (same for src/ui + src/landing).
// They are concatenated in the order below, so a file may use names declared in an earlier file.
// Usage: node build-single.mjs [--out <file>]
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const H = dirname(fileURLToPath(import.meta.url));
export const CSS = ['src/ui/tokens.css', 'src/ui/editor.css', 'src/landing/landing.css', 'src/landing/assets.css'];
export const I18N = ['src/i18n/ko.json', 'src/i18n/en.json'];
export const BOOT = ['src/i18n/i18n.js'];
export const CORE = [
  'src/core/state.js', 'src/save/source.js', 'src/core/assets.js', 'src/core/open.js', 'src/core/view-mode.js', 'src/core/slides.js',
  'src/core/select.js', 'src/core/history.js', 'src/save/handoff.js', 'src/save/save.js', 'src/save/comment-block.js', 'src/core/comments.js',
  'src/core/slide-ops.js', 'src/core/text-style.js', 'src/core/objects.js', 'src/core/table.js', 'src/core/text-edit.js',
  'src/core/input.js', 'src/core/present.js', 'src/core/api.js',
];
export const UI = [
  'src/ui/ribbon.js', 'src/ui/thumbs.js', 'src/ui/pdf.js', 'src/ui/status.js', 'src/ui/overlay.js', 'src/ui/comments.js', 'src/ui/hooks.js',
  'src/ui/buttons.js', 'src/ui/notes.js', 'src/ui/presenter.js', 'src/ui/keys.js', 'src/ui/grid.js', 'src/ui/open.js',
  'src/ui/view-mode.js', 'src/landing/landing.js', 'src/ui/modes.js', 'src/ui/offline.js',
];
// Third-party scripts kept as-is (license header intact), each in its own <script> before the UI scope. GSAP drives the landing motion.
export const VENDOR = ['src/landing/vendor/gsap.min.js'];
const read = (f) => { try { return readFileSync(join(H, f), 'utf8'); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } };
const files = (list) => list.map((f) => [f, read(f)]).filter(([, t]) => t != null);
const js = (t) => t.replace(/<\/script/gi, '<\\/script');
// 시연용 장 묶음(tools/landing-deck*.html)을 16:9 완결 덱 문서로 감싼다. 장마다 class="slide"를 달고 첫 장만 보이게 한다(좌우 방향키로 넘김).
const wrapDeck = (frag, lang) => {
  const secs = frag.replace(/<!--[\s\S]*?-->\s*/, '').split(/(?=<section[\s>])/).filter((x) => x.startsWith('<section'));
  if (!secs.length) return '';
  const body = secs.map((x, i) => x.replace(/^<section/, `<section class="slide${i ? '' : ' on'}"`)).join('\n');
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${JSON.parse(read('src/i18n/' + lang + '.json'))['land.exName'].replace(/\.html$/, '')}</title>
<style>
html,body{margin:0;height:100%;background:#E9EBF0;overflow:hidden;font-family:Pretendard,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;word-break:keep-all}
#deck{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:0 0}
section.slide{position:absolute;left:0;top:0;overflow:hidden;display:none}
section.slide.on{display:block}
</style></head><body>
<div id="deck">
${body}
</div>
<script>
(function(){var d=document.getElementById('deck'),s=[].slice.call(document.querySelectorAll('section.slide')),i=0;
function fit(){var k=Math.min(innerWidth/1920,innerHeight/1080);d.style.transform='translate('+((innerWidth-1920*k)/2)+'px,'+((innerHeight-1080*k)/2)+'px) scale('+k+')'}
function go(n){i=Math.max(0,Math.min(s.length-1,n));s.forEach(function(e,j){e.classList.toggle('on',j===i)})}
addEventListener('resize',fit);fit();
addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' ')go(i+1);if(e.key==='ArrowLeft'||e.key==='PageUp')go(i-1)});
window.deckGo=go;})();
</script>
</body></html>`;
};

export function build() {
  let html = read('editor.html');
  if (!html.includes('<!--build:css-->') || !html.includes('<!--build:js-->')) throw new Error('editor.html: build markers missing');
  const css = files(CSS).map(([f, t]) => `<style data-src="${f}">\n${t}</style>`).join('\n');
  const dict = Object.fromEntries(files(I18N).map(([f, t]) => [f.replace(/^.*\/|\.json$/g, ''), JSON.parse(t)]));
  const scripts = [
    `<script>window.HE_I18N=${js(JSON.stringify(dict))};</script>`,
    ...files(BOOT).map(([, t]) => `<script>\n${js(t)}</script>`),
    `<script>\n(function () {\n'use strict';\n${files(CORE).map(([f, t]) => `// ---- ${f}\n${js(t)}`).join('\n')}\n})();\n</script>`,
    // 첫 화면 「샘플로 바로 둘러보기」 버튼이 여는 덱 = 시연 창과 같은 공익활동AI교육 덱(tools/landing-deck*.html 장을 완결 문서로 감싼다). 영어 화면은 영어판. 옛 예시 덱은 tools/_archive/example-deck.html에 보관. 외부 요청 없이 파일 안에 넣는다.
    `<script>window.HE_EXAMPLE=${js(JSON.stringify(wrapDeck(read('tools/landing-deck.html') || '', 'ko')))};window.HE_EXAMPLE_EN=${js(JSON.stringify(wrapDeck(read('tools/landing-deck.en.html') || '', 'en')))};</script>`,
    // 첫 화면 아래 시연 창에 띄우는 실제 강의 덱 장(tools/landing-deck.html, 사진 없는 장만)
    `<script>window.HE_LANDDECK=${js(JSON.stringify((read('tools/landing-deck.html') || '').replace(/<!--[\s\S]*?-->\s*/, '')))};</script>`,
    // 영어 화면에서는 같은 자리 구성의 영어판 장(tools/landing-deck.en.html)을 띄운다. 없으면 한국어 장을 쓴다
    `<script>window.HE_LANDDECK_EN=${js(JSON.stringify((read('tools/landing-deck.en.html') || '').replace(/<!--[\s\S]*?-->\s*/, '')))};</script>`,
    ...files(VENDOR).map(([f, t]) => `<script data-src="${f}">\n${js(t)}</script>`),
    `<script>\n(function () {\n${files(UI).map(([f, t]) => `// ---- ${f}\n${js(t)}`).join('\n')}\n})();\n</script>`,
  ].join('\n');
  // Head tags (title, description, og:*) hold Korean text from the dictionary: {{ko:key}} is filled from ko.json here, so no Korean sits in editor.html.
  const esc = (v) => v.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  html = html.replace(/\{\{ko:([\w.]+)\}\}/g, (m, k) => { if (dict.ko[k] == null) throw new Error('editor.html: unknown key ' + k); return esc(dict.ko[k]); });
  return html.replace('<!--build:css-->', () => css).replace('<!--build:js-->', () => scripts);
}

// Offline support for the site (plan 5b): network first, last copy from cache when offline.
// The version is a hash of the page, so each deploy replaces the old cache.
export const serviceWorker = (version) => `// Built by build-single.mjs. Open HTML Editor offline cache.
const VERSION = '${version}', CACHE = 'ohe-' + VERSION;
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('ohe-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('message', (e) => { if (e.data && e.data.type === 'he-version?' && e.source) e.source.postMessage({ type: 'he-version', version: VERSION }); });
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET' || r.mode !== 'navigate') return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try { const net = await fetch(r); if (net.ok) cache.put('./', net.clone()); return net; }
    catch (err) { return (await cache.match('./')) || Response.error(); }
  })());
});
`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const i = process.argv.indexOf('--out');
  const out = i > 0 ? process.argv[i + 1] : join(H, 'public', 'index.html');
  mkdirSync(dirname(out), { recursive: true });
  let html = build();
  const version = createHash('sha256').update(html).digest('hex').slice(0, 12);
  html = html.replace('<script>window.HE_I18N=', () => `<script>window.HE_BUILD='${version}';</script>\n<script>window.HE_I18N=`);
  writeFileSync(out, html);
  writeFileSync(join(dirname(out), 'sw.js'), serviceWorker(version));
  // Link-card image (og:image in editor.html). A plain static file next to the page; not part of the single-file app.
  if (existsSync(join(H, 'static', 'og.png'))) copyFileSync(join(H, 'static', 'og.png'), join(dirname(out), 'og.png'));
  console.log('built:', out.replace(H + '/', ''), Math.round(html.length / 1024) + 'KB', 'version', version);
}
