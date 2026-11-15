// The skill's share.mjs must produce the same block as the editor's own "Save for sharing".
// Opens the built editor (public/index.html), share-saves a sample, runs share.mjs on the same sample, and compares
// the markup outside the packed source plus the unpacked source itself. Run: node tools/check-skill-share.mjs
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { withHandoff } from '../skills/open-html-editor/scripts/share.mjs';

const { chromium } = createRequire(execSync('npm root -g', { encoding: 'utf8' }).trim() + '/')('playwright');
const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const work = mkdtempSync(join(tmpdir(), 'ohe-share-'));
// A4-ish sample with one big inline image (exercises the image packing) and a script of its own
const img = 'data:image/png;base64,' + 'iVBORw0KGgo'.padEnd(4000, 'A');
const sample = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>t</title><style>.p{width:794px;height:1123px}</style></head><body>
<div class="p"><h1>Title</h1><p>One line of body text</p><img src="${img}" alt=""></div><div class="p"><p>Second page</p></div>
<script>window.x=1</script>
</body></html>`;
const file = join(work, 'sample.html');
writeFileSync(file, sample);

// The editor's save also normalizes the doctype line (<!DOCTYPE html> + newline) — that is the save layer, not the share block.
const dt = (h) => h.replace(/^<!doctype html>\n?/i, '');
const split = (h0) => { const h = dt(h0); const m = /<script type="application\/x-ohe-source" id="ohe-src">([^<]*)<\/script>/.exec(h); return { rest: h.replace(m[0], '<GZ>'), src: dt(gunzipSync(Buffer.from(m[1], 'base64')).toString('utf8')) }; };
const b = await chromium.launch();
const ctx = await b.newContext({ acceptDownloads: true, locale: 'ko-KR', permissions: ['clipboard-read', 'clipboard-write'] });
const p = await ctx.newPage();
await p.goto(pathToFileURL(join(ROOT, 'public', 'index.html')).href);
await p.setInputFiles('#openFile', file);
await p.waitForFunction(() => document.body.classList.contains('loaded') && window.HE.S.doc);
await p.waitForTimeout(400);
await p.click('#bShare');
const chk = await p.$('#chkHandoff'); if (chk && !(await chk.isChecked())) await chk.check();
const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#bShareSave')]);
const editor = readFileSync(await dl.path(), 'utf8');
await b.close();

const skill = withHandoff(sample, 'ko');
const e = split(editor), s = split(skill);
const results = {
  'markup outside the packed source is identical': e.rest === s.rest,
  'unpacked source is identical': e.src === s.src,
  'running twice keeps exactly one button': (withHandoff(skill, 'ko').match(/id="ohe-edit"/g) || []).length === 1,
};
let fail = 0;
for (const [k, v] of Object.entries(results)) { console.log(v ? 'PASS' : 'FAIL', k); if (!v) fail++; }
if (fail) { writeFileSync(join(work, 'editor.html'), editor); writeFileSync(join(work, 'skill.html'), skill); console.log('outputs kept in', work); }
process.exit(fail ? 1 : 0);
