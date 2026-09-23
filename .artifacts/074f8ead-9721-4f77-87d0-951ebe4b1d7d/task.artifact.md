# Codez48 Pilot Task Session & Desktop Worker Upgrade Task Tracker

- `[x]` **Step 1: Task Session Manager & Intent Isolation**
    - [x] Create `src/pilot/task-session.js` with CREATE vs EDIT intent detection & unique filename generator (`story-2.txt`)
    - [x] Update `src/pilot/adapters/notepad-adapter.js` to enforce fresh document state
- `[x]` **Step 2: Calculator Math Automation Adapter**
    - [x] Create `src/pilot/adapters/calculator-adapter.js`
    - [x] Test Calculator launching, keystroke entry (`4250*18=`), and math result verification
- `[x]` **Step 3: External Deployment Approval Helper**
    - [x] Create `src/pilot/deployment-helper.js` for Netlify deployments with `y/n` user approval
- `[ ]` **Step 4: Capability Registry & Controller Upgrades**
    - [ ] Update `src/pilot/capability-registry.js` & `src/pilot/pilot-controller.js`
- `[ ]` **Step 5: Testing & Final Verification**
    - [ ] Run `node --check` across all JavaScript modules (0 errors)
    - [ ] Test consecutive Notepad story creation (verifying `story.txt` and `story-2.txt`)
    - [ ] Test Calculator calculation (`4250 * 18`)
    - [ ] Test VS Code fresh project opening
