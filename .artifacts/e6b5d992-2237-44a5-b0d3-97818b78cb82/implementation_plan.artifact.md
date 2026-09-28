# Implementation Plan - Continuous Closed-Loop Cursor Feedback System

Implement a closed-loop feedback mechanism for the local knowledgeable cursor in Codez48 Pilot, continuously tracking cursor telemetry (`cursorScreenX`, `cursorScreenY`, `targetScreenX`, `targetScreenY`, `deltaX`, `deltaY`, `distance`), checking if the target moved during movement, and performing local closed-loop correction before final click and verification.

## Proposed Changes

### 1. GUI Driver Cursor Telemetry & Closed-Loop Correction (`src/pilot/drivers/gui-driver.js`)
- Add `getCursorPos()` using User32 `GetCursorPos` via koffi or PowerShell to read real Windows cursor position.
- Implement `moveCursorSmoothlyWithFeedback(targetX, targetY, onTelemetry)`:
  - Continuously samples current cursor position (`cursorScreenX`, `cursorScreenY`).
  - Calculates `deltaX = targetX - cursorX`, `deltaY = targetY - cursorY`, `distance = sqrt(dx*dx + dy*dy)`.
  - Emits telemetry logs (`[CURSOR] x=..., y=..., target=..., distance=... px`).
  - Iteratively glides the mouse in steps, re-evaluating target position if layout shifts occur.

### 2. Action Executor Continuous Feedback Loop (`src/pilot/browser/action-executor.js`)
- Integrate the closed-loop cursor movement function into `CLICK_ELEMENT`, `TYPE_TEXT`, and `SELECT_TEXT` actions.
- Perform pre-action hit-test and post-action arrival verification.

---

## Verification Plan

### Automated Tests
- Run `node cli.js pilot "Open Codez48 and click CLI from the top navigation."`
- Verify closed-loop cursor telemetry logs appear showing real-time `deltaX`, `deltaY`, and `distance` decrementing to arrival tolerance.
