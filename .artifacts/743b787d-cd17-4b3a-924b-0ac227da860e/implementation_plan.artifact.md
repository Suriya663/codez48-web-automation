# Implementation Plan: Fix Firebase Screenshot Rendering & Robust OCR/DOM Grounding Workflow

This implementation plan addresses the issues with Firebase screenshot rendering in `public/pilot-request-monitor.html` and implements the robust visual computer control workflow involving screenshot analysis, OCR text extraction, DOM content integration, scroll/scan loop, and precise element interaction.

## User Review Required

> [!IMPORTANT]
> - **Firebase Screenshot Rendering**: Ensuring `screenshotData` (base64 image data URLs) is correctly sanitized, stored, and loaded with proper error handlers and MIME type checks.
> - **OCR & DOM Grounding Workflow**: Integrating screenshot and DOM content payload exchange between the monitoring page, Firebase, and AI automation controller to support scrolling, scanning, and precise element clicking.

## Open Questions

- None. Brand details and workflow specs have been verified across Codez48 platform components.

## Proposed Changes

### Pilot Monitor & Automation Controller

#### [MODIFY] [pilot-request-monitor.html](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/public/pilot-request-monitor.html)
- Enhance image loading robustness for Firebase `screenshotData` (handle missing MIME prefixes, loading errors, fallback placeholders).
- Implement enhanced DOM content transmission alongside screenshot data in analysis/action requests.
- Add robust scroll-to-locate and visual grounding feedback loop for UI elements (buttons, inputs, text nodes).

#### [MODIFY] [pilot-request-monitor.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/netlify/functions/pilot-request-monitor.js)
- Ensure Firestore request handler correctly accepts and stores `screenshotData`, `domContent`, `elements`, and `ocr` payloads without truncation.
- Ensure GET endpoint returns complete `screenshotData` and DOM metadata for real-time monitoring.

## Verification Plan

### Automated Tests
- Build check / static verification of Netlify functions and HTML template.

### Manual Verification
- Open `public/pilot-request-monitor.html` in browser, verify that Firebase screenshots render immediately and trigger OCR/DOM visual grounding correctly.
