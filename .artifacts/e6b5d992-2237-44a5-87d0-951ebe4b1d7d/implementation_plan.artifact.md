# Implementation Plan - Full Visual Agent + Exact Target Detection & Cursor Control

Implementing the Full Visual Agent (`src/pilot/autonomous/full-visual-agent.js`) that orchestrates the complete runtime flow:
1. User Request & Target Application Understanding (e.g. "Select 20 in Notepad")
2. Real Desktop Observation & Current Application Identification
3. Target Application Activation / Switching (without redundant launching)
4. Fresh Screenshot Capture & Transmission to Firebase / Request Monitor
5. Precise Visual + OCR Analysis & Exact Target Localization (`left`, `top`, `right`, `bottom`, `centerX`, `centerY`)
6. Proportional Overlay Synchronization & Source-to-Display Mapping
7. Real Windows Cursor Movement (`screenX`, `screenY`) & Precise Action Execution (`mouseDrag`)
8. Fresh Post-Action Screenshot Capture & Verification

## Proposed Changes

### 1. Full Visual Agent (`src/pilot/autonomous/full-visual-agent.js`)
- Orchestrates the full 14-step visual agent workflow with strict request-response correlation (`requestId`, sequence, timestamp) and safe stopping.

### 2. Full Visual Agent Acceptance Test (`tests/full_visual_agent_test.js`)
- Runs the real runtime acceptance test against Windows Notepad ("SURYA PRAKASH\n10 20 30 40", target "20"), proving exact target detection, overlay alignment, source coordinate transfer, real cursor movement, and post-action verification.

---

## Verification Plan

### Automated & Runtime Tests
1. Run `node tests/full_visual_agent_test.js` to execute the full visual agent acceptance test against real Windows Notepad and verify all 31 acceptance criteria and Stage 2–14 regressions.
