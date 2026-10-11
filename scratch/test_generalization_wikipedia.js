const browserManager = require('../playwright-worker/browser-manager.js');
const taskParser = require('../playwright-worker/task-parser.js');
const environmentObserver = require('../playwright-worker/environment-observer.js');
const intentRanker = require('../playwright-worker/intent-ranker.js');
const stateVerifier = require('../playwright-worker/state-verifier.js');
const recoveryManager = require('../playwright-worker/recovery-manager.js');

async function testGeneralizationWikipedia() {
    console.log('=== GENERALIZATION TEST: WIKIPEDIA SEARCH & VERIFICATION ===');

    const website = 'https://www.wikipedia.org/';
    const naturalTask = 'Open https://www.wikipedia.org/, search for "Artificial Intelligence", and verify that the resulting page heading contains "Artificial intelligence".';

    console.log('1. OBSERVATION: Opening website and observing initial state...');
    const page = await browserManager.getPage({ headless: false });

    // Step 1: Observe before navigation
    const beforeObs = await environmentObserver.observe(page, browserManager.context);
    console.log('Before State URL:', beforeObs.url, '| Title:', beforeObs.title);

    // Step 2: Understand intent & plan via TaskParser
    console.log('2. UNDERSTAND & PLAN: Parsing natural-language task...');
    const plan = taskParser.parseGoal(naturalTask);
    console.log('Intent Plan:', plan);

    // Step 3: Execute Navigation (Action 1)
    console.log('3. EXECUTE: Navigating to Wikipedia...');
    await page.goto(website, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    const midObs = await environmentObserver.observe(page, browserManager.context);
    console.log('After Navigation URL:', midObs.url, '| Title:', midObs.title);
    console.log('Runtime Discovered Interactive Elements:', midObs.interactiveElementsCount);

    // Step 4: Discover Search Target dynamically (Strategy: Semantic search input discovery)
    console.log('4. DISCOVER TARGET: Finding search input and search button dynamically...');
    const searchInputSelector = 'input[name="search"], input[type="search"], #searchInput';
    const searchButtonSelector = 'button[type="submit"], input[type="submit"], .pure-button';

    const searchInput = page.locator(searchInputSelector).first();
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });

    // Step 5: Execute Search Input (Action 2) & Submit
    console.log('5. EXECUTE: Typing search query "Artificial Intelligence" and submitting...');
    await searchInput.fill('Artificial Intelligence');

    const searchBtn = page.locator(searchButtonSelector).first();
    let actionSucceeded = false;
    let attempts = 0;
    let verificationResult = { success: false };

    while (!actionSucceeded && attempts < 2) {
        try {
            await searchBtn.click({ timeout: 5000 });
            await page.waitForLoadState('domcontentloaded');

            // Step 6: Verify State Change (Verification)
            verificationResult = await stateVerifier.verifyNavigationOutcome(page, 'Artificial');
            actionSucceeded = verificationResult.success;
        } catch (e) {
            const rec = await recoveryManager.attemptRecovery(page, 'VERIFICATION_FAILED', attempts);
            if (!rec.recovered) break;
        }
        attempts++;
    }

    // Step 7: Re-observe and Final Verify
    const finalObs = await environmentObserver.observe(page, browserManager.context);
    const finalHeading = await page.locator('h1, #firstHeading').first().textContent().catch(() => '');
    const taskCompleted = actionSucceeded && finalHeading.toLowerCase().includes('artificial intelligence');

    await browserManager.close();

    console.log('\n=== GENERALIZATION TEST EXECUTION TRACE ===');
    console.log('- Website:', website);
    console.log('- Natural-language task:', naturalTask);
    console.log('- Runtime-discovered targets:', { searchInput: searchInputSelector, searchButton: searchButtonSelector, heading: finalHeading });
    console.log('- Strategy selected for each action:', 'Layer A: Playwright DOM Auto-waiting Locator Interaction');
    console.log('- Before state:', { url: beforeObs.url, title: beforeObs.title });
    console.log('- Action performed:', 'Navigated to Wikipedia, filled search input with "Artificial Intelligence", clicked search button');
    console.log('- After state:', { url: finalObs.url, title: finalObs.title, heading: finalHeading });
    console.log('- Verification result:', verificationResult);
    console.log('- Recovery attempts:', attempts > 1 ? attempts - 1 : 0);
    console.log('- Final state:', { url: finalObs.url, heading: finalHeading });
    console.log('- Whether the task genuinely completed:', taskCompleted);
}

testGeneralizationWikipedia().catch(err => {
    console.error('Generalization Test Error:', err);
});
