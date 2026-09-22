# Codez48 Pilot Advanced Application Automation & Fallback Plan

Expanding `codez48 pilot` to support web fallbacks (e.g. WhatsApp Web), Notepad file save/location automation, winget app/game installation helper (with `Y/n` user approval), and A-to-Z app discovery.

## Architecture Overview

```text
User Goal ("Open WhatsApp and type hello" OR "Write notes in Notepad and save to Desktop")
        │
        ▼
1. Capability & App Discovery (app-discovery.js)
        │
        ├── Native App Installed?
        │     ├── YES: Launch native app (ms-clock:, whatsapp:, notepad.exe, etc.)
        │     └── NO : Fall back to Web App URL (https://web.whatsapp.com, https://microsoft.com)
        │
2. Notepad & Editor File Automation
        │     ├── Type text into active window
        │     ├── Trigger Save As (Ctrl+S / Alt+F, S)
        │     ├── Navigate & save to exact requested location (e.g., Desktop/notes.txt)
        │     └── Verify target file exists on disk
        │
3. Application & Game Installation Helper
        │     ├── Check winget / ms-windows-store:
        │     ├── Request user approval: "Install <package> via winget? (Y/n)"
        │     └── Execute installer after Y approval
```

## User Review Required

> [!IMPORTANT]
> **Web Fallback Behavior**: If a requested application (like WhatsApp or Teams) is not installed natively on Windows, Pilot will automatically launch its web version in your browser (`https://web.whatsapp.com`) so your workflow continues uninterrupted.
> **Package / Game Installation Approval**: If you ask Pilot to install an app or game, it will check `winget`, display the package name, and require explicit `(Y/n)` approval before downloading or installing anything.

---

## Proposed Changes

### 1. App Discovery & Web Fallback Map
#### [MODIFY] [app-discovery.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/app-discovery.js)
- Add web fallback URLs for WhatsApp (`https://web.whatsapp.com`), Microsoft (`https://microsoft.com`), Teams (`https://teams.microsoft.com`), Spotify (`https://open.spotify.com`), Discord (`https://discord.com/app`), Zoom (`https://zoom.us`), etc.
- Add installer package lookup via `winget`.

### 2. File Save & Menu Automation Adapter
#### [NEW] [notepad-adapter.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/adapters/notepad-adapter.js)
- Handles Notepad text creation, typing, triggering `Ctrl+S`, typing target file path (`Desktop/notes.txt`), saving, and verifying file existence.

### 3. Application / Game Installer Helper
#### [NEW] [installer-helper.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/installer-helper.js)
- Searches `winget search <app>` on Windows.
- Prompts user: `Install package '<app>' using winget? (Y/n):`
- Executes `winget install <app>` only after `Y` approval.

### 4. Pilot Controller Integration
#### [MODIFY] [pilot-controller.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/pilot-controller.js)
- Integrates web fallback routing, Notepad file save automation, and installer prompts into `codez48 pilot`.

---

## Verification Plan

### Test Scenarios
1. **App Web Fallback Test**:
   - Prompt: `"Open WhatsApp"`
   - Verification: If native app found -> launches native app; else opens `https://web.whatsapp.com` in default browser.
2. **Notepad Type & Save Test**:
   - Prompt: *"Open Notepad, type 'Codez48 Pilot Notes Test', and save it as 'pilot_notes.txt' on my Desktop."*
   - Verification: Launches Notepad, types text, triggers save, verifies `pilot_notes.txt` exists on Desktop.
3. **App Installation Prompt Test**:
   - Prompt: *"Install Spotify"*
   - Verification: Prompts `Install Spotify using winget? (Y/n):` before attempting execution.
