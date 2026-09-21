# Codez48 Autonomous Agent Behavioral Refinements Plan

Enhancing the Codez48 CLI Autonomous Agent with 15 refined behavioral rules for intent gating, static web defaults, real execution statuses, follow-up session editing, and project-type-specific output handling.

## User Review Required

> [!IMPORTANT]
> **Behavioral Refinements Overview**:
> - **Normal Chat Gating**: Questions like "What is Node.js?" or "Explain REST API" return pure conversational answers without triggering workspace creation, environment checks, or file generation.
> - **Static Web Default**: Simple "Create a website" prompts default to lightweight static HTML/CSS/JS (`index.html`, `style.css`, `script.js`) using a zero-dependency built-in node HTTP preview server.
> - **Truthful Execution Statuses**: Status reports show `Running` or `Completed` ONLY if processes, health-checks, or installations exit with code 0. Failed commands report `Status: Failed` or `Status: Needs Attention`.
> - **Follow-Up Session Editing**: Edits target the `activeProjectPath` directly, modifying existing files rather than spawning duplicate files.

---

## Proposed Changes

### 1. Intent Detection & Normal Chat Gating
#### [MODIFY] [agent-controller.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/core/agent-controller.js)
- Implement `isAutomationIntent(goal)` check.
- If goal is purely informational, bypass file operations, environment checks, and workspace creation. Simply query AI API and output text response.

### 2. Static Web Preview Server & Default Adapter
#### [MODIFY] [static-web.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/adapters/static-web.js)
- Implement zero-dependency built-in static HTTP preview server using Node's native `http` and `fs` modules.
- Automatically serves `index.html`, `style.css`, and `script.js` on an available port.

### 3. Real Execution Verification & Run Method Display
#### [MODIFY] [agent-controller.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/core/agent-controller.js)
- Log `Run command: <command>` prior to execution.
- Capture exact exit codes and stdout/stderr for package installations (`npm install`, `pip install`).
- Set final status to `Status: Running` / `Status: Completed` or `Status: Failed` / `Status: Needs Attention` based on true process state.

### 4. Smart Editing & Session Persistence
#### [MODIFY] [filesystem-actions.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/actions/filesystem-actions.js)
- Ensures follow-up prompts on an active project search existing files in `activeProjectPath`, reading and modifying existing files directly.

---

## Verification Plan

### Test Scenarios
1. **Normal Chat Test**:
   - Prompt: `"What is Node.js?"`
   - Verification: Returns text answer only. No workspace, no file creation, no commands.
2. **Static Web Default Test**:
   - Prompt: `"Create a portfolio website and run it."`
   - Verification: Creates static HTML/CSS/JS, launches built-in HTTP server, opens browser at `http://localhost:<port>`.
3. **Node.js Express Test**:
   - Prompt: `"Create a Node.js Express website and run it."`
   - Verification: Prompts for `npm install`, runs `npm start`, health-checks port, opens browser.
4. **Follow-Up Modification Test**:
   - Prompt: `"Change the background color to black."`
   - Verification: Modifies existing `style.css` in active project directory without spawning new files or folders.
5. **VS Code Opening Test**:
   - Prompt: `"Open this project in VS Code."`
   - Verification: Opens exact `activeProjectPath`.
