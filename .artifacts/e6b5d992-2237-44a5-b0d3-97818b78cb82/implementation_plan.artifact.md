# Implementation Plan - Live Screen Visual Analysis & Extended Pilot Request Monitor

Extend the existing Codez48 Pilot Request Monitor (`public/pilot-request-monitor.html`) and backend (`netlify/functions/pilot-request-monitor.js`) to support **Live Screen Visual Analysis** and real-time tracking of visual requests, screenshots, OCR, element bounding boxes, coordinate mapping, mouse actions, and verification status.

## Proposed Changes

### 1. Backend Extension (`netlify/functions/pilot-request-monitor.js`)
- Support `visual_analysis_requests` Firestore collection alongside existing pilot requests.
- Handle storing/fetching visual analysis requests and responses containing screenshot URLs, OCR text count, detected elements, bounding boxes, and clickable coordinates.

### 2. Frontend Monitor Extension (`public/pilot-request-monitor.html`)
- Add a new **LIVE SCREEN VISUAL ANALYSIS** dashboard section.
- Display Visual Request ID, Screenshot Status, Screenshot Preview with visual bounding boxes overlay, Analysis Status, Detected Elements Count, OCR Text Count, Target Element, Target Bounding Box, Clickable X/Y, Confidence, Coordinate Mapping, Mouse Action, Verification Status, and Last Updated.

### 3. Local CLI Visual Analysis & Storage Pipeline (`C:/Users/suriya prakash/OneDrive/Desktop/codez48cli`)
- Integrate screenshot capture, Firebase Storage upload, Firestore metadata logging, and visual response polling into Codez48 CLI / Pilot.

---

## Verification Plan

### Automated Tests
1. Verify Netlify function returns visual analysis requests.
2. Verify local CLI script successfully captures screenshot, uploads metadata, receives visual analysis response, performs coordinate mapping, and moves cursor.
3. Verify monitor page renders live visual telemetry and screenshot overlays in real-time.
