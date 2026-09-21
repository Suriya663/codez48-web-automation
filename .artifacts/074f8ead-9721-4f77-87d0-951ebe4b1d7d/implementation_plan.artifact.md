# Autonomous AI Agent Real Failure Fixes & Behavior Plan

Fixing the Node.js project path resolution bug, message length limits in auto-fix repair requests, static preview 404s, and deterministic error handling.

## User Review Required

> [!IMPORTANT]
> **Root Cause & Fix Summary**:
> 1. **Node.js Working Directory & Double Nesting Bug**: When AI sent relative paths starting with the project folder name (e.g. `express-website/server.js`), `filesystemActions` appended it to `activeProjectPath` (`.../Codez48 Preview/express-website`), creating `.../express-website/express-website/server.js` while running `node server.js` in the parent directory!
>    - **Fix**: `filesystemActions` and `workspaceManager` will strip any redundant project-name path prefixes before creating/editing files, placing all source files directly inside `activeProjectPath`.
> 2. **Auto-Fix 2000-Character Message Limit**: `attemptAutoFix` sent entire conversation history plus long logs and full code snippets, exceeding the Netlify 2000-character request limit.
>    - **Fix**:
>      - Deterministic errors (e.g., `Cannot find module 'express'`) are resolved locally by triggering `npm install` without calling the AI API.
>      - For actual code errors, the fix prompt is budget-constrained (short error summary + relevant file snippet) and sent as a fresh, compact request payload (<= 800 chars).
> 3. **Static Preview 404 & Asset Inlining**:
>    - Ordinary static generated websites use the existing Codez48 preview infrastructure (`https://codez48.netlify.app/preview/<projectId>`).
>    - For the public preview URL, CSS and JS are bundled/inlined into the stored Firestore `generated_websites` HTML payload to prevent 404 asset errors on the web preview, while saving separate `index.html`, `style.css`, and `script.js` locally in `activeProjectPath`.
>    - Real HTTP health checks verify preview URLs before opening the default browser.

---

## Proposed Changes

### 1. Filesystem & Workspace Path Normalization
#### [MODIFY] [workspace-manager.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/core/workspace-manager.js)
#### [MODIFY] [filesystem-actions.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/actions/filesystem-actions.js)
- Normalize paths by stripping redundant `projectName/` prefixes when `activeProjectPath` is already set.
- Ensure all project files (`package.json`, `server.js`, `public/index.html`) write directly into `activeProjectPath`.
- Ensure `cwd: activeProjectPath` is used for `npm install`, build commands, `node server.js`, `code "<activeProjectPath>"`, and follow-up edits.

### 2. Compact Request Budgeting & Deterministic Error Handling
#### [MODIFY] [agent-controller.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/core/agent-controller.js)
- Implement deterministic local error handlers:
  - `Cannot find module 'X'` -> Auto-trigger `npm install X` locally.
  - Entry file missing -> Inspect `package.json` or project files to resolve true entry point.
- Compact AI Repair Prompt:
  - Budget fix request to <= 800 characters total.
  - Send clean single-message payload instead of re-sending full conversation history.

### 3. Static Web Preview Contract & Asset Handling
#### [MODIFY] [static-web.js](file:///C:/Users/suriya prakash/OneDrive/Desktop/codez48cli/src/adapters/static-web.js)
#### [MODIFY] [agent-controller.js](file:///C:/Users/suriya prakash/OneDrive/Desktop/codez48cli/src/core/agent-controller.js)
- Static website default ("Create a portfolio website"):
  - Generate random project ID (`web-xxxxxx`).
  - Store combined HTML (with inlined CSS/JS for zero-asset-404 web rendering) in Firestore `generated_websites`.
  - Save separate `index.html`, `style.css`, `script.js` in local `activeProjectPath`.
  - Perform real HTTP check on `https://codez48.netlify.app/preview/<projectId>` before opening browser.

---

## Verification Plan

### Test Scenarios
1. **Normal Chat Test**:
   - Input: `"What is Node.js?"`
   - Result: Returns text explanation only. No files, no folders, no commands.
2. **Static Website Preview Test**:
   - Input: `"Create a simple portfolio website"`
   - Result: Creates `portfolio/` in `Codez48 Preview`, generates `index.html`, `style.css`, `script.js`, stores in Firestore, verifies `previewUrl`, opens browser.
3. **Node.js Express Project Test**:
   - Input: `"Create a Node.js Express website and run it"`
   - Result:
     - Creates `express-website/`
     - Sets `activeProjectPath = ...\Codez48 Preview\express-website`
     - Files (`package.json`, `server.js`, `public/...`) placed directly inside `express-website/`
     - Analyzes `package.json` -> Prompts `Install express? (y/n)` -> `npm install` runs with `cwd = express-website`
     - Runs `npm start` with `cwd = express-website`
     - Server starts, detects `http://localhost:<port>`, health checks pass, browser opens.
4. **Auto-Fix & Deterministic Error Test**:
   - Missing module error is resolved locally via `npm install` without exceeding character limits.
5. **VS Code Test**:
   - Input: `"Open this project in VS Code"`
   - Result: Opens `...\Codez48 Preview\express-website` in VS Code.
6. **Follow-Up Edit Test**:
   - Input: `"Change the heading to Student Portal"`
   - Result: Modifies `index.html` inside `...\Codez48 Preview\express-website` directly without spawning duplicate files.
