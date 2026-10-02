class LocatorResolver {
    async resolveLocator(page, target, goal = '') {
        if (!page || page.isClosed()) return null;

        // Invalidate stale target references on scroll / navigation state change
        try {
            // Check if goal implies search and no explicit search target provided
            const isSearchGoal = /search|find|lookup|query/i.test(goal || '');
            if (isSearchGoal && (!target || !target.selector)) {
                // Try generic universal search bar resolution across any website
                const searchLocators = [
                    page.locator('input[type="search"]').first(),
                    page.locator('[role="searchbox"]').first(),
                    page.locator('input[placeholder*="search" i]').first(),
                    page.locator('input[aria-label*="search" i]').first(),
                    page.locator('input[name*="search" i]').first(),
                    page.locator('input[name*="q" i]').first(),
                    page.locator('input[name*="query" i]').first()
                ];

                for (const loc of searchLocators) {
                    if (await loc.count() > 0 && await loc.isVisible().catch(() => false)) {
                        console.log('[SEARCH GROUNDING]: Generic search input detected via universal heuristics');
                        return { locator: loc, strategy: 'generic-search-heuristic' };
                    }
                }
            }
        } catch (e) {
            console.warn('[SEARCH GROUNDING WARN]:', e.message);
        }

        if (!target) return null;

        try {
            // Priority 1: getByRole()
            if (target.role && target.name) {
                const loc = page.getByRole(target.role, { name: target.name, exact: false }).first();
                if (await loc.count() > 0) return { locator: loc, strategy: 'getByRole' };
            }

            // Priority 2: getByLabel()
            if (target.label) {
                const loc = page.getByLabel(target.label, { exact: false }).first();
                if (await loc.count() > 0) return { locator: loc, strategy: 'getByLabel' };
            }

            // Priority 3: getByPlaceholder()
            if (target.placeholder) {
                const loc = page.getByPlaceholder(target.placeholder, { exact: false }).first();
                if (await loc.count() > 0) return { locator: loc, strategy: 'getByPlaceholder' };
            }

            // Priority 4: Name Attribute
            if (target.nameAttr || target.name) {
                const nameVal = target.nameAttr || target.name;
                const loc = page.locator(`[name="${nameVal}"]`).first();
                if (await loc.count() > 0) return { locator: loc, strategy: 'nameAttr' };
            }

            // Priority 5: ID
            if (target.id) {
                const loc = page.locator(`#${target.id}`).first();
                if (await loc.count() > 0) return { locator: loc, strategy: 'id' };
            }

            // Priority 6: getByText()
            if (target.text) {
                const loc = page.getByText(target.text, { exact: false }).first();
                if (await loc.count() > 0) return { locator: loc, strategy: 'getByText' };
            }

            // Priority 7: CSS Selector
            if (target.selector) {
                const loc = page.locator(target.selector).first();
                if (await loc.count() > 0) return { locator: loc, strategy: 'css' };
            }

            // Target not resolved on initial viewport - attempt scroll-and-retry search for elements
            console.log('[LOCATOR RESOLVER] Target not in immediate viewport. Scrolling down to locate element...');
            await page.mouse.wheel(0, 400);
            await page.waitForTimeout(600);

            // Retry resolution after scroll (Invalidates previous viewport coordinates)
            if (target.role && target.name) {
                const loc = page.getByRole(target.role, { name: target.name, exact: false }).first();
                if (await loc.count() > 0) return { locator: loc, strategy: 'getByRole-after-scroll' };
            }
            if (target.text) {
                const loc = page.getByText(target.text, { exact: false }).first();
                if (await loc.count() > 0) return { locator: loc, strategy: 'getByText-after-scroll' };
            }
            if (target.nameAttr || target.name) {
                const nameVal = target.nameAttr || target.name;
                const loc = page.locator(`[name="${nameVal}"]`).first();
                if (await loc.count() > 0) return { locator: loc, strategy: 'nameAttr-after-scroll' };
            }

            return null;
        } catch (e) {
            console.error('[LOCATOR RESOLVER ERROR]:', e.message);
            return null;
        }
    }
}

module.exports = new LocatorResolver();
