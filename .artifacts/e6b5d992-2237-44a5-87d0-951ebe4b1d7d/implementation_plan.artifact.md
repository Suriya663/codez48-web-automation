# Implementation Plan - Direct Image-Text OCR Integration & Precise Bounding Box Alignment

Integrating direct image-text OCR capabilities (`visual-analyzer.js` and Tesseract.js / robust pixel text localization) into the Codez48 Pilot visual intelligence pipeline. This ensures text embedded inside images, banners, buttons, canvas, and graphical UI is detected from actual screenshot pixels with word-level pixel bounding boxes (`left`, `top`, `right`, `bottom`, `centerX`, `centerY`, `confidence`, `sourceType: "IMAGE_OCR"`).

## Proposed Changes

### 1. Visual Analyzer OCR Enhancement (`src/pilot/browser/visual-analyzer.js`)
- Upgrade `VisualAnalyzer` to support robust image-text OCR and pixel-based text localization, returning structured word-level bounding boxes and `sourceType: "IMAGE_OCR"` / `"NATIVE_OCR"`.

### 2. Request Monitor Overlay Geometry (`public/pilot-request-monitor.html`)
- Ensure precise display transformation using `img.getBoundingClientRect()` and proportional contain scaling (`scale`, `imageOffsetX`, `imageOffsetY`) so markers sit exactly over target text.

### 3. Acceptance Test Suite (`tests/image_text_ocr_acceptance_test.js`)
- Implements and executes Test A (Native Text - Notepad "20") and Test B (Image Text - Banner "BRING YOUR BUSINESS ONLINE"), proving end-to-end pixel-accurate detection, overlay alignment, source X/Y transfer, and real cursor action.

---

## Verification Plan

### Automated & Runtime Tests
1. Run `node tests/image_text_ocr_acceptance_test.js` to execute both Test A and Test B and verify image-text OCR detection, bounding box accuracy, and Stage 2–14 regressions.
