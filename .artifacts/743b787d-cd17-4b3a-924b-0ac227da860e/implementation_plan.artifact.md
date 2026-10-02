# Implementation Plan: Robust JSON Parsing & Desktop Screenshot Capture Error Fix

This implementation plan addresses the `[DESKTOP SCREEN CAPTURE ERROR] Failed to parse desktop screen capture JSON output or file missing` issue by adding bulletproof `try...catch` JSON body parsing in Netlify serverless functions (`cli-automation-manager.js`, `pilot-request-monitor.js`) and ensuring screenshot base64 payloads are accepted and handled without parsing crashes.

## User Review Required

> [!IMPORTANT]
> - **Robust Body Parsing**: Wrapping `JSON.parse(event.body)` in `try...catch` blocks across Netlify functions to gracefully handle any raw or malformed desktop screen capture payloads.

## Open Questions

- None.

## Proposed Changes

### Netlify Functions

#### [MODIFY] [cli-automation-manager.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/netlify/functions/cli-automation-manager.js)
- Add safe `try...catch` body parsing so screenshot payloads and DOM content never trigger JSON parse crashes.

#### [MODIFY] [pilot-request-monitor.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/netlify/functions/pilot-request-monitor.js)
- Ensure safe `try...catch` body parsing for POST telemetry requests.

## Verification Plan

### Automated Tests
- Static inspection of Netlify functions.

### Manual Verification
- Test POST requests with screenshot data payloads to ensure clean parsing and Firebase recording.
