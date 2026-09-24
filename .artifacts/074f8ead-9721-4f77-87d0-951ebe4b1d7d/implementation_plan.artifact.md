# Codez48 Pilot Sequential State Machine & Topic-Specific Office AI Plan

Fixing the Notepad writing/save race condition (`Codez48 Pilot Test^s`), enforcing strict sequential state machine execution, and eliminating hardcoded topic fallbacks in PowerPoint (`.pptx`), Word (`.docx`), and Excel (`.xlsx`).

## User Review Required

> [!IMPORTANT]
> **Root Causes Identified & Fixed**:
> 1. **Notepad Writing/Save Race Condition**:
>    - `typeText` started typing, and immediately `sendHotkey('^s')` was triggered asynchronously. The Save As dialog opened while typing was ongoing, typing story text into the Save dialog box (`Codez48 Pilot Test^s`).
>    - **Fix**: Implement strict sequential state machine in `NotepadAdapter`:
>      `AI_REQUEST` -> `OPEN_NOTEPAD` -> `CREATE_FRESH_DOCUMENT` (`Ctrl+N`) -> `WRITE_CONTENT` (await typing completion) -> `VERIFY_EDITOR_FOCUS` -> `SEND_HOTKEY_CTRL_S` -> `SAVE` -> `VERIFY_DISK_CONTENT`.
> 2. **Repeated / Predefined Office Content**:
>    - `powerpoint-adapter.js`, `word-adapter.js`, and `excel-adapter.js` hardcoded `AI Presentation.pptx`, `Cloud Computing Report.docx`, and `Monthly Sales Sheet.xlsx`.
>    - **Fix**: Remove all hardcoded topic functions. Query `cli-ai-chat.js` Central AI Task Engine for topic-specific JSON (`Video Games`, `Cyber Security`, `Artificial Intelligence`), generate dynamic filenames (`video_games_presentation.pptx`), and fail explicitly if AI generation fails.

---

## Proposed Changes

### 1. Sequential State Machine & Hotkey Execution
#### [MODIFY] [gui-driver.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/drivers/gui-driver.js)
- Ensure `typeText` fully flushes all keystrokes and waits before resolving promises.

#### [MODIFY] [notepad-adapter.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/adapters/notepad-adapter.js)
- Enforce strict state machine: `WRITE_CONTENT` completes 100% -> focus check -> `sendHotkey('^s')` -> `fs.writeFileSync` -> read back from disk & verify match.

### 2. Topic-Specific Office AI Adapters
#### [MODIFY] [powerpoint-adapter.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/adapters/powerpoint-adapter.js)
- Fetch topic-specific 5 to 10-slide deck JSON from `cli-ai-chat.js` -> build `.pptx` via Office COM -> save with dynamic filename -> verify.

#### [MODIFY] [word-adapter.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/adapters/word-adapter.js)
- Fetch topic-specific document sections JSON from `cli-ai-chat.js` -> build `.docx` via Office COM -> save with dynamic filename -> verify.

#### [MODIFY] [excel-adapter.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/adapters/excel-adapter.js)
- Fetch topic-specific headers/rows JSON from `cli-ai-chat.js` -> build `.xlsx` via Office COM -> save with dynamic filename -> verify.

---

## Verification Plan

### Test Checklist
- [ ] **Test 1: Notepad Fresh Document & Hotkey Race Condition**:
  - Goal: *"Open Notepad and write 'Write an original English story about a robot that becomes a programmer in Notepad.'"*
  - Verification: `WRITE_CONTENT` finishes 100% before `Ctrl+S`. No `^s` text in document.
- [ ] **Test 2: Second Consecutive Notepad Story**:
  - Goal: *"Write an original story about space exploration."*
  - Verification: Fresh document (`Ctrl+N`), saves `space_exploration-2.txt`, first file untouched.
- [ ] **Test 3: Topic-Specific PowerPoint Presentation**:
  - Goal 1: *"Create a 5-slide PowerPoint about Artificial Intelligence"* -> saves `ai_presentation.pptx` with AI content.
  - Goal 2: *"Create a 5-slide PowerPoint about Video Games"* -> saves `video_games_presentation.pptx` with Video Game content.
- [ ] **Test 4: Topic-Specific Word Document**:
  - Goal 1: *"Create a Word report about Cloud Computing"* -> saves `cloud_computing_report.docx`.
  - Goal 2: *"Create a Word report about Cyber Security"* -> saves `cyber_security_report.docx`.
