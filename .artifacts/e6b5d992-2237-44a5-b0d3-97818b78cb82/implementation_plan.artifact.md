# Implementation Plan - Complete Codez48 Pilot Data Path Verification & Refinement

Verify and fix the complete end-to-end data flow for Codez48 Pilot, ensuring precise state ordering, removal of Enter fallback, physical mouse clicks via `clickPhysicalMouse()`, strong result verification, request type scoping (`browser_automation`), and live Firebase/HTML request monitor telemetry.

## Proposed Changes

### 1. State Ordering & Physical Click (`action-executor.js`, `gui-driver.js`)
- Fix execution order: `[CURSOR] Moving to target...` -> closed-loop movement -> arrival check -> `[CURSOR] Target reached` -> actual-cursor hit test -> `[ACTION] Clicking...` -> physical mouse click (`guiDriver.clickPhysicalMouse()`).
- **Remove** `{ENTER}` hotkey fallback from `CLICK_ELEMENT`.
- Implement strict failure propagation if cursor arrival fails (do not run hit test or click, return task failure).

### 2. Strong Action Verification (`action-verifier.js`)
- Replace weak `Elements Count > 0` checks with specific expected destination/state verification (e.g., expected route/URL or target-specific observable state change).
- Ensure top-level controller returns task failure if goal completion condition is not verified.

### 3. Request Types & Monitor Telemetry (`cli-ai-chat.js`, `pilot-request-monitor.js`, `pilot-request-monitor.html`)
- Enforce explicit `requestType = browser_automation` for browser tasks.
- Ensure monitor page displays real-time request attributes without hardcoded fallback targets.

---

## Verification Plan

### Automated Runtime Tests
- Run `node cli.js pilot "Open Codez48 and click CLI from the top navigation."`
- Verify exact state ordering, physical mouse click execution (no Enter key), actual-cursor hit test, and strong result verification.
