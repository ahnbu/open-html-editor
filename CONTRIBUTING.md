# Contributing to Open HTML Editor

Thank you for your interest in contributing to Open HTML Editor!

## Core Philosophy

- **Editing, Not Generating:** We focus on making visual tweaks to existing AI-generated HTML fast and effortless. We do not add creation/generation wizards.
- **Lightweight & Dependency-Free:** The entire editor ships as a single standalone HTML file (`public/index.html`) with zero runtime dependencies.
- **100% Local & Private:** The editor never sends network requests.

---

## Development Setup

The source code is organized in modular files under `src/` and bundled into `public/index.html` via `build-single.mjs`.

```bash
# Clone the repository
git clone https://github.com/ahnbu/open-html-editor.git
cd open-html-editor

# Build the standalone file
node build-single.mjs

# Open the built editor in your browser
open public/index.html
```

---

## Automated Testing

Before submitting a Pull Request, all headless tests must pass.

### Prerequisites
Install global Playwright:
```bash
npm install -g playwright
npx playwright install chromium
```

### Running Test Suites
```bash
node test-editor.mjs      # 53 functional & editing tests
node test-docs.mjs        # 23 document & A4 layout tests
node test-security.mjs    # 6 sandbox & network isolation tests
node test-site.mjs        # 4 PWA, caching & size budget tests
node tools/check-i18n.mjs # Validates key parity between ko.json and en.json
node tools/check-public.mjs # Verifies public/index.html bundle integrity
```

Every Pull Request triggers automated GitHub Actions running these tests. All tests must be green for PR approval.

---

## Architectural Rules

1. **Three-Layer Separation (`docs/architecture.md`):**
   - **Screen Layer (`editor.html`, `src/ui/`, `src/landing/`, `src/i18n/`):** Manages UI components and interacts solely through `window.HE`.
   - **Editing Core (`src/core/`):** Handles selection, mutations, undo/redo, and view modes. Never references UI labels directly.
   - **Saving Layer (`src/save/`):** Patches mutations onto a pristine copy of the original HTML, preserving structure and inserting the comment block.
2. **Strings & Internationalization:**
   - Never hardcode user-facing strings in HTML or JS.
   - All text must be declared in both `src/i18n/ko.json` and `src/i18n/en.json`.
3. **Design Tokens & Animation:**
   - Colors, spacing, and motion durations must use tokens defined in `src/ui/tokens.css`.
4. **Network Restrictions:**
   - The editor must never make outbound network requests (`fetch`, `XMLHttpRequest`, telemetry, analytics). Any request will fail `test-security.mjs`.
5. **Comment Format Standard:**
   - Follow the JSON specification defined in `docs/comment-format.md`.

---

## Scope & Roadmap Boundaries

### Welcome Contributions
- Fixes for editing accuracy, undo/redo bugs, or layout preservation.
- Compatibility fixes for specific AI outputs (please attach the reproducing HTML file).
- Translations and dictionary updates.
- Accessibility improvements (keyboard navigation, ARIA attributes).
- Additional automated test coverage.

### Out of Scope for Core Repo
- AI text/image generation features.
- PPTX / PDF conversion utilities.
- Server-side backends, databases, or user accounts.
- Heavy front-end frameworks (React, Vue, Tailwind CLI build steps).
- Desktop wrappers or browser extensions (these belong in separate companion repositories).
