# Codez48 Hybrid Automation Execution Tasks

- [ ] **Phase 1: Perception & Target Representation Layer**
  - [ ] Extend target representation to compute absolute screen bounds, viewport offsets, and window geometry.
- [ ] **Phase 2: Action Dispatcher**
  - [ ] Implement strategy selection router (`DOM` vs `PHYSICAL_CURSOR`/`KEYBOARD`).
- [ ] **Phase 3: Koffi Cursor Integration & Verification**
  - [ ] Integrate Koffi `SetCursorPos` and `GetCursorPos` into the active execution pipeline with cursor movement tracking.
- [ ] **Phase 4: Keyboard/Mouse Computer-Level Interaction**
  - [ ] Implement human-like input typing and smooth mouse trajectories.
- [ ] **Phase 5: Intent-Ranker & Pilot-Navigator Integration**
  - [ ] Wire hybrid dispatcher into navigation and intent resolution flow.
- [ ] **Phase 6: State Verification**
  - [ ] Ensure every action uses `state-verifier.js` for fail-closed post-action validation.
- [ ] **Phase 7: Doctor Diagnostics & Regression Tests**
  - [ ] Run `node cli.js doctor` and full verification suite.
