# Implementation Plan: Generic Search Grounding, Tab Focus Verification, and Scroll Invalidation Layer

This implementation plan enhances the Codez48 Pilot system's screen grounding, search bar identification, scroll interaction, and keyboard navigation (Tab focus tracking) to work generically across any website (YouTube, Google, Amazon, blogs, docs, etc.) without hardcoded selectors.

## User Review Required

> [!IMPORTANT]
> - **Generic Search Detection**: Combine DOM attributes (`role="searchbox"`, `type="search"`, `placeholder`, `aria-label`, `name`), OCR visible text, and screenshot analysis to identify search bars universally.
> - **Verified Tab Navigation**: Track active element focus after each Tab key press (`activeElement` inspection + screenshot highlight confirmation) before typing or pressing Enter.
> - **Scroll & Navigation Invalidation**: Invalidate all cached target data, OCR coordinates, and DOM references immediately upon scrolling or navigation.
> - **Observe-Act-Verify Loop**: Enforce strict capture of fresh observation (screenshot + OCR + DOM + HTML + activeElement) post-action to verify state transitions.

## Proposed Changes

### Playwright Worker & Pilot Engine

#### [MODIFY] [locator-resolver.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/locator-resolver.js)
- Enhance generic search bar resolution combining DOM inputs/searchboxes, accessibility attributes, and visual OCR bounding boxes.
- Implement stale target invalidation hooks on scroll and navigation events.

#### [MODIFY] [action-executor.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/action-executor.js)
- Implement verified Tab navigation loop (press Tab, inspect `document.activeElement`, verify focus reached intended target).
- Support physical cursor movement with coordinate validation (`[CURSOR POSITION VERIFIED]: PASS`).
- Execute typing and Enter/Space actions post-focus.

#### [MODIFY] [action-verifier.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/action-verifier.js)
- Implement strict post-action fresh state verification capturing fresh screenshot, OCR, DOM, HTML, URL, title, and active element.

## Verification Plan

### Automated Tests
- Run acceptance test script (`node .artifacts/743b787d-cd17-4b3a-924b-0ac227da860e/scratch/test_youtube_acceptance.js`).
- Verify console logs show:
  - `[SEARCH GROUNDING]: Generic search input detected`
  - `[KEYBOARD FOCUS VERIFIED]: Tab focus reached target`
  - `[CURSOR POSITION VERIFIED]: PASS`
  - `[FRESH STATE VERIFIED]: PASS`
