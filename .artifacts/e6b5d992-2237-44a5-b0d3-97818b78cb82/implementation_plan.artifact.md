# Implementation Plan - Stage 10: AI Task Understanding & Intelligent Workflow Orchestrator

Build the AI Task Understanding & Intelligent Workflow Orchestration layer (`task-understanding-engine.js`, `capability-analyzer.js`, `ai-provider.js`, `intelligent-workflow-orchestrator.js`) that sits above Stage 9, converting natural-language goals into structured intents, entities, constraints, and capability requirements, validating plans, executing them via Stage 9, and providing dynamic replanning, adaptive recovery, and Request Monitor telemetry.

## Proposed Changes

### 1. AI Provider Abstraction (`src/pilot/ai/ai-provider.js`)
- Pluggable AI provider interface with safe deterministic fallback for offline/testing operation.

### 2. Task Understanding Engine (`src/pilot/ai/task-understanding-engine.js`)
- Converts natural-language requests into structured understanding (`intent`, `mode`, `entities`, `constraints`, `requestedOutput`, `ambiguity`, `confidence`).
- Supports CREATE vs EDIT distinction and ambiguity detection (`MULTIPLE_CANDIDATES`, `requiresClarification`).

### 3. Capability Analyzer (`src/pilot/ai/capability-analyzer.js`)
- Analyzes task requirements and determines required application capabilities using Stage 7 metadata.

### 4. Intelligent Workflow Orchestrator (`src/pilot/ai/intelligent-workflow-orchestrator.js`)
- Main Stage 10 orchestrator: Goal → Understand → Capability Analysis → Application Selection → Workflow Generation (Stage 9) → Plan Validation → Execution (Stage 9/8/6) → Adaptive Replanning → Verification.

### 5. Request Monitor Extension (`public/pilot-request-monitor.html`, Netlify function)
- Adds Stage 10 diagnostics (Task ID, original goal, understanding status, intent, mode, extracted entities, constraints, ambiguity status, clarification required, capability requirements, selected application, AI provider / deterministic fallback, workflow ID, workflow status, current step, replanning count, verification status, final result).

### 6. Comprehensive Test Suite (`tests/stage10_test.js`)
- Implements and executes all 34 Stage 10 test cases plus Stage 2–9 regressions.

---

## Verification Plan

### Automated Tests
1. Run `node tests/stage10_test.js` to execute all 34 Stage 10 test cases and regressions.
