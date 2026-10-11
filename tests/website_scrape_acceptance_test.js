const assert = require('assert');
const fs = require('fs');
const path = require('path');
const pilotNavigator = require('../playwright-worker/pilot-navigator');

async function runWebsiteScrapeAcceptanceTest() {
    console.log('=== ACCEPTANCE TEST: WEBSITE RECONSTRUCTION, SECURITY & REGRESSION MATRIX ===');

    // 1. Test Protected Official Primary Domain Without Opt-in -> Blocked
    console.log('[TEST 1] Testing protected primary domain without opt-in...');
    const res1 = await pilotNavigator.scrapeAndCloneWebsite('https://codez48.netlify.app/', 'startify', 8080);
    assert.strictEqual(res1.success, false, 'Primary official domain without opt-in should be blocked');
    assert.strictEqual(res1.error, 'OFFICIAL_PRIMARY_DOMAIN_PROTECTED', 'Error code should be OFFICIAL_PRIMARY_DOMAIN_PROTECTED');
    console.log('[TEST 1 PASSED] Official primary domain protected without opt-in');

    // 2. Test Lookalike Domain -> NOT mistaken for official domain
    console.log('[TEST 2] Testing lookalike domain parsing...');
    const isLookalikeOfficial = pilotNavigator.isOfficialPrimaryDomain('https://codez48.fake-domain.com/');
    assert.strictEqual(isLookalikeOfficial, false, 'Lookalike domain codez48.fake-domain.com must NOT be matched as official');
    console.log('[TEST 2 PASSED] Lookalike domain correctly parsed as third-party site');

    // 3. Test Explicit Opt-in -> Authorized
    console.log('[TEST 3] Testing explicit opt-in for owned domain...');
    const res3 = await pilotNavigator.scrapeAndCloneWebsite('https://codez48.netlify.app/', 'startify', 8080, { allowOfficial: true });
    assert.strictEqual(res3.success, true, 'Official domain with allowOfficial: true should succeed');
    assert.strictEqual(res3.confirmationMessage, 'We have received and saved everything.');
    console.log('[TEST 3 PASSED] Official domain allowed with explicit opt-in flag');

    // 4. Test Invalid / Malformed URL -> Blocked
    console.log('[TEST 4] Testing invalid URL strings...');
    const res4 = await pilotNavigator.scrapeAndCloneWebsite('not-a-valid-url', 'startify', 8080);
    assert.strictEqual(res4.success, false, 'Invalid URL string should be rejected');
    assert.strictEqual(res4.error, 'INVALID_URL', 'Error code should be INVALID_URL');

    const res4b = await pilotNavigator.scrapeAndCloneWebsite('ftp://example.com/file.txt', 'startify', 8080);
    assert.strictEqual(res4b.success, false, 'FTP protocol should be rejected');
    assert.strictEqual(res4b.error, 'INVALID_URL', 'Error code should be INVALID_URL');
    console.log('[TEST 4 PASSED] Invalid & non-HTTP URLs rejected safely');

    // 5. Test SSRF Protection (localhost / private IPs)...
    console.log('[TEST 5] Testing SSRF protection (localhost / private IPs)...');
    const res5 = await pilotNavigator.scrapeAndCloneWebsite('http://169.254.169.254/latest/meta-data/', 'startify', 8080);
    assert.strictEqual(res5.success, false, 'SSRF attempt to AWS metadata IP should be rejected');
    assert.strictEqual(res5.error, 'INVALID_URL', 'Error code should be INVALID_URL');
    console.log('[TEST 5 PASSED] SSRF attempt rejected safely');

    // 6. Test Extraction Failure -> Fail Closed (No placeholder HTML substitution)
    console.log('[TEST 6] Testing extraction failure on non-existent domain...');
    const res6 = await pilotNavigator.scrapeAndCloneWebsite('https://this-domain-definitely-does-not-exist-123456789.org/', 'startify', 8080);
    assert.strictEqual(res6.success, false, 'Extraction failure must fail closed');
    assert.strictEqual(res6.error, 'EXTRACTION_FAILED', 'Error code should be EXTRACTION_FAILED');
    console.log('[TEST 6 PASSED] Extraction failure failed closed without placeholder substitution');

    // 7. Test Successful Reconstruction of Authorized Third-Party Site
    console.log('[TEST 7] Testing successful reconstruction of third-party site...');
    const targetUrl = 'https://lablab.ai/tech/text-generation-webui';
    const projectName = 'lablab_text_generation_webui';
    const port = 8080;

    const res7 = await pilotNavigator.scrapeAndCloneWebsite(
        targetUrl,
        projectName,
        port
    );

    assert.strictEqual(res7.success, true, 'Result success should be true');
    assert.strictEqual(fs.existsSync(res7.projectPath), true, 'Project folder should exist on disk');
    assert.strictEqual(res7.filesChanged.includes('index.html'), true, 'Should include index.html');
    assert.strictEqual(res7.filesChanged.includes('style.css'), true, 'Should include style.css');
    assert.strictEqual(res7.filesChanged.includes('script.js'), true, 'Should include script.js');
    assert.strictEqual(res7.confirmationMessage, 'We have received and saved everything.', 'Confirmation message mismatch');
    assert.strictEqual(res7.previewUrl, `http://localhost:${port}`, 'Preview URL mismatch');
    assert.strictEqual(typeof res7.scrapedTitle, 'string', 'Scraped title should be string');
    assert.strictEqual(typeof res7.resourceSummary.htmlBytes, 'number', 'htmlBytes should be number');

    console.log(`[PASS] Website Source Code Retrieval, Reconstruction & Local Preview Verified!`);
    console.log(`       - Target URL: ${res7.targetUrl}`);
    console.log(`       - Scraped Page Title: "${res7.scrapedTitle}"`);
    console.log(`       - Workspace Path: ${res7.projectPath}`);
    console.log(`       - Files Reconstructed & Saved: ${res7.filesChanged.join(', ')}`);
    console.log(`       - Active VS Code PID: ${res7.vsCodePid}`);
    console.log(`       - Active PowerShell Workspace PID: ${res7.powerShellPid}`);
    console.log(`       - Resource Summary: HTML Bytes=${res7.resourceSummary.htmlBytes}, TailwindInjected=${res7.resourceSummary.tailwindCdnInjected}`);
    console.log(`       - Confirmation Message: "${res7.confirmationMessage}"`);
    console.log(`       - Live Local Preview URL: ${res7.previewUrl}`);

    console.log('WEBSITE SCRAPE ACCEPTANCE TEST PASSED SUCCESSFULLY.');
}

runWebsiteScrapeAcceptanceTest().catch(err => {
    console.error('WEBSITE SCRAPE ACCEPTANCE TEST FAILED:', err.message);
    process.exit(1);
});
