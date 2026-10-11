const assert = require('assert');
const fs = require('fs');
const path = require('path');
const pilotNavigator = require('../playwright-worker/pilot-navigator');

async function runWebsiteScrapeAcceptanceTest() {
    console.log('=== ACCEPTANCE TEST: WEBSITE RECONSTRUCTION, VS CODE SETUP & LOCAL PREVIEW ===');

    const targetUrl = 'https://lablab.ai/tech/text-generation-webui';
    const projectName = 'lablab_text_generation_webui';
    const port = 8080;

    const result = await pilotNavigator.scrapeAndCloneWebsite(
        targetUrl,
        projectName,
        port
    );

    console.log('[DEBUG SCRAPE RESULT]:', result);

    assert.strictEqual(result.success, true, 'Result success should be true');
    assert.strictEqual(fs.existsSync(result.projectPath), true, 'Project folder should exist on disk');
    assert.strictEqual(result.filesChanged.includes('index.html'), true, 'Should include index.html');
    assert.strictEqual(result.filesChanged.includes('style.css'), true, 'Should include style.css');
    assert.strictEqual(result.filesChanged.includes('script.js'), true, 'Should include script.js');
    assert.strictEqual(result.confirmationMessage, 'We have received and saved everything.', 'Confirmation message mismatch');
    assert.strictEqual(result.previewUrl, `http://localhost:${port}`, 'Preview URL mismatch');
    assert.strictEqual(typeof result.scrapedTitle, 'string', 'Scraped title should be string');

    console.log(`[PASS] Website Source Code Retrieval, Reconstruction & Local Preview Verified!`);
    console.log(`       - Target URL: ${result.targetUrl}`);
    console.log(`       - Scraped Page Title: "${result.scrapedTitle}"`);
    console.log(`       - Workspace Path: ${result.projectPath}`);
    console.log(`       - Files Reconstructed & Saved: ${result.filesChanged.join(', ')}`);
    console.log(`       - Active VS Code PID: ${result.vsCodePid}`);
    console.log(`       - Active PowerShell Workspace PID: ${result.powerShellPid}`);
    console.log(`       - Confirmation Message: "${result.confirmationMessage}"`);
    console.log(`       - Live Local Preview URL: ${result.previewUrl}`);

    console.log('WEBSITE SCRAPE ACCEPTANCE TEST PASSED SUCCESSFULLY.');
}

runWebsiteScrapeAcceptanceTest().catch(err => {
    console.error('WEBSITE SCRAPE ACCEPTANCE TEST FAILED:', err.message);
    process.exit(1);
});
