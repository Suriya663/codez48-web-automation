# Codez48 CLI Bug Fix & Verification Task Tracker

- `[x]` **Issue 1: Fix Static Web Runtime Requirements**
    - [x] Update `AdapterFactory.getAdapter` to prioritize static web adapter when goals specify HTML/CSS/JS/portfolio
    - [x] Verify `staticWebAdapter` has `requiredTools = []` (no npm requirement)
- `[x]` **Issue 2: Fix Static Web Output Routing & Public Preview 404**
    - [x] Prevent static web workflow from falling through into Node runner / `localhost:3000` / `INTERNAL_STATIC_SERVER`
    - [x] Update `cli-ai-chat.js` with `storePreview` direct endpoint
    - [x] Update `agent-controller.js` to bundle HTML/CSS/JS into Firestore `generated_websites` payload
    - [x] Perform real HTTP health check on `https://codez48.netlify.app/preview/<projectId>` before opening browser
- `[x]` **Issue 3: Fix npm Detection on Windows & Pre-Run Node.js Installation**
    - [x] Update `environment-detector.js` with `shell: true` and `.cmd` fallback for Windows npm checks
    - [x] Reject local file paths (`C:\...\server.js`, `server.js`) in `isValidNpmPackageName`
    - [x] Execute `npm install` with `cwd = activeProjectPath` after user approval and verify exit code 0
    - [x] Inspect `package.json` scripts (`"start": "node server.js"`) and prefer `npm start`
    - [x] Ensure Node apps open `http://localhost:<actual-port>` while static web opens Codez48 preview URL
