class LocatorResolver {
    async buildGroundedPayload(locator, strategy, ocrBox = null) {
        try {
            const tagName = await locator.evaluate(el => el.tagName).catch(() => 'UNKNOWN');
            const elementId = await locator.evaluate(el => el.id).catch(() => '');
            const role = await locator.evaluate(el => el.getAttribute('role') || el.tagName.toLowerCase()).catch(() => 'element');
            const text = await locator.evaluate(el => el.innerText || el.value || el.textContent || '').catch(() => '');
            const htmlSnippet = await locator.evaluate(el => el.outerHTML.substring(0, 300)).catch(() => '');
            const box = await locator.boundingBox().catch(() => null);

            let confidence = 0.96;
            let reason = 'Live DOM element grounded via multi-signal resolution.';

            if (box && ocrBox) {
                // Calculate spatial overlap between OCR bounding box and DOM bounding rect
                const overlapX = Math.max(0, Math.min(box.x + box.width, ocrBox.x + ocrBox.width) - Math.max(box.x, ocrBox.x));
                const overlapY = Math.max(0, Math.min(box.y + box.height, ocrBox.y + ocrBox.height) - Math.max(box.y, ocrBox.y));
                const overlapArea = overlapX * overlapY;
                if (overlapArea > 0) {
                    confidence = 0.98;
                    reason = `OCR visual detection spatially overlaps with live DOM element (${tagName}#${elementId || 'element'}).`;
                }
            } else if (box) {
                reason = `OCR visual detection and live DOM element occupy overlapping spatial region (rect: x:${Math.round(box.x)}, y:${Math.round(box.y)}, w:${Math.round(box.width)}, h:${Math.round(box.height)}).`;
            }

            const groundedPayload = {
                targetFound: true,
                targetText: text.substring(0, 60),
                targetType: role,
                action: 'GROUNDED_TARGET',
                confidence,
                reason,
                targetIdentity: {
                    elementId,
                    tagName,
                    role,
                    text: text.substring(0, 60),
                    domReference: strategy,
                    htmlSnippet,
                    viewportX: box ? Math.round(box.x + box.width / 2) : 0,
                    viewportY: box ? Math.round(box.y + box.height / 2) : 0,
                    rect: box ? { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) } : { x: 0, y: 0, width: 0, height: 0 }
                }
            };
            console.log('[GROUNDED TARGET IDENTITY]:', JSON.stringify(groundedPayload, null, 2));
            return { locator, strategy, groundedPayload };
        } catch (e) {
            console.warn('[BUILD GROUNDED PAYLOAD WARN]:', e.message);
            return { locator, strategy, groundedPayload: null };
        }
    }

    async resolveLocator(page, target, goal = '') {
        if (!page || page.isClosed()) return null;

        // Invalidate stale target references on scroll / navigation state change
        try {
            const isSearchGoal = /search|find|lookup|query/i.test(goal || '');
            if (isSearchGoal && (!target || !target.selector)) {
                const searchLocators = [
                    { loc: page.locator('input[type="search"]').first(), strat: 'search-type' },
                    { loc: page.locator('[role="searchbox"]').first(), strat: 'search-role' },
                    { loc: page.locator('input[placeholder*="search" i]').first(), strat: 'search-placeholder' },
                    { loc: page.locator('input[aria-label*="search" i]').first(), strat: 'search-arialabel' },
                    { loc: page.locator('input[name*="search" i]').first(), strat: 'search-name' },
                    { loc: page.locator('input[name*="q" i]').first(), strat: 'search-q' },
                    { loc: page.locator('input[name*="query" i]').first(), strat: 'search-query' }
                ];

                for (const item of searchLocators) {
                    if (await item.loc.count() > 0 && await item.loc.isVisible().catch(() => false)) {
                        console.log('[SEARCH GROUNDING]: Generic search input detected via universal heuristics');
                        return await this.buildGroundedPayload(item.loc, item.strat);
                    }
                }
            }
        } catch (e) {
            console.warn('[SEARCH GROUNDING WARN]:', e.message);
        }

        if (!target) return null;

        try {
            let foundLoc = null;
            let foundStrat = '';

            // Priority 1: getByRole()
            if (target.role && target.name) {
                const loc = page.getByRole(target.role, { name: target.name, exact: false }).first();
                if (await loc.count() > 0) { foundLoc = loc; foundStrat = 'getByRole'; }
            }

            // Priority 2: getByLabel()
            if (!foundLoc && target.label) {
                const loc = page.getByLabel(target.label, { exact: false }).first();
                if (await loc.count() > 0) { foundLoc = loc; foundStrat = 'getByLabel'; }
            }

            // Priority 3: getByPlaceholder()
            if (!foundLoc && target.placeholder) {
                const loc = page.getByPlaceholder(target.placeholder, { exact: false }).first();
                if (await loc.count() > 0) { foundLoc = loc; foundStrat = 'getByPlaceholder'; }
            }

            // Priority 4: Name Attribute
            if (!foundLoc && (target.nameAttr || target.name)) {
                const nameVal = target.nameAttr || target.name;
                const loc = page.locator(`[name="${nameVal}"]`).first();
                if (await loc.count() > 0) { foundLoc = loc; foundStrat = 'nameAttr'; }
            }

            // Priority 5: ID
            if (!foundLoc && target.id) {
                const loc = page.locator(`#${target.id}`).first();
                if (await loc.count() > 0) { foundLoc = loc; foundStrat = 'id'; }
            }

            // Priority 6: getByText()
            if (!foundLoc && target.text) {
                const loc = page.getByText(target.text, { exact: false }).first();
                if (await loc.count() > 0) { foundLoc = loc; foundStrat = 'getByText'; }
            }

            // Priority 7: CSS Selector
            if (!foundLoc && target.selector) {
                const loc = page.locator(target.selector).first();
                if (await loc.count() > 0) { foundLoc = loc; foundStrat = 'css'; }
            }

            if (foundLoc) {
                return await this.buildGroundedPayload(foundLoc, foundStrat);
            }

            // Target not resolved on initial viewport - attempt scroll-and-retry search for elements
            console.log('[LOCATOR RESOLVER] Target not in immediate viewport. Scrolling down to locate element...');
            await page.mouse.wheel(0, 400);
            await page.waitForTimeout(600);

            // Retry resolution after scroll (Invalidates previous viewport coordinates)
            if (target.role && target.name) {
                const loc = page.getByRole(target.role, { name: target.name, exact: false }).first();
                if (await loc.count() > 0) { foundLoc = loc; foundStrat = 'getByRole-after-scroll'; }
            }
            if (!foundLoc && target.text) {
                const loc = page.getByText(target.text, { exact: false }).first();
                if (await loc.count() > 0) { foundLoc = loc; foundStrat = 'getByText-after-scroll'; }
            }
            if (!foundLoc && (target.nameAttr || target.name)) {
                const nameVal = target.nameAttr || target.name;
                const loc = page.locator(`[name="${nameVal}"]`).first();
                if (await loc.count() > 0) { foundLoc = loc; foundStrat = 'nameAttr-after-scroll'; }
            }

            if (foundLoc) {
                return await this.buildGroundedPayload(foundLoc, foundStrat);
            }

            return null;
        } catch (e) {
            console.error('[LOCATOR RESOLVER ERROR]:', e.message);
            return null;
        }
    }
}

module.exports = new LocatorResolver();
