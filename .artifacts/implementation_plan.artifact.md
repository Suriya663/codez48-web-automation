# Implementation Plan: Tab Navigation Loop & Resolved Live-DOM Target Architecture

This implementation plan establishes first-class Tab/keyboard navigation, verified focus tracking (`document.activeElement`), resolved live-DOM target propagation from resolver to executor, and strict stale-target invalidation.

## User Review Required

> [!IMPORTANT]
> - **Resolved Target Propagation**: Resolver passes the resolved Playwright locator and `groundedPayload` directly to the Action Executor, avoiding redundant or stale re-resolutions.
> - **Verified Tab Navigation Loop**: `action: 'tab'` and `action: 'shift-tab'` step through Tab focus, inspect `document.activeElement` (`tagName`, `id`, `role`, `text`, `rect`), capture fresh state, and log `[KEYBOARD FOCUS VERIFIED]: PASS`.
> - **Pre-Action Revalidation**: Re-check element presence and bounding rect in live DOM prior to mouse click/type. If URL or DOM shifted, invalidate and re-resolve.

## Proposed Changes

### Playwright Worker & Execution Engine

#### [MODIFY] [action-executor.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/action-executor.js)
- Accept pre-resolved locator/grounded target when available in `actionPlan`.
- Re-check target validity against live DOM before executing actions.
- Enhance `tab` and `shift-tab` execution to query `document.activeElement`, log `[FOCUS OBSERVATION]`, and verify focus arrival (`[KEYBOARD FOCUS VERIFIED]: PASS`).
- Support keyboard shortcuts (`enter`, `space`, `escape`, `arrow-down`, `arrow-up`, `ctrl-a`).

#### [MODIFY] [server.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/server.js)
- Attach `resolvedTarget` directly to `actionPlan` for `actionExecutor.executeAction`.

## Verification Plan

### Automated Tests
- Run updated acceptance test harness (`node .artifacts/743b787d-cd17-4b3a-924b-0ac227da860e/scratch/test_comprehensive_capabilities.js` and `test_youtube_acceptance.js`).
- Confirm logs display:
  - `[FOCUS OBSERVATION] activeElement: ...`
  - `[KEYBOARD FOCUS VERIFIED]: PASS`
  - `[GROUNDED TARGET IDENTITY]`: Rich DOM target identity preserved
  - `[CURSOR POSITION VERIFIED]: PASS`
