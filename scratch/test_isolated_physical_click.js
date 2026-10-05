const browserManager = require('../playwright-worker/browser-manager.js');
const stateVerifier = require('../playwright-worker/state-verifier.js');
const { getCursor, setCursor, simulateClick, moveCursorSmoothly, bringWindowToFront } = require('../playwright-worker/win32-cursor.js');

async function testIsolatedPhysicalClick() {
    console.log('=== ISOLATED PHYSICAL INPUT TEST (With Overlay Handling) ===');
    const page = await browserManager.getPage({ headless: false });
    await page.goto('https://codez48.netlify.app/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Handle overlay per overlay rules (select English / dismiss)
    const overlayVisible = await page.evaluate(() => {
        const o = document.getElementById('onboarding-overlay');
        return o && o.offsetParent !== null;
    });

    if (overlayVisible) {
        console.log('[OVERLAY DETECTED] Dismissing onboarding overlay...');
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

    const initialTitle = await page.title();
    console.log(`Initial Title: "${initialTitle}"`);
    console.log(`URL Before Click: ${page.url()}`);

    // Locate CLI navigation link
    const locator = page.locator('a[href*="cli"], a:has-text("CLI")').first();
    await locator.waitFor({ state: 'visible', timeout: 5000 });
    const box = await locator.boundingBox();

    if (box) {
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

        console.log(`Element BoundingBox:`, box);
        console.log(`Calculated Screen Rectangle: x=${clientScreenX + box.x}, y=${clientScreenY + box.y}, w=${box.width}, h=${box.height}`);
        console.log(`Target Center Point: (${targetScreenX.toFixed(1)}, ${targetScreenY.toFixed(1)})`);

        // Bring browser window to foreground
        bringWindowToFront(initialTitle);
        await page.bringToFront();
        await new Promise(r => setTimeout(r, 500));

        // Move cursor smoothly and verify with GetCursorPos
        const posAfterMove = moveCursorSmoothly(targetScreenX, targetScreenY);
        console.log(`[Koffi GetCursorPos] Verified cursor position before click: X=${posAfterMove.x}, Y=${posAfterMove.y}`);

        // Hit-test diagnostics
        const elementTagAtPoint = await page.evaluate(({ x, y, winX, winY }) => {
            const el = document.elementFromPoint(x - winX, y - winY);
            return el ? { tag: el.tagName, text: (el.innerText || '').substring(0, 30), href: el.getAttribute('href') } : null;
        }, { x: targetScreenX, y: targetScreenY, winX: clientScreenX, winY: clientScreenY });
        console.log(`[HIT-TEST / elementFromPoint] Element at target point:`, elementTagAtPoint);

        // Perform physical click
        simulateClick();
        console.log(`[ISOLATED PHYSICAL CLICK] mouse_event down & up executed.`);

        // Verify state change
        await new Promise(r => setTimeout(r, 1500));
        console.log(`URL After Click: ${page.url()}`);

        const result = await stateVerifier.verifyNavigationOutcome(page, '/cli');
        console.log(`State Verification Result:`, result);
    } else {
        console.error('Target element bounding box not found.');
    }

    await browserManager.close();
}

testIsolatedPhysicalClick().catch(err => {
    console.error('Isolated Physical Click Error:', err);
});
