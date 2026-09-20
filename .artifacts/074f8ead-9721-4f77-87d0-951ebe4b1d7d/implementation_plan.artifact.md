# Codez48 CLI Documentation & Website Integration Plan

Adding a dedicated "Command Line" section to the Codez48 website to document the official CLI tool and its capabilities.

## 1. Website UI Integration

### [MODIFY] [tools/index.html](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/tools/index.html)
- Add a new **Command Line** card to the "Business Suite" grid.
- Visual: Terminal icon with a "Documentation & Setup" call to action.
- Action: Redirect to `/cli.html`.

### [MODIFY] [index.html](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/index.html)
- Add "Command Line" to the "Tools" dropdown in the main navigation.
- Add "Command Line" to the mobile navigation menu.

## 2. New CLI Documentation Page

### [NEW] [cli.html](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/cli.html)
- **Design**: Premium, clean, minimal UI matching Codez48 theme.
- **Terminal Component**: A visual terminal showing example commands.
- **Sections**:
    - **Requirements**: Node.js v18+.
    - **Installation**: `npm install -g codez48-cli` with a copy button.
    - **Authentication**: `codez48 login` documentation.
    - **Product Management**: `add`, `list`, `update`, `delete` commands.
    - **Advanced Tools**: `automation`, `tracker`, `notifications`, `mail`, `webhook`, `ai-studio`.
    - **Command Reference**: A detailed table of all supported commands and their descriptions.

## 3. Interactive Features
- **Copy Buttons**: Every command block will have a "Copy" button that shows a temporary "Copied" state without using alerts.
- **Responsive Layout**: Optimized for mobile (stacking sections) and desktop (grid-based reference).

---

## User Review Required

> [!IMPORTANT]
> **Source of Truth**: All documented commands are derived directly from `C:\Users\suriya prakash\OneDrive\Desktop\codez48cli\cli.js`.

> [!WARNING]
> **No Secrets**: This page is public documentation. It will never display real API keys, passwords, or tokens.

## Verification Plan

### Manual UI Testing
1.  Verify the "Command Line" card appears in the Tools Hub.
2.  Verify the navigation links in the header and mobile menu.
3.  Test the "Copy" functionality on all command blocks.
4.  Perform responsive checks (simulating mobile viewport).
5.  Verify that all commands match the latest CLI version (1.1.0).
6.  Ensure no secret data is hard-coded in the HTML/JS of the new page.
