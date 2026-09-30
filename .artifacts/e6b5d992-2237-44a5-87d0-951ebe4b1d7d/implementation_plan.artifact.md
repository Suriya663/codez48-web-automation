# Implementation Plan - Critical UI/UX Redesign: Codez48 Pilot Live Visual Stream Control Room

Redesigning the existing Request Monitor (`public/pilot-request-monitor.html`) into an ultra-clean, minimal, screenshot-first real-time visual control room. The UI removes all bulky headers, branding banners, and persistent side request lists from the primary view, placing the full Windows desktop screenshot as the dominant viewport surface with proportional target overlay rings and a compact floating event response badge. Technical diagnostics are tucked away in a small collapsible drawer.

## Proposed Changes

### 1. Request Monitor Redesign (`public/pilot-request-monitor.html`)
- **Screenshot-First Viewport**: Full-screen layout where the latest Windows screenshot fills the available viewport (`object-fit: contain`).
- **Removal of Bulky UI Elements**: Removes the large Codez48 Pilot header, active stream badge, and permanent side request cards from the main screen.
- **Compact Floating Response Panel**: A sleek, non-intrusive floating status badge showing current target, source X/Y coordinates, confidence, and execution state.
- **Proportional Target Overlay**: HTML/CSS ring and bounding rectangle positioned precisely using source-to-display coordinate transformation (`scaleX`, `scaleY`, `offsetX`, `offsetY`).
- **Collapsible Diagnostics Drawer**: Moves raw logs, request lists, JSON dumps, and metadata behind a small, discrete "Diagnostics" button/drawer.

---

## Verification Plan

### Automated & Visual Tests
1. Verify the redesigned HTML template renders correctly, maintains live auto-refresh without manual reload, and correctly positions target overlays using source screenshot coordinates.
