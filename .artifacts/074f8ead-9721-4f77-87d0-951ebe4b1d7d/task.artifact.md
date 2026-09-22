# Browser Client-Side `require` Error Fix Task Tracker

- `[x]` **Phase 1: System Prompt Browser JS Rule Enforcement**
    - [x] Update `netlify/functions/cli-ai-chat.js` system prompt to explicitly forbid CommonJS `require(...)` in client-side scripts
- `[x]` **Phase 2: Client-Side Script Sanitization & Fallback in Bundler**
    - [x] Update `bundleStaticWebHtml` in `src/core/agent-controller.js` to strip `require(...)` lines from `jsContent`
    - [x] Inject safe `window.require` fallback in preview script payloads
- `[x]` **Phase 3: Syntax Verification & Test Execution**
    - [x] Run `node --check` across all JavaScript modules (0 errors)
    - [x] Test `bundleStaticWebHtml` with JS containing `require(...)` statements
