class LocatorResolver {
    async resolveLocator(page, target) {
        if (!page || page.isClosed() || !target) return null;

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

            // Target not resolved - return null so AI can replan or scroll safely
            return null;
        } catch (e) {
            console.error('[LOCATOR RESOLVER ERROR]:', e.message);
            return null;
        }
    }
}

module.exports = new LocatorResolver();
