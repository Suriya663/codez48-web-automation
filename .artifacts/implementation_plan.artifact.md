# Implementation Plan: Generic Visual + DOM Content Grounding & Rich Target Identity

This implementation plan outlines the refinement of Codez48 Pilot's content understanding, visual (OCR/screenshot) + DOM + HTML grounding, rich target identity payload construction, monitor highlighting data, and verified CLI cursor/keyboard execution flow.

## User Review Required

> [!IMPORTANT]
> - **Unified Grounding Payload**: Construct structured target identities combining OCR bounding boxes, live DOM attributes (ID, tag, role, text), HTML snippets, and viewport coordinates.
> - **Preserve Original Requirement**: Maintain the user's original requirement throughout the automation lifecycle to guide AI visual understanding and target resolution.
> - **Monitor Visualization & Highlighting**: Expose bounding boxes, OCR regions, and matched DOM elements for live monitoring and debugging.
> - **Stale Target Invalidation**: Invalidate all target references immediately upon scrolling, navigation, or DOM/viewport shifts.

## Proposed Changes

### Playwright Worker & Pilot Engine

#### [MODIFY] [page-inspector.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/page-inspector.js)
- Enhance inspection to extract rich element attributes (`id`, `tagName`, `role`, `innerText`, `outerHTML` snippet, bounding rect `x`, `y`, `width`, `height`, `viewportX`, `viewportY`) for interactive elements.

#### [MODIFY] [locator-resolver.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/locator-resolver.js)
- Implement multi-signal grounding (combining visual OCR hints, DOM attributes, and HTML structure).
- Attach rich target identity metadata (`elementId`, `tagName`, `role`, `text`, `htmlSnippet`, `rect`, `viewportX`, `viewportY`) to resolved targets.

#### [MODIFY] [action-executor.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/action-executor.js)
- Enforce pre-action target revalidation, physical cursor movement, and `[CURSOR POSITION VERIFIED]: PASS` validation.

## Verification Plan

### Automated Tests
- Run acceptance test script (`node .artifacts/743b787d-cd17-4b3a-924b-0ac227da860e/scratch/test_youtube_acceptance.js`).
- Verify console logs show rich target identity grounding and successful post-action verification.
