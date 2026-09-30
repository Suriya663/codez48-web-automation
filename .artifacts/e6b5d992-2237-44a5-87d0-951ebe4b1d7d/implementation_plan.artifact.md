# Implementation Plan - Full-Screen Live Screenshot + Target Overlay UI

Redesigning the Request Monitor frontend (`public/pilot-request-monitor.html`) to deliver a screenshot-first, full-screen live visual streaming interface with proportional target bounding box overlays, target coordinate callouts (`X`, `Y`, `Confidence`), hidden secondary logs, and automatic live updates.

## Proposed Changes

### 1. Request Monitor Redesign (`public/pilot-request-monitor.html`)
- **Full-Screen Viewport**: Feature the latest captured Windows screenshot as the primary full-size visual viewport with contain-style scaling.
- **Bounding Box & Target Overlay**: Overlay canvas/HTML elements scaled accurately from source screenshot coordinates (`1536x864`) to display dimensions, drawing target rings/circles and bounding rectangles.
- **Collapsible Diagnostics Panel**: Move verbose logs, JSON dumps, and OCR text lists into a collapsible secondary drawer.
- **Live Stream Streamlined Header**: Display compact live status (`LIVE`, `Request ID`, `Sequence`, `Timestamp`).

---

## Verification Plan

### Automated & Visual Tests
1. Verify HTML template updates and ensure seamless rendering of screenshot previews and coordinate mapping overlays.
