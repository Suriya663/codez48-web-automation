# Implementation Plan - Stage 6: Visual Element Intelligence & Coordinate Accuracy

Implement advanced visual element intelligence, robust text normalization, scoring-based target matching, ambiguity handling, safe click-point calculation, multi-monitor metadata, DPI/scaling handling, disabled element rejection, and Request Monitor diagnostics.

## Proposed Changes

### 1. Visual Element Intelligence (`src/pilot/browser/visual-element-engine.js`)
- Implement normalized visual element schema (`id`, `type`, `text`, `normalizedText`, `bbox`, `center`, `clickablePoint`, `confidence`, `visible`, `enabled`, `source`, `parentId`).
- Implement robust text normalization (case-insensitive, whitespace normalization, punctuation differences).
- Implement scoring-based target matching (exact match, normalized match, element type, visibility, enabled state, confidence, penalties for partial visibility or disabled state).
- Handle multiple matches and ambiguity detection (`TARGET_AMBIGUOUS`).
- Safe click-point calculation (avoiding edges, padding, overlapping elements).
- Disabled element detection & low-confidence rejection.

### 2. Coordinate & Monitor Extension (`coordinate-mapper.js`, `public/pilot-request-monitor.html`, `visual-request-manager.js`)
- Enhance coordinate mapper with multi-monitor display metadata and robust DPI/scaling handling.
- Extend Request Monitor and Firestore schema to display element intelligence telemetry, match scores, candidates, ambiguity warnings, and bounding box overlays.

### 3. Test Suite (`tests/stage6_test.js`)
- Comprehensive test suite covering all 18 Stage 6 test cases (normal text, case-insensitive, whitespace, multiple matches, button click-point, image text, partially visible, scrollable panel, disabled target, low-confidence icon, coordinate mapping, DPI/scaling, multi-monitor, Request Monitor diagnostics, and Stage 2–5 regressions).

---

## Verification Plan

### Automated Tests
1. Run `node tests/stage6_test.js` to execute all 18 Stage 6 test cases and regression tests.
