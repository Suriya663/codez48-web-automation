# Implementation Plan: Fix Firebase Screenshot Rendering & Full OCR + DOM Grounding Workflow in `public/pilot-request-monitor.html`

This implementation plan addresses the exact user requirements:
1. Fix Firebase screenshot image rendering (ensuring `img.src` assignment and `onload` handlers correctly process base64 data URLs without getting blocked by browser cache or completion state).
2. Implement robust OCR text reading from screenshot images via Tesseract.js.
3. Transmit both the screenshot image and the full DOM content (`domContent`) in requests sent to Firebase/Netlify functions.
4. Implement intelligent concept/target grounding ("It is located here"), scroll-to-locate scanning for off-screen items, and precise click/event action execution.

## User Review Required

> [!IMPORTANT]
> - **Firebase Image Loading**: Fixing image assignment order and `onload` handling to guarantee screenshots from Firebase appear instantly.
> - **OCR & DOM Workflow**: Ensuring complete request payloads include both screenshot image and DOM tree data.

## Open Questions

- None.

## Proposed Changes

### Pilot Request Monitor HTML

#### [MODIFY] [pilot-request-monitor.html](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/public/pilot-request-monitor.html)
- Update `processActiveRequest()` to correctly handle image loading state, base64 MIME prefixes, and `onload`/`onerror` handlers.
- Update `triggerInitialScreenCapture()` and `sendCursorRequest()` to robustly capture and transmit both `screenshotData` and `domContent`.
- Refine OCR text extraction and DOM grounding loop with scroll-to-locate fallback and precise action execution.

## Verification Plan

### Automated Tests
- Static inspection of HTML/JS logic.

### Manual Verification
- Open `public/pilot-request-monitor.html` in browser, verify image rendering, OCR text reading, DOM transmission, and telemetry updates.
