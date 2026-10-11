const assert = require('assert');
const fs = require('fs');
const path = require('path');
const pilotNavigator = require('../playwright-worker/pilot-navigator.js');

async function runDataScrapeAcceptanceTest() {
    console.log('=== ACCEPTANCE TEST: DATA SCRAPING ===');

    const targetUrl = 'https://codez48.netlify.app';
    const instructions = 'Scrape the public product names from https://codez48.netlify.app';

    const result = await pilotNavigator.extractData(
        targetUrl,
        instructions
    );

    console.log('[DEBUG SCRAPE RESULT]:', result);

    assert.strictEqual(result.success, true, 'Result success should be true');
    assert.strictEqual(typeof result.filePath, 'string', 'Should return a saved file path');
    assert.strictEqual(fs.existsSync(result.filePath), true, 'File should exist on disk');

    const content = fs.readFileSync(result.filePath, 'utf8');
    assert.ok(content.includes('Type,Content'), 'CSV header should be present');
    assert.ok(result.extractedItemsCount > 0, 'Should extract at least some items');

    console.log(`[PASS] Web Data Extraction Verified!`);
    console.log(`       - Target URL: ${result.targetUrl}`);
    console.log(`       - Saved Data Path: ${result.filePath}`);
    console.log(`       - Items Extracted: ${result.extractedItemsCount}`);

    console.log('DATA SCRAPE ACCEPTANCE TEST PASSED SUCCESSFULLY.');
}

runDataScrapeAcceptanceTest().catch(err => {
    console.error('DATA SCRAPE ACCEPTANCE TEST FAILED:', err.message);
    process.exit(1);
});
