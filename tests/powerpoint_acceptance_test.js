const assert = require('assert');
const fs = require('fs');
const nativeAppAutomation = require('../playwright-worker/native-app-automation');

async function runPowerPointTest() {
    console.log('=== ACCEPTANCE TEST 2: POWERPOINT 10-SLIDE PRESENTATION ===');

    const res = await nativeAppAutomation.createFanAutomationPresentation();
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.slideCount, 10);
    assert.strictEqual(fs.existsSync(res.filePath), true);
    assert.strictEqual(fs.statSync(res.filePath).size > 0, true);

    console.log(`[PASS] PowerPoint 10-slide presentation created and verified at: ${res.filePath}`);
    console.log('ACCEPTANCE TEST 2 PASSED SUCCESSFULLY.');
}

runPowerPointTest().catch(err => {
    console.error('ACCEPTANCE TEST 2 FAILED:', err.message);
    process.exit(1);
});
