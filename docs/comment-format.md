# Comment block format (version 1)

Open HTML Editor stores review comments **inside the saved HTML file**, as one JSON block right before `</body>`.
The block does nothing in the browser (it is `type="application/json"`), so the file still opens and presents normally.
Any tool or AI can read it, apply the comments, and delete the block.

## The block

```html
<script type="application/json" id="he-comments">
{
 "format": "open-html-editor/comments",
 "version": 1,
 "about": "Open HTML Editor comments (docs/comment-format.md). Apply each item, then delete this block.",
 "comments": [
  {
   "id": "cm3k2a9x1",
   "slide": 2,
   "view": "deck",
   "slideId": "pricing",
   "x": 41.5,
   "y": 63.0,
   "target": "Starter plan $9",
   "text": "Make the price bigger"
  }
 ]
}
</script>
```

| Field | Type | Meaning |
|---|---|---|
| `format` | string | Always `open-html-editor/comments`. |
| `version` | number | Format version. This document describes `1`. |
| `about` | string | Human/AI hint. Not used by the editor. |
| `comments[].id` | string | Unique id inside the file. |
| `comments[].slide` | number | **1-based position** of the slide (deck), page (A4 document) or section (scrolling document) that holds the comment. |
| `comments[].view` | string | How the editor showed the file: `deck`, `a4` or `page`. Optional (files saved before version 1 do not have it; treat as `deck`). |
| `comments[].slideId` | string | `id` attribute of that slide/page/section, if it has one. Empty string otherwise. |
| `comments[].x`, `y` | number | Position of the pin inside that slide/page/section, in percent of its width/height (0–100, one decimal). |
| `comments[].target` | string | Up to 80 characters of the text (or `alt`, or tag name) of the element under the pin. Helps find the spot. |
| `comments[].text` | string | What to change. Comments with empty text are never saved. |

How the editor finds slides/pages/sections: see `src/core/view-mode.js` (deck selectors first, otherwise the top-level blocks of `<body>`).

## Rules for tools that apply comments

1. Change only what the comments point to. Keep the rest of the file byte-for-byte where possible.
2. Keep the document structure (slide `section`s, scripts, styles, `@page` rules).
3. After applying, **delete the whole `<script id="he-comments">` block**. A file without the block has no open comments.
4. If you cannot apply a comment, leave the block and explain why.

## Compatibility

- Readers must accept files **without** `format`/`version` (saved before version 1). They have the same `comments` array; treat `view` as `deck`.
- Readers must ignore unknown fields. Writers add fields only in a new version.
- The editor reads the block when a file is opened and removes it from the document it shows; it writes a fresh block on save.

## Where this is used

- The editor: `src/save/comment-block.js` (read/write), `src/core/comments.js` (add, AI prompt).
- Copy for AI: the copied prompt contains the file with this block plus a numbered list of the comments.
- The optional skill `skills/open-html-editor/` reads this block from the last saved file and applies it.
