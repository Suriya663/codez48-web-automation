const locatorResolver = require('./locator-resolver');

class ActionExecutor {
    async executeAction(page, actionPlan, realtimeServer = null, runId = null) {
        if (!page || page.isClosed()) {
            return { success: false, error: 'Target page is closed or unavailable' };
        }

        const action = actionPlan.action;
        const target = actionPlan.target;
        const value = actionPlan.value;

        console.log(`[ACTION EXECUTOR] Executing action [${action}] on page: ${page.url()}`);

        try {
            // 1. NAVIGATE ACTION
            if (action === 'navigate') {
                let targetUrl = value || (typeof target === 'string' ? target : '');
                if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
                    targetUrl = 'https://' + targetUrl;
                }

                if (realtimeServer && runId) {
                    realtimeServer.emitRunEvent(runId, 'ACTION_STARTED', {
                        action: 'navigate',
                        targetUrl,
                        statusText: `Navigating to ${targetUrl}...`
                    });
                }

                await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                return { success: true, action: 'navigate', url: page.url() };
            }

            // 2. SCROLL ACTION
            if (action === 'scroll') {
                const scrollAmount = value === 'up' ? -500 : 500;
                await page.mouse.wheel(0, scrollAmount);
                await page.waitForTimeout(500);

                if (realtimeServer && runId) {
                    realtimeServer.emitRunEvent(runId, 'SCROLL_COMPLETED', {
                        direction: value,
                        statusText: `Scrolled page ${value}...`
                    });
                }

                return { success: true, action: 'scroll' };
            }

            // 3. WAIT ACTION
            if (action === 'wait') {
                const ms = parseInt(value, 10) || 2000;
                await page.waitForTimeout(ms);
                return { success: true, action: 'wait' };
            }

            // 4. LOCATOR-BASED ACTIONS (click, fill, type, press, select, check, hover, extract)
            const resolved = await locatorResolver.resolveLocator(page, target);
            if (!resolved || !resolved.locator) {
                console.warn(`[ACTION EXECUTOR] Could not resolve target locator for action ${action}. Falling back.`);
                return { success: false, error: 'Target element locator not found on live page' };
            }

            const { locator, strategy } = resolved;

            // Obtain real bounding box for Cursor Synchronization (Module 11)
            await locator.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
            const box = await locator.boundingBox().catch(() => null);

            let cursorX = 500;
            let cursorY = 300;

            if (box) {
                cursorX = Math.round(box.x + box.width / 2);
                cursorY = Math.round(box.y + box.height / 2);
            }

            // Emit Real Cursor Coordinates
            if (realtimeServer && runId) {
                realtimeServer.emitRunEvent(runId, 'CURSOR_MOVE', {
                    x: cursorX,
                    y: cursorY,
                    strategy,
                    action,
                    statusText: actionPlan.statusText || `Targeting element for ${action}...`
                });
            }

            await page.waitForTimeout(400);

            // Execute Real Playwright Actions
            switch (action) {
                case 'click':
                    if (realtimeServer && runId) {
                        realtimeServer.emitRunEvent(runId, 'CURSOR_CLICK', { x: cursorX, y: cursorY });
                    }
                    await locator.click({ timeout: 5000 });
                    break;

                case 'fill':
                    await locator.fill(value || '', { timeout: 5000 });
                    break;

                case 'type':
                    await locator.click({ timeout: 5000 });
                    await locator.pressSequentially(value || '', { delay: 50 });
                    break;

                case 'press':
                    await locator.press(value || 'Enter', { timeout: 5000 });
                    break;

                case 'select':
                    await locator.selectOption(value, { timeout: 5000 });
                    break;

                case 'check':
                    await locator.check({ timeout: 5000 });
                    break;

                case 'uncheck':
                    await locator.uncheck({ timeout: 5000 });
                    break;

                case 'hover':
                    await locator.hover({ timeout: 5000 });
                    break;

                case 'extract':
                    let extractedText = '';
                    try {
                        extractedText = await locator.innerText({ timeout: 3000 });
                    } catch (e) {
                        extractedText = await locator.inputValue({ timeout: 3000 }).catch(() => '');
                    }
                    return { success: true, action: 'extract', extractedData: extractedText };

                default:
                    await locator.click({ timeout: 5000 });
                    break;
            }

            return {
                success: true,
                action,
                strategy,
                cursorX,
                cursorY
            };

        } catch (err) {
            console.error(`[ACTION EXECUTOR ERROR] [${action}]:`, err.message);
            return {
                success: false,
                action,
                error: err.message
            };
        }
    }
}

module.exports = new ActionExecutor();
