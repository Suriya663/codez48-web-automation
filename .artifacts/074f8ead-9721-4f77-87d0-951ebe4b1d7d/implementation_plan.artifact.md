# Codez48 CLI Stability & Advanced Capabilities Plan

Resolving critical connectivity, preview, and application control issues while perfecting local workspace integration.

## User Review Required

> [!IMPORTANT]
> **Realtime Backend**: I am moving the WebSocket endpoint to the **root path (/)** on the Railway server. This eliminates the common 404 routing errors seen with specific paths like `/ws`.
> **Preview IDs**: I will use a regex-based extraction from the full URL path to ensure the Project ID is never missed, even with complex Netlify rewrites.

## Proposed Changes

### Phase 1: Realtime Connectivity (Chat & File Share)
- **Backend (`server.js` & `realtime-server.js`)**:
    - Remove the `/ws` path restriction.
    - Use standard `WebSocket.Server({ server })` for maximum proxy compatibility.
- **CLI (`cli.js`)**:
    - Connect to the root URL (e.g., `wss://codez48-worker.up.railway.app`).
    - Add a pre-flight connectivity check.

### Phase 2: Website Preview Fix
- **Backend (`preview-website.js`)**:
    - Update extraction logic to handle `/preview/ID` and `/preview/ID/` formats using a robust regex.
    - Fallback to query parameters if the path extraction fails.

### Phase 3: AI Generated Project Storage + VS Code
- **CLI (`cli.js`)**:
    - Resolve `C:\Users\...\OneDrive\Desktop\Codez48 Preview` dynamically.
    - Set `activeProjectPath` as an absolute path during project creation.
    - Command `code "PATH"` will be used to open the specific project folder.

### Phase 4: Modern App Control
- **CLI (`cli.js`)**:
    - Fix Windows `start` commands to use `start "" "target"` for safe handling of protocols and spaces.
    - Enhance the app map for Clock, WhatsApp, etc.

### Phase 5: Local Discovery & Safety
- **CLI (`cli.js`)**:
    - Finalize `codez48 find` with recursive local search.
    - Implement heuristic safety checks (double extensions, etc.).

---

## Verification Plan

### Manual Verification
1.  **Chat**: Run `node cli.js chat`. Verify connection to `wss://...` (no path). Confirm two-way messaging.
2.  **Preview**: Generate a site. Open the link in a browser. Verify rendering.
3.  **VS Code**: Generate a project. Verify it is saved in `Codez48 Preview`. Say "Open in VS Code" and verify the folder opens in the editor.
4.  **App Control**: Test `codez48 open clock` and `codez48 open whatsapp`.
