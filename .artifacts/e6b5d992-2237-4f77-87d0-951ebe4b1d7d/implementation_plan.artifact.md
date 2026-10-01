# Implementation Plan - Local Dashboard Image Loading Fix

Resolving the Mixed Content and Cross-Origin routing blocks that prevent the Dashboard HTML from downloading the local high-res screenshot stream correctly.

## Proposed Changes

### 1. Unified Telemetry & HTTP Server (`monitor.js`)
- Combine the static HTML serving (port `4849`) and the live screenshot stream (port `4848`) into a single proxy route in `monitor.js`.
- Update `monitor.js` to intelligently proxy any dashboard requests matching `/.netlify/functions/pilot-request-monitor` directly over to `http://localhost:4848/latest`, thereby spoofing the cloud environment and feeding the dashboard the fast local images natively.

---

## Verification Plan
1. Send a request locally to `monitor.js` on port `4849` simulating the dashboard's API fetch to verify the proxy redirects to the image stream.