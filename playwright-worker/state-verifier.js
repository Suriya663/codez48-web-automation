/**
 * State Verifier Module
 * Handles state-based waiting after clicks and derives expectedOutcome from link hrefs (including hash links like #pricing).
 */
class StateVerifier {
    async verifyNavigationOutcome(page, clickedElementHref) {
        let expectedOutcome = '/cli';
        if (clickedElementHref) {
            if (clickedElementHref.startsWith('#')) {
                expectedOutcome = clickedElementHref;
            } else if (clickedElementHref.startsWith('http') || clickedElementHref.startsWith('/')) {
                try {
                    const parsed = new URL(clickedElementHref, page.url());
                    expectedOutcome = parsed.hash ? parsed.pathname + parsed.hash : parsed.pathname;
                } catch (e) {
                    expectedOutcome = clickedElementHref;
                }
            } else {
                expectedOutcome = clickedElementHref.startsWith('/') ? clickedElementHref : '/' + clickedElementHref;
            }
        }

        console.log(`[STATE VERIFIER] Derived expectedOutcome from href "${clickedElementHref}": "${expectedOutcome}"`);

        try {
            if (expectedOutcome.startsWith('#')) {
                await page.waitForFunction(hash => window.location.hash === hash, expectedOutcome, { timeout: 10000 });
            } else {
                await page.waitForURL(`**${expectedOutcome}*`, { timeout: 10000 });
            }

            const currentUrl = page.url();
            const verified = expectedOutcome.startsWith('#')
                ? currentUrl.includes(expectedOutcome)
                : currentUrl.includes(expectedOutcome);

            if (!verified) {
                return {
                    success: false,
                    expectedOutcome,
                    finalUrl: currentUrl,
                    error: `URL verification failed: Current URL "${currentUrl}" does not match expected outcome "${expectedOutcome}"`
                };
            }

            return { success: true, expectedOutcome, finalUrl: currentUrl };
        } catch (e) {
            return { success: false, expectedOutcome, error: `Navigation verification timeout or error: ${e.message}`, finalUrl: page.url() };
        }
    }
}

module.exports = new StateVerifier();
