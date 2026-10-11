const assert = require('assert');
const pilotNavigator = require('../playwright-worker/pilot-navigator');

async function runGoogleAiStudioTest() {
    console.log('=== ACCEPTANCE TEST 6: GOOGLE AI STUDIO BROWSER INSPECTION ===');

    const result = await pilotNavigator.navigateAndInteract('https://aistudio.google.com/', null);
    assert.strictEqual(result.success, true);
    assert.strictEqual(typeof result.finalUrl, 'string');
    assert.strictEqual(result.finalUrl.includes('aistudio.google.com'), true);

    console.log(`[PASS] Google AI Studio inspected cleanly. Final URL: "${result.finalUrl}", Final Title: "${result.finalTitle}"`);
    console.log('ACCEPTANCE TEST 6 PASSED SUCCESSFULLY.');
}

runGoogleAiStudioTest().catch(err => {
    console.error('ACCEPTANCE TEST 6 FAILED:', err.message);
    process.exit(1);
});
