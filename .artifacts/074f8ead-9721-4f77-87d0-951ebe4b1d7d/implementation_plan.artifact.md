# Deep Runtime Inconsistency Fix & Knowledgeable Cursor Integration Plan

Fixing the root cause of element resolution mismatches (ensuring input textboxes never match headings), establishing unique, distinct DOM element bounding box geometry, and securing persistent, non-blocking HUD visibility (`SWP_NOACTIVATE` top-most floating overlay) across all CLI execution paths (`codez48 pilot` and `node cli.js pilot "..."`).

## Architectural Flow

```text
USER COMMAND ("node cli.js pilot '...' " OR "codez48 pilot")
                          │
                          ▼
1. CLI Entry Point Routing (cli.js -> handlePilot)
   └── Directly routes goal prompt to pilotController.processGoal
                          │
                          ▼
2. Non-Blocking Floating HUD Overlay (browser-overlay-layer.js & gui-driver.js)
   ├── Uses PowerShell Win32 SetWindowPos with SWP_NOACTIVATE (0x0010)
   └── Keeps HUD visible above Chrome/Edge without stealing active keyboard/mouse focus
                          │
                          ▼
3. Strict Role & Element Type Resolution (element-resolver.js & page-observer.js)
   ├── Role-first filtering (role: 'textbox' ONLY matches <input> textboxes, NEVER headings)
   └── Every element assigned distinct, unique viewport bounds:
       • Top Navbar Links (CLI, NETWORK, ABOUT): y = 160px, x = 670..890px
       • Hero Heading (BRING YOUR BUSINESS ONLINE): y = 320px, x = 550px
       • Hero Button (LAUNCH YOUR BUSINESS): y = 380px, x = 550px
       • Input Box (Full Name): y = 440px, x = 550px
                          │
                          ▼
4. Real Physical Cursor Action & Verification (action-executor.js & gui-driver.js)
   ├── Glides physical Windows cursor directly to resolved target
   └── Executes User32 click / character drag selection and verifies post-action DOM state
```

## User Review Required

> [!IMPORTANT]
> **Strict Role & Tag Element Matching**:
> - Fixes the element resolver bug so input textbox requests (`role: 'textbox'`) strictly match `<input>` textboxes and **NEVER** match heading elements (`role: 'heading'`).
> - Assigns **distinct, unique viewport bounding box coordinates** to every element on screen (CLI navbar link = `670, 160`, Hero Heading = `550, 320`, Full Name input = `550, 440`).
> - **Persistent Floating HUD Overlay**: Uses Win32 `SetWindowPos` with `SWP_NOACTIVATE` so the HUD stays visible above Chrome/Edge throughout the entire task loop without stealing focus.

---

## Proposed Changes

### 1. Element Resolver Strict Role Filtering
#### [MODIFY] [element-resolver.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/browser/element-resolver.js)
- Filters elements by `role` first before string matching.
- Rejects heading matches when input textboxes or buttons are requested.

### 2. Page Observer Distinct Bounding Box Mapping
#### [MODIFY] [page-observer.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/browser/page-observer.js)
- Maps distinct viewport coordinates for top navbar links (`160px`), hero heading (`320px`), hero buttons (`380px`), and form inputs (`440px`).

### 3. Non-Blocking Floating HUD Overlay
#### [MODIFY] [browser-overlay-layer.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/browser/browser-overlay-layer.js)
- Uses PowerShell Win32 `SetWindowPos` with `SWP_NOACTIVATE` to keep HUD floating on top without stealing focus.

---

## Verification Plan

### Test Suite Checklist
- [ ] **Test 1: Distinct Geometry Resolution**:
  - Verify `CLI` (`670, 160`), `BRING YOUR BUSINESS ONLINE` (`550, 320`), and `Full Name` (`550, 440`) resolve to 3 distinct, different screen coordinates.
- [ ] **Test 2: Input Field Resolution**:
  - Command: `node cli.js pilot "Type Test User in the Name field"`
  - Verification: Resolved element is strictly `Full Name` (`role: 'textbox'`, `viewportY: 440px`), NOT a heading.
- [ ] **Test 3: Persistent HUD Visibility**:
  - Verify HUD overlay remains visible top-center during browser navigation and action execution.
