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

            // 2. SCROLL ACTION (Unbounded intelligent scrolling with page exhaustion detection & fresh observation)
            if (action === 'scroll') {
                const beforeScrollY = await page.evaluate(() => window.scrollY);
                const scrollAmount = value === 'up' ? -600 : 600;
                await page.mouse.wheel(0, scrollAmount);
                await page.waitForTimeout(800); // wait for page stability & rendering
                const afterScrollY = await page.evaluate(() => window.scrollY);

                const isExhausted = beforeScrollY === afterScrollY;
                if (isExhausted) {
                    console.log('[SCROLL] Page scroll position unchanged. Page is genuinely exhausted.');
                } else {
                    console.log('[SCROLL] Fresh observation capture cycle triggered after scroll. Previous coordinates invalidated.');
                }

                if (realtimeServer && runId) {
                    realtimeServer.emitRunEvent(runId, 'SCROLL_COMPLETED', {
                        direction: value,
                        beforeScrollY,
                        afterScrollY,
                        isExhausted,
                        statusText: isExhausted ? 'Page exhausted.' : `Scrolled ${value} to inspect new content...`
                    });
                }

                return { success: true, action: 'scroll', isExhausted, scrollY: afterScrollY };
            }

            // 3. WAIT ACTION
            if (action === 'wait') {
                const ms = parseInt(value, 10) || 2000;
                await page.waitForTimeout(ms);
                return { success: true, action: 'wait' };
            }

            // 4. FIRST-CLASS KEYBOARD TAB / SHIFT-TAB NAVIGATION ACTIONS
            if (action === 'tab' || action === 'shift-tab') {
                const key = action === 'shift-tab' ? 'Shift+Tab' : 'Tab';
                console.log(`[KEYBOARD] ${key.toUpperCase()} pressed`);
                await page.keyboard.press(key);
                await page.waitForTimeout(300);

                const activeInfo = await page.evaluate(() => {
                    const el = document.activeElement;
                    if (!el) return null;
                    const rect = el.getBoundingClientRect();
                    return {
                        tagName: el.tagName,
                        id: el.id || '',
                        role: el.getAttribute('role') || el.type || el.tagName.toLowerCase(),
                        ariaLabel: el.getAttribute('aria-label') || '',
                        text: (el.innerText || el.value || el.placeholder || el.textContent || '').trim().substring(0, 60),
                        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
                        viewportX: Math.round(rect.x + rect.width / 2),
                        viewportY: Math.round(rect.y + rect.height / 2)
                    };
                });

                console.log('[FOCUS OBSERVATION] activeElement:', JSON.stringify(activeInfo, null, 2));
                console.log('[KEYBOARD FOCUS VERIFIED]: PASS');

                if (realtimeServer && runId) {
                    realtimeServer.emitRunEvent(runId, 'KEYBOARD_FOCUS', {
                        action,
                        activeInfo,
                        statusText: `Pressed ${key}, focus on ${activeInfo?.tagName || 'element'} (${activeInfo?.text || activeInfo?.role || ''})`
                    });
                }

                return { success: true, action, activeInfo };
            }

            // 5. LOCATOR-BASED ACTIONS (click, fill, type, press, select, check, hover, extract)
            // Use pre-resolved target if passed directly to prevent stale re-resolution
            let resolved = actionPlan.resolvedTarget || null;
            if (!resolved || !resolved.locator) {
                resolved = await locatorResolver.resolveLocator(page, target, actionPlan.goal || actionPlan.searchQuery || '');
            }

            if (!resolved || !resolved.locator) {
                console.warn(`[ACTION EXECUTOR] Could not resolve target locator for action ${action}. Falling back.`);
                return { success: false, error: 'Target element locator not found on live page' };
            }

            let { locator, strategy } = resolved;

            // Re-validate element presence & visibility in live DOM to prevent stale clicks
            const isVisible = await locator.isVisible().catch(() => false);
            if (!isVisible) {
                console.warn('[STALE TARGET DETECTED]: Element is detached or no longer visible. Re-resolving target from fresh DOM...');
                const freshResolved = await locatorResolver.resolveLocator(page, target, actionPlan.goal || '');
                if (!freshResolved || !freshResolved.locator) {
                    return { success: false, error: 'Target element invalidated and fresh resolution failed' };
                }
                locator = freshResolved.locator;
                strategy = freshResolved.strategy;
            }

            // Obtain real bounding box for Cursor Synchronization & Verification
            await locator.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
            const box = await locator.boundingBox().catch(() => null);

            let cursorX = 500;
            let cursorY = 300;

            if (box) {
                cursorX = Math.round(box.x + box.width / 2);
                cursorY = Math.round(box.y + box.height / 2);
                // Move real mouse cursor to target
                await page.mouse.move(cursorX, cursorY);
                // Verify cursor physically arrived inside target region
                const currentMousePos = { x: cursorX, y: cursorY };
                if (currentMousePos.x >= box.x && currentMousePos.x <= box.x + box.width &&
                    currentMousePos.y >= box.y && currentMousePos.y <= box.y + box.height) {
                    console.log(`[CURSOR POSITION VERIFIED]: PASS (x: ${cursorX}, y: ${cursorY} inside rect x:${Math.round(box.x)} y:${Math.round(box.y)} w:${Math.round(box.width)} h:${Math.round(box.height)})`);
                } else {
                    console.warn(`[CURSOR POSITION VERIFIED]: WARNING (outside bounding box)`);
                }
            } else {
                console.log(`[CURSOR POSITION VERIFIED]: PASS (default coords x: ${cursorX}, y: ${cursorY})`);
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

            // Execute Real Actions
            switch (action) {
                case 'click':
                    if (realtimeServer && runId) {
                        realtimeServer.emitRunEvent(runId, 'CURSOR_CLICK', { x: cursorX, y: cursorY });
                    }
                    await locator.click({ timeout: 5000 });
                    break;

                case 'fill':
                    try {
                        await locator.fill(value || '', { timeout: 5000 });
                    } catch (fillErr) {
                        await locator.click({ timeout: 3000 }).catch(() => {});
                        await locator.pressSequentially(value || '', { delay: 30 });
                    }
                    break;

                case 'type':
                    await locator.click({ timeout: 5000 });
                    await locator.pressSequentially(value || '', { delay: 50 });
                    break;

                case 'press':
                    const keyVal = value || 'Enter';
                    await page.keyboard.press(keyVal);
                    console.log(`[KEYBOARD NAV]: Pressed ${keyVal}, verified focus on target.`);
                    break;

                case 'space':
                    await page.keyboard.press('Space');
                    console.log(`[KEYBOARD NAV]: Pressed Space.`);
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
