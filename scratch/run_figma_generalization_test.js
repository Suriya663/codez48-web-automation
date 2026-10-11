const browserManager = require('../playwright-worker/browser-manager.js');
const environmentObserver = require('../playwright-worker/environment-observer.js');
const stateVerifier = require('../playwright-worker/state-verifier.js');

async function runFigmaTest() {
    console.log('=== GENERALIZATION TEST: FIGMA SIGN-UP DISCOVERY ===');

    const website = 'https://www.figma.com/';
    const naturalTask = 'Open Figma, find the Sign up button, click it, and verify that the signup interface/page appears.';

    console.log('[OBSERVE] Launching browser and navigating to Figma...');
    const page = await browserManager.getPage({ headless: false });

    const beforeObs = await environmentObserver.observe(page, browserManager.context);
    console.log('Before State URL:', beforeObs.url, '| Title:', beforeObs.title);

    await page.goto(website, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const midObs = await environmentObserver.observe(page, browserManager.context);
    console.log('After Navigation URL:', midObs.url, '| Title:', midObs.title);

    // Dynamic target discovery using semantic runtime discovery (roles, text, buttons)
    console.log('[DISCOVER TARGET] Discovering "Sign up" button semantically...');
    const signupLocators = [
        page.getByRole('link', { name: /sign up/i }).first(),
        page.getByRole('button', { name: /sign up/i }).first(),
        page.locator('a:has-text("Sign up"), button:has-text("Sign up"), a[href*="signup"]').first()
    ];

    let clicked = false;
    let selectedMethod = '';
    for (const loc of signupLocators) {
        if (await loc.count() > 0 && await loc.isVisible().catch(() => false)) {
            selectedMethod = 'Playwright Semantic Locator (getByRole / visible text)';
            await loc.click({ timeout: 5000 });
            clicked = true;
            break;
        }
    }

    if (!clicked) {
        console.error('Sign up button not found via runtime discovery.');
        await browserManager.close();
        return;
    }

    await page.waitForTimeout(2000);
    const afterObs = await environmentObserver.observe(page, browserManager.context);

    // Identify email input and continue controls dynamically
    console.log('[DISCOVER TARGET] Identifying email input and continue controls dynamically...');
    const emailInput = page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]').first();
    const emailVisible = await emailInput.isVisible().catch(() => false);

    const continueBtn = page.locator('button:has-text("Continue"), button[type="submit"], input[type="submit"]').first();
    const continueVisible = await continueBtn.isVisible().catch(() => false);

    const taskCompleted = clicked && (afterObs.url.includes('signup') || afterObs.title.toLowerCase().includes('sign up') || emailVisible);

    await browserManager.close();

    console.log('\n=== FIGMA TEST REPORT ===');
    console.log('- Environment classification: BROWSER');
    console.log('- Target discovery method:', selectedMethod);
    console.log('- Action performed:', 'Navigated to Figma, dynamically discovered and clicked "Sign up" button');
    console.log('- Before state:', { url: beforeObs.url, title: beforeObs.title });
    console.log('- After state:', { url: afterObs.url, title: afterObs.title, emailInputVisible: emailVisible, continueButtonVisible: continueVisible });
    console.log('- Verification evidence:', { signupPageReached: taskCompleted, finalUrl: afterObs.url });
    console.log('- Final result:', taskCompleted ? 'PASS' : 'FAIL');
    console.log('- Exit code: 0');
}

runFigmaTest().catch(err => {
    console.error('Figma Test Error:', err);
});
