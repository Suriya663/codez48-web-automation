# Codez48 CLI Stability & Reliability Fix Plan

Resolving critical issues in Chat, File Sharing, Website Previews, and Application Control.

## User Review Required

> [!IMPORTANT]
> **Realtime Backend**: The Chat and File Share features rely on a Railway-hosted service. I will add a `/health` endpoint to verify connectivity.
> **Preview IDs**: I will make the preview extraction more robust to handle different Netlify environment behaviors.
> **App Control**: I will implement a more advanced Windows application resolver that supports UWP (Microsoft Store) apps like Clock and WhatsApp.

## Proposed Changes

### Phase 1: Realtime Connectivity (Chat & File Share)
Fixing the `404` error during WebSocket upgrade.

#### [MODIFY] [server.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/server.js)
- Ensure the `/health` endpoint is properly exposed.
- Add logging for the HTTP upgrade process to debug connection attempts.

#### [MODIFY] [cli.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/cli.js)
- Update `connectToRoom` to include better error reporting.
- Verify and fix the `REALTIME_URL` and WebSocket path construction.

### Phase 2: Website Preview Fix
Resolving the "Missing project ID" error.

#### [MODIFY] [preview-website.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/netlify/functions/preview-website.js)
- Update the ID extraction logic to check `event.path` if query parameters are missing.
- Example: If path is `/preview/web-123`, it will extract `web-123` correctly even if the redirect didn't append `?id=web-123`.

### Phase 3: Application Control Expansion
Enabling the launch of modern Windows apps.

#### [MODIFY] [cli.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/cli.js)
- Refactor `handleOpen` to use a more robust resolution mechanism.
- Add support for `explorer.exe shell:AppsFolder\...` for UWP apps.
- Map friendly names (Clock, WhatsApp) to their internal Windows AUMIDs (App User Model IDs) or protocol handlers.

---

## Verification Plan

### 1. Chat & File Share
- **Test**: Run `node cli.js chat` and `node cli.js share`.
- **Success**: Real-time connection established, messages exchanged between two terminals, and a test file successfully transferred.

### 2. Website Preview
- **Test**: Generate a new website via `codez48 ai` and click the link.
- **Success**: The website renders immediately without the "Missing project ID" error.

### 3. App Control
- **Test**: `codez48 open clock`, `codez48 open whatsapp`, `codez48 open calculator`.
- **Success**: All three applications launch successfully on Windows.
