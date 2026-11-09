---
name: open-html-editor
description: Apply review comments that were left in Open HTML Editor. Use when the user says "apply the comments in the file I just saved", "reflect my Open HTML Editor comments", "방금 저장한 파일 코멘트 반영해 줘", or points to an HTML file that contains a <script id="he-comments"> block. Reads the comments from the saved HTML, shows them, edits that file directly, backs it up first, and removes the comment block when done.
---

# Apply Open HTML Editor comments

Open HTML Editor (https://github.com/ahnbu/open-html-editor) lets people fix AI-made HTML by hand and pin comments for bigger changes.
Saved files carry the comments in one JSON block before `</body>` — format: `docs/comment-format.md` in the repository.
This skill lets the AI you are already talking to apply those comments. No server, no MCP.

## Steps

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
3. **Back up** before editing (copies to `_편집백업/` next to the file, timestamped):
   ```bash
   node "<this skill folder>/scripts/comments.mjs" backup <file.html>
   ```
4. **Edit the file yourself.** Change only what each comment asks. Keep slide `section`s, scripts, styles and `@page` rules. Do not reformat the file.
5. **Remove the whole `<script type="application/json" id="he-comments">…</script>` block** when every comment is applied. If one cannot be applied, keep the block, remove only the applied items from `comments`, and tell the user why.
6. **Verify** and report one line per comment:
   ```bash
   node "<this skill folder>/scripts/comments.mjs" list <file.html>   # prints 0 comments when done
   ```
   Tell the user to reopen the file in Open HTML Editor to check.

## Notes

- Never upload the file anywhere. Work on the local file only.
- The backup folder name is the one the editor's lecture kit already uses; keep it so both tools find the same backups.
