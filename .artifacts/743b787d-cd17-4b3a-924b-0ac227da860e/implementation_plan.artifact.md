# Implementation Plan: Puppeteer/Playwright CLI Automation Image & DOM Transmission to Firebase

This implementation plan resolves the issue where automated runs from the command line (via Puppeteer/Playwright) need to flawlessly transmit screenshot images (`screenshotData`), user query text (`goal`), HTML (`activePage.content()`), and DOM content (`domContent`) to Firebase Firestore (`visual_analysis_requests` and `automations`), ensuring the request-response cycle and image retrieval work reliably.

## User Review Required

> [!IMPORTANT]
> - **Puppeteer/Playwright Worker Firebase Sync**: Updating `runAgentLoop` in `playwright-worker/server.js` and `realtimeServer.emitRunEvent` in `playwright-worker/realtime-server.js` to capture live screenshots, full HTML/DOM content (`activePage.content()`), and user query text (`goal`), and persist them directly into Firebase Firestore (`visual_analysis_requests` and `automations/{runId}`) on every inspection step.

## Open Questions

- None.

## Proposed Changes

### Playwright Worker & Realtime Server

#### [MODIFY] [server.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/server.js)
- In `runAgentLoop`, capture live screenshot base64 (`image`), full HTML/DOM content (`domContent = await activePage.content()`), and user query text (`run.goal`).
- Write these explicitly to Firebase Firestore (`visual_analysis_requests` and `automations`) so remote monitors retrieve them instantly.

#### [MODIFY] [realtime-server.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/realtime-server.js)
- Ensure `emitRunEvent` persists `screenshotData`, `domContent`, and `goal` to Firestore `automations/{runId}` cleanly.

## Verification Plan

### Automated Tests
- Static verification.

### Manual Verification
- Run test simulation script and verify Firestore write payload structure for screenshot + DOM + query text.
