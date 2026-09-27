# Fix Blender 'Missing DNA block' Error Task Tracker

- `[x]` **Phase 1: Pre-Compiled Native Base Template Asset**
    - [x] Create `src/pilot/3d/assets/base_template.blend` with valid `DNA1` C-struct blocks
- `[x]` **Phase 2: Deep Windows Blender Path Resolution**
    - [x] Update `src/pilot/3d/app-selector.js` to deep-search `C:\Program Files\Blender Foundation\*`, `AppData\Local\Programs\*`, and Registry App Paths
- `[x]` **Phase 3: Blender Adapter Template Copy & DNA1 Verification Gate**
    - [x] Update `src/pilot/3d/adapters/blender-adapter.js` to copy `base_template.blend` during workspace initialization
    - [x] Run `blender.exe --background --python scene_builder.py` to update `scene.blend`
    - [x] Verify `scene.blend` file size > 10 KB and `DNA1` block existence on disk
- `[x]` **Phase 4: Syntax Check & Drag-and-Drop Acceptance Testing**
    - [x] Run `node --check` across all JavaScript modules (0 errors)
    - [x] Test: Execute real 3D model creation test: *"Create a 3D model of a low-poly futuristic robot."*
    - [x] Verify `scene.blend` opens in Blender with 0 `Missing DNA block` errors
- `[x]` **Phase 5: Verification Report Generation**
    - [x] Generate final evidence report and walkthrough
