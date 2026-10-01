# Implementation Plan: Automatic Screenshot Request Trigger, OCR Verification, and CLI Multi-Page Navigation Loop

This implementation plan addresses the requirement to ensure that page-load screenshot capture requests are automatically triggered and sent to Firebase, processed with OCR/AI verification against user queries, scrolled if elements are off-screen, and interacted with via DOM actions across both the HTML monitor page (`pilot-request-monitor.html`) and the CLI (`cli-automation-manager.js`).

## User Review Required

> [!IMPORTANT]
> This plan ensures the complete end-to-end trigger loop:
> 1. **Auto-Trigger on Page Load**: Automatically capture a full screenshot of the screen upon HTML page load and POST it to Firebase (`/.netlify/functions/pilot-request-monitor`).
> 2. **OCR & AI Content Verification**: Run OCR and query the AI to check if user-requested content (or target element) is present in the extracted text.
> 3. **Viewport Scrolling & Re-Verification**: If the element is not immediately visible, scroll down, take a new screenshot, and re-verify.
> 4. **DOM Interaction & Progression**: Acknowledge found elements (e.g., buttons, input fields, "Start") and execute DOM actions (clicking/navigating to next page).
> 5. **CLI Integration**: Expose and mirror these visual verification and action steps in the CLI automation manager.

## Open Questions

- None. The architecture uses Netlify serverless functions, Firestore, Tesseract OCR, and Playwright worker services.

## Proposed Changes

### HTML Page Monitor & Auto-Trigger
#### [MODIFY] [pilot-request-monitor.html](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/public/pilot-request-monitor.html)
- Add auto-screenshot capture upon page load using HTML5 canvas / snapshot and send a POST request to `/.netlify/functions/pilot-request-monitor` with `screenshotData`, dimensions, and OCR telemetry.
- Add AI verification and scrolling logic to automatically check for user-requested content and trigger interaction.

### CLI Automation Manager
#### [MODIFY] [cli-automation-manager.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/netlify/functions/cli-automation-manager.js)
- Enhance the `VISUAL_VERIFY` handler to accept screenshot payloads, perform OCR/AI validation against user goals, handle scrolling recommendations, and stream direct execution responses back to the CLI.

## Verification Plan

### Automated Tests
- Run test script validating screenshot request payload structure and OCR/AI response verification logic.

### Manual Verification
- Open the HTML monitor page and CLI, verifying that initial page-load requests are successfully triggered, sent to Firebase, verified via OCR/AI, scrolled if needed, and interacted with.
