# Implementation Plan - Local Telemetry Server for Monitor Dashboard

Since the Firebase Read Quota is occasionally exceeded (causing a 500/Quota error when the frontend polls Firebase), the Monitor HTML falls back to the placeholder image. We will implement a tiny, ultra-fast **Local Telemetry Server** directly inside the CLI.

## Proposed Changes

### 1. Local HTTP Telemetry Server (`src/pilot/browser/visual-request-manager.js`)
- Start a lightweight HTTP server on port `4848` when the CLI runs.
- Store the latest screenshot and DOM element data in memory.
- Provide a GET `/latest` endpoint serving the real-time payload locally with CORS headers.

### 2. Frontend Local Polling Fallback (`public/pilot-request-monitor.html`)
- Update the web monitor to try fetching from `http://localhost:4848/latest` first. If the local server is running (which it will be when the CLI runs), it instantly grabs the massive 3MB screenshots locally—zero quota limits, zero payload limits, and instant rendering.

---

## Verification Plan
1. Send a request to the local server via browser.
2. Verify the `pilot-request-monitor.html` seamlessly connects to `localhost:4848` and displays the real screenshot instead of the placeholder.