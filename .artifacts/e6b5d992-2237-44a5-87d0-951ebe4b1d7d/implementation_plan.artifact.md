# Implementation Plan - Precision Target Overlay Alignment & Uniform Scaling

Fixing the Request Monitor overlay positioning (`public/pilot-request-monitor.html`) to achieve pixel-perfect alignment of target rings and bounding rectangles over text in the screenshot. The fix replaces independent `scaleX`/`scaleY` stretching with uniform proportional `object-fit: contain` scaling (`scale = Math.min(containerWidth / sourceWidth, containerHeight / sourceHeight)`) and explicit letterbox/pillarbox offset calculations (`imageOffsetX`, `imageOffsetY`).

## Proposed Changes

### 1. Request Monitor Proportional Overlay Engine (`public/pilot-request-monitor.html`)
- Update `updateOverlay(vr)` to calculate uniform scale and exact image offsets within the container.
- Position bounding rectangles (`bounding-rect`) and target rings (`target-ring`) using:
  - `dispLeft = imageOffsetX + left * scale`
  - `dispTop = imageOffsetY + top * scale`
  - `dispWidth = (right - left) * scale`
  - `dispHeight = (bottom - top) * scale`
  - `dispCx = imageOffsetX + centerX * scale`
  - `dispCy = imageOffsetY + centerY * scale`
- Add a developer debug mode toggle in the Diagnostics drawer to visualize source vs display rectangles.

---

## Verification Plan

### Automated & Visual Tests
1. Verify overlay alignment calculation via unit test or test script ensuring source-to-display coordinate mapping matches rendered image geometry.
