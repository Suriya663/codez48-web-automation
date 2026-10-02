# Implementation Plan: Direct Real-Time Firebase Firestore Integration for `public/pilot-request-monitor.html`

This implementation plan resolves the issue where the web monitor (`public/pilot-request-monitor.html`) remained stuck on the static fallback screen ("Waiting for remote Firebase telemetry...") when Netlify functions were unreachable or not polled correctly. We will integrate direct client-side Firebase Firestore real-time listeners (`onSnapshot`) using `js/firebase-config.js` to receive live screenshots and DOM telemetry the exact moment they are written to Firebase.

## User Review Required

> [!IMPORTANT]
> - **Direct Firebase Real-Time Listener (`onSnapshot`)**: Add direct Firebase SDK initialization and real-time query listeners to `public/pilot-request-monitor.html` for the `visual_analysis_requests` collection. This guarantees that live screenshots sent from the CLI/worker appear instantly in the monitor without relying on serverless function polling.

## Open Questions

- None.

## Proposed Changes

### Pilot Request Monitor HTML

#### [MODIFY] [pilot-request-monitor.html](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/public/pilot-request-monitor.html`)
- Import Firebase SDK and `js/firebase-config.js`.
- Set up real-time `onSnapshot` listener on `visual_analysis_requests` ordered by `createdAt desc`.
- Instantly render incoming screenshot data, run Tesseract OCR, and draw overlays when new telemetry arrives from Firebase.

## Verification Plan

### Automated Tests
- Static verification.

### Manual Verification
- Open `public/pilot-request-monitor.html` in browser, verify that it successfully authenticates anonymously with Firebase and renders incoming live screenshots in real time.
