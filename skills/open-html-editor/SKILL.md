---
name: open-html-editor
description: "Review HTML in Openditor: make a copy with an 'Edit this document' button, then apply comments and edits saved in it. Triggers: 오픈디터로 리뷰, 코멘트 반영해줘."
---

# Review and fix HTML with Openditor

Openditor (https://github.com/ahnbu/open-html-editor) lets people read AI-made HTML, fix it by hand and pin comments for bigger changes.
Saved files carry the comments in one JSON block before `</body>` — format: `docs/comment-format.md` in the repository.
Two jobs, often one after the other: **A. hand the user a review copy**, **B. apply what they left in it.** No server, no MCP, nothing uploaded.

## A. Make a review copy

1. **Pages that a script builds are invisible to the editor.** Openditor finds slides and A4 pages from elements that already exist in the file. If the HTML paginates itself at load time (Paged.js, a print polyfill, a script that splits content into pages), open it in a browser, wait until pagination finishes, remove those scripts and save `document.documentElement.outerHTML` as the review file. If that snapshot has a single `<section>` wrapper (a cover, say), turn it into a `<div>` — one `section` makes the editor treat the whole file as one slide. Skip this step for ordinary decks and documents.
2. **Add the button:**
   ```bash
   node "<this skill folder>/scripts/share.mjs" <file.html> [--out <path>] [--lang ko|en]   # default: <name>_share.html
   ```
   It adds the same floating "✎ Edit this document" button as the editor's "Save for sharing". Running it again replaces the button.
3. **Tell the user how to use it:** open the copy (any browser, phone included) → press the button → Openditor opens in a new tab with the document (handed over inside the browser) → pin comments, fix small things directly → Save. The saved file lands in Downloads as `<name>_수정.html` (or overwrites after "Save as"). Editing is comfortable on a computer; on a phone, comments plus "Copy for AI" pasted into the chat works better than saving files.

## B. Apply the comments (and hand edits)

1. **Find the file.** If the user gave a path, use it. Otherwise list recent candidates (newest first) and take the first unless the user says otherwise:
   ```bash
   node "<this skill folder>/scripts/comments.mjs" find            # cwd and ~/Downloads, last 3 days
   node "<this skill folder>/scripts/comments.mjs" find <dir> ...   # other folders
   ```
2. **Show the comments** to the user as a numbered list (where + what), so they can stop you if a file is wrong:
   ```bash
   node "<this skill folder>/scripts/comments.mjs" list <file.html>
   ```
   `slide` is the 1-based slide (deck), page (A4) or section (scrolling page). `target` is text near the pin. `x`/`y` are percent positions inside that slide/page/section.
3. **Decide where the change belongs — the HTML, or the source it was built from.** Many HTML files are build outputs (from Markdown, a template, a script). Editing only the output looks fine until the next build silently throws the change away. Treat the file as generated when any of these hold: the project has a build script that writes this file name (search for the name), a source with the same stem sits nearby (`.md`, template, data file), the head or a comment names a generator, or the user said so. If it is generated:
   - collect every change: the comments, **and the hand edits** — compare the saved file's text with the original output to see what the user typed directly;
   - make those changes in the source, rebuild with the project's own command, and check the rebuilt output shows them;
   - rebuild the review copy (A) if the user will keep reviewing.
   Otherwise continue with steps 4–6 on the HTML itself.
4. **Back up** before editing (copies to `_편집백업/` next to the file, timestamped):
   ```bash
   node "<this skill folder>/scripts/comments.mjs" backup <file.html>
   ```
5. **Edit the file yourself.** Change only what each comment asks. Keep slide `section`s, scripts, styles and `@page` rules. Do not reformat the file. Then **remove the whole `<script type="application/json" id="he-comments">…</script>` block** when every comment is applied. If one cannot be applied, keep the block, remove only the applied items from `comments`, and tell the user why.
6. **Verify** and report one line per comment (and per hand edit you carried over):
   ```bash
   node "<this skill folder>/scripts/comments.mjs" list <file.html>   # prints 0 comments when done
   ```
   Tell the user to reopen the file in Openditor to check.

## Notes

- Never upload the file anywhere. Work on local files only. The button only opens the public editor page; the document travels by `postMessage` inside the browser.
- The backup folder name is the one the editor's lecture kit already uses; keep it so both tools find the same backups.
- `share.mjs` mirrors `src/save/handoff.js`. After changing either, run `node tools/check-skill-share.mjs` in the repository.
