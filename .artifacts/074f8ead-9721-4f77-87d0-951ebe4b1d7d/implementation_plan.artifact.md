# Browser Client-Side `require` Error Fix & System Prompt Safeguard Plan

Fixing the browser preview runtime error `ReferenceError: require is not defined` when client-side scripts generated for web previews contain Node.js CommonJS `require()` calls.

## User Review Required

> [!IMPORTANT]
> **Root Cause Identified**:
> - The AI model occasionally generated Node.js CommonJS statements (e.g., `const express = require('express')` or `const fs = require('fs')`) inside client-side `script.js` files intended for the browser.
> - When rendered in the browser, the browser script engine threw `ReferenceError: require is not defined`, crashing DOM execution and preventing the generated website layout/components from rendering.

## Proposed Fix Strategy

### 1. Server System Prompt Rule Enforcement
#### [MODIFY] [cli-ai-chat.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/netlify/functions/cli-ai-chat.js)
- Add a strict instruction to `systemPrompt`:
  > *"CRITICAL BROWSER JS RULE: Client-side \`script.js\` or browser HTML scripts MUST NOT contain Node.js CommonJS statements like \`require(...)\`, \`module.exports\`, or Node built-in modules (\`fs\`, \`path\`, \`http\`). Use native browser DOM APIs (\`document.querySelector\`, \`addEventListener\`, \`fetch\`)."*

### 2. Client-Side Script Sanitization in Bundler
#### [MODIFY] [agent-controller.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/core/agent-controller.js)
- In `bundleStaticWebHtml`:
  - Automatically strip/clean lines containing `require(...)` or `module.exports` from `jsContent` before embedding into `<script>` tags for the browser.
  - Define a safe no-op `window.require = window.require || function() { return {}; };` fallback at the top of embedded preview scripts to prevent `ReferenceError: require is not defined` from breaking DOM execution.

---

## Verification Plan

### Manual Verification
1. **Syntax Check**: Run `node -c` across all modified files.
2. **Browser Compatibility Test**:
   - Pass JS content containing `const fs = require('fs'); document.body.style.background = 'blue';` through `bundleStaticWebHtml`.
   - Verify `require(...)` line is safely stripped/handled.
   - Verify DOM code executes without `ReferenceError`.
