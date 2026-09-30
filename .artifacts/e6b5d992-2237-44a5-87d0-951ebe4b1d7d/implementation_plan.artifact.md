# Implementation Plan - Real-Time Core Flow Hardening & Bounding Box Overlay Integration

Hardening the core real-time pipeline: `Real Windows Screenshot → Complete PNG Base64 Payload → Firebase/Firestore → Live Request Monitor → Actual Screenshot Preview with Bounding Box Overlay → OCR/UI Element Detection → Coordinate Mapping → Local CLI Response → Real Windows Cursor Movement → Fresh Screenshot Verification`.

## Proposed Changes

### 1. Request Monitor UI Overlay (`public/pilot-request-monitor.html`)
- Enhance the preview box to render the actual screenshot image (`<img src="${vr.screenshotData}" ... />`) alongside an HTML canvas / absolute overlay layer rendering bounding boxes for detected OCR text and UI elements with labels, confidence scores, and target markers.
- Display complete lifecycle status progression (`PENDING → RECEIVED → ANALYZING → ANALYZED → RESPONSE_READY → ACTION_STARTED → ACTION_COMPLETED → VERIFYING → COMPLETED`).

### 2. Netlify Function & Firestore Schema (`netlify/functions/pilot-request-monitor.js`)
- Ensure full propagation of `screenshotData`, `ocr`, `elements`, `targetElement`, `status`, and telemetry timestamps.

### 3. End-to-End Real-Time Pipeline Test (`tests/core_flow_test.js`)
- Implements and executes the complete core flow acceptance test verifying live screenshot transmission, monitor preview display, OCR, coordinate mapping, and physical cursor movement.

---

## Verification Plan

### Automated Tests
1. Run `node tests/core_flow_test.js` to verify end-to-end real-time core flow execution.
