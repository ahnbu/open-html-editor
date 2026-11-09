#!/usr/bin/env node
// Builds the landing-page assets that get inlined into the single file (no external requests):
//   src/landing/assets.css  - subset web fonts (base64) for the landing headline/body, ko + en text
// Inputs (land/ folder):
//   Paperlogy-land.woff2, Pretendard-land-500.woff2, Pretendard-land-700.woff2   subset fonts
// The landing demo is drawn in HTML and animated (src/landing/landing.js), so there is no video any more.
// When landing text changes, fonts may miss glyphs. Re-subset (needs fonttools: pip install fonttools brotli):
//   node tools/landing-assets.mjs --subset <Paperlogy-8ExtraBold.woff2> <Pretendard-Medium.woff2> <Pretendard-Bold.woff2>
// Check that every landing character exists in the fonts (exit 1 if not):
//   node tools/landing-assets.mjs --check
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const H = join(dirname(fileURLToPath(import.meta.url)), '..'), L = join(H, 'land');
const FONTS = ['Paperlogy-land.woff2', 'Pretendard-land-500.woff2', 'Pretendard-land-700.woff2'];
// Every landing string in every language + digits/latin/punctuation the page may show.
export function landText() {
  const dicts = ['ko', 'en'].map((l) => JSON.parse(readFileSync(join(H, 'src/i18n', l + '.json'), 'utf8')));
  const t = dicts.flatMap((d) => Object.entries(d).filter(([k]) => k.startsWith('land.') || k === 'lang.group').map(([, v]) => v)).join(' ')
    .replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z]+;/g, ' ');
  // 시연 창에 크게 보이는 장(tools/landing-deck.html의 data-demo="main")과 시연 오타 낱말도 넣는다. 작은 목록 그림(나머지 장)은 빼서 가볍게 둔다
  // 영어 화면용 영어판 장(tools/landing-deck.en.html)도 같은 방식으로 넣는다
  const mainOf = (f) => { let d = ''; try { d = readFileSync(join(H, f), 'utf8'); } catch (e) { return ''; } const m = d.indexOf('data-demo="main"'); const s = m < 0 ? '' : d.slice(m, d.indexOf('</section>', m)); return s + ' ' + ((s.match(/data-typo="([^"]*)"/) || [])[1] || ''); };
  const demo = (mainOf('tools/landing-deck.html') + ' ' + mainOf('tools/landing-deck.en.html')).replace(/<[^>]+>/g, ' ').replace(/data-[a-z-]+="[^"]*"|style="[^"]*"/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  return [...new Set(t + demo + ' ←—「」 한국어English GitHub 0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,·%\'"()-_:!?/&+')].join('');
}
const a = process.argv.slice(2);
const py = process.env.PYTHON || 'python3';
if (a[0] === '--subset') {
  const text = landText();
  a.slice(1, 4).forEach((src, i) => { execFileSync(py, ['-m', 'fontTools.subset', src, `--text=${text}`, '--flavor=woff2', `--output-file=${join(L, FONTS[i])}`, '--layout-features=*']); console.log('font', FONTS[i]); });
}
if (a[0] === '--check') {
  // Lists each subset font's character map and compares it with the landing text.
  const text = landText().replace(/\s/g, '');
  const code = `import sys\nfrom fontTools.ttLib import TTFont\nt=sys.argv[1]\nbad=0\nfor f in sys.argv[2:]:\n  m=TTFont(f).getBestCmap()\n  miss=[c for c in t if ord(c) not in m]\n  print(f.split('/')[-1], 'missing:', ''.join(miss) or '-')\n  bad+=len(miss)\nsys.exit(1 if bad else 0)`;
  try { console.log(execFileSync(py, ['-c', code, text, ...FONTS.map((f) => join(L, f))], { encoding: 'utf8' })); process.exit(0); }
  catch (e) { console.log(String(e.stdout || e.message)); process.exit(1); }
}
const b64 = (f) => readFileSync(join(L, f)).toString('base64');
const font = (fam, f, w) => `@font-face{font-family:${fam};src:url(data:font/woff2;base64,${b64(f)}) format("woff2");font-weight:${w};font-display:swap}`;
const css = '/* tools/landing-assets.mjs builds this file. Do not edit by hand. */\n'
  + [font('LPaperlogy', FONTS[0], 800), font('LPretendard', FONTS[1], '400 500'), font('LPretendard', FONTS[2], '600 800')].join('\n') + '\n';
writeFileSync(join(H, 'src/landing/assets.css'), css);
console.log('assets.css', Math.round(css.length / 1024) + 'KB');
