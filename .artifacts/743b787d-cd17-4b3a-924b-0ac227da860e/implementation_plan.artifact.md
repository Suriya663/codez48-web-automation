# Implementation Plan: Remote Global Pilot Flow via Firebase & Netlify (Removing Localhost Dependencies)

This implementation plan refines the existing Codez48 Pilot automation flow to remove any reliance on local HTTP servers (such as `localhost:4848` or local ports) for Pilot data exchange. All communication (screenshots, DOM/HTML state, user requirements, AI analysis requests, AI responses, and verification steps) will flow strictly through the existing Netlify functions and Firebase Firestore architecture.

## User Review Required

> [!IMPORTANT]
> - **Removal of Localhost/Port 4848 Dependencies**: Ensure that `public/pilot-request-monitor.html` and CLI automation scripts communicate exclusively via Netlify serverless functions (`/.netlify/functions/...`) and Firebase Firestore rather than attempting local HTTP connections.
> - **End-to-End Remote Pilot Flow**:
  1. Real Browser captures Screenshot + DOM + User Requirement.
  2. Data is synced to Firebase Firestore / Netlify Backend.
  3. Existing AI analyzes OCR/Screenshot, User Requirement, and live DOM.
  4. Returns identified target element or navigation action (e.g. "Get Started" / scroll) via Firebase.
  5. CLI executes action in the real browser, captures fresh state, and syncs back to Firebase for verification.

## Open Questions

- None.

## Proposed Changes

### Pilot Monitor & Automation Architecture

#### [MODIFY] [pilot-request-monitor.html](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/public/pilot-request-monitor.html)
- Remove any references to local port 4848 or local fallback servers.
- Route all telemetry fetch and POST requests directly to Netlify functions (`/.netlify/functions/pilot-request-monitor`) backed by Firebase Firestore.

#### [MODIFY] [cli-automation-manager.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/netlify/functions/cli-automation-manager.js)
- Ensure `VISUAL_VERIFY` and automation actions communicate reliably with Firebase Firestore for remote global coordination.

## Verification Plan

### Automated Tests
- Static inspection and build checks.

### Manual Verification
- Verify that `public/pilot-request-monitor.html` and Netlify backend functions exchange screenshot + DOM + requirement telemetry globally through Firebase without any local server dependencies.
