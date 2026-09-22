# Codez48 Dynamic Web Generation & Package Installation Approval Plan

Enhancing the Codez48 CLI AI Agent and Server Prompts to generate rich, multi-file, fully-styled dynamic Node.js/Express applications and guaranteeing the `Y/n` package installation approval flow.

## User Review Required

> [!IMPORTANT]
> **Key Enhancements**:
> 1. **Rich Dynamic Website Code Generation**:
>    - System prompt updated so Node.js/Express project generation produces complete, rich, multi-section UI layouts (`public/index.html`), professional CSS (`public/style.css`), and client-side JavaScript (`public/script.js`).
>    - `server.js` is instructed to configure Express static file serving (`app.use(express.static('public'))`), ensuring HTML, CSS, and JS link together seamlessly.
> 2. **Explicit Package/Dependency Approval Flow**:
>    - When a Node.js project requires dependencies (e.g. `express`, `cors`), the CLI displays the missing packages and prompts:
>      `Install required package(s) using 'npm install express'? (Y/n):`
>    - Pressing `y`/`Y`/`yes` automatically runs `npm install` inside the project folder (`cwd: activeProjectPath`) and verifies installation before starting the server.

---

## Proposed Changes

### 1. Server System Prompt Upgrade
#### [MODIFY] [cli-ai-chat.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/netlify/functions/cli-ai-chat.js)
- Enhance system prompt for Node.js / Express projects to generate:
  - `package.json` with dependencies and start scripts.
  - `server.js` configured with `app.use(express.static('public'))` and dynamic API routes.
  - `public/index.html` containing a full, modern, multi-section responsive web page layout (navbar, hero, features, interactive components, footer).
  - `public/style.css` with complete styling.
  - `public/script.js` with client-side DOM logic.
  - Linked tags: `<link rel="stylesheet" href="style.css">` and `<script src="script.js"></script>`.

### 2. Dependency Approval & Execution Refinement
#### [MODIFY] [agent-controller.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/core/agent-controller.js)
- Refine approval prompt handling to accept `Y`, `y`, `yes`, `YES` or Enter (default Yes).
- Execute `npm install` with `cwd: activeProjectPath` and log stdout/stderr.

---

## Verification Plan

### Test Scenario: Dynamic Node.js Express Application
1. **Command**:
   `codez48 ai` -> *"Create a Node.js Express shopping website and run it"*
2. **Expected Verification**:
   - `express-website/package.json` created.
   - `express-website/server.js` created with `express.static('public')`.
   - `express-website/public/index.html` created with rich shopping UI.
   - `express-website/public/style.css` and `script.js` created and linked.
   - Missing dependency `express` detected -> Prompt `Install required package(s)? (Y/n)`.
   - Press `y` -> `npm install express` executes automatically in project folder.
   - `npm start` runs server.
   - Browser opens `http://localhost:3000` rendering full styled shopping website.
