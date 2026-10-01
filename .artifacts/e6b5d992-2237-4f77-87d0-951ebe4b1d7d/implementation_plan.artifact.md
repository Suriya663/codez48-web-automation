# Implementation Plan - Suppressing Mixed Content & Connection Refused Console Errors

Fixing the persistent `ERR_CONNECTION_REFUSED` and `CORS` red error blocks flooding the browser console inside the dashboard monitor.

## Proposed Changes
- Previously, the `pilot-request-monitor.html` Javascript code contained a direct `try { fetch('http://localhost:4848/latest') } catch()` block. Even though the Javascript caught the error safely, Google Chrome still aggressively prints red error traces to the developer console whenever a cross-origin or local network connection gets refused.
- To silence this completely, we have completely eradicated the `localhost:4848` network fetch out of the frontend HTML client.
- All traffic is now exclusively piped cleanly through the unified `/.netlify/functions/pilot-request-monitor` route. Because the user accesses the page via `monitor.js` (`http://localhost:4849`), the Node.js backend performs the proxy redirect silently behind the scenes.
- **Result**: Zero console error red text in the browser.

---

## Verification Plan
1. Restart the CLI monitor script (`node monitor.js`) and refresh the web dashboard.
2. Confirm no `net::ERR_CONNECTION_REFUSED` errors pop up in the developer console.