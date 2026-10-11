const assert = require('assert');
const fs = require('fs');
const path = require('path');
const nativeAppAutomation = require('../playwright-worker/native-app-automation');

async function runVsCodeAcceptanceTest() {
    console.log('=== VS CODE AUTOMATION & LOCAL APP PREVIEW ACCEPTANCE TEST ===');

    const result = await nativeAppAutomation.automatedVsCodeWorkflow({
        projectName: 'interactive_demo',
        port: 8080
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(fs.existsSync(result.projectPath), true);
    assert.strictEqual(result.filesChanged.length >= 3, true);
    assert.strictEqual(result.previewUrl, 'http://localhost:8080');
    assert.strictEqual(Array.isArray(result.shortcutsTriggered), true);
    assert.strictEqual(result.shortcutsTriggered.includes('CTRL+N'), true);
    assert.strictEqual(result.shortcutsTriggered.includes('CTRL+S'), true);
    assert.strictEqual(result.testOutcomes.clickVerified, true);
    assert.strictEqual(parseInt(result.testOutcomes.initialCounter, 10) >= 2, true);
    assert.strictEqual(parseInt(result.testOutcomes.updatedCounter, 10) >= 3, true);

    console.log(`[PASS] VS Code Automation Verified!`);
    console.log(`       - Project Path: ${result.projectPath}`);
    console.log(`       - Files Created: ${result.filesChanged.join(', ')}`);
    console.log(`       - Active VS Code PID: ${result.vsCodePid}`);
    console.log(`       - Keyboard Shortcuts Triggered: ${result.shortcutsTriggered.join(', ')}`);
    console.log(`       - Local Preview URL: ${result.previewUrl}`);
    console.log(`       - Initial Devices Count: "${result.testOutcomes.initialCounter}"`);
    console.log(`       - Updated Devices Count: "${result.testOutcomes.updatedCounter}"`);
    console.log(`       - Status Message: "${result.testOutcomes.statusMessage}"`);

    console.log('VS CODE AUTOMATION ACCEPTANCE TEST PASSED SUCCESSFULLY.');
}

runVsCodeAcceptanceTest().catch(err => {
    console.error('VS CODE AUTOMATION ACCEPTANCE TEST FAILED:', err.message);
    process.exit(1);
});
