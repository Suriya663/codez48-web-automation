# Codez48 Pilot On-Screen Text Area Highlight Overlay & Text Copy Engine Plan

Building a transparent Windows Forms **On-Screen Text Area Visual Highlight Overlay** (`showVisualTextHighlightOverlay(x, y, w, h, label)`) and implementing `COPY_TEXT` / `SELECT_TEXT` actions in Codez48 Pilot (`src/pilot/drivers/gui-driver.js` and `src/pilot/browser/action-executor.js`).

## Architectural Flow

```text
USER WEBPAGE TEXT SELECTION / COPY REQUEST ("Select and copy the Developer Program text on https://codez48.netlify.app/")
                                  │
                                  ▼
1. Web Page DOM & Element Resolution (page-observer.js & element-resolver.js)
   ├── Observes page state and locates target text/heading element (e.g. "Developer Program")
   └── Calculates exact screen coordinates & bounding rectangle (x, y, width, height)
                                  │
                                  ▼
2. On-Screen Visual Text Area Highlight Overlay (gui-driver.js)
   ├── Renders a top-most transparent Windows Forms highlight box directly over target text on screen:
   │   ┌────────────────────────────────────────────────────────┐
   │   │  🟨 YELLOW TRANSLUCENT HIGHLIGHT BOUNDING BOX          │
   │   │  ✨ AI HIGHLIGHTED CONTENT                             │
   │   │  "Developer Program - Earn Commissions on Referrals"   │
   │   └────────────────────────────────────────────────────────┘
   └── Moves native mouse cursor to highlight start position
                                  │
                                  ▼
3. Text Selection & Clipboard Copy Execution (action-executor.js)
   ├── Clicks text start position and selects text (guiDriver.sendHotkey("^c"))
   ├── Copies text content to clipboard & session artifact
   └── Verifies copied text integrity
```

## User Review Required

> [!IMPORTANT]
> **On-Screen Translucent Yellow Bounding Box & Status Box**:
> - Replaces small dark boxes with a **live translucent yellow highlight bounding box** directly around the target website text area on screen.
> - A cyan/black status label box (*"✨ AI HIGHLIGHTED CONTENT: Developer Program"*) showcases the exact question, heading, or copied content clearly on the main website layer.
> - **`COPY_TEXT` / `SELECT_TEXT` Actions**: Automatically reads, highlights, selects, and copies website content when requested.

---

## Proposed Changes

### 1. On-Screen Text Area Visual Highlight Overlay
#### [MODIFY] [gui-driver.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/drivers/gui-driver.js)
- Implements `showVisualTextHighlightOverlay(x, y, width, height, labelText)` drawing a yellow translucent highlight box and cyan status label.

### 2. Action Executor `COPY_TEXT` & `SELECT_TEXT` Support
#### [MODIFY] [action-executor.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/browser/action-executor.js)
- Implements `COPY_TEXT` and `SELECT_TEXT` actions.
- Triggers `showVisualTextHighlightOverlay`, selects text, and copies to clipboard.

---

## Verification Plan

### Test Scenario: Website Text Highlight & Copy Acceptance Test
1. **Command**:
   `codez48 pilot` -> *"Open https://codez48.netlify.app/ and copy the Developer Program heading text"*
2. **Verification Checklist**:
   - [ ] Navigates to `https://codez48.netlify.app/`.
   - [ ] Locates "Developer Program" text.
   - [ ] On-screen yellow highlight box renders directly over the "Developer Program" text on screen.
   - [ ] Text selected and copied (`Ctrl+C`).
   - [ ] Copied text verified and logged in session record (`Desktop/browser_control_session.json`).
