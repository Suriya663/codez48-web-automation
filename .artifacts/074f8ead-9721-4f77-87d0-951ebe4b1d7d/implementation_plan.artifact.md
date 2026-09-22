# Codez48 Static Web Preview Pipeline Root Cause Fix Plan

Eliminating the placeholder fallback string `'Codez48 Static Website'` and fixing the static preview persistence pipeline so public previews render the complete generated HTML/CSS/JS website.

## User Review Required

> [!IMPORTANT]
> **Root Cause Identified**:
> 1. In `cli-ai-chat.js`, when Groq/Gemini returned `isWebsite: true`, `cli-ai-chat.js` saved the full generated HTML to Firestore under `doc(data.projectId)` and returned `data.previewUrl`.
> 2. However, `agent-controller.js` received `data.isWebsite = true`, ignored `data.previewUrl`, generated a **second** random `previewProjId`, failed to find local files (because `isWebsite` didn't write local files), fell back to `'<html><body><h1>Codez48 Static Website</h1></body></html>'`, and **overwrote Firestore** with this placeholder HTML under the new ID!
> 3. **The Fix**:
>    - Remove all placeholder fallback HTML strings (`'Codez48 Static Website'`) from `agent-controller.js`.
>    - Ensure static website creation creates both local files (`index.html`, `style.css`, `script.js`) AND persists the full HTML to Firestore under one single `projectId`.
>    - When `data.isWebsite` is returned, use `data.previewUrl` directly without creating a second ID or overwriting Firestore.

---

## Proposed Changes

### 1. Server-Side Prompt & Local File Generation
#### [MODIFY] [cli-ai-chat.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/netlify/functions/cli-ai-chat.js)
- Update system prompt so static website generation requests return `isAction: true` with full local files (`index.html`, `style.css`, `script.js`) AND `isWebsite: true` with `html` bundling.

### 2. Client-Side Agent Controller
#### [MODIFY] [agent-controller.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/core/agent-controller.js)
- Remove all fallback placeholder strings (`'Codez48 Static Website'`).
- If `data.isWebsite` is true, use `data.projectId` and `data.previewUrl` directly.
- If local files exist, bundle `index.html`, `style.css`, and `script.js` into `htmlBundle` and update the single Firestore document `doc(projectId)`.
- If local files were not written, extract HTML from `data.html` and write local files (`index.html`, `style.css`, `script.js`) in `activeProjectPath`.
- Perform real HTTP check on `publicPreviewUrl` verifying `res.status === 200` and response length > 200 chars before launching the default browser.

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
   - Verified that Firestore document contains full HTML with inlined styles and scripts.
4. Check public preview response (`https://codez48.netlify.app/preview/<projectId>`):
   - HTTP 200 OK.
   - Body contains "About", "Skills", "Projects", "Contact".
5. Browser opens public preview URL rendering the complete designed portfolio.
