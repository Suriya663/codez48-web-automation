# Codez48 Pilot Hotkey Fix, Fresh Document & Browser `process` Root Cause Fix

- `[x]` **Step 1: Dedicated `sendHotkey()` & `^s` Hotkey Fix**
    - [x] Add `sendHotkey(hotkey, windowTitle)` to `src/pilot/drivers/gui-driver.js` without escaping SendKeys modifier characters (`^`, `%`, `+`)
    - [x] Add `^n` fresh document shortcut to `src/pilot/adapters/notepad-adapter.js`
    - [x] Ensure exact file extension preservation (`index.html` remains `index.html`)
    - [x] Test 1: Open Notepad -> write "Codez48 Pilot Test" in a NEW document (`Ctrl+N`) -> save with `Ctrl+S` -> verify no `^s` text in file and disk content matches
    - [x] Test 2: Second consecutive Notepad story creation (verifying file isolation and story-2.txt)
- `[x]` **Step 2: Root Cause Investigation of `process` References in Browser JS**
    - [x] Trace AI generation and static bundling pipeline to find where `process` or `process.env` enters client-side scripts
    - [x] Update `netlify/functions/cli-ai-chat.js` system prompt and static bundling in `src/core/agent-controller.js` to ensure pure client-side browser JS is generated without Node.js `process` globals
    - [x] Test 3: Static website HTML/CSS/JS preview test verifying 0 browser console errors and no fake shims
