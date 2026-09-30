# Implementation Plan - Real-Time Visual Analysis Pipeline Hardening & Diagnostics

Hardening and end-to-end debugging of the Real-Time Full Windows Screen Capture → Upload → Visual Analysis → OCR/UI Detection → Firestore → Request Monitor pipeline.

## Identified Root Causes & Proposed Fixes

1. **Missing Screenshot Data in Netlify Function GET Response (`netlify/functions/pilot-request-monitor.js`)**:
   - *Issue*: The GET handler omitted `screenshotData` (base64 image payload) when returning `visualRequests` to the Request Monitor frontend, causing screenshot previews to remain empty/black.
   - *Fix*: Include `screenshotData: d.screenshotData || null` in the `visualRequests` response mapping.

2. **Pipeline Telemetry & Structured Diagnostics**:
   - Add structured logging at every boundary (`SCREEN_CAPTURE_CREATED`, `FIREBASE_REQUEST_CREATED`, `FIREBASE_REQUEST_READ`, `MONITOR_REQUEST_RECEIVED`, `SCREENSHOT_RENDERED`, `ANALYSIS_STARTED`, `ANALYSIS_COMPLETED`, `RESPONSE_WRITTEN`, `PILOT_RESPONSE_RECEIVED`, `TARGET_SELECTED`, `CURSOR_MOVE_STARTED`, `CURSOR_MOVE_COMPLETED`, `CLICK_COMPLETED`, `VERIFICATION_STARTED`, `VERIFICATION_COMPLETED`).

3. **Request Monitor UI (`public/pilot-request-monitor.html`)**:
   - Ensure live rendering of `screenshotData` (`<img src="${vr.screenshotData}" ... />`), bounding boxes overlay, OCR counts, element counts, target coordinates, and live status progression without manual refresh.

---

## Verification Plan

### Automated Tests
1. Run a comprehensive end-to-end pipeline verification test script (`tests/realtime_pipeline_test.js`) verifying screen capture, full PNG generation, Firestore transmission, Netlify function ingestion, screenshot preview rendering, OCR/element detection, coordinate mapping, and local cursor action.
