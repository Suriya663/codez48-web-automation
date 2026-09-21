# Codez48 CLI Bug Fixes & Execution Plan

- `[x]` **Phase 1: Single Source of Truth & Path Security**
    - [x] Update `src/core/workspace-manager.js` to enforce canonical `activeProjectPath` and double-nesting removal
    - [x] Update `src/actions/filesystem-actions.js` to strip redundant prefixes
- `[x]` **Phase 2: Package Validation & Pre-Run Dependency Installation**
    - [x] Implement `isValidNpmPackageName(pkgName)` to reject file paths
    - [x] Implement `node.js` adapter pre-run package.json analysis
    - [x] Run `npm install` with `cwd = activeProjectPath` and verify exit code 0
- `[x]` **Phase 3: Static Website Preview Contract & Firestore Persistence**
    - [x] Persist bundled static HTML to Firestore `generated_websites` via Netlify function
    - [x] Perform real HTTP check on `https://codez48.netlify.app/preview/<projectId>` before opening browser
- `[x]` **Phase 4: Agent Controller & Process Execution**
    - [x] Ensure process manager runs with `cwd = activeProjectPath`
    - [x] Budget auto-fix repair prompt to <= 800 characters
- `[x]` **Phase 5: Local Testing & Verification**
    - [x] Test Node.js Express flow ("Create a Node.js Express website and run it")
    - [x] Test Static Web flow ("Create a portfolio website")
    - [x] Test VS Code flow ("Open this project in VS Code")
