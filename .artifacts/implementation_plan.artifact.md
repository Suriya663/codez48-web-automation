# AI Pilot Native Intent Resolver & System Integration Implementation Plan

This plan addresses the issue where the AI Pilot planner was defaulting to web navigation steps instead of triggering the native desktop automation capabilities (PowerPoint, Calculator, VS Code project creation, Web Search Extractor, Input Verifier, and 200px Input Popup).

---

## User Review Required

> [!IMPORTANT]
> The AI Planner (`ai-planner.js`) will now feature a **Deterministic Intent Pre-Resolver** and enhanced LLM system guidelines.
> Whenever a pilot goal mentions PowerPoint, Calculator, VS Code/program writing, web search (e.g. Amazon search for iPhone), input field verification, or credential collection, the planner will immediately execute the native action without getting stuck on standard web navigation loops.

---

## Proposed Changes

### Component 1: Deterministic Native Intent Pre-Resolver in AI Planner

#### [MODIFY] [ai-planner.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/ai-planner.js)
- Adds a **Deterministic Intent Pre-Resolver** at the beginning of `planNextAction(run, pageState)`:
  - **PowerPoint/PPT/Presentation Intent**: If `run.goal` includes keywords like `powerpoint`, `ppt`, `presentation`, `slides`, immediately returns `action: 'native_app'`, `value: 'powerpoint:<Title>'`.
  - **Calculator Intent**: If `run.goal` includes keywords like `calculator`, `calc`, `calculate`, `math`, immediately returns `action: 'native_app'`, `value: 'calculator:<Expression>'`.
  - **VS Code Program Creation Intent**: If `run.goal` includes keywords like `program`, `code`, `vscode`, `write a program`, `create a project`, immediately returns `action: 'native_app'`, `value: 'vscode:<ProjectName>'`.
  - **Search & Link Extraction Intent**: If `run.goal` includes keywords like `search for`, `amazon`, `find on`, `locate link`, immediately returns `action: 'search_and_extract'`, `value: <SearchQuery>`.
  - **Input Verification Intent**: If `run.goal` includes keywords like `input box`, `verify field`, `ask order`, immediately returns `action: 'verify_inputs'`.
  - **Popup Credential Collection Intent**: If `run.goal` includes keywords like `personal details`, `credentials`, `login details`, immediately returns `action: 'popup_input'`.
- Updates `systemPrompt` with explicit priority rules so LLM completions also select these native actions when appropriate.

---

### Component 2: Action Executor Output Formatting & Response Handling

#### [MODIFY] [action-executor.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/action-executor.js)
- Enhances execution result reporting for `native_app` actions (PowerPoint file generation paths, Calculator results, VS Code project location, terminal execution logs) so they are reported directly to the user and Firebase monitor stream in real time.

---

## Verification Plan

### Automated Tests
- Run updated test script `scratch/test_pilot_capabilities.js` to verify:
  1. Goal: *"Create a PowerPoint presentation about AI"* -> Triggers PPT generation automatically.
  2. Goal: *"Calculate 250 * 15"* -> Opens Calculator & evaluates `3750` automatically.
  3. Goal: *"Write a Node.js program in VS Code"* -> Minimizes windows, creates project in `Documents`, opens VS Code, and executes in terminal automatically.
  4. Goal: *"Search Amazon for iPhone and extract link"* -> Triggers web search and extracts product links automatically.

### Manual Verification
- Test interactive Pilot requests via CLI or web workspace to confirm immediate native execution without getting stuck in browser loading loops.
