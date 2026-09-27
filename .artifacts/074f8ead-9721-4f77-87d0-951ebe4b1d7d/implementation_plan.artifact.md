# Live Webpage Text Find + Scroll + Real Mouse Drag Selection Plan

Building a real **Physical Windows Mouse Drag Text Selection Engine** (`guiDriver.moveCursorAndDrag(startX, startY, endX, endY)`) that finds target text/phrases on live webpages, purposeful scrolling if off-screen, recalculating fresh bounds, and dragging the physical laptop cursor across the text range to create genuine native browser text selection highlights.

## Architectural Flow

```text
USER PROMPT ("Select the text 'Bring Your Business Online'")
                          │
                          ▼
1. Live Webpage State Observation & Exact Text Matching (page-observer.js & element-resolver.js)
   ├── Searches DOM snapshot for target string/phrase/paragraph
   └── Checks if target text is currently inside viewport bounds
                          │
                          ▼
2. Purposeful Scroll to Off-Screen Text (browser-controller.js)
   ├── If target is below viewport: Focuses content body, sends {PGDN} hotkeys
   └── Re-observes webpage DOM to capture fresh post-scroll element bounds
                          │
                          ▼
3. Text Range Bounds & Screen Coordinate Conversion (element-resolver.js)
   ├── Calculates text start coordinates (startX, startY) and end coordinates (endX, endY)
   └── Converts viewport bounds dynamically to Windows screen coordinates
                          │
                          ▼
4. Smooth Physical Mouse Drag Selection (gui-driver.js)
   ├── Moves physical laptop mouse cursor smoothly to (startX, startY)
   ├── Glides cursor across 15 interpolated drag steps to (endX, endY)
   └── User physically sees native blue/cyan browser text selection highlight on screen
                          │
                          ▼
5. Post-Selection Verification & Optional Copy
   └── Verifies selected text matches prompt and saves output to Desktop/browser_control_session.json
```

## User Review Required

> [!IMPORTANT]
> **Real Native Browser Text Selection**:
> - Replaces static bounding box overlays with **real physical mouse dragging** across character bounds.
> - Moves physical Windows laptop cursor to text start `(startX, startY)` and glides smoothly across the characters to `(endX, endY)`, creating genuine native browser text selection highlights.
> - **Off-Screen Text Discovery**: Purposeful scrolling (`{PGDN}`) brings lower text into view before dragging.

---

## Proposed Changes

### 1. Physical Mouse Drag Selection Method
#### [MODIFY] [gui-driver.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/drivers/gui-driver.js)
- Implements `moveCursorAndDrag(startX, startY, endX, endY, actionText)` performing smooth 15-step cursor dragging.

### 2. Action Executor Text Selection & Range Dragging
#### [MODIFY] [action-executor.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/browser/action-executor.js)
- Updates `SELECT_TEXT` and `SELECT_CONTENT` to compute `startX`, `endX` character bounds and invoke `moveCursorAndDrag`.

---

## Staged Verification Plan

### Test Suite Checklist
- [ ] **Test 1: Single Word Selection**:
  - Command: `codez48 pilot` -> *"Open https://codez48.netlify.app/ and select the text Codez48"*
- [ ] **Test 2: Heading & Sentence Selection**:
  - Command: `codez48 pilot` -> *"Open https://codez48.netlify.app/ and select Bring Your Business Online"*
- [ ] **Test 3: Off-Screen Text Find + Scroll + Select**:
  - Command: `codez48 pilot` -> *"Open https://codez48.netlify.app/, scroll down to Developer Program and select High Commission"*
