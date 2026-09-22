# Codez48 Static Web Preview Pipeline & Content Preservation Fix Plan

Resolving the preview content loss bug so that generated HTML, CSS, and JS structure (sections, layouts, styling, scripts) render completely on the public Codez48 preview URL without placeholder/title-only fallbacks.

## User Review Required

> [!IMPORTANT]
> **Root Cause Identified**:
> In `agent-controller.js`, if `readFile('index.html')` failed or returned empty content, it fell back to `'<html><body><h1>Codez48 Static Website</h1></body></html>'`.
> Additionally, the CSS/JS injection used rigid `replace('</head>')` and `replace('</body>')` logic. If `index.html` lacked lowercase tags, or if CSS/JS were linked via `<link rel="stylesheet" href="style.css">`, the injection failed silently, persisting only bare HTML to Firestore!

## Proposed Fix Strategy

### 1. Robust Multi-File HTML Bundling Engine
- Implement a smart HTML bundler function `bundleStaticWebHtml(indexHtml, cssContent, jsContent)`:
  - Strips external `<link href="style.css">` and `<script src="script.js">` tags from HTML.
  - Injects full `style.css` and `script.js` content into `<style>` and `<script>` blocks flexibly (handling missing `<head>`/`<body>` tags safely).
  - Preserves DOCTYPE, semantic tags, navbar, hero, sections, classes, IDs, and layouts intact.

### 2. File Resolution & Fallback Elimination
- If `index.html` is not in root, scan `activeDir` for any generated `.html` file.
- Never overwrite real generated HTML with a placeholder string (`"Codez48 Static Website"`).

### 3. Response Verification
- After persisting to Firestore, fetch the public preview URL `https://codez48.netlify.app/preview/<projectId>`.
- Verify:
  - HTTP Status == 200.
  - Response body contains actual website content (length > 200 chars, no default title-only placeholder).
- Only when response verification passes: open browser and display `✓ Preview Ready`.

---

## Verification Plan

### Test Scenario: Complete Portfolio Generation
1. Goal Prompt:
   *"Create a modern responsive portfolio website using HTML, CSS and JavaScript with a navigation bar, hero section, about section, skills section, projects section, contact section and footer."*
2. Check local generated files:
   - `index.html` (contains navbar, hero, about, skills, projects, contact, footer).
   - `style.css` (contains complete responsive CSS).
   - `script.js` (contains interactions).
3. Check Firestore persisted HTML payload:
   - Bundled HTML contains complete structure and inlined CSS/JS.
4. Check public preview response (`https://codez48.netlify.app/preview/<projectId>`):
   - HTTP 200 OK.
   - Body contains "About", "Skills", "Projects", "Contact".
5. Browser opens public preview URL rendering the complete design.
