# Implementation Plan - Task-Aware Verification Routing & Desktop Verification Engine

Build a task-aware verification routing system that distinguishes between browser automation tasks (requiring DOM/URL path transition verification via `ActionVerifier`) and Windows desktop application tasks (requiring desktop state verification such as `APPLICATION_LAUNCHED`, `WINDOW_VISIBLE`, `WINDOW_ACTIVE`, `APPLICATION_READY`, `TARGET_VISIBLE`, `ACTION_COMPLETED`, `EXPECTED_UI_STATE`, `FINAL_RESULT_VERIFIED` via `InteractionVerifier` and visual desktop screen analysis).

## Proposed Changes

### 1. Unified Task-Aware Verifier (`src/pilot/browser/unified-verifier.js`)
- Inspects task type and application context (Browser vs Windows Desktop Apps like Notepad, Calculator).
- Routes browser tasks to browser state differential verifier (`ActionVerifier`).
- Routes Windows desktop tasks to desktop verification engine (`InteractionVerifier` + desktop screenshot analysis verifying process/window visibility and activity).
- Provides rich diagnostics: Task Type, Application, Verification Strategy, Expected State, Observed State, Verification Evidence, Confidence, Verification Result.

### 2. Integration with Pilot Controller & Workflows
- Connect `pilot-controller.js`, `autonomous-task-executor.js`, and workflow executors to use the unified verifier.

### 3. Comprehensive Test Suite (`tests/verification_routing_test.js`)
- Implements Tests A through E for verification routing:
  - Test A: "Open Notepad" → Desktop verification strategy.
  - Test B: "Open Calculator" → Desktop verification strategy.
  - Test C: Open Notepad and type "Hello World" → Desktop visual/state verification.
  - Test D: Real browser task → Browser verification.
  - Test E: Unknown application/task → Safe fallback / UNVERIFIED.
- Runs all Stage 2–11 regressions.

---

## Verification Plan

### Automated Tests
1. Run `node tests/verification_routing_test.js` to execute verification routing tests and regressions.
