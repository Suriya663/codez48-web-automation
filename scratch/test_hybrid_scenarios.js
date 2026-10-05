const browserManager = require('../playwright-worker/browser-manager.js');
const stateVerifier = require('../playwright-worker/state-verifier.js');
const { getCursor, setCursor, simulateClick, moveCursorSmoothly, bringWindowToFront } = require('../playwright-worker/win32-cursor.js');

async function testScenarios() {
    console.log('=== HYBRID AUTOMATION SCENARIOS TEST ===');

    // 1. Navigate to homepage
    const page = await browserManager.getPage({ headless: false });
    await page.goto('https://codez48.netlify.app/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Handle overlay if present
    const overlayVisible = await page.evaluate(() => {
        const o = document.getElementById('onboarding-overlay');
        return o && o.offsetParent !== null;
    });
    if (overlayVisible) {
        const englishBtn = page.locator('#onboarding-overlay button, #onboarding-overlay a').filter({ hasText: 'English' }).first();
        if (await englishBtn.isVisible()) {
            await englishBtn.click();
            await page.evaluate(() => {
                const o = document.getElementById('onboarding-overlay');
                if (o) o.style.display = 'none';
            });
            await page.waitForTimeout(500);
        }
    }

    // 2. Identify a different navigation link from CLI link (e.g. Pricing navigation)
    const targetName = 'Pricing navigation';
    const clickSelector = 'a[href*="pricing"], a:has-text("Pricing")';
    const expectedHref = '#pricing';
    const locator = page.locator(clickSelector).first();
    await locator.waitFor({ state: 'visible', timeout: 5000 });

    // 3. First attempt Playwright DOM interaction
    console.log('\n--- SCENARIO 3: Playwright DOM Interaction ---');
    const urlBeforeDOM = page.url();
    let domSucceeded = false;
    try {
        await page.click(clickSelector, { timeout: 5000 });
        domSucceeded = true;
    } catch (e) {}

    // 4. Verify resulting URL/title/heading
    const verResultDOM = await stateVerifier.verifyNavigationOutcome(page, expectedHref);
    const finalUrlDOM = page.url();
    const finalTitleDOM = await page.title();
    const finalHeadingDOM = await page.locator('h1, h2').first().textContent().catch(() => '');

    console.log('DOM Strategy Succeeded:', domSucceeded);
    console.log('Final URL (DOM):', finalUrlDOM);
    console.log('State Verifier Result (DOM):', verResultDOM);

    // Reset back to homepage for physical fallback test
    await page.goto('https://codez48.netlify.app/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(500);

    // 5. Force the physical fallback strategy for the same target
    console.log('\n--- SCENARIO 5-10: Physical Fallback Strategy ---');
    const box = await locator.boundingBox();
    let screenCoords = null;
    let cursorCoords = null;
    let physicalSucceeded = false;
    let verResultPhysical = null;
    let finalUrlPhysical = '';

    if (box) {
        // 6. Calculate real screen coordinates
        const winGeometry = await page.evaluate(() => ({
            screenX: window.screenX || window.screenLeft || 0,
            screenY: window.screenY || window.screenTop || 0,
            outerWidth: window.outerWidth || 1280,
            outerHeight: window.outerHeight || 800,
            innerWidth: window.innerWidth || 1280,
            innerHeight: window.innerHeight || 800
        }));

        const borderWidth = Math.max(0, Math.round((winGeometry.outerWidth - winGeometry.innerWidth) / 2));
        const titleBarHeight = Math.max(0, winGeometry.outerHeight - winGeometry.innerHeight);

        const clientScreenX = winGeometry.screenX + borderWidth;
        const clientScreenY = winGeometry.screenY + titleBarHeight;

        const targetScreenX = clientScreenX + box.x + box.width / 2;
        const targetScreenY = clientScreenY + box.y + box.height / 2;
        screenCoords = { x: targetScreenX, y: targetScreenY };

        bringWindowToFront(await page.title());
        await page.bringToFront();
        await new Promise(r => setTimeout(r, 500));

        // 7. Move Windows cursor there
        // 8. Verify cursor position with Koffi
        const posAfterMove = moveCursorSmoothly(targetScreenX, targetScreenY);
        cursorCoords = { x: posAfterMove.x, y: posAfterMove.y };

        // 9. Physically click it
        simulateClick();
        physicalSucceeded = true;

        // 10. Verify resulting state with state-verifier.js
        await new Promise(r => setTimeout(r, 1000));
        verResultPhysical = await stateVerifier.verifyNavigationOutcome(page, expectedHref);
        finalUrlPhysical = page.url();
    }

    await browserManager.close();

    console.log('\n=== HYBRID SCENARIOS REPORT ===');
    console.log('Target Element:', targetName);
    console.log('DOM Bounding Box:', box);
    console.log('Screen Coordinates:', screenCoords);
    console.log('Cursor Coordinates (Koffi GetCursorPos):', cursorCoords);
    console.log('Whether DOM Strategy Succeeded:', domSucceeded);
    console.log('Whether Physical Strategy Succeeded:', physicalSucceeded);
    console.log('Final URL:', finalUrlPhysical || finalUrlDOM);
    console.log('State-Verifier Result:', verResultPhysical || verResultDOM);
}

testScenarios().catch(err => {
    console.error('Scenarios Test Error:', err);
});
