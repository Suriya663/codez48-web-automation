const assert = require('assert');
const nativeAppAutomation = require('../playwright-worker/native-app-automation');

async function runCalculatorTest() {
    console.log('=== ACCEPTANCE TEST 1: CALCULATOR (7 x 8 = 56) ===');

    const res = await nativeAppAutomation.calculateAndVerify('7 * 8');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.verified, true);
    assert.strictEqual(res.result, '56');
    assert.strictEqual(typeof res.pid, 'string');
    assert.strictEqual(res.pid !== '0', true);

    console.log(`[PASS] Calculator arithmetic verified: 7 * 8 = ${res.result} (PID: ${res.pid})`);
    console.log('ACCEPTANCE TEST 1 PASSED SUCCESSFULLY.');
}

runCalculatorTest().catch(err => {
    console.error('ACCEPTANCE TEST 1 FAILED:', err.message);
    process.exit(1);
});
