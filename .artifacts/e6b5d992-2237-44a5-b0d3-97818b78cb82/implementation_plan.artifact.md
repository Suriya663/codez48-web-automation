# Implementation Plan - Visual-Analysis / OCR & Screenshot-Based Vision Fallback Pipeline

Implement a full visual-analysis and screenshot verification pipeline for Codez48 Pilot: capturing full screen snapshots, sending them to the Codez48 visual-analysis/OCR service, receiving bounding boxes for UI elements (Text, Buttons, Images, Inputs, Links, Menus, Icons), converting screenshot coordinates to screen coordinates, executing real mouse movement / click / type / scroll via the existing robust motor driver, capturing post-action screenshots, and verifying action success visually.

## Component Architecture

1. **Screen Capture Utility (`src/pilot/browser/screen-capture.js`)**:
   - Captures full-screen desktop / active browser window screenshots using Node native screenshot capabilities or PowerShell / CDP page screenshot APIs.
2. **Visual Analysis Service Adapter (`src/pilot/browser/visual-analyzer.js`)**:
   - Integrates with Codez48 visual-analysis backend service (or AI multimodal vision model) to perform OCR and visual element detection, returning structured bounding boxes.
3. **Coordinate Transformer & Motor Integration (`src/pilot/browser/element-resolver.js` & `gui-driver.js`)**:
   - Maps screenshot bounding box coordinates to real Windows screen coordinates, accounting for DPI, scaling, and window bounds.
4. **Action & Verification Loop (`browser-controller.js` & `action-verifier.js`)**:
   - Executes physical mouse/keyboard action, captures post-action screenshot, and performs visual/OCR verification.

---

## Verification Plan

### Automated Tests
1. Test screen capture utility execution.
2. Test visual analysis element detection and bounding box coordinate mapping.
3. End-to-end test via CLI: `codez48 pilot "Open Codez48 and click CLI from the top navigation using visual analysis."`
