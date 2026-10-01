# Implementation Plan - Pilot Capability and Quality Pack (PPT, Permissions, Documents, Websites, Applications)

Expanding the Code-Based Pilot engine into a fully polished capability and quality pack covering structured style briefs, style-pack libraries, multi-axis image scoring, centralized permission management, document reading/editing, learned website profiling, application capability profiling, and acceptance tests Q1–Q5, R1–R4, and S1–S10.

## Step 0 Audit Summary
- **PPT Style & Images**: `powerpoint-adapter.js` handles slide text and Wikimedia image search. Needs upgrade for multi-axis image scoring (content + style + technical) and style-pack libraries.
- **Permissions**: Task session tracks artifacts, but a dedicated centralized `PermissionManager` (scope/capability/audit log) is needed.
- **Document & App Tasks**: COM Office drivers (`com-office-driver.js`), adapters (`notepad-adapter.js`, `excel-adapter.js`, `word-adapter.js`), and app discovery (`application-launcher.js`, `app-discovery.js`) exist. Needs unification under the Action Router and capability profiling.
- **Website Profiling**: `page-observer.js` and `element-resolver.js` exist. Needs learned site profiles with revalidation.

---

## Proposed Changes

### 1. Style-Pack Library & Style Brief (`src/pilot/autonomous/style-pack-manager.js`)
- Implements structured Style Briefs and editable data-driven style profiles (corporate-clean, tech-dark, startup-bold, academic-minimal, creative-editorial).
- Multi-axis image scoring (Content relevance, Style fit, Technical fit).

### 2. Central Permission Manager (`src/pilot/autonomous/permission-manager.js`)
- Least-privilege capability grants (`READ_SCREEN`, `READ_WEB`, `CLICK_WEB`, `TYPE_WEB`, `READ_FILES`, `WRITE_FILES`, `CONTROL_APP`, `RUN_COMMANDS`, `INSTALL_SOFTWARE`, `NETWORK_EXTERNAL`), scoped per site/app/folder with audit logging and prompt-injection defense.

### 3. Application Capability Profiling & Learned Website Profiles (`src/pilot/autonomous/app-profile-manager.js`, `site-profile-manager.js`)
- Dynamic capability profiling per application and revalidated site inventory profiles.

### 4. Comprehensive Acceptance Tests (`tests/pilot_quality_pack_test.js`)
- Implement tests Q1–Q5 (PPT quality), R1–R4 (Permissions), and S1–S10 (Documents/Apps/Web/Recovery/Regression).

---

## Verification Plan

### Automated & Runtime Tests
1. Run `node tests/pilot_quality_pack_test.js` to execute acceptance tests Q1–Q5, R1–R4, and S1–S10 on the real runtime.
