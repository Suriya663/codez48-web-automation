# Implementation Plan - Interactive Selectable Text OCR Overlays & Full-Screen Live Stream

Enhancing the Request Monitor (`public/pilot-request-monitor.html`) so that all detected OCR words and text elements from the screenshot are rendered as interactive, transparent, copyable/selectable text spans positioned precisely over their exact screenshot pixel locations (`sourceLeft`, `sourceTop`, `sourceRight`, `sourceBottom` mapped via proportional contain scaling `scale`, `imageOffsetX`, `imageOffsetY`), allowing users to click and copy any text directly from the visual stream while maintaining pixel-perfect target highlighting.

## Proposed Changes

### 1. Interactive Selectable Text Overlay (`public/pilot-request-monitor.html`)
- Update `updateOverlay(vr)` to render interactive, transparent `<span class="ocr-selectable-text">` elements for all detected words from Tesseract.js / visual analysis, allowing users to select and copy text directly from the screenshot overlay layer.
- Ensure the primary target (`"business"`, etc.) is highlighted with a precise target ring and bounding rectangle, while all surrounding OCR words are interactive and copyable.

---

## Verification Plan

### Automated & Visual Tests
1. Verify HTML template updates for interactive copyable text overlays and proportional contain scaling.
