# Codez48 Pilot Final Implementation Plan

A comprehensive, evidence-based plan to execute the final architecture review specifications for Codez48 Pilot, ensuring a single authoritative engine, persistent non-blocking HUD, fail-closed live geometry, knowledgeable cursor movement, and rigorous verification.

## Phase 0: Runtime Path Truth Tracing (Read-Only Inspection)
- Trace the exact real user runtime path:
  - CLI entry point (`cli.js`)
  - Global link / npm bin shim resolution (`codez48`)
  - Command routing (`pilot`)
  - Module loading, working directory resolution, and environment loading.
- Compare against agent test execution paths to identify any discrepancies.

## Phase 1: Persistent Native HUD Service
- Verify HUD lifecycle across browser startup, navigation, and task completion.
- Ensure state-driven protocol (`seq`, `phase`, `detail`) with renderer-side timing (minimum dwell, terminal holds, fade).
- Enforce Win32 `WS_EX_NOACTIVATE | WS_EX_TOPMOST | WS_EX_TOOLWINDOW | WS_EX_LAYERED | WS_EX_TRANSPARENT`.

## Phase 2: Original Goal Preservation & AI Loop
- Maintain immutable `ORIGINAL_USER_GOAL` throughout the session.
- Implement bounded Observe -> Think -> Act -> Verify -> Re-observe loop with budgets, stall detection, and retry guards.
- Integrate schema-validated JSON responses from Codez48 backend (`cli-ai-chat`).

## Phase 3: Browser Eyes & Structured Observation
- Utilize Playwright + CDP to capture live DOM accessibility tree and layout rectangles.
- Build candidate table with stable IDs (`e12`), filtering visible/enabled elements.
- Sanitize all page-derived text (length caps, control character strip, no secrets).

## Phase 4: Fail-Closed Geometry & Coordinate Conversion
- Strip all default/fallback coordinates (`|| 550`, `|| 320`).
- Implement typed coordinate spaces (`coords.js`).
- Enforce Per-Monitor-V2 DPI awareness and Win32 render widget origin discovery.
- Enforce hit-test gate (`elementFromPoint`) and cursor arrival verification.

## Phase 5: Knowledgeable Cursor & Physical Action Verification
- Smooth, distance-based mouse movement using `gui-driver.js`.
- Physical actions (click, drag-select, copy, scroll, type) with local post-action verification (`window.getSelection()`, clipboard read-back, DOM focus and value verification).

## Phase 6: Security & Policy Guardrails
- Data-channel separation for untrusted page content.
- Task-scoped execution allowlists.
- Native confirmation dialog for consequential actions.
- Handoff detection for CAPTCHA/MFA/OTP/UAC.

## Phase 7: Milestone Test Execution (Tests A through H)
- Test A/B: CLI navigation click (`codez48 pilot "Open Codez48 and click CLI from the top navigation."`).
- Test C-H: Cursor targeting, exact text selection, copy verification, target-aware scroll, safe input, and second website generalization.
