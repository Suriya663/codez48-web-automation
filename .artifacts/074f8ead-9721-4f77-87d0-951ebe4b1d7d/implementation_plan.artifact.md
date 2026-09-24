# Codez48 Pilot Fresh File Creation, Hotkey Fix & Static Web Upgrade Plan

Resolving the keyboard `^s` literal text bug, enforcing fresh document state in Notepad (`Ctrl+N`), fixing file extension precision (`index.html` vs `.html.txt`), eliminating `process is not defined` in browser previews, and upgrading task session isolation.

## User Review Required

> [!IMPORTANT]
> **Root Cause Identified**:
> 1. **Keyboard `^s` Bug**: `guiDriver.typeText('^s')` was escaping `^` to `{^}`, which caused Windows `SendKeys` to type literal `^s` text into the document instead of sending the `Ctrl+S` hotkey.
> 2. **Fresh Document State**: When opening Notepad for a `CREATE` goal, if Notepad was already open, text was typed into the old active file.
> 3. **Browser `process is not defined` Error**: AI-generated client-side scripts contained `process.env` references, which crashed in the browser.

---

## Proposed Fix Strategy

### 1. Dedicated Hotkey Driver (`sendHotkey`)
#### [MODIFY] [gui-driver.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/drivers/gui-driver.js)
- Implement `sendHotkey(hotkey, windowTitle)`: Does NOT escape modifier characters (`^` = Ctrl, `%` = Alt, `+` = Shift).
- `sendHotkey('^s', 'Notepad')` sends real `Ctrl+S` hotkey.
- `sendHotkey('^n', 'Notepad')` sends real `Ctrl+N` hotkey to create a fresh document.

### 2. Notepad Fresh Document State & Exact File Extensions
#### [MODIFY] [notepad-adapter.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/adapters/notepad-adapter.js)
- When executing a `CREATE` goal:
  - Focuses Notepad and sends `sendHotkey('^n', 'Notepad')` to ensure a fresh blank document editor.
  - Types AI-generated content into the fresh document.
  - Preserves exact extension (`index.html`, `style.css`, `script.js`, `story.txt`).
  - Reads saved file from disk and verifies actual content matches before returning success.

### 3. Browser `process` Global Fallback in Static Web Bundler
#### [MODIFY] [agent-controller.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/core/agent-controller.js)
- In `bundleStaticWebHtml`:
  - Strips `process.env` / `process.` lines from `jsContent`.
  - Defines `window.process = window.process || { env: {} };` fallback to guarantee `process is not defined` error never crashes browser previews.

---

## Verification Plan

### Test Scenarios
1. **TEST 1: Notepad Fresh File Creation & Hotkey Fix**:
   - Prompt: *"Open Notepad and write 'Codez48 Pilot Test' and save as a new text file."*
   - Verify: No `^s` literal text in document; real `Ctrl+S` sent; new `.txt` file verified on disk.
2. **TEST 2: Second Consecutive Notepad Story**:
   - Prompt: *"Write a new story about space exploration."*
   - Verify: First file unchanged; fresh document created (`Ctrl+N`); `story-2.txt` saved and verified on disk.
3. **TEST 3: Notepad HTML File Creation**:
   - Prompt: *"Open Notepad and create a complete HTML webpage about Codez48 and save it as index.html."*
   - Verify: Saved as `index.html` (NOT `index.html.txt`); contains valid HTML structure.
4. **TEST 4: Static Web Preview & `process` Global Check**:
   - Prompt: *"Create a static portfolio website with HTML, CSS, and JS."*
   - Verify: HTML structure, CSS styles apply, JS runs in browser without `ReferenceError: process is not defined`.
5. **TEST 5: Calculator Calculation**:
   - Prompt: *"Open Calculator and calculate 4250 * 18"*
   - Verify: Calculator opens, inputs `4250*18=`, result `76500` verified.
6. **TEST 6: VS Code Fresh Project**:
   - Prompt: *"Open VS Code and create a new HTML/CSS portfolio website."*
   - Verify: Fresh project folder created, opened in VS Code, source files verified on disk.
