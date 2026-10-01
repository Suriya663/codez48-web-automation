# Implementation Plan: Fix Firebase Screenshot Rendering & Robust OCR Visual Grounding Loop

This implementation plan addresses the issue where Firebase screenshot images were not appearing in the HTML monitor (`pilot-request-monitor.html`) and ensures the complete end-to-end visual grounding, OCR extraction, DOM cross-checking, scrolling, and AI-driven action execution loop functions flawlessly.

## User Review Required

> [!IMPORTANT]
> This plan fixes the root cause of image rendering failures in `pilot-request-monitor.html` (missing dimension guards) and reinforces the OCR + DOM visual feedback loop.

## Open Questions

- None. The architecture uses Netlify functions, Firestore, Tesseract OCR, and Playwright worker services.

## Proposed Changes

### HTML Page Monitor (`pilot-request-monitor.html`)
#### [MODIFY] [pilot-request-monitor.html](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/public/pilot-request-monitor.html)
- Add robust dimension fallbacks (`vr.screenshotWidth || img.naturalWidth || 1280`, `vr.screenshotHeight || img.naturalHeight || 800`) in `analyzeAndOverlay` so images always render even if dimension metadata is missing in Firestore.
- Ensure `img.src` assignment and onload/complete handlers robustly trigger Tesseract OCR and DOM element overlay generation.
- Ensure error handling and debugging output clearly indicate screenshot load status.

## Verification Plan

### Automated Tests
- Run static analysis and verify HTML structure.

### Manual Verification
- Open `public/pilot-request-monitor.html` in browser, verify that Firebase screenshots render immediately, OCR extracts text, and target boxes/actions are correctly displayed and dispatched.
