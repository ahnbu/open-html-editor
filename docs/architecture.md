# Architecture

The editor is **one HTML file** (`public/index.html`) with no dependencies and no server.
The source is split into small files under `src/`; `build-single.mjs` glues them together.

## Three layers

| Layer | Folder | Does | Must not |
|---|---|---|---|
| Screen | `editor.html`, `src/ui/`, `src/landing/`, `src/i18n/` | Buttons, menus, status line, presenter view, landing page, language switch | Change the document directly. It calls functions on `window.HE` |
| Editing (policy) | `src/core/` | Selection, undo/redo, text, objects, tables, images, slides, comments, view kind (deck / A4 / page), input | Know about screen text or design. Build the saved file itself |
| Saving | `src/save/` | Parse and serialize the source, apply only edited parts to the original, comment block, file writing | Change the original structure. Saved files contain **no editor marks** |

`src/core` + `src/save` are concatenated into one function scope (order in `build-single.mjs` `CORE`).
`src/ui` + `src/landing` are concatenated into a second scope (`UI`). Inside a scope, a file may use names from an earlier file.
They talk through two objects: `window.HE` (editing API, defined in `src/core/api.js`) and `window.HEUI` (screen callbacks, `src/ui/hooks.js`).

## How a file is edited

1. `openText` reads the file, removes the comment block, and gives every element a temporary `data-he` number.
2. The document is shown in an `<iframe srcdoc>` with a Content-Security-Policy that blocks `fetch`/XHR/WebSocket/beacon/form posts (`src/core/open.js`). Images, fonts, styles and scripts still load (see README "Security").
3. `detectView` (`src/core/view-mode.js`) decides **deck** (fixed-size slides shown one at a time), **a4** (portrait pages) or **page** (sections of any height). No mode switch for the user.
4. Every edit is recorded with a `MutationObserver` (`src/core/history.js`). Undo/redo replays the records.
5. On save, `buildPatched` (`src/save/save.js`) copies **only the edited elements/attributes/styles** from the live document onto a fresh copy of the original, removes the temporary numbers, and adds the comment block (`docs/comment-format.md`).

## Folder map

```
editor.html            screen markup (template; text comes from src/i18n)
src/core/              editing engine
src/save/              source parsing, saving, comment block
src/ui/                editor screen (tokens.css = colors, spacing, motion)
src/landing/           landing page (HTML demo animated with vendor/gsap.min.js; fonts are generated: tools/landing-assets.mjs)
src/i18n/              ko.json, en.json, i18n.js
skills/open-html-editor/   optional AI skill that applies comments (installable)
tools/                 build helpers and checks
test-*.mjs             headless tests (Playwright)
```

## Rules that keep it small

- No network requests from the editor. `test-security.mjs` and the "site file: no external requests" test fail otherwise.
- Motion durations only from `src/ui/tokens.css`. `tools/check-public.mjs` fails on hard-coded durations.
- Every screen string lives in `src/i18n/*.json`. `tools/check-i18n.mjs` fails on missing keys or text in code.
- Size budget: `public/index.html` under 1 MB (`test-site.mjs`).
