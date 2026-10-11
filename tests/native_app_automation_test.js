const assert = require('assert');
const appResolver = require('../playwright-worker/app-resolver');
const nativeAppAutomation = require('../playwright-worker/native-app-automation');

async function runNativeAppTests() {
    console.log('=== STAGE C NATIVE APP AUTOMATION TEST SUITE ===');

    // Test 1: Application Discovery Probe
    const notepadStatus = appResolver.resolveApp('notepad');
    assert.strictEqual(notepadStatus.matched, true);
    assert.strictEqual(notepadStatus.installed, true);
    assert.strictEqual(typeof notepadStatus.executablePath, 'string');
    console.log('[TEST 1 PASSED] Notepad app resolution and path verification');

    // Test 2: Missing Application Handling
    const missingStatus = appResolver.resolveApp('non_existent_app_12345');
    assert.strictEqual(missingStatus.matched, false);
    assert.strictEqual(missingStatus.installed, false);
    console.log('[TEST 2 PASSED] Unknown application resolution handled cleanly');

    // Test 3: Notepad End-to-End Launch & Window Title / Process Verification
    const notepadRes = await nativeAppAutomation.launchNotepadAndWriteText('Stage C Automated Integration Test String');
    assert.strictEqual(notepadRes.success, true);
    assert.notStrictEqual(notepadRes.pid, '0');
    assert.strictEqual(typeof notepadRes.windowTitle, 'string');
    console.log(`[TEST 3 PASSED] Notepad launched and verified. PID: ${notepadRes.pid}, Window Title: "${notepadRes.windowTitle}"`);

    // Test 4: Calculator Automation & Expression Evaluation
    const calcRes = await nativeAppAutomation.calculate('25 * 8');
    assert.strictEqual(calcRes.success, true);
    assert.strictEqual(calcRes.result, '200');
    console.log('[TEST 4 PASSED] Calculator calculation verified (25 * 8 = 200)');

    console.log('ALL NATIVE APP AUTOMATION TESTS PASSED SUCCESSFULLY.');
}

runNativeAppTests().catch(err => {
    console.error('NATIVE APP AUTOMATION TEST FAILED:', err.message);
    process.exit(1);
});
