# Implementation Plan - Gemini Vision + Python Local Automation Integration

Integrating Gemini Vision API (`GeminiVisionProvider`) and an optional Python local automation helper (`python/codez48_automation/`) into the existing Codez48 Pilot architecture without disturbing existing modules.

## Proposed Changes

### 1. Gemini Vision Provider (`src/pilot/vision/gemini-vision-provider.js`)
- Exposes `analyzeScreenshot(base64Image, goal)` using `@google/genai` or secure fetch calls against the Gemini API with `GEMINI_API_KEY` from environment variables.
- Returns structured JSON perception data (status, target, bbox, center, confidence, reason).

### 2. Python Local Automation Helper (`python/codez48_automation/`)
- `screen.py`, `input.py`, `vision.py`, `bridge.py` for local screenshot capture and optional input fallback.

### 3. Acceptance Tests & Final Report (`tests/gemini_python_integration_test.js`, `FINAL_REPORT.md`)
- Executes acceptance tests for Notepad, Website Navigation, Full Page Text, Image Text, Filesystem, Ambiguity, Stale Screen, and API Key Safety.

---

## Verification Plan

### Automated & Runtime Tests
1. Run `node tests/gemini_python_integration_test.js` to execute acceptance tests and generate `FINAL_REPORT.md`.
