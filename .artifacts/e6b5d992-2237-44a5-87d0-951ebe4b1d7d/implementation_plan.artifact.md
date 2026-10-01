# Implementation Plan - Closed-Loop Visual Grounding & DOM Execution Pipeline

Integrating the complete user-requested closed-loop orchestration architecture:
1. **Screenshot Capture & Firebase Telemetry Sync**: Capture screen/HTML, transmit screenshot and metadata to Firebase Request Monitor (`VisualRequestManager`).
2. **OCR + DOM Cross-Checking**: Extract text via local OCR / DOM observation, cross-check against backend structure.
3. **AI Vision & Element Grounding**: Feed screenshot and structured page model to the existing AI model (`AIProvider`) to identify target elements (e.g. "Start" or input boxes).
4. **Iterative DOM Action & Verification Loop**: Execute the action via DOM/CDP, capture fresh state, verify expected state transition, and report back to the CLI.

## Proposed Changes

### 1. Closed-Loop Visual Orchestration Engine (`src/pilot/browser/browser-controller.js` & `visual-request-manager.js`)
- Wire screenshot capture -> Firebase Request Monitor upload -> OCR/DOM Cross-checking -> AI Semantic Resolution -> DOM/CDP execution -> Fresh verification loop.

---

## Verification Plan

### Automated & Runtime Tests
1. Run end-to-end test verifying the closed-loop visual grounding and DOM execution sequence.
