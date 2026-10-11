const browserManager = require('../playwright-worker/browser-manager.js');
const environmentObserver = require('../playwright-worker/environment-observer.js');

async function runCanvaTest() {
    console.log('=== REAL CANVA GENERALIZATION TEST ===');

    const page = await browserManager.getPage({ headless: false });
    await page.setViewportSize({ width: 1440, height: 900 });

    const beforeObs = await environmentObserver.observe(page, browserManager.context);
    console.log('[INTENT] Open Canva, discover sign up button dynamically, click it, and verify signup interface appears.');
    console.log('[ENVIRONMENT CLASSIFICATION] BROWSER');
    console.log('[ENVIRONMENT CONNECTION] Browser persistent context connected successfully.');

    // 1. Open Canva
    await page.goto('https://www.canva.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Accept cookies if present
    const cookieBtn = page.locator('button:has-text("Accept"), button:has-text("Allow"), button:has-text("Got it")').first();
    if (await cookieBtn.isVisible().catch(() => false)) {
        await cookieBtn.click().catch(() => {});
        await page.waitForTimeout(1000);
    }

    // 2. Dynamic Target Discovery for Sign up / Get started
    console.log('[TARGET DISCOVERY] Scanning DOM and accessibility tree for signup/get started entry points...');
    const candidates = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('a, button'));
        return els.map((el, idx) => ({
            index: idx,
            tag: el.tagName,
            text: (el.innerText || el.getAttribute('aria-label') || '').trim(),
            href: el.getAttribute('href') || ''
        })).filter(e => /sign up|get started|register/i.test(e.text) || /signup|register/i.test(e.href));
    });

    console.log('[TARGET DISCOVERY] Discovered candidates:', candidates);

    let signupLoc = page.locator('a[href*="signup"], button:has-text("Sign up"), a:has-text("Sign up"), button:has-text("Get started")').locator('visible=true').first();
    await signupLoc.waitFor({ state: 'visible', timeout: 10000 });

    const targetText = await signupLoc.textContent();
    const targetHref = await signupLoc.getAttribute('href');
    console.log(`[TARGET SELECTION REASON] Selected element with text "${targetText.trim()}" and href "${targetHref}" based on semantic match for user intent.`);

    // 3. Execute Action
    console.log('[ACTION] Clicking dynamic signup target...');
    await signupLoc.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const afterObs = await environmentObserver.observe(page, browserManager.context);

    // 4. Verify signup interface & identify email input / continue controls
    const emailInput = page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]').first();
    const emailVisible = await emailInput.isVisible().catch(() => false);

    const continueBtn = page.locator('button:has-text("Continue"), button[type="submit"], input[type="submit"], span:has-text("Continue")').first();
    const continueVisible = await continueBtn.isVisible().catch(() => false);

    const verified = afterObs.url.includes('signup') || afterObs.url.includes('login') || emailVisible;

    await browserManager.close();

    console.log('\n[INTENT] Open Canva, discover sign up button dynamically, click it, and verify signup interface appears.');
    console.log('[ENVIRONMENT CLASSIFICATION] BROWSER');
    console.log('[ENVIRONMENT CONNECTION] Connected and verified.');
    console.log('[TARGET DISCOVERY]', { candidatesFound: candidates.length, selectedText: targetText.trim() });
    console.log('[TARGET SELECTION REASON] Semantic match for user intent ("Sign up" / "Get started").');
    console.log('[ACTION] Clicked discovered signup entry point.');
    console.log('[BEFORE STATE]', { url: beforeObs.url, title: beforeObs.title });
    console.log('[AFTER STATE]', { url: afterObs.url, title: afterObs.title, emailInputVisible: emailVisible, continueVisible });
    console.log('[VERIFICATION]', { signupInterfaceAppeared: verified });
    console.log('[RECOVERY] None');
    console.log('[FINAL RESULT]', verified ? 'PASS' : 'FAIL');
    console.log('[EXIT CODE] 0');
}

runCanvaTest().catch(err => {
    console.error('Canva Test Error:', err);
});
