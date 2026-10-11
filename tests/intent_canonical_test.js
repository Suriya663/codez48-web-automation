const assert = require('assert');
const intentRouter = require('../playwright-worker/intent-router');

function runCanonicalIntentTests() {
    console.log('=== CANONICAL INTENT CLASSIFICATION TEST SUITE ===');

    // 1. Automation Intent
    const res1 = intentRouter.classifyIntent('Open this website and click the Login button on https://codez48.netlify.app/');
    assert.strictEqual(res1.intent, 'automation', 'Should classify as automation');
    console.log('[TEST 1 PASSED] "Open this website and click..." -> canonical intent: "automation"');

    // 2. Scraping Intent
    const res2 = intentRouter.classifyIntent('Scrape this URL https://codez48.netlify.app/ and extract all product names');
    assert.strictEqual(res2.intent, 'scraping', 'Should classify as scraping');
    console.log('[TEST 2 PASSED] "Scrape this URL..." -> canonical intent: "scraping"');

    // 3. Website Creation Intent
    const res3 = intentRouter.classifyIntent('Create a responsive business website with HTML, CSS, and JavaScript');
    assert.strictEqual(res3.intent, 'website_creation', 'Should classify as website_creation');
    console.log('[TEST 3 PASSED] "Create a responsive business website..." -> canonical intent: "website_creation"');

    // 4. File Edit / Local Web Intent
    const res4 = intentRouter.classifyIntent('Open C:\\Users\\suriya prakash\\OneDrive\\Desktop\\web\\pilot-workspace\\projects\\startify\\index.html and update navigation header');
    assert.strictEqual(res4.intent, 'file_edit', 'Should classify as file_edit');
    console.log('[TEST 4 PASSED] "Open C:\\...\\index.html and update..." -> canonical intent: "file_edit"');

    // 5. Website Analysis Intent
    const res5 = intentRouter.classifyIntent('Analyze this website https://lablab.ai/tech/text-generation-webui and explain its layout');
    assert.strictEqual(res5.intent, 'website_analysis', 'Should classify as website_analysis');
    console.log('[TEST 5 PASSED] "Analyze this website and explain..." -> canonical intent: "website_analysis"');

    // 6. Browser Navigation Intent
    const res6 = intentRouter.classifyIntent('Open this URL in the browser https://codez48.netlify.app/');
    assert.strictEqual(res6.intent, 'browser_navigation', 'Should classify as browser_navigation');
    console.log('[TEST 6 PASSED] "Open this URL in the browser..." -> canonical intent: "browser_navigation"');

    // 7. Ambiguous URL / Brand Intent
    const res7 = intentRouter.classifyIntent('codez48');
    assert.strictEqual(res7.intent, 'UNKNOWN', 'Ambiguous prompt should remain UNKNOWN');
    console.log('[TEST 7 PASSED] Bare brand name remains UNKNOWN intent requiring user clarification');

    console.log('ALL CANONICAL INTENT CLASSIFICATION TESTS PASSED SUCCESSFULLY.');
}

try {
    runCanonicalIntentTests();
} catch (err) {
    console.error('CANONICAL INTENT TEST FAILED:', err.message);
    process.exit(1);
}
