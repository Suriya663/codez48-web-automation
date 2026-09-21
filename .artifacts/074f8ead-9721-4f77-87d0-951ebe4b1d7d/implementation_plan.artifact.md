# Codez48 CLI Bug Fixes & Execution Plan

Fixing the Node.js project path/dependency execution failure and resolving the static website public preview 404 error.

## User Review Required

> [!IMPORTANT]
> **Root Cause & Fix Summary**:
> 1. **Package Validation Security Fix**:
>    - The error resolver was treating missing local files (`Cannot find module 'C:\...\server.js'`) as npm package names, attempting `npm install "C:\...\server.js"` from user root!
>    - **Fix**: Implemented strict package name validation. Paths containing file extensions (`.js`, `.json`), slashes, Windows drive letters (`C:\`), or relative prefixes (`./`) are strictly rejected from being passed to `npm install`.
> 2. **Canonical `activeProjectPath` & CWD Fix**:
>    - `workspaceManager.setActiveProject` will be initialized immediately upon project detection and used as the single source of truth across all actions (`cwd: activeProjectPath`).
>    - `workspaceManager.resolvePath` strips redundant folder name prefixes to prevent double-nesting (`express-website/express-website/server.js`).
> 3. **Node.js Pre-Run Dependency Analysis**:
>    - Before spawning the process, read `package.json` and scan source files -> prompt user `(y/n)` -> execute `npm install` inside `activeProjectPath` -> verify exit code 0 -> check package.json scripts (`npm start`) -> verify entry file -> run process with `cwd = activeProjectPath`.
> 4. **Static Website Public Preview 404 Fix**:
>    - Local static files (`index.html`, `style.css`, `script.js`) write to `activeProjectPath`.
>    - The agent merges HTML, CSS, and JS into a complete single-document HTML payload and persists it to Firestore `generated_websites` under `doc(projectId)`.
>    - Performs a real HTTP check on `https://codez48.netlify.app/preview/<projectId>` to verify `HTTP 200` before opening the browser.

---

## Proposed Changes

### 1. Workspace & Path Security
#### [MODIFY] [workspace-manager.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/core/workspace-manager.js)
#### [MODIFY] [filesystem-actions.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/actions/filesystem-actions.js)
- Enforce single canonical `activeProjectPath`.
- Normalize all paths and strip double-nesting prefixes.

### 2. Dependency Manager & Package Validation
#### [MODIFY] [node.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/adapters/node.js)
#### [MODIFY] [agent-controller.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/core/agent-controller.js)
- Implement `isValidNpmPackageName(pkg)` to reject file paths from `npm install`.
- Execute `npm install` with `cwd: activeProjectPath`.
- Read `package.json` scripts (`"start": "node server.js"`) and prefer `npm start`.

### 3. Static Web Preview Persistence
#### [MODIFY] [static-web.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/adapters/static-web.js)
#### [MODIFY] [agent-controller.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/core/agent-controller.js)
- For static web goals, persist the bundled HTML payload to Firestore `generated_websites` via the Netlify `cli-ai-chat` API so `https://codez48.netlify.app/preview/<projectId>` returns `HTTP 200`.

---

## Verification Plan

### Test Scenario 1: Node.js Express Application
- **Command**: `codez48 ai` -> *"Create a Node.js Express website and run it"*
- **Verification**:
  - `activeProjectPath`: `...\Codez48 Preview\express-website`
  - `package.json` created in `express-website`
  - `express` dependency detected
  - `npm install` runs with `cwd = ...\express-website`
  - `npm start` runs with `cwd = ...\express-website`
  - Localhost URL detected and opened.

### Test Scenario 2: Static Portfolio Website
- **Command**: `codez48 ai` -> *"Create a portfolio website"*
- **Verification**:
  - Local `index.html`, `style.css`, `script.js` created.
  - Document persisted to Firestore `generated_websites`.
  - Preview URL `https://codez48.netlify.app/preview/<projectId>` returns `HTTP 200`.
  - Browser opens public preview URL.
