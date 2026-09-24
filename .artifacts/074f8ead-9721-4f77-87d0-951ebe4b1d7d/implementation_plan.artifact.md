# Codez48 Central AI Task Engine for Pilot + CLI Automation Plan

Establishing a server-side Central AI Task Engine in `netlify/functions/cli-ai-chat.js` that powers `codez48 pilot` with dynamic, un-hardcoded AI generation for Notepad stories, PowerPoint slide decks, Word reports, Excel spreadsheets, VS Code multi-file projects, and saved automation workflows (`start.json`).

## Phase 1 Research Findings

1. **Existing Server AI Function**: `netlify/functions/cli-ai-chat.js` (backed by server-side Groq & Gemini API keys).
2. **Existing Client Module**: `apiCall('cli-ai-chat', 'POST', payload)` in `cli.js` & `src/core/agent-controller.js`.
3. **Current Request/Response Format**:
   - Request: `{ messages: [{ role: "user", content: "..." }], projectId: "..." }` or `{ storePreview: true, ... }`.
   - Response: `{ success: true, answer: "...", isAction: true, actions: [...], isWebsite: true, previewUrl: "..." }`.
4. **Where Predefined Content Was Introduced**:
   - `powerpoint-adapter.js`: Hardcoded `generateAiSlideDeck()` function.
   - `word-adapter.js`: Hardcoded `generateDocSections()` function.
   - `excel-adapter.js`: Hardcoded `generateSpreadsheetData()` function.
   - `notepad-adapter.js`: Fallback string `'Codez48 Pilot Story Output'`.
5. **Minimal Architecture Change Required**:
   - Add structured `PILOT_TASK` capability to `cli-ai-chat.js` system prompt so the AI server returns dynamic JSON for requested content (`taskType: "TEXT|PRESENTATION|DOCUMENT|SPREADSHEET|PROJECT|WORKFLOW"`).
   - Update all Pilot adapters (`notepad`, `powerpoint`, `word`, `excel`, `vscode`) to query `cli-ai-chat` for real AI-generated content before executing local file creation and application automation.

---

## User Review Required

> [!IMPORTANT]
> **Complete Removal of Hardcoded / Predefined Content**:
> - All hardcoded slide deck arrays, document section templates, spreadsheet rows, and fallback story strings in Pilot adapters will be replaced with real-time server-side AI model responses from `cli-ai-chat.js`.
> - **Saved Workflows**: Reusable Pilot routines will be stored safely in `~/.codez48/pilot/workflows/start.json` (using `os.homedir()`, never hardcoding Windows usernames or secrets). Typing `start` in `codez48 pilot` loads the user's saved workflow, plans actions via AI, executes local application/browser steps, and summarizes live observations.

---

## Proposed Changes

### 1. Server-Side Central AI Task Engine
#### [MODIFY] [cli-ai-chat.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/netlify/functions/cli-ai-chat.js)
- Add Capability 5: `PILOT DESKTOP TASK ENGINE`.
- Structured JSON output for Pilot content generation:
  - `taskType: "TEXT"` -> `{ content: "..." }`
  - `taskType: "PRESENTATION"` -> `{ title: "...", slides: [{ title: "...", bullets: [...] }] }`
  - `taskType: "DOCUMENT"` -> `{ title: "...", sections: [{ heading: "...", body: "..." }] }`
  - `taskType: "SPREADSHEET"` -> `{ title: "...", headers: [...], rows: [[...]] }`
  - `taskType: "PROJECT"` -> `{ projectDir: "...", files: [{ path: "...", content: "..." }] }`
  - `taskType: "WORKFLOW"` -> `{ steps: [{ action: "...", target: "...", value: "..." }] }`

---

### 2. Pilot Adapters & AI Integration (`src/pilot/`)
#### [MODIFY] [notepad-adapter.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/adapters/notepad-adapter.js)
- Queries `cli-ai-chat` for dynamic story/text content -> writes to fresh document -> saves unique `.txt` file -> verifies disk content.

#### [MODIFY] [powerpoint-adapter.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/adapters/powerpoint-adapter.js)
- Queries `cli-ai-chat` for dynamic slide deck JSON -> builds 10-slide `.pptx` via Office COM -> saves to Desktop -> verifies `.pptx` -> opens PowerPoint.

#### [MODIFY] [word-adapter.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/adapters/word-adapter.js)
- Queries `cli-ai-chat` for dynamic document sections JSON -> builds `.docx` via Office COM -> saves to Desktop -> verifies `.docx` -> opens Word.

#### [MODIFY] [excel-adapter.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/adapters/excel-adapter.js)
- Queries `cli-ai-chat` for dynamic headers/rows JSON -> builds `.xlsx` via Office COM -> saves to Desktop -> verifies `.xlsx` -> opens Excel.

#### [MODIFY] [vscode-adapter.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/adapters/vscode-adapter.js)
- Queries `cli-ai-chat` for dynamic multi-file project JSON (`index.html`, `style.css`, `script.js`) -> writes project files -> opens VS Code -> verifies.

---

### 3. Saved Workflow System (`src/pilot/workflow-system.js`)
#### [NEW] [workflow-system.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/workflow-system.js)
- Manages saved user workflows in `~/.codez48/pilot/workflows/start.json`.
- Supports `codez48 pilot workflow create` and typing `start` in `codez48 pilot`.
- Converts natural language instructions into executable local app & browser steps via Central AI Task Engine.

---

## Verification Plan

### Test Checklist
- [ ] Phase 1: Server AI function `cli-ai-chat.js` inspection & structured Pilot task output response verification.
- [ ] Phase 2: Notepad story test ("Write a story about a space explorer") -> verifies AI-generated text content written and saved on disk.
- [ ] Phase 3: PowerPoint test ("Create a 10-slide presentation about Quantum Computing") -> verifies AI-generated 10-slide deck JSON build & `.pptx` file.
- [ ] Phase 4: VS Code multi-file project test ("Create a responsive restaurant website with HTML, CSS, JS") -> verifies `index.html`, `style.css`, `script.js` created and opened in VS Code.
- [ ] Phase 5: Saved Workflow test (`start-test` workflow) -> verifies workflow execution, browser navigation, and observation summary.
- [ ] 0 syntax errors across all JavaScript modules (`node -c`).
