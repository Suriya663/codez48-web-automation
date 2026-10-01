# Implementation Plan - Full Visual Agent & Precise Image-Text OCR Alignment

Hardening the Full Visual Agent pipeline to guarantee:
1. **Precise Image-Text OCR Detection**: Enhancing `visual-analyzer.js` prompts and parsing to explicitly detect text embedded inside images, banners, buttons, and pixel graphics (`IMAGE_OCR`, `NATIVE_OCR`, `VISION`).
2. **Exact Rendered Image Rect Overlay (`public/pilot-request-monitor.html`)**: Positioning the `.overlay-layer` precisely over the exact rendered image bounding rectangle (`imageOffsetX`, `imageOffsetY`, `renderedWidth`, `renderedH`) matching `object-fit: contain` without any viewport offset discrepancies.
3. **Canonical Target Geometry & Real Cursor Flow**: Ensuring source X/Y coordinates flow accurately from the visual analysis bounding box to the real Windows cursor controller (`guiDriver`).

## Proposed Changes

### 1. Visual Analyzer Enhancement (`src/pilot/browser/visual-analyzer.js`)
- Update prompt instructions to explicitly request OCR and image-text detection for text inside images, banners, buttons, canvas, and graphical UI, returning source classification (`IMAGE_OCR`, `NATIVE_OCR`).

### 2. Request Monitor Overlay Geometry (`public/pilot-request-monitor.html`)
- Align `.overlay-layer` dimensions and offsets precisely with the DOM image's rendered bounding box (`getBoundingClientRect()` or proportional contain rect), ensuring pixel-perfect overlay alignment.

### 3. Acceptance Test Suite (`tests/full_visual_agent_acceptance_test.js`)
- Runs the full visual agent acceptance test verifying image-text OCR detection, proportional overlay mapping, source X/Y calculation, and real cursor action.

---

## Verification Plan

### Automated & Runtime Tests
1. Run acceptance test script proving image-text detection, exact overlay alignment, and Stage 2–14 regressions.
