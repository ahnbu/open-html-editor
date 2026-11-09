#!/usr/bin/env node
// Builds the single-file editor: editor.html + src/ -> public/index.html.
// That one file is the whole app. Double-clicking it works offline, and it is what the site serves.
//
// src/core + src/save files are fragments of ONE function scope (same for src/ui + src/landing).
// They are concatenated in the order below, so a file may use names declared in an earlier file.
// Usage: node build-single.mjs [--out <file>]
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

export function build() {
  let html = read('editor.html');
  if (!html.includes('<!--build:css-->') || !html.includes('<!--build:js-->')) throw new Error('editor.html: build markers missing');
  const css = files(CSS).map(([f, t]) => `<style data-src="${f}">\n${t}</style>`).join('\n');
  const dict = Object.fromEntries(files(I18N).map(([f, t]) => [f.replace(/^.*\/|\.json$/g, ''), JSON.parse(t)]));
  const scripts = [
    `<script>window.HE_I18N=${js(JSON.stringify(dict))};</script>`,
    ...files(BOOT).map(([, t]) => `<script>\n${js(t)}</script>`),
    `<script>\n(function () {\n'use strict';\n${files(CORE).map(([f, t]) => `// ---- ${f}\n${js(t)}`).join('\n')}\n})();\n</script>`,
    // 첫 화면 「예시」 버튼이 여는 16:9 완결 덱(계획 _docs/20261105_04 2d). 시연 녹화는 tools/demo-deck.html을 따로 쓴다. 외부 요청 없이 파일 안에 넣는다.
    `<script>window.HE_EXAMPLE=${js(JSON.stringify(read('tools/example-deck.html') || ''))};</script>`,
    // 첫 화면 아래 시연 창에 띄우는 실제 강의 덱 장(tools/landing-deck.html, 사진 없는 장만)
    `<script>window.HE_LANDDECK=${js(JSON.stringify((read('tools/landing-deck.html') || '').replace(/<!--[\s\S]*?-->\s*/, '')))};</script>`,
    // 영어 화면에서는 같은 자리 구성의 영어판 장(tools/landing-deck.en.html)을 띄운다. 없으면 한국어 장을 쓴다
    `<script>window.HE_LANDDECK_EN=${js(JSON.stringify((read('tools/landing-deck.en.html') || '').replace(/<!--[\s\S]*?-->\s*/, '')))};</script>`,
    ...files(VENDOR).map(([f, t]) => `<script data-src="${f}">\n${js(t)}</script>`),
    `<script>\n(function () {\n${files(UI).map(([f, t]) => `// ---- ${f}\n${js(t)}`).join('\n')}\n})();\n</script>`,
  ].join('\n');
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
  console.log('built:', out.replace(H + '/', ''), Math.round(html.length / 1024) + 'KB', 'version', version);
}
