# Implementation Plan - Critical Production Fix: Real-Time Visual Observation & Fast Streaming Pipeline

Production-grade hardening of the real-time visual observation, fast screenshot streaming, accurate text/image OCR, coordinate detection, and real cursor control pipeline.

## Identified Root Causes & Proposed Fixes

1. **`net::ERR_INVALID_URL` Base64 Data URI Malformation**:
   - *Issue*: PowerShell base64 output can contain newline/carriage-return characters (`\r\n`) or duplicate `data:image/png;base64,` prefixes, causing browsers to reject data URIs with `net::ERR_INVALID_URL`.
   - *Fix*: Implement robust data URI normalization in `screen-capture.js` and `visual-request-manager.js` that strips all newlines/whitespace and guarantees a single canonical `data:image/png;base64,<cleanBase64>` representation. Validate PNG base64 before transmission and rendering.

2. **Latency Optimization & Fast Continuous Loop**:
   - Streamline the observe → analyze → respond → act → observe loop in `continuous-loop-engine.js` with structured latency metrics (capture, upload, Firebase write, analysis, response, cursor move, total) and zero arbitrary blocking sleeps.

3. **Request Monitor Live Streaming & Bounding Box Overlays**:
   - Ensure `pilot-request-monitor.html` renders live request streams with unique `requestId`s, timestamps, and active visual bounding box overlays.

---

## Verification Plan

### Automated Tests
1. Run a dedicated test script (`tests/production_fix_test.js`) validating canonical base64 normalization, clean data URI rendering, latency measurement, and Stage 2–13 regressions.
