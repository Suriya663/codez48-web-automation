# Implementation Plan: Ultra-Reliable Multi-Signal Visual + DOM + OCR Grounding Engine

This implementation plan establishes maximum reliability for Codez48 Pilot's screen understanding, OCR ↔ DOM ↔ HTML spatial correlation, rich target contract emission, live monitor visual target highlighting, verified keyboard navigation, and fresh state post-action verification.

## User Review Required

> [!IMPORTANT]
> - **Spatial Correlation (OCR ↔ DOM ↔ HTML)**: Correlate OCR bounding boxes (`x`, `y`, `width`, `height`) with live DOM `getBoundingClientRect()` to compute spatial overlap and confidence scores before action execution.
> - **Rich Grounded Contract Emission**: Output structured target contracts (`targetFound`, `targetText`, `targetType`, `action`, `confidence`, `reason`, `targetIdentity` including `elementId`, `tagName`, `role`, `text`, `domReference`, `htmlSnippet`, `viewportX`, `viewportY`, `rect`).
> - **Live Monitor Target Highlighting**: Render prominent target bounding box overlays and target identity badges (`TARGET FOUND: [Text] | TYPE: [Type]`) in `public/pilot-request-monitor.html`.
> - **Keyboard Navigation & Active Element Tracking**: Support Tab/Shift+Tab iteration with `document.activeElement` focus verification prior to executing Enter/Space actions.
> - **Pre-Action Target Revalidation & Cursor Verification**: Confirm element visibility and position in live browser state before moving real cursor (`[CURSOR POSITION VERIFIED]: PASS`).

## Proposed Changes

### Playwright Worker & Telemetry Engine

#### [MODIFY] [locator-resolver.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/locator-resolver.js)
- Enhance `buildGroundedPayload` to calculate spatial overlap between OCR visual bounding boxes and DOM bounding rects.
- Compute confidence score and emit structured `targetIdentity` contracts.

#### [MODIFY] [action-executor.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/action-executor.js)
- Enforce pre-action target revalidation, physical cursor movement, and `[CURSOR POSITION VERIFIED]: PASS` verification.
- Support verified keyboard navigation (Tab/Shift+Tab tracking `document.activeElement`).

#### [MODIFY] [public/pilot-request-monitor.html](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/public/pilot-request-monitor.html)
- Add target overlay rendering for grounded target contracts (`targetIdentity.rect`), displaying prominent bounding box highlights and target metadata badges on live stream frames.

## Verification Plan

### Automated Tests
- Execute real-world CLI acceptance test (`node .artifacts/743b787d-cd17-4b3a-924b-0ac227da860e/scratch/test_youtube_acceptance.js`).
- Confirm console logs verify:
  - `[GROUNDED TARGET IDENTITY]`: Structured JSON with spatial correlation & HTML snippet
  - `[CURSOR POSITION VERIFIED]: PASS`: Real cursor arrival confirmed
  - `[FRESH STATE VERIFIED]: PASS`: State transition confirmed post-action.
