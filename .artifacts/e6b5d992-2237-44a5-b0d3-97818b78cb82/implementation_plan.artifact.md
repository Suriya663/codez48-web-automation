# Implementation Plan - Firebase Telemetry Sync Fix (Monitor Display)

Fixing the `pilot-request-monitor.html` issue where the monitor shows only the fallback image. This is caused by the CLI missing the telemetry transmission step in the main execution loop. We will integrate `VisualRequestManager` and `ScreenCapture` back into `BrowserController`.

## Proposed Changes

### 1. Reconnect Screenshot Telemetry (`src/pilot/browser/browser-controller.js`)
- Import `visualRequestManager` and `screenCapture`.
- Before requesting the next AI action, capture the desktop screen.
- Call `visualRequestManager.createVisualRequest` with the actual screenshot base64 and current elements, so the Firebase backend is updated with the real image, breaking out of the local fallback mode in the monitor UI.

---

## Verification Plan
1. Trigger a CLI task.
2. Verify that `visualRequestManager` transmits the base64 screenshot data to Firebase without errors.