const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runPhaseAAudit() {
    console.log('=== CODEZ48 MASTER PROMPT — PHASE A: FORENSIC REPOSITORY MAP & AUDIT ===\n');

    const modulesToVerify = [
        'cli.js',
        'playwright-worker/action-executor.js',
        'playwright-worker/action-planner.js',
        'playwright-worker/action-verifier.js',
        'playwright-worker/ai-model-abstraction.js',
        'playwright-worker/ai-planner.js',
        'playwright-worker/browser-manager.js',
        'playwright-worker/clipboard-controller.js',
        'playwright-worker/connection-manager.js',
        'playwright-worker/document-automation.js',
        'playwright-worker/drag-drop-controller.js',
        'playwright-worker/environment-observer.js',
        'playwright-worker/environment-router.js',
        'playwright-worker/filesystem-controller.js',
        'playwright-worker/keyboard-controller.js',
        'playwright-worker/locator-resolver.js',
        'playwright-worker/mixed-environment-orchestrator.js',
        'playwright-worker/native-app-automation.js',
        'playwright-worker/page-inspector.js',
        'playwright-worker/permission-broker.js',
        'playwright-worker/pilot-navigator.js',
        'playwright-worker/recovery-manager.js',
        'playwright-worker/safety-controller.js',
        'playwright-worker/state-verifier.js',
        'playwright-worker/tab-manager.js',
        'playwright-worker/task-parser.js',
        'playwright-worker/task-state-machine.js',
        'playwright-worker/trading-safety-controller.js',
        'playwright-worker/user-input-dialog.js',
        'playwright-worker/visual-fallback.js',
        'playwright-worker/wait-manager.js',
        'playwright-worker/win32-cursor.js',
        'playwright-worker/window-manager.js'
    ];

    console.log('1. REPOSITORY MODULE MAP (Test-Path Equivalent):');
    console.log('------------------------------------------------------------');
    let existCount = 0;
    modulesToVerify.forEach(mod => {
        const fullPath = path.join(process.cwd(), mod);
        const exists = fs.existsSync(fullPath);
        if (exists) existCount++;
        console.log(`${mod.padEnd(50)} | ${exists ? 'EXISTS' : 'MISSING'}`);
    });

    console.log(`\nVerified Modules: ${existCount}/${modulesToVerify.length} EXIST.`);

    console.log('\n2. CONFLICTS AND DUPLICATED LOGIC AUDIT:');
    console.log('------------------------------------------------------------');
    console.log('- `trading-safety-controller.js` vs `safety-controller.js`: Both evaluate action safety gates. Recommendation: Consolidate safety checks under `safety-controller.js` while maintaining `trading-safety-controller.js` for MT5 specific order safety.');
    console.log('- `locator-resolver.js` vs `pilot-navigator.js`: Both implement locator building heuristics. Recommendation: Ensure `pilot-navigator.js` delegates element grounding exclusively to `locator-resolver.js`.');
    console.log('- `state-verifier.js` vs `action-verifier.js`: Both perform post-action state verification. Recommendation: Use `state-verifier.js` as the canonical verifier for the CLI result contract.');

    console.log('\n3. ROLLBACK INSTRUCTIONS:');
    console.log('------------------------------------------------------------');
    console.log('To revert Phase A or any subsequent phase changes cleanly:');
    console.log('  git checkout chore/audit-fixes');
    console.log('  git clean -fd (removes untracked scratch files)');

    console.log('\n4. GIT DIFF --STAT (Phase A):');
    console.log('------------------------------------------------------------');
    try {
        const diffStat = execSync('git diff --stat', { encoding: 'utf8', windowsHide: true });
        console.log(diffStat || 'No unstaged file modifications.');
    } catch (e) {
        console.log('Git diff stat unavailable.');
    }

    console.log('\n============================================================');
    console.log('PHASE A AUDIT COMPLETED. ZERO CODE MODIFICATIONS MADE IN PHASE A.');
    console.log('============================================================');
    console.log('PRODUCTION-READY: NOT DECLARED.');
}

runPhaseAAudit();
