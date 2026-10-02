# Comprehensive Pilot Automation Architecture Implementation Plan

This implementation plan outlines the architectural additions and component updates required to fulfill the user's multi-faceted AI Pilot automation requirements:
1. **Desktop App & Office/IDE Automation**: Native app execution (Calculator calculations, PowerPoint presentation generation, minimizing desktop windows, creating VS Code projects in `Documents`, writing code, installing dependencies, and running via terminal).
2. **Web Search & Link Extraction**: Generalizable search and direct link/data extraction on Amazon or any specified website without manual user intervention.
3. **Input Field Verification & Ordering**: Interactive input field screenshot submission via Firebase, user input confirmation, and field sequence order mapping (1st, 2nd, 3rd field).
4. **Lightweight Firebase Input Popup Window (200px Height)**: Dedicated `input-prompt.html` window connected to Firebase for collecting user credentials/personal details, supporting saved browser credential auto-fill, transmitting data to Firebase, and auto-closing immediately upon submission.

---

## Proposed Changes

### Component 1: Native System & IDE Application Manager

#### [NEW] [native-app-automation.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/native-app-automation.js)
- **Desktop Window Minimization**: Executes PowerShell shell command `(New-Object -ComObject Shell.Application).MinimizeAll()` to minimize all open desktop windows prior to code project creation.
- **Calculator Automation**: Launches system calculator (`calc.exe` or PowerShell math execution engine) to run user-requested mathematical calculations and return calculated results.
- **PowerPoint Generator (`pptxgenjs` Integration)**: Integrates `pptxgenjs` to programmatically build tailored, styled Microsoft PowerPoint `.pptx` presentations according to user prompts.
- **VS Code Project Creator & Execution Workflow**:
  - Resolves local `Documents` folder path (`C:/Users/<username>/Documents/Codez48Projects/<projectName>`).
  - Creates project directory and writes requested single-file or multi-file programs.
  - Spawns VS Code instance using `code <projectPath>`.
  - Automatically installs required npm/pip packages and executes the application in VS Code terminal process.

---

### Component 2: Smart Web Search & Direct Link Extraction

#### [MODIFY] [ai-planner.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/ai-planner.js)
- Updates system prompt to recognize direct web search and product extraction requirements (e.g. Amazon search for iPhone, retrieving product links, price, and canonical item URL without requiring manual clicks).

#### [NEW] [web-search-extractor.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/web-search-extractor.js)
- Provides generic DOM extraction for search engines and e-commerce websites (Amazon, eBay, Google, target sites).
- Locates search bar, enters query (e.g. "iPhone"), executes search, and evaluates top matching product links, image URLs, titles, and product detail URLs directly from DOM structure.

---

### Component 3: Input Field Screenshot Verification & Order Mapping Protocol

#### [NEW] [input-verifier.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/input-verifier.js)
- Triggers when input boxes are detected during page inspection (`page-inspector.js`).
- Takes an annotated page screenshot highlighting discovered input boxes.
- Pushes screenshot and confirmation prompt to Firebase collection (`input_field_verifications`).
- Asks user/monitor:
  1. *"Is this indeed an input box?"*
  2. If confirmed, requests specific order of fields (e.g., 1st: Username, 2nd: Password, 3rd: Verification code).
- Maps sequence order into AI action planner for precise step-by-step typing.

---

### Component 4: Lightweight 200px Height Firebase Input Popup Window

#### [NEW] [input-prompt.html](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/public/input-prompt.html)
- Lightweight HTML file designed specifically to run in a **200px height window**.
- Minimalist UI featuring:
  - Input field for requested details (username, password, personal details).
  - "Send" action button.
- Directly initialized with Firebase Firestore SDK.
- Checks if login details are saved in browser credential store for auto-filling login pages.
- Transmits entered data to Firebase Firestore run context on 'Send' click.
- Calls `window.close()` / browser context close to immediately dismiss the popup window after data transmission.

#### [NEW] [popup-input-manager.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/popup-input-manager.js)
- Opens browser popup window loading `public/input-prompt.html` with explicit dimensions (`width: 450px, height: 200px`).
- Listens to Firebase Firestore for submission event and handles graceful popup destruction.

---

## Verification Plan

### Automated Tests
- Run `node playwright-worker/scratch/test_native_automation.js` to verify:
  1. Desktop window minimization & Calculator calculations.
  2. PowerPoint slide presentation generation (`.pptx`).
  3. Documents project directory creation and VS Code launcher workflow.
- Run `node playwright-worker/scratch/test_web_search_extraction.js` to verify:
  1. Amazon search navigation & direct iPhone item link extraction.
- Run `node playwright-worker/scratch/test_input_popup.js` to verify:
  1. 200px height popup window creation, Firebase transmission, and automatic popup window closure.

### Manual Verification
- Verify `public/input-prompt.html` renders cleanly with exact 200px height layout.
- Verify live Firebase real-time updates in `public/pilot-request-monitor.html`.
