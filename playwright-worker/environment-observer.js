/**
 * Environment Observer Module
 * Collects active runtime state: URL, title, DOM page index, accessibility tree, viewport, and window bounds.
 */
class EnvironmentObserver {
    async observe(page, context) {
        if (!page) return { url: '', title: '', elements: [] };

        const url = page.url();
        const title = await page.title().catch(() => '');
        const viewport = page.viewportSize() || { width: 1280, height: 800 };

        const pageIndex = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('a, button, input, select, textarea'));
            return elements.map((el, idx) => ({
                index: idx,
                tag: el.tagName,
                role: el.getAttribute('role') || (el.tagName === 'A' ? 'link' : el.tagName === 'BUTTON' ? 'button' : 'textbox'),
                name: (el.innerText || el.getAttribute('aria-label') || el.value || el.placeholder || '').trim().substring(0, 50),
                href: el.getAttribute('href') || '',
                visible: el.offsetParent !== null && window.getComputedStyle(el).visibility !== 'hidden'
            })).filter(e => e.name || e.href);
        }).catch(() => []);

        let accessibilityTree = null;
        try {
            const client = await context.newCDPSession(page);
            accessibilityTree = await client.send('Accessibility.getFullAXTree');
        } catch (e) {
            accessibilityTree = { nodes: [{ role: { value: 'WebArea' }, name: { value: title } }] };
        }

        return {
            url,
            title,
            viewport,
            interactiveElementsCount: pageIndex.length,
            pageIndex,
            accessibilityTree
        };
    }
}

module.exports = new EnvironmentObserver();
