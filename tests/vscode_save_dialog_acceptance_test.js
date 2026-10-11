const assert = require('assert');
const fs = require('fs');
const path = require('path');
const nativeAppAutomation = require('../playwright-worker/native-app-automation');

async function runVsCodeSaveDialogAcceptanceTest() {
    console.log('=== ACCEPTANCE TEST: STEP-BY-STEP WRITING, POWERSHELL NAVIGATION & EXPRESS API ===');

    const result = await nativeAppAutomation.automatedVsCodeSaveAsWorkflow({
        projectName: 'dynamic_express_app',
        port: 3000
    });

    console.log('[DEBUG RESULT SHORTCUTS]:', result.shortcutsTriggered);
    console.log('[DEBUG RESULT DIALOG SAVED]:', result.dialogSaved);
    console.log('[DEBUG RESULT TEXT CLEARED]:', result.textCleared);
    console.log('[DEBUG RESULT POWERSHELL PID]:', result.powerShellPid);
    console.log('[DEBUG CONFIRMATION MESSAGE]:', result.confirmationMessage);

    assert.strictEqual(result.success, true, 'Result success should be true');
    assert.strictEqual(fs.existsSync(result.projectPath), true, 'Project path should exist');
    assert.strictEqual(result.filesChanged.length >= 4, true, 'Files changed count >= 4');
    assert.strictEqual(result.dialogSaved, true, 'Dialog saved should be true');
    assert.strictEqual(result.textCleared, true, 'Text cleared should be true');
    assert.strictEqual(result.confirmationMessage, 'We have received and saved everything.', 'Confirmation message mismatch');
    assert.strictEqual(typeof result.powerShellPid, 'string', 'PowerShell PID should be string');
    assert.strictEqual(result.previewUrl, 'http://localhost:3000', 'Preview URL mismatch');
    assert.strictEqual(Array.isArray(result.shortcutsTriggered), true, 'Shortcuts triggered should be array');
    assert.strictEqual(result.shortcutsTriggered.includes('ALT+TAB'), true, 'Should include ALT+TAB');
    assert.strictEqual(result.shortcutsTriggered.includes('CTRL+N'), true, 'Should include CTRL+N');
    assert.strictEqual(result.shortcutsTriggered.includes('CTRL+S'), true, 'Should include CTRL+S');
    assert.strictEqual(result.shortcutsTriggered.includes('CTRL+A'), true, 'Should include CTRL+A');
    assert.strictEqual(result.shortcutsTriggered.includes('BACKSPACE'), true, 'Should include BACKSPACE');
    assert.strictEqual(result.shortcutsTriggered.includes('ENTER'), true, 'Should include ENTER');
    assert.strictEqual(result.testOutcomes.clickVerified, true, 'Click verified should be true');
    assert.strictEqual(parseInt(result.testOutcomes.initialCounter, 10), 2, 'Initial counter should be 2');
    assert.strictEqual(parseInt(result.testOutcomes.updatedCounter, 10), 3, 'Updated counter should be 3');

    console.log(`[PASS] VS Code Sequential Writing, PowerShell Workspace Navigation & Dynamic Express API Automation Verified!`);
    console.log(`       - Project Path: ${result.projectPath}`);
    console.log(`       - Files Saved via Save As Dialog: ${result.filesChanged.join(', ')}`);
    console.log(`       - Active VS Code PID: ${result.vsCodePid}`);
    console.log(`       - Active PowerShell Workspace PID: ${result.powerShellPid}`);
    console.log(`       - Confirmation Message: "${result.confirmationMessage}"`);
    console.log(`       - Shortcuts Triggered: ${result.shortcutsTriggered.join(', ')}`);
    console.log(`       - Live Dynamic Preview URL: ${result.previewUrl}`);
    console.log(`       - Initial Devices Count: "${result.testOutcomes.initialCounter}"`);
    console.log(`       - Updated Devices Count: "${result.testOutcomes.updatedCounter}"`);
    console.log(`       - Status Message: "${result.testOutcomes.statusMessage}"`);

    console.log('ACCEPTANCE TEST PASSED SUCCESSFULLY.');
}

runVsCodeSaveDialogAcceptanceTest().catch(err => {
    console.error('VS CODE SAVE AS DIALOG ACCEPTANCE TEST FAILED:', err.message);
    process.exit(1);
});
