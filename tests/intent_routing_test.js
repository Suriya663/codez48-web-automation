const assert = require('assert');
const intentRouter = require('../playwright-worker/intent-router');

function runTests() {
    console.log('=== INTENT ROUTING TEST SUITE ===');

    // Test 1: Explicit 'scraping' keyword
    const res1 = intentRouter.classifyIntent('scraping https://codez48.netlify.app/');
    assert.strictEqual(res1.intent, 'WEBSITE_CODE_RECONSTRUCTION');
    console.log('[TEST 1 PASSED] "scraping" keyword securely routes to code reconstruction');

    // Test 2: Explicit 'automation' keyword
    const res2 = intentRouter.classifyIntent('run automation for https://codez48.netlify.app/');
    assert.strictEqual(res2.intent, 'WEB_AUTOMATION');
    console.log('[TEST 2 PASSED] "automation" keyword securely routes to web automation');

    // Test 3: Ambiguous brand name
    const res3 = intentRouter.classifyIntent('codez48');
    assert.strictEqual(res3.intent, 'UNKNOWN');
    console.log('[TEST 3 PASSED] Ambiguous brand name correctly flags as UNKNOWN intent');

    // Test 4: URL with other code keywords
    const res4 = intentRouter.classifyIntent('recreate site https://example.com');
    assert.strictEqual(res4.intent, 'WEBSITE_CODE_RECONSTRUCTION');
    console.log('[TEST 4 PASSED] Standard reconstruction keywords function normally');

    console.log('ALL INTENT ROUTING TESTS PASSED SUCCESSFULLY.');
}

try {
    runTests();
} catch (err) {
    console.error('INTENT ROUTING TEST FAILED:', err.message);
    process.exit(1);
}
