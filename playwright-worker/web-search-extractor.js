const locatorResolver = require('./locator-resolver');

class WebSearchExtractor {
    /**
     * Executes web search and extracts matching product/content links directly from DOM
     * Supported sites: Amazon, Google, eBay, or any target site with search inputs and result links
     */
    async searchAndExtractLinks(page, siteUrl, searchQuery) {
        console.log(`[SEARCH EXTRACTOR] Navigating to ${siteUrl} and searching for: "${searchQuery}"`);
        if (!page || page.isClosed()) {
            return { success: false, error: 'Target page closed or unavailable' };
        }

        try {
            // 1. Navigate to target URL if not already there
            let currentUrl = page.url();
            if (!currentUrl.includes(new URL(siteUrl.startsWith('http') ? siteUrl : 'https://' + siteUrl).hostname)) {
                let target = siteUrl.startsWith('http') ? siteUrl : 'https://' + siteUrl;
                await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30000 });
            }

            // 2. Locate search input box
            const searchTarget = {
                role: 'searchbox',
                placeholder: 'Search',
                id: 'twotabsearchtextbox', // Amazon ID
                name: 'field-keywords',
                selector: 'input[type="text"], input[type="search"], input[name="q"], input[name="field-keywords"]'
            };

            const resolved = await locatorResolver.resolveLocator(page, searchTarget, searchQuery);
            if (resolved && resolved.locator) {
                await resolved.locator.click({ timeout: 5000 }).catch(() => {});
                await resolved.locator.fill(searchQuery, { timeout: 5000 });
                await page.keyboard.press('Enter');
                await page.waitForTimeout(3000); // Allow search results page to load
            } else {
                // Fallback: try pressing Enter on any active input
                await page.keyboard.type(searchQuery);
                await page.keyboard.press('Enter');
                await page.waitForTimeout(3000);
            }

            // 3. Extract items & product links directly from DOM without manual clicks
            const extractedItems = await page.evaluate((query) => {
                const results = [];
                const searchRegex = new RegExp(query.split(' ')[0], 'i');

                // Query all links with text/titles
                document.querySelectorAll('a[href]').forEach((a, idx) => {
                    const text = (a.innerText || a.getAttribute('aria-label') || a.title || '').trim();
                    const href = a.getAttribute('href') || '';

                    // Check if link contains relevant product match and link structure
                    if (text.length > 5 && (searchRegex.test(text) || href.includes('/dp/') || href.includes('/item/')) && results.length < 10) {
                        let fullHref = href;
                        if (href.startsWith('/')) {
                            fullHref = window.location.origin + href;
                        }

                        // Try locating parent container for price or extra details
                        const parentCard = a.closest('.s-result-item, .s-card-container, div[data-component-type="s-search-result"], .card, article') || a.parentElement;
                        const priceText = parentCard?.querySelector('.a-price .a-offscreen, .a-price, .price, .a-color-price')?.innerText?.trim() || '';

                        results.push({
                            index: idx + 1,
                            title: text.replace(/\s+/g, ' ').substring(0, 120),
                            price: priceText,
                            link: fullHref
                        });
                    }
                });

                return results;
            }, searchQuery);

            console.log(`[SEARCH EXTRACTOR] Extracted ${extractedItems.length} direct product/item links.`);

            return {
                success: true,
                query: searchQuery,
                pageUrl: page.url(),
                extractedItems,
                topResultLink: extractedItems[0]?.link || null,
                message: `Found ${extractedItems.length} matching item links for "${searchQuery}" on ${page.url()}`
            };

        } catch (err) {
            console.error('[SEARCH EXTRACTOR ERROR]:', err.message);
            return { success: false, error: err.message };
        }
    }
}

module.exports = new WebSearchExtractor();
