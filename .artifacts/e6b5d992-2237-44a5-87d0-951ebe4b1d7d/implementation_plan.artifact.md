# Implementation Plan - General-Purpose Windows Desktop Agent Expansion (Phase 0 Audit & Architecture)

Extending the existing Codez48 Pilot engine into a general-purpose Windows desktop agent that handles both browser automation and native Windows application tasks using the SAME shared loop, HUD, policy layer, and input driver (`guiDriver`).

## Phase 0 - Mandatory Read-Only Repository Audit (Architecture-Truth Table)

| CAPABILITY | STATUS | FILE(S) | NOTES |
| :--- | :--- | :--- | :--- |
| **Desktop Capture** | REAL | `src/pilot/browser/screen-capture.js` | GDI+ based full Windows screen capture |
| **OCR / Local Vision** | REAL | `src/pilot/browser/visual-analyzer.js`, `tesseract-integration.js` | Multimodal AI + Tesseract.js word-level bounding boxes |
| **App Discovery / Launcher** | REAL | `src/pilot/apps/application-launcher.js`, `application-resolver.js` | Resolves and launches Windows applications (Notepad, VS Code, etc.) |
| **Workflow Planner / System** | REAL | `src/pilot/workflows/workflow-planner.js`, `workflow-system.js` | Goal parsing and step execution |
| **Recovery / Checkpoint** | REAL | `src/pilot/autonomous/recovery-manager.js`, `goal-state-manager.js` | Bounded recovery and state tracking |
| **Coordinate Mapper** | REAL | `src/pilot/browser/coordinate-mapper.js` | Maps normalized/pixel screen coordinates to Windows mouse |
| **GUI Driver** | REAL | `src/pilot/drivers/gui-driver.js` | DPI-aware SendInput mouse/keyboard driver with closed-loop feedback |
| **Continuous Loop** | REAL | `src/pilot/autonomous/goal-completion-engine.js` | Observe -> Understand -> Act -> Verify loop |
| **Capability Registry** | REAL | `src/pilot/capability-registry.js` | Intent and entity extraction |
| **Request Monitor / Firebase** | REAL | `public/pilot-request-monitor.html`, `netlify/functions/pilot-request-monitor.js` | Live telemetry HUD (optional monitoring path) |
| **3D Automation** | NOT FOUND | N/A | Explicitly out of scope per Section 10 |

---

## Proposed Changes for Desktop Agent Expansion

### 1. Desktop UIA Observer (`src/pilot/desktop/uia-observer.js`)
- Persistent native host (PowerShell + in-memory C# using `System.Windows.Automation`) to inspect the active window's UI Automation tree and normalize elements into the shared Candidate shape.

### 2. App Discovery Expansion (`src/pilot/desktop/app-discovery.js`)
- Dynamic Start Menu shortcut resolution (.lnk), PATH scanning, and process enumeration with a known/tested-app registry (`Notepad`, `Calculator`, `File Explorer`, `Chrome`, `Edge`).

### 3. Policy & Confirmation Gate (`src/pilot/autonomous/desktop-policy.js` / `core/policy.js`)
- Enforces non-bypassable confirmation prompts for OS settings changes, file overwrites, software installations, unnamed/ambiguous app launches, and out-of-scope actions.

### 4. Acceptance Tests J–S (`tests/desktop_agent_acceptance_test.js`)
- Real runtime acceptance tests covering Notepad operations, File Explorer folder creation, scroll-until-found, image-text OCR, ambiguity handling, confirmation gates, create vs edit, recovery, and SIGINT clean stop.

---

## Verification Plan

### Automated & Runtime Tests
1. Run acceptance test suite proving desktop agent capabilities and Stage 2–14 regressions.
