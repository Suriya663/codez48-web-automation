const assert = require('assert');
const intentRouter = require('../playwright-worker/intent-router.js');

function runTests() {
    let passed = 0;
    let failed = 0;

    const testCases = [
        {
            goal: "Open this website and show me its homepage: https://example.com",
            expectedIntent: "BROWSE_WEBSITE"
        },
        {
            goal: "Scrape the public product names, prices, and links from https://example.com",
            expectedIntent: "WEB_SCRAPE"
        },
        {
            goal: "Analyze https://example.com and explain its layout, technologies, and visible functionality",
            expectedIntent: "WEBSITE_ANALYSIS"
        },
        {
            goal: "Extract the accessible website resources from https://example.com and recreate the site as a complete local HTML/CSS/JavaScript project in VS Code",
            expectedIntent: "WEBSITE_CODE_RECONSTRUCTION"
        },
        {
            goal: "Open https://example.com, log into my authorized test account, complete the specified form, submit it, and verify the result",
            expectedIntent: "WEB_AUTOMATION"
        },
        {
            goal: "Test whether the contact form works on my website https://example.com",
            expectedIntent: "WEBSITE_TESTING"
        },
        {
            goal: "Fetch code for https://example.com",
            expectedIntent: "WEBSITE_CODE_RECONSTRUCTION"
        },
        {
            goal: "https://example.com",
            expectedIntent: "BROWSE_WEBSITE" // Default for naked URL
        },
        {
            goal: "Look at this https://example.com", // Unrelated text but too short to be ambiguous, or should be ambiguous?
            expectedIntent: "UNKNOWN" // Or BROWSE_WEBSITE if < 5 chars stripped. Let's see: length is > 5 so UNKNOWN.
        },
        {
            goal: "Create a calculator that adds 2+2",
            expectedIntent: "GENERAL_AUTOMATION_CALC"
        }
    ];

    console.log("=== RUNNING INTENT ROUTER REGRESSION TESTS ===");

    testCases.forEach((tc, idx) => {
        try {
            const result = intentRouter.classifyIntent(tc.goal);
            assert.strictEqual(result.intent, tc.expectedIntent, `Test ${idx+1} Failed: Expected ${tc.expectedIntent}, got ${result.intent}`);
            console.log(`[PASS] Test ${idx+1}: "${tc.goal}" -> ${result.intent}`);
            passed++;
        } catch (e) {
            console.error(`[FAIL] Test ${idx+1}: "${tc.goal}" -> ${e.message}`);
            failed++;
        }
    });

    console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests();
