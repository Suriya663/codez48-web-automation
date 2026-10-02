# Implementation Plan: Post-Website-Visit Screen Understanding, Target Grounding, Interaction, and Verification Flow

This implementation plan outlines the enhancement of the Codez48 Pilot system's post-website-visit execution pipeline. The goal is to establish a robust, autonomous computer-use agent flow combining real screenshots, OCR positional data, live DOM inspection, full HTML structure, and the original user requirement, followed by precise target grounding, physical cursor/keyboard interaction, and real-world state verification.

## User Review Required

> [!IMPORTANT]
> - **No Disruption of Existing Infrastructure**: Browser launch, navigation, Firebase/Netlify communication, and the existing Codez48 AI contract will remain untouched.
> - **Unified Synchronized Observation**: We will package screenshot, OCR positional data, live DOM, full HTML, viewport, scroll position, active element, and user requirement into a synchronized observation object sent to the AI planner.
> - **Physical Cursor & Focus Verification**: Actions will verify cursor coordinates / focus state before execution and verify fresh state transition post-action.

## Proposed Changes

### Playwright Worker & Pilot Automation Engine

#### [MODIFY] [page-inspector.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/page-inspector.js)
- Enhance `inspectPage` to extract:
  - Full HTML (`document.documentElement.outerHTML`)
  - Scroll position (`window.scrollX`, `window.scrollY`)
  - Viewport dimensions (`window.innerWidth`, `window.innerHeight`)
  - Active element info (`document.activeElement`)
  - Bounding rectangles for interactive elements (buttons, inputs, links, cards)
  - Visual text/OCR readiness markers.

#### [MODIFY] [ai-planner.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/ai-planner.js)
- Update `planNextAction` to ingest synchronized observation (Screenshot + OCR + Live DOM + Full HTML + Scroll + Viewport + Active Element + Original Goal).
- Return structured target response including target bounding box, confidence, interaction method (`mouse` or `keyboard`), and reason.

#### [MODIFY] [locator-resolver.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/locator-resolver.js)
- Ground visual elements / OCR text to live DOM elements and precise bounding rectangles.
- Ensure stale target invalidation when scroll position or URL changes.

#### [MODIFY] [action-executor.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/action-executor.js)
- Implement physical cursor movement calculation, accounting for viewport offset and bounding boxes.
- Verify cursor position arrival (`[CURSOR POSITION VERIFIED]: PASS`).
- Support keyboard navigation (`TAB`, `SHIFT+TAB`, `ENTER`, `SPACE`) with active element focus verification.

#### [MODIFY] [action-verifier.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/action-verifier.js)
- Implement rigorous closed-loop verification capturing fresh state (fresh screenshot, fresh OCR, fresh DOM, fresh HTML) and verifying expected browser state transition.

## Verification Plan

### Automated Tests
- Run simulation and CLI pilot test flows (`node .artifacts/743b787d-cd17-4b3a-924b-0ac227da860e/scratch/test_pilot_flow.js` or CLI test execution).
- Verify logs output:
  - `[SCREEN INSPECTION]: Synchronized observation captured`
  - `[OCR & DOM GROUNDING]: Target grounded`
  - `[CURSOR POSITION VERIFIED]: PASS`
  - `[ACTION VERIFIED]: PASS`

### Manual Verification
- Execute `node cli.js pilot "..."` or test run monitor to verify autonomous agent behavior.
