# Implementation Plan — Intent Classification & Workflow Dispatch Fix

## Executive Summary & Root Cause
A recent VCS rollback reverted the dispatch logic in `cli.js`. As a result, non-code automation tasks (such as PowerPoint presentation generation, Word document creation, and CSV report processing) match the condition on line 170 in `cli.js` and get short-circuited into `GENERAL_CHAT`, returning plain text responses instead of executing their native handlers (`nativeAppAutomation`, `filesystemController`, etc.).

This plan fixes the dispatching logic in `cli.js` and `cli-ai-analyzer.js` so that every request is classified into one of the 12 primary intent categories, displays metadata in the user's terminal, and routes directly to its corresponding working handler.

---

## User Review Required

> [!IMPORTANT]
> - **Native Workflow Dispatching**: Requests for PowerPoint (`.pptx`), Word (`.docx`), CSV reports, file operations, web scraping, and browser automation will dispatch directly to their respective native handlers (`nativeAppAutomation`, `filesystemController`, `pilotNavigator`) with terminal status indicators:
>   ```text
>   [INTENT: DOCUMENT_GENERATION]
>   [SUB_INTENT: POWERPOINT]
>   [KEYWORDS: presentation, artificial intelligence]
>   [WORKFLOW: PRESENTATION_GENERATOR]
>   [STATUS: EXECUTING]
>   ```
> - **No Unnecessary Automation**: `GENERAL_CHAT` queries (greetings, general explanations, advice) will return clean text responses directly in the console without opening VS Code, spawning PowerShell, or writing project files.
> - **Safe File Writing & Verification**: Code generation and project modifications write formatted, multiline UTF-8 files to disk, run `node --check` syntax validation, create `.bak` backups for existing files, and execute runtime verification with up to 3 repair attempts.
> - **Repository Protection**: Existing user files, untracked `.gradle` directories (`android_webview_template/.gradle/`), and environment credentials (`.env`) are preserved 100% untouched.

---

## Proposed System Architecture & Changes

### 1. Intent Classification & Terminal Logging (`playwright-worker/cli-ai-analyzer.js` & `cli.js`)
- Standardize the 12 intent categories in `cli-ai-analyzer.js`:
  1. `GENERAL_CHAT`
  2. `CODE_GENERATION`
  3. `PROJECT_GENERATION`
  4. `FILE_OPERATIONS`
  5. `BROWSER_AUTOMATION`
  6. `WEBSITE_SCRAPING`
  7. `WEBSITE_SOURCE_ANALYSIS`
  8. `DOCUMENT_GENERATION`
  9. `DATA_PROCESSING`
  10. `WORDPRESS_TASK`
  11. `GENERAL_AUTOMATION`
  12. `UNKNOWN_OR_AMBIGUOUS`
- In `cli.js`, log full intent classification metadata for all non-chat and actionable requests:
  ```text
  [INTENT: <INTENT>]
  [SUB_INTENT: <SUB_INTENT>]
  [KEYWORDS: <KEYWORDS>]
  [WORKFLOW: <WORKFLOW>]
  [STATUS: EXECUTING]
  ```

### 2. Workflow Dispatcher Repairs (`cli.js`)
- **Prevent Early Exit**: Update line 170 in `cli.js` so that `DOCUMENT_GENERATION`, `DATA_PROCESSING`, `GENERAL_AUTOMATION`, and `FILE_OPERATIONS` do not short-circuit as `GENERAL_CHAT`.
- **Connect Specialized Handlers**:
  - `DOCUMENT_GENERATION` (PowerPoint / `.pptx`) -> `nativeAppAutomation.createFanAutomationPresentation()`
  - `DOCUMENT_GENERATION` (Word / `.docx`) -> `nativeAppAutomation.createFanAutomationWordDoc()`
  - `DATA_PROCESSING` (CSV / Spreadsheet) -> `filesystemController.createCsvReport()`
  - `GENERAL_AUTOMATION` (Calculator) -> `nativeAppAutomation.calculateAndVerify()`
  - `FILE_OPERATIONS` (Local project edit) -> `cliProjectModifier.modifyProject()`
  - `PROJECT_GENERATION` / `CODE_GENERATION` -> `cliProjectGenerator.generateProject()`
  - `WEBSITE_SCRAPING` -> `pilotNavigator.scrapeAndCloneWebsite()`
  - `BROWSER_AUTOMATION` -> `pilotNavigator.navigateAndInteract()`

### 3. Netlify & Groq Integration
- Use `.env` configured `GROQ_API_KEY` list with live fallback to `https://codez48.netlify.app/.netlify/functions/call-ai`.
- Keep credentials safe and unexposed.

---

## Feature Inventory & Verification Table

| Feature Category | Request Examples | Target Handler | Output / Verification Method |
|---|---|---|---|
| `GENERAL_CHAT` | "Hello", "Explain Node.js" | `unwrapAnswer()` / Console Output | Plain text display, no VS Code / no file creation |
| `CODE_GENERATION` | "Write a javascript function to check prime numbers" | `cliProjectGenerator` | Multiline JS file created, `node --check` passed |
| `PROJECT_GENERATION` | "Create a Node.js express server with routes/user.js" | `cliProjectGenerator` | Multi-file project, `npm install`, server run & screenshot |
| `FILE_OPERATIONS` | "Modify project_1792139101032 to add a comment" | `cliProjectModifier` | Two-pass local inspection, `.bak` backup, single target match check, read-back |
| `BROWSER_AUTOMATION` | "Open https://codez48.netlify.app/ and click pricing" | `pilotNavigator` | Playwright browser navigation, selector click, screenshot |
| `WEBSITE_SCRAPING` | "Scrape source code from https://codez48.netlify.app/" | `pilotNavigator` | Cloned site in `pilot-workspace/projects/startify` |
| `WEBSITE_SOURCE_ANALYSIS` | "Analyze layout of https://codez48.netlify.app/" | `browserManager` | Page title, heading count, link inventory report |
| `DOCUMENT_GENERATION` (PPT) | "Create a PowerPoint presentation about AI Automation" | `nativeAppAutomation` | `.pptx` file generated on disk (`Fan_Automation.pptx`), 10 slides verified |
| `DOCUMENT_GENERATION` (Doc) | "Create a Word document report on Fan Automation" | `nativeAppAutomation` | `.docx` file created on disk (`Fan_Automation_Technical_Overview.docx`) |
| `DATA_PROCESSING` | "Generate a CSV report for Fan Automation" | `filesystemController` | `.csv` file created and verified (`Fan_Automation_Report.csv`) |
| `GENERAL_AUTOMATION` | "Calculate 15 * 8", "Open Notepad" | `nativeAppAutomation` / `filesystemController` | Win32 process spawn / evaluation verification |
| `UNKNOWN_OR_AMBIGUOUS` | "do something with code" | `cli.js` | Asks user for safe clarification |

---

## Acceptance Test Plan

Execute end-to-end verification through `node cli.js pilot "<prompt>"` for all primary workflows:
1. `node cli.js pilot "Hello"` -> Verify plain text greeting, no VS Code.
2. `node cli.js pilot "Explain Node.js"` -> Verify readable explanation text, no raw JSON wrapper.
3. `node cli.js pilot "Create a JavaScript program that prints Hello World"` -> Verify file generation, `node --check`, VS Code launch, execution.
4. `node cli.js pilot "Create a PowerPoint presentation about AI Automation"` -> Verify `.pptx` file generation, 10 slides, disk verification.
5. `node cli.js pilot "Create a Word document report on Fan Automation"` -> Verify `.docx` file generation on disk.
6. `node cli.js pilot "Generate a CSV report for Fan Automation"` -> Verify `.csv` file generation on disk.
7. `node cli.js pilot "modify project_1792139101032 to add a comment in routes/user.js"` -> Verify 2-pass inspection, `.bak` backup, exact match edit, read-back.
8. `node cli.js pilot "do something with code"` -> Verify clarification request.

---

## Git & Repository Safety
- All tests will run on disposable directories inside `pilot-workspace/`.
- No git resets or cleanups will be run on untracked `.gradle` files.
- Credentials in `.env` remain unexposed.