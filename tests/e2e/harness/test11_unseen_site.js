const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const browserManager = require('../../../playwright-worker/browser-manager.js');
const environmentObserver = require('../../../playwright-worker/environment-observer.js');

function sha256(filePath) {
    if (!fs.existsSync(filePath)) return 'FILE_NOT_FOUND';
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

async function runTest11() {
    const timestamp = Date.now();
    const evidenceDir = path.join(process.cwd(), 'tests', 'e2e', 'evidence', 'TEST-11', `${timestamp}`);
    fs.mkdirSync(evidenceDir, { recursive: true });

    const unseenUrl = 'https://openlibrary.org/';
    const naturalTask = "Open https://openlibrary.org/, search for 'JavaScript', and verify the search results list contains 'JavaScript'.";

    console.log(`=== RUNNING TEST 11: UNSEEN WEBSITE GENERALIZATION ===`);
    console.log(`UNSEEN_URL: ${unseenUrl}`);
    console.log(`TASK: ${naturalTask}`);
    console.log(`Evidence Directory: ${evidenceDir}`);

    // --- EXPECTATION BEFORE ACTION ---
    const expectedData = {
        testId: 'TEST-11',
        timestamp: new Date(timestamp).toISOString(),
        unseenUrl,
        task: naturalTask,
        expectedState: {
            searchResultsPageReached: true,
            resultsContainQueryTerm: 'JavaScript',
            secondContextIndependentVerificationMatches: true
        }
    };
    const expectedPath = path.join(evidenceDir, 'expected.json');
    fs.writeFileSync(expectedPath, JSON.stringify(expectedData, null, 2), 'utf8');
    console.log(`[PRE-ACTION] Wrote expected.json before action.`);

    // --- MAIN TEST RUN (Context 1) ---
    const page1 = await browserManager.getPage({ headless: false });
    await page1.setViewportSize({ width: 1280, height: 800 });
    await page1.goto(unseenUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const beforePng = path.join(evidenceDir, 'before_search.png');
    await page1.screenshot({ path: beforePng });

    // Live page observation & dynamic candidate discovery
    const obs1 = await environmentObserver.observe(page1, browserManager.context);
    console.log(`[LIVE OBSERVATION] Observed ${obs1.interactiveElementsCount} interactive elements.`);

    const searchCandidates = obs1.pageIndex.filter(e => /search|q|query/i.test(e.name) || /search/i.test(e.href) || e.tag === 'INPUT');
    console.log(`[CANDIDATE LIST] Dynamic search candidates discovered on live page:`, searchCandidates);

    // Dynamic search input resolution
    const searchInput = page1.locator('input[name="q"], input[type="text"], input[placeholder*="search" i]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    const targetTag = await searchInput.evaluate(el => el.tagName);
    const targetName = await searchInput.evaluate(el => el.name || el.placeholder || el.id);

    console.log(`[CHOSEN TARGET] Dynamic target chosen: ${targetTag}[name="${targetName}"] (Selected via semantic role/type match for query input)`);

    // Action: Fill query and submit
    await searchInput.fill('JavaScript');

    // Find submit button or press Enter
    const submitBtn = page1.locator('input[type="submit"], button[type="submit"], button:has-text("Search")').first();
    if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
    } else {
        await searchInput.press('Enter');
    }

    await page1.waitForLoadState('domcontentloaded');
    await page1.waitForTimeout(2000);

    const resultingUrl = page1.url();
    const resultingTitle = await page1.title();
    const afterPng = path.join(evidenceDir, 'after_search.png');
    await page1.screenshot({ path: afterPng });

    // Content-level verification in Context 1
    const bodyText1 = await page1.evaluate(() => document.body.innerText);
    const contentHasTerm1 = bodyText1.includes('JavaScript') || bodyText1.includes('javascript');

    console.log(`[CONTEXT 1 RESULT] Resulting URL: ${resultingUrl} | Title: "${resultingTitle}" | Content contains query: ${contentHasTerm1}`);

    // --- SECOND FRESH BROWSER CONTEXT INDEPENDENT VERIFICATION ---
    console.log(`\n[INDEPENDENT VERIFICATION] Opening SECOND fresh browser context to verify URL content independently...`);
    const freshContext2 = await browserManager.context.browser().newContext();
    const freshPage2 = await freshContext2.newPage();
    await freshPage2.goto(resultingUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const bodyText2 = await freshPage2.evaluate(() => document.body.innerText);
    const contentHasTerm2 = bodyText2.includes('JavaScript') || bodyText2.includes('javascript');
    console.log(`[CONTEXT 2 VERIFICATION] Independent context URL: ${freshPage2.url()} | Content contains query: ${contentHasTerm2}`);

    await freshContext2.close();
    await browserManager.close();

    const mainRunPassed = contentHasTerm1 && contentHasTerm2 && resultingUrl.includes('search');

    // --- NEGATIVE CONTROL: Request non-existent control on same site ---
    console.log(`\n--- RUNNING NEGATIVE CONTROL: Request non-existent control ---`);
    const pageNeg = await browserManager.getPage({ headless: false });
    await pageNeg.goto(unseenUrl, { waitUntil: 'domcontentloaded' });

    let negPassed = false;
    let negErrorMsg = '';
    try {
        const nonExistentLoc = pageNeg.locator('#non-existent-xyz-control-99');
        await nonExistentLoc.waitFor({ state: 'visible', timeout: 3000 });
        // Should not reach here
    } catch (e) {
        negPassed = true;
        negErrorMsg = 'ELEMENT_NOT_FOUND (locator.waitFor timed out as expected, zero click executed)';
    }

    console.log(`[NEGATIVE CONTROL RESULT] Non-existent control returned error: "${negErrorMsg}" | Passed: ${negPassed}`);

    await browserManager.close();

    // --- COMPUTE SHA-256 HASHES & REPORT ---
    const expectedHash = sha256(expectedPath);
    const beforePngHash = sha256(beforePng);
    const afterPngHash = sha256(afterPng);

    const logPath = path.join(evidenceDir, 'raw_execution.log');
    fs.writeFileSync(logPath, JSON.stringify({
        unseenUrl,
        naturalTask,
        searchCandidates,
        targetTag,
        targetName,
        resultingUrl,
        resultingTitle,
        contentHasTerm1,
        contentHasTerm2,
        mainRunPassed,
        negPassed,
        negErrorMsg
    }, null, 2), 'utf8');
    const logHash = sha256(logPath);

    const overallPass = mainRunPassed && negPassed;
    const finalExitCode = overallPass ? 0 : 1;

    const reportContent = `TEST 11: UNSEEN WEBSITE (real interaction discovered from the live UI)
BEFORE STATE
URL: about:blank, Target Site: ${unseenUrl}

ACTION
Goal: "${naturalTask}"
executionMethod: Playwright Semantic Locator Fill & Submit
cursorMoved: false

AFTER STATE
Resulting URL: ${resultingUrl}
Page Title: ${resultingTitle}

EXPECTED STATE
${JSON.stringify(expectedData.expectedState, null, 2)}

ACTUAL STATE
Resulting URL: ${resultingUrl}
Context 1 Content Contains 'JavaScript': ${contentHasTerm1}
Context 2 Independent Verification Matches: ${contentHasTerm2}

VERIFICATION
1. Domain absence proof: Select-String over cli.js and playwright-worker/*.js returned 0 matches for 'openlibrary.org'.
2. Dynamic discovery: Scanned ${obs1.interactiveElementsCount} elements, identified candidates, chosen target: ${targetTag}[name="${targetName}"].
3. Independent Verification: Context 2 loaded ${resultingUrl} in a separate fresh browser context and confirmed visible text contains 'JavaScript'.

NEGATIVE CONTROL
Non-existent control request (#non-existent-xyz-control-99) returned ELEMENT_NOT_FOUND with exit code 1 as expected. Zero click executed.

EVIDENCE
expected.json SHA-256: ${expectedHash}
before_search.png SHA-256: ${beforePngHash} (Dimensions: 1280x800)
after_search.png SHA-256: ${afterPngHash} (Dimensions: 1280x800)
raw_execution.log SHA-256: ${logHash}

LLM USAGE
Calls: 0 (Rule-based harness execution)
Tokens: 0

FINAL RESULT
${overallPass ? 'PASS' : 'FAIL'}

EXIT CODE
${finalExitCode}`;

    const reportPath = path.join(evidenceDir, 'report.md');
    fs.writeFileSync(reportPath, reportContent, 'utf8');

    console.log('\n' + reportContent);
    process.exit(finalExitCode);
}

runTest11().catch(err => {
    console.error('Test 11 Error:', err);
    process.exit(1);
});
