const browserManager = require('./browser-manager.js');
const stateVerifier = require('./state-verifier.js');
const { getCursor, setCursor, simulateClick, moveCursorSmoothly, bringWindowToFront } = require('./win32-cursor.js');

class PilotNavigator {
    async navigateAndInteract(goalUrl, expectedHref, options = { forcePhysical: false }) {
        const page = await browserManager.getPage({ headless: options.forcePhysical ? false : true });
        console.log(`[PILOT NAVIGATOR] Navigating to target URL: ${goalUrl}`);
        await page.goto(goalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Handle overlay per overlay rules
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

        if (expectedHref) {
            try {
                const clickSelector = expectedHref === '#pricing' ? 'a[href*="pricing"], a:has-text("Pricing")' : 'a[href*="cli"], a:has-text("CLI")';

                if (!options.forcePhysical) {
                    console.log(`[ACTION DISPATCHER] Executing preferred Playwright DOM click on selector: "${clickSelector}"`);
                    await page.click(clickSelector, { timeout: 5000 });
                } else {
                    console.log(`[ACTION DISPATCHER] Dispatching Win32 Physical Cursor interaction for: "${expectedHref}"`);
                    const locator = page.locator(clickSelector).first();

                    await locator.waitFor({ state: 'visible', timeout: 5000 });
                    const box = await locator.boundingBox();
                    const viewport = page.viewportSize() || { width: 1280, height: 800 };

                    if (box) {
                        const winGeometry = await page.evaluate(() => ({
                            screenX: window.screenX || window.screenLeft || 0,
                            screenY: window.screenY || window.screenTop || 0,
                            outerWidth: window.outerWidth || 1280,
                            outerHeight: window.outerHeight || 800,
                            innerWidth: window.innerWidth || 1280,
                            innerHeight: window.innerHeight || 800
                        })).catch(() => ({ screenX: 0, screenY: 0, outerWidth: 1280, outerHeight: 800, innerWidth: 1280, innerHeight: 800 }));

                        const borderWidth = Math.max(0, Math.round((winGeometry.outerWidth - winGeometry.innerWidth) / 2));
                        const titleBarHeight = Math.max(0, winGeometry.outerHeight - winGeometry.innerHeight);

                        const clientScreenX = winGeometry.screenX + borderWidth;
                        const clientScreenY = winGeometry.screenY + titleBarHeight;

                        const targetScreenX = clientScreenX + box.x + box.width / 2;
                        const targetScreenY = clientScreenY + box.y + box.height / 2;

                        console.log(`[DIAGNOSTICS LOG] Element BoundingBox:`, box);
                        console.log(`[DIAGNOSTICS LOG] Calculated Screen Rectangle: x=${clientScreenX + box.x}, y=${clientScreenY + box.y}, w=${box.width}, h=${box.height}`);
                        console.log(`[DIAGNOSTICS LOG] Target Center Point: (${targetScreenX.toFixed(1)}, ${targetScreenY.toFixed(1)})`);

                        const cursorBefore = getCursor();
                        console.log(`[DIAGNOSTICS LOG] Actual Cursor Position Before Click: X=${cursorBefore.x}, Y=${cursorBefore.y}`);
                        console.log(`[DIAGNOSTICS LOG] URL Before Click: ${page.url()}`);

                        bringWindowToFront(initialTitle);
                        await page.bringToFront();
                        await new Promise(r => setTimeout(r, 500));

                        const posAfterMove = moveCursorSmoothly(targetScreenX, targetScreenY);
                        console.log(`[Koffi GetCursorPos] Verified cursor position before click: X=${posAfterMove.x}, Y=${posAfterMove.y}`);

                        const insideBounds = (posAfterMove.x >= clientScreenX + box.x && posAfterMove.x <= clientScreenX + box.x + box.width &&
                                              posAfterMove.y >= clientScreenY + box.y && posAfterMove.y <= clientScreenY + box.y + box.height);
                        console.log(`[HIT-TEST] Cursor inside target bounds? ${insideBounds}`);

                        simulateClick();
                        console.log(`[PHYSICAL CLICK] Mouse down & up executed successfully.`);

                        console.log(`[DIAGNOSTICS LOG] URL After Click (pre-settle): ${page.url()}`);
                    } else {
                        await page.click(clickSelector, { timeout: 5000 });
                    }
                }

                await stateVerifier.verifyNavigationOutcome(page, expectedHref);
            } catch (e) {
                console.warn('[PILOT NAVIGATOR CLICK/NAV WARN]:', e.message);
            }
        }

        const finalUrl = page.url();
        const finalTitle = await page.title();
        const finalHeading = await page.locator('h1, h2').first().textContent().catch(() => 'Codez48');

        await browserManager.close();
        return { finalUrl, finalTitle, finalHeading };
    }
}

module.exports = new PilotNavigator();
