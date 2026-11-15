#!/usr/bin/env node
// Helper for the open-html-editor skill. No dependencies.
//   share <file.html> [--out <path>] [--lang ko|en]
//     Writes a copy with the floating "Edit this document" button that Openditor's "Save for sharing" adds.
//     Opening the copy and pressing the button opens https://easy-html-editor.pages.dev in a new tab and hands the
//     document over inside the browser (postMessage) — nothing is uploaded.
//     Default output: <name>_share.html next to the input. Running it again replaces the old button (never two).
// Keep in sync with src/save/handoff.js (block markup, script, CSS) and src/i18n/*.json (handoff.badge*).
// tools/check-skill-share.mjs compares this output with the editor's own share save.
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HANDOFF_SITE = 'https://easy-html-editor.pages.dev';
const HANDOFF_BLOCK = /\n?<!--ohe-handoff-->[\s\S]*?<!--\/ohe-handoff-->\n?/g;
const BIG_DATA = /data:[\w\/+.-]+;base64,[A-Za-z0-9+\/=]{2048,}/g;
const TEXT = {
  ko: { badge: '이 문서 고치기', title: '오픈디터에서 이 문서를 바로 엽니다' },
  en: { badge: 'Edit this document', title: 'Open and edit this document in Openditor' },
};
function cyrb53(s, seed) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}
const dataKey = (u) => u.length + ':' + cyrb53(u, 1) + cyrb53(u, 7);
// Big images are left out of the packed source; the editor takes them back from the live page it receives.
const packSource = (t) => t.replace(BIG_DATA, (u) => 'ohe-data:' + dataKey(u));
const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const handoffScript = () => `(function(){var S='${HANDOFF_SITE}',b=document.getElementById('ohe-edit');if(!b)return;b.addEventListener('click',function(e){e.preventDefault();var w=window.open(S+'/#handoff','_blank');if(!w)return;function f(m){if(m.source!==w||m.origin!==S||m.data!=='ohe-ready')return;removeEventListener('message',f);var g=document.getElementById('ohe-src'),n=decodeURIComponent(location.pathname.split('/').pop()||'')||'document.html';w.postMessage({t:'ohe-doc',v:1,name:n,gz:g?g.textContent.replace(/\\s/g,''):'',live:document.documentElement.outerHTML},S)}addEventListener('message',f)})})();`;
const HANDOFF_CSS = '#ohe-edit{position:fixed!important;right:18px!important;bottom:18px!important;z-index:2147483647!important;display:inline-flex!important;align-items:center;gap:6px;margin:0!important;font:600 14px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;color:#1C60EF!important;background:#fff!important;border:1px solid #DBE8FE!important;border-radius:999px!important;padding:10px 16px!important;box-shadow:0 4px 14px rgba(10,37,72,.18)!important;text-decoration:none!important;cursor:pointer}#ohe-edit:hover{background:#F2F6FF!important}#ohe-edit:focus-visible{outline:2px solid #1C60EF!important;outline-offset:3px}@media print{#ohe-edit{display:none!important}}:fullscreen #ohe-edit{display:none!important}';

export function withHandoff(html, lang = 'ko') {
  const text = html.replace(HANDOFF_BLOCK, '');
  const t = TEXT[lang] || TEXT.ko;
  const gz = gzipSync(Buffer.from(packSource(text), 'utf8')).toString('base64');
  const block = '\n<!--ohe-handoff--><a id="ohe-edit" href="' + HANDOFF_SITE + '/" target="_blank" title="' + escHtml(t.title) + '">✎ ' + escHtml(t.badge) + '</a>'
    + '<style>' + HANDOFF_CSS + '</style><script>' + handoffScript() + '<\/script>'
    + '<script type="application/x-ohe-source" id="ohe-src">' + gz + '<\/script><!--/ohe-handoff-->\n';
  return /<\/body>/i.test(text) ? text.replace(/<\/body>(?![\s\S]*<\/body>)/i, () => block + '</body>') : text + block;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const file = args.find((a, i) => !a.startsWith('--') && !['--out', '--lang'].includes(args[i - 1]));
  if (!file) { console.log('usage: share.mjs <file.html> [--out <path>] [--lang ko|en]'); process.exit(2); }
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const src = resolve(file);
  const out = resolve(opt('--out') || join(dirname(src), basename(src).replace(/\.html?$/i, '') + '_share.html'));
  const html = withHandoff(readFileSync(src, 'utf8'), opt('--lang') || 'ko');
  writeFileSync(out, html);
  const scripts = (html.match(/<script(?![^>]*application\/(json|x-ohe-source))[^>]*>/gi) || []).length - 1;
  console.log(JSON.stringify({ out, bytes: html.length, otherScripts: scripts }));
}
