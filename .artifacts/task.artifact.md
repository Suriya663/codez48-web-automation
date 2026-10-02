# Task List: Generic Search Grounding & Tab Focus Verification

- [x] **Phase 1: Generic Search Bar Grounding (`locator-resolver.js`)**
  - [x] Implement universal search bar detection combining DOM inputs/searchboxes, accessibility attributes, and OCR visual hints.
  - [x] Implement scroll and navigation target invalidation.
- [x] **Phase 2: Verified Tab Navigation & Keyboard Focus (`action-executor.js`)**
  - [x] Implement iterative Tab / Shift+Tab navigation with active element focus verification.
  - [x] Support physical cursor movement with `[CURSOR POSITION VERIFIED]: PASS`.
- [x] **Phase 3: Fresh State Observation & Verification (`action-verifier.js`)**
  - [x] Enforce fresh screenshot, OCR, DOM, HTML, URL, and active element capture post-action.
- [x] **Phase 4: Acceptance Testing**
  - [x] Run YouTube search acceptance test and verify all steps pass successfully.
