# Codez48 CLI Realtime & Local Capabilities Plan

Extending the Codez48 CLI with AI Coding Agent, Local App Control, Group Chat, and File Sharing.

## 1. Fix: "Missing project ID" Preview Error
- **Root Cause**: Inconsistent parameter names between the redirect rule and the function handler.
- **Fix**: Align `netlify.toml` and `preview-website.js` to use `id` consistently.
- **Verification**: Test URL `https://codez48.netlify.app/preview/abc123` correctly triggers the function with `id=abc123`.

## 2. Feature 1: AI Coding Agent + VS Code
- **Backend (`cli-ai-chat.js`)**:
    - Update system prompt to recognize "Coding Agent" intent.
    - Instruct AI to return a JSON schema for file operations: `create_file`, `update_file`, `delete_file`, `open_vscode`.
- **CLI (`cli.js`)**:
    - Add `localActionHandler` to process AI-requested file operations.
    - Implement safe file writing using `fs.promises.writeFile` within the current working directory.
    - Implement `open_vscode` using `child_process.exec('code .')`.

## 3. Feature 2: Local Application Control
- **CLI (`cli.js`)**:
    - New command: `codez48 open <target>`.
    - Resolution logic for Windows:
        - If `<target>` is a valid URL (`http://` or `https://`), open via `start <url>`.
        - If `<target>` is a known app (`chrome`, `vscode`, `notepad`), resolve to the executable path and launch.
- **AI Integration**: AI can trigger `open_app` or `open_url` actions during chat.

## 4. Feature 3: Real-time Group Chat
- **Railway Backend (`realtime-server.js`)**:
    - Update WebSocket server to handle rooms.
    - New event: `JOIN_ROOM` with a 5-digit room code.
    - New event: `CHAT_MESSAGE` broadcasted to all users in the same room.
- **CLI (`cli.js`)**:
    - New command: `codez48 chat`.
    - Interactive menu to "Create Room" or "Join Room".
    - Continuous loop for sending/receiving messages in real-time.

## 5. Feature 4: Multi-user Room-based File Sharing
- **Railway Backend (`server.js` & `realtime-server.js`)**:
    - **Metadata**: Handle `FILE_OFFER` events in rooms.
    - **Transfer**: Add `POST /api/files/upload` and `GET /api/files/download/:id` endpoints.
    - **Persistence**: Store files temporarily in a `temp_transfers/` directory on the Railway container.
    - **Cleanup**: Auto-delete files after 1 hour.
- **CLI (`cli.js`)**:
    - New command: `codez48 share`.
    - Join/Create room flow (shared with Chat logic).
    - `share <path>` command to upload and broadcast an offer.
    - `y/n` prompt for receivers to download the offered file.
    - Progress bar implementation for uploads/downloads.

---

## User Review Required

> [!IMPORTANT]
> **Filesystem Safety**: The AI Coding Agent will strictly operate within the folder where the CLI is executed. It will NOT be allowed to use absolute paths or escape the current directory (`../`).

> [!CAUTION]
> **Public Previews**: AI-generated websites are public. Avoid generating sites with private data.

## Verification Plan

### Manual Verification
1.  **Fix Check**: Generate a site via `codez48 ai` and verify the preview URL works immediately.
2.  **Coding Agent**: Ask "Create a login page with CSS". Verify `login.html` and `style.css` are created locally.
3.  **App Control**: Run `codez48 open chrome`. Verify Chrome launches.
4.  **Group Chat**: Open two terminals, join room `12345`. Send a message from one and verify it appears in the other.
5.  **File Sharing**: Share a file from one terminal to another in the same room. Verify successful download to the `Downloads` folder.
