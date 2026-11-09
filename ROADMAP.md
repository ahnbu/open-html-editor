# Openditor Roadmap

This document outlines the development direction, scope boundaries, and milestones for Openditor.

---

## Core Guiding Principles

1. **Focused on Editing:** Make fixing AI-made HTML faster and easier than re-prompting.
2. **Local-First & Private:** Run 100% in the user's browser without requiring server infrastructure.
3. **Zero Friction:** No build steps for end users, no accounts, no installations.

---

## Scope Boundaries

To maintain speed, reliability, and architectural simplicity, we maintain strict boundaries:

| Category | In Core Repository | Separate Companion Repositories | Out of Scope |
|---|---|---|---|
| **Core Editing** | Visual text editing, object styling, tables, layout adjustment, undo/redo | - | Rich drawing tools, animation authoring, code IDE features |
| **Document Formats** | Slides (16:9), A4 vertical docs, resumes, continuous web sections | - | PPTX converter, DOCX exporter, EPUB parser |
| **AI Integration** | One-click prompt copy, embedded `<script id="he-comments">` block | CLI skills (`skills/open-html-editor/`) | Mandatory MCP servers, built-in cloud LLM API calls |
| **Platforms** | Standalone web app, Service Worker PWA | Desktop apps (Electron/Tauri), VS Code extension, Chrome extension | Native mobile apps |
| **Infrastructure** | Static hosting (Cloudflare Pages), zero server dependencies | - | User databases, cloud syncing, telemetry, analytics |

---

## Milestones

### Phase 1: v1.0 Launch (Current)
- [x] Zero-dependency single-file bundle architecture (`public/index.html`).
- [x] Visual WYSIWYG editing: text, objects, images, tables, z-order, alignment.
- [x] Auto-detection for slides vs. A4 documents and scrolling web sections.
- [x] Full presenter mode with speaker notes, multi-monitor display, and timer.
- [x] Review pin comments and one-click structured prompt copy for Claude and ChatGPT.
- [x] Optional local AI companion skill (`skills/open-html-editor/`).
- [x] 100% offline Service Worker support and CSP security sandboxing.
- [x] Bilingual interface (Korean & English).

### Phase 2: Refinements & Ecosystem (Near-term)
- [ ] Direct link sharing with built-in edit capability (optional URL hash state, default off).
- [ ] Expanded compatibility gallery testing AI outputs from Claude Design, Open Design, v0, and Lovable.
- [ ] Companion Chrome Extension for 1-click inspection of local HTML files (separate repo).
- [ ] Companion VS Code Extension / WebView integration (separate repo).
- [ ] Enhanced A4 page-break visualization and print styling preview.

### Phase 3: Community & Governance
- [ ] Formal community issue triage guidelines (activated after 50 stars or 5 external issue submissions).
- [ ] Translation contributions for additional languages (Japanese, Spanish, etc.).
- [ ] Sponsorship and ecosystem contributor recognition.
