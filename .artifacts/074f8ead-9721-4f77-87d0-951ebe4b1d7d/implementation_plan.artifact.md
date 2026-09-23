# Codez48 Pilot Task Session Isolation & Desktop Worker Upgrade Plan

Upgrading `codez48 pilot` with task session isolation, explicit CREATE vs EDIT intent distinction, unique filename auto-incrementing, Calculator live UI automation, VS Code fresh project folder opening, and Netlify deployment stage integration.

## Architecture Overview

```text
User Goal ("Open Notepad and write a story" / "Open Calculator and calculate 4250 * 18")
        │
        ▼
1. Task Session Manager (src/pilot/task-session.js)
        ├── Assigns unique taskId (TASK-XXXX)
        └── Determines Intent Mode: CREATE (Fresh Artifact) vs EDIT (Existing Artifact)
        │
2. Unique Filename Resolver
        └── If story.txt exists during CREATE -> returns story-2.txt
        │
3. Application & Capability Drivers
        ├── Notepad Adapter (Fresh document creation, typing, unique save, disk verification)
        ├── Calculator Adapter (Launches calc, sends keystrokes 4250*18=, verifies 76500)
        ├── VS Code Adapter (Creates fresh project folder, opens code "<activeProjectPath>")
        └── Deployment Helper (Prompts Y/n approval before external Netlify deployment)
```

## User Review Required

> [!IMPORTANT]
> **Task Session & CREATE vs EDIT Intent Rules**:
> - **CREATE Mode**: Triggered by keywords (`create`, `make`, `write a new`, `generate`). Always generates a fresh unique filename (`story.txt`, `story-2.txt`) and fresh document state. Never silently overwrites an existing user file.
> - **EDIT Mode**: Triggered by keywords (`edit`, `modify`, `update`, `continue`, `change`, `append`). Targets the existing active task artifact or user-specified file.

> [!NOTE]
> **Deployment Approval**: External deployments to Netlify require explicit `(y/n)` approval before execution.

---

## Proposed Changes

### 1. Task Session & Intent Isolation
#### [NEW] [task-session.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/task-session.js)
- Manages `taskId`, `mode` (`CREATE` vs `EDIT`), `activeArtifactPath`, and unique filename generation (`story-2.txt`).

### 2. Calculator & Math Automation Adapter
#### [NEW] [calculator-adapter.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/adapters/calculator-adapter.js)
- Handles Calculator launching, window focus, typing calculation keystrokes (`4250*18=`), evaluating math expressions, and reporting verified results.

### 3. Deployment Helper
#### [NEW] [deployment-helper.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/deployment-helper.js)
- Handles Netlify deployment requests with explicit user approval `(y/n)`.

### 4. Adapter & Controller Upgrades
#### [MODIFY] [notepad-adapter.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/adapters/notepad-adapter.js)
- Uses `TaskSession` to resolve fresh unique filenames (`story.txt`, `story-2.txt`) and enforce fresh document state.

#### [MODIFY] [capability-registry.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/capability-registry.js)
- Adds intent detection for `CALCULATOR_MATH` and `DEPLOY_NETLIFY`.

#### [MODIFY] [pilot-controller.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/pilot-controller.js)
- Integrates `TaskSession` and new capability adapters.

---

## Verification Plan

### Test Scenarios
1. **Task Isolation & Unique Filenames Test**:
   - Goal 1: *"Open Notepad and write a story about a robot."* -> Saves `story.txt` on Desktop.
   - Goal 2: *"Write a new story about space exploration."* -> Saves `story-2.txt` on Desktop (`story.txt` remains unchanged).
2. **Calculator Math Automation Test**:
   - Goal: *"Open Calculator and calculate 4250 * 18"* -> Launches Calculator, inputs keystrokes, verifies math result `76500`.
3. **VS Code Fresh Project Test**:
   - Goal: *"Open VS Code and create a JavaScript calculator program"* -> Opens exact child directory `Desktop/Codez48 Preview/js-calculator`.
