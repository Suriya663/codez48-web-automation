# Implementation Plan - Remote Page Intelligence + Codez48 AI + Local Knowledgeable Cursor (v2)

Comprehensive implementation plan incorporating all 16 required corrections, verifying the repository component table, and executing Phases 0 through 10.

## Verified Repository Inspection Table

| COMPONENT | ACTUAL PATH | EXISTS? | CURRENT PURPOSE | CLASSIFICATION | WHY |
| --- | --- | --- | --- | --- | --- |
| CLI Entry | `cli.js` | YES | Command routing (`pilot`, `ai`, `login`) | KEEP / EXTEND | Authoritative CLI entry point |
| Pilot Controller | `src/pilot/pilot-controller.js` | YES | Session setup and task dispatch | KEEP / EXTEND | Manages task lifecycle and goal execution |
| Browser Controller | `src/pilot/browser/browser-controller.js` | YES | Agent loop (Observe -> Think -> Act) | KEEP / EXTEND | Orchestrates browser navigation and step execution |
| Page Observer | `src/pilot/browser/page-observer.js` | YES | Raw CDP over WebSocket DOM observation | KEEP / EXTEND | Primary local observation engine |
| Page State | `src/pilot/browser/page-state.js` | YES | Structured candidate representation | KEEP / EXTEND | Compact candidate serialization for AI context |
| Element Resolver | `src/pilot/browser/element-resolver.js` | YES | Local geometry conversion | KEEP / EXTEND | Maps viewport bounds to physical screen pixels |
| Action Executor | `src/pilot/browser/action-executor.js` | YES | Real Windows cursor actions | KEEP / EXTEND | Performs physical clicks, typing, scrolling, selection |
| Action Verifier | `src/pilot/browser/action-verifier.js` | YES | Post-action state verification | KEEP / EXTEND | Verifies UI state changes after actions |
| GUI Driver | `src/pilot/drivers/gui-driver.js` | YES | Win32 mouse/keyboard control | KEEP / EXTEND | Drives real Windows cursor movement |
| HUD Layer | `src/pilot/browser/browser-overlay-layer.js` | YES | WinForms GDI+ HUD overlay | EXTEND / FIX | Ensure persistent non-blocking operation (`WS_EX_NOACTIVATE`) |
| Website Folder | Root / `public/` | YES | Static web files & monitors | KEEP / EXTEND | Houses request monitor and web interface |
| Firebase Config | `js/firebase-config.js` | YES | Client-side Firebase initialization | KEEP | Existing Firebase integration |
| Firestore Collection | `pilot_requests` | YES | Task and status tracking | KEEP / EXTEND | Existing telemetry and request coordination |
| AI Netlify Function | `netlify/functions/cli-ai-chat.js` | YES | Codez48 AI backend reasoning | KEEP / EXTEND | Existing Groq/Gemini backend integration |
| Request Monitor | `public/pilot-request-monitor.html` | YES | Admin/debug task telemetry view | KEEP | Existing request monitor page |
| Railway Worker | N/A | NO | Remote browser worker | DOES NOT EXIST | Replaced by direct CDP + local browser execution |
| Playwright | N/A | NO | Full Playwright package | DOES NOT EXIST | Rely on raw CDP + `ws` per project architecture |

---

## Execution Phases

- **Phase 0**: Runtime path truth verification (`codez48 pilot` vs `node cli.js pilot`).
- **Phase 1**: Persistent HUD timing, persistence, and non-blocking operation.
- **Phase 2**: Local cursor, DPI awareness, and typed coordinate spaces (`coords.js`).
- **Phase 3**: Current local DOM/accessibility/CDP observation priority (Local first, AI semantic reasoning when needed).
- **Phase 4**: Target resolution, fresh geometry, hit-test gate, and cursor arrival verification.
- **Phase 5**: Observe -> Think -> Act -> Verify loop and goal preservation.
- **Phase 6**: Firebase request/status coordination (`pilot_requests`).
- **Phase 7**: Remote public-page intelligence (optional assistance with SSRF defense and URL safety).
- **Phase 8**: Local re-observation of semantic remote results.
- **Phase 9**: Click, scroll, type, exact text selection, and copy verification.
- **Phase 10**: Acceptance Tests A through H on the real normal CLI path.
