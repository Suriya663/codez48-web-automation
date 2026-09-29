# Implementation Plan - Stage 12: Autonomous Goal Completion & Adaptive Execution Engine

Build the Autonomous Goal Completion & Adaptive Execution layer (`goal-completion-engine.js`, `adaptive-execution-engine.js`, `goal-state-manager.js`, `execution-context-manager.js`, `dynamic-replanner.js`, `recovery-orchestrator.js`, `final-goal-verifier.js`) that unifies Task Understanding (Stage 10), Task Graph / Session / Checkpoints (Stage 11), Visual Intelligence (Stage 6), Application Launch (Stage 7), Interaction Engine (Stage 8), and Task-Aware Verification Routing into a complete, end-to-end goal completion system with adaptive replanning, partial success handling, and final global verification.

## Proposed Changes

### 1. Autonomous Goal Modules (`src/pilot/autonomous/`)
- `goal-state-manager.js`: Manages structured goal state lifecycle (`CREATED`, `UNDERSTANDING`, `PLANNING`, `EXECUTING`, `VERIFYING`, `COMPLETED`, `FAILED`, etc.).
- `execution-context-manager.js`: Manages context survival across multi-app transitions.
- `dynamic-replanner.js`: Handles adapting remaining task graph when UI deviates or unexpected dialogs appear.
- `recovery-orchestrator.js`: Coordinates bounded recovery and checkpoints.
- `final-goal-verifier.js`: Evaluates complete original user goal against observed outcomes, returning structured global verification (`VERIFIED`, `PARTIALLY_VERIFIED`, `UNVERIFIED`, `FAILED`).
- `goal-completion-engine.js` & `adaptive-execution-engine.js`: Main Stage 12 orchestration engine.

### 2. Request Monitor Extension (`public/pilot-request-monitor.html`)
- Adds Stage 12 workflow progress, goal state, step progression, recovery attempts, replanning counts, and final verification diagnostics.

### 3. Comprehensive Test Suite (`tests/stage12_test.js`)
- Implements and executes all 35 Stage 12 test cases plus Stage 2–11 regressions and Verification Routing regression.

---

## Verification Plan

### Automated Tests
1. Run `node tests/stage12_test.js` to execute all 35 Stage 12 test cases, regressions, and acceptance tests.
