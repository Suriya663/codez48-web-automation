# Walkthrough - Pilot Request Monitor HTTP 404 & Connection Refused Fix

We have successfully resolved the console errors (`ERR_CONNECTION_REFUSED` and `404 Not Found`) that were plaguing the `pilot-request-monitor.html` UI when viewing the telemetry stream.

## Changes & Fix Details

### 1. Robust API Fallback Mechanisms (`pilot-request-monitor.html`)
- Upgraded `sendCursorRequest` and `triggerInitialScreenCapture` network functions to intelligently try the ultra-fast direct Local Telemetry Server (`http://localhost:4848/latest`) first.
- If the CLI telemetry stream is currently offline or unreachable, the network request gracefully degrades to fallback onto the Firebase/Netlify endpoint (`/.netlify/functions/pilot-request-monitor`) without polluting the browser console with unhandled exceptions.

### 2. Network Proxy Optimization (`monitor.js`)
- The internal API proxy seamlessly translates `/.netlify/functions/pilot-request-monitor` directly into the live high-res image stream to continuously supply the dashboard with fresh frames without hitting remote network quotas.

> [!NOTE]
> The automation monitor will now reliably render and silently recover from connectivity drops. Run `node monitor.js` in a separate terminal and open `http://localhost:4849` to view your CLI stream seamlessly!
