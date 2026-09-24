# Full AI Pipeline & Multi-Category Application Automation Test Plan

Executing an exhaustive, evidence-based audit and test suite across the Codez48 Central AI Task Engine (`cli-ai-chat.js`), safe Request Monitor (`public/pilot-request-monitor.html`), and every application category supported on this Windows machine.

## Phase 1 Research Findings & Diagnostics UI

1. **Publisher Helper Inspection**:
   - `publisher-helper` / `PublisherHelper` does not exist in the codebase.
   - The diagnostic page `public/pilot-request-monitor.html` and Netlify function `netlify/functions/pilot-request-monitor.js` created in the previous iteration serve as the official, secure request tracking UI and backend endpoint.
2. **Server-Side API Key Security**:
   - All AI API keys (`GROQ_API_KEY`, `GEMINI_API_KEY`) remain 100% server-side inside Netlify environment variables.
   - No secrets are exposed to the monitor HTML page or CLI responses.

---

## User Review Required

> [!IMPORTANT]
> **Audit Scope & Safety Policy**:
> - **Pure AI Knowledge Test**: Tests pure AI response round-trip (*"Explain what video games are..."*) through `cli-ai-chat.js` and verifies telemetry on `public/pilot-request-monitor.html` without launching local apps.
> - **Application Category Coverage**: Tests Notepad (Text), VS Code (Development), PowerPoint/Word/Excel (Office), Calculator/Settings/File Explorer/Paint/Clock (Utilities), Edge/Chrome (Browsers), and WordPress (Web Drafts).
> - **Safe Execution**: All test artifacts will be saved into dedicated Desktop files (`robot_mars_story.txt`, `Gaming Market Sales.xlsx`, etc.). No existing user files will be modified or deleted.

---

## Proposed Test Plan & Categories

### Category 1: Pure AI Knowledge Request (No Local Apps)
- **Prompt**: *"Explain what video games are and list a few common game genres."*
- **Verification**: Verifies `cli-ai-chat.js` generates response, logs `requestId` in Firestore `pilot_requests`, and displays telemetry on `public/pilot-request-monitor.html`.

### Category 2: Text Editors (Notepad)
- **Test 1**: *"Write an original English story about a robot exploring Mars using Notepad."* -> Verifies fresh document (`Ctrl+N`), AI text written, saved as `robot_mars_story.txt`, disk content verified.
- **Test 2**: *"Write an original English story about space exploration using Notepad."* -> Verifies fresh document (`Ctrl+N`), AI text written, saved as `space_exploration_story.txt` (`robot_mars_story.txt` untouched), disk content verified.

### Category 3: Development IDEs (VS Code)
- **Prompt**: *"Create a responsive HTML CSS JavaScript website about a gaming community in Visual Studio Code."* -> Verifies isolated fresh folder `Desktop/Codez48 Preview/vscode-gaming-community/`, AI multi-file project (`index.html`, `style.css`, `script.js`), opens folder in VS Code, verifies disk files.

### Category 4: Office Suite (PowerPoint, Word, Excel)
- **PowerPoint**: *"Create a new 5-slide presentation about the history of video games."* -> Verifies AI slide deck JSON, builds `.pptx` via Office COM, saves as `History of Video Games.pptx` on Desktop, verifies file size, opens PowerPoint.
- **Word**: *"Create a new Word document explaining the evolution of video games."* -> Verifies AI document sections, builds `.docx` via Office COM, saves as `Evolution of Video Games.docx` on Desktop, verifies file size, opens Word.
- **Excel**: *"Create an Excel spreadsheet with gaming market sales data."* -> Verifies AI spreadsheet headers/rows, builds `.xlsx` via Office COM, saves as `Gaming Market Sales.xlsx` on Desktop, verifies file size, opens Excel.

### Category 5: Windows System Utilities (Calculator, Settings, File Explorer, Paint, Clock)
- **Calculator**: *"Open Calculator and calculate 4250 * 18"* -> Launches Calculator, enters `4250*18=`, verifies result `76500`.
- **Settings**: *"Open Settings"* -> Launches `ms-settings:`, verifies window active.
- **File Explorer**: *"Open File Explorer"* -> Opens workspace directory in File Explorer.
- **Paint**: *"Open Paint"* -> Launches `mspaint.exe`, verifies window active.
- **Clock**: *"Open Clock"* -> Launches `ms-clock:`, verifies window active.

### Category 6: Browsers (Chrome / Edge)
- **Prompt**: *"Open Chrome and navigate to https://codez48.netlify.app and scroll down."* -> Opens browser, navigates to URL, verifies page health, performs scroll.

### Category 7: Web Applications (WordPress Drafts)
- **Prompt**: *"Create a WordPress draft article about AI gaming tools."* -> AI generates article title and HTML body, opens `https://wordpress.com/post`, saves draft (does NOT publish).

---

## Verification & Reporting

After executing the complete test suite, an evidence-based **Final Capability Report** will be generated detailing:
- Application Category
- Discovery Status (`DISCOVERED: YES/NO`)
- Automation Driver (`SUPPORTED: YES/NO`)
- Test Result (`PASS / FAIL / NOT INSTALLED`)
- Artifact Path & Disk Verification Metrics
