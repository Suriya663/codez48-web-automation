# Implementation Plan - Robust Target Disambiguation & Precise Pixel OCR Highlighting

Fixing the target misidentification bug where Tesseract OCR or visual analysis matched top-left artifacts (like `®` at X: 71, Y: 26) instead of the actual requested target text (e.g. `"business"` in "BRING YOUR BUSINESS ONLINE" or "BUSINESS NETWORK").

## Proposed Changes

### 1. Robust Target Filtering & Scoring Engine (`public/pilot-request-monitor.html`)
- Update `analyzeAndOverlay(vr)` to filter out non-alphanumeric noise and tiny symbols (`®`, punctuation, icons).
- Implement intelligent keyword scoring and filtering for `vr.targetElement` (defaulting to `"business"` when requested):
  - Prioritize exact word matches (e.g. `"business"`).
  - Filter out words located in the extreme top-left browser chrome header zone (`top < 50` or `left < 50`) unless no other match exists, ensuring page-content text like `"BRING YOUR BUSINESS ONLINE"` or `"BUSINESS NETWORK"` is selected.
  - Sort matches by confidence and vertical position to guarantee the most relevant instance of `"business"` is highlighted.

---

## Verification Plan

### Automated & Runtime Tests
1. Run acceptance test suite `tests/codez48_business_target_test.js` to verify that `"business"` is detected at the correct content coordinates (`X=495, Y=298` or similar page content location) and never in the top-left browser chrome.
