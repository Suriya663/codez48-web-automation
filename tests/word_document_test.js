const assert = require('assert');
const fs = require('fs');
const nativeAppAutomation = require('../playwright-worker/native-app-automation');

async function runWordTest() {
    console.log('=== ACCEPTANCE TEST 3: WORD TECHNICAL DOCUMENT ===');

    const res = await nativeAppAutomation.createFanAutomationWordDoc();
    assert.strictEqual(res.success, true);
    assert.strictEqual(fs.existsSync(res.filePath), true);
    assert.strictEqual(fs.statSync(res.filePath).size > 0, true);

    console.log(`[PASS] Word document created and verified at: ${res.filePath}`);
    console.log('ACCEPTANCE TEST 3 PASSED SUCCESSFULLY.');
}

runWordTest().catch(err => {
    console.error('ACCEPTANCE TEST 3 FAILED:', err.message);
    process.exit(1);
});
