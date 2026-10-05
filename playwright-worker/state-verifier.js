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
                const parsed = new URL(clickedElementHref, page.url());
                expectedOutcome = parsed.hash ? parsed.pathname + parsed.hash : parsed.pathname;
            }
        }

        console.log(`[STATE VERIFIER] Derived expectedOutcome from href "${clickedElementHref}": "${expectedOutcome}"`);

        try {
            if (expectedOutcome.startsWith('#')) {
                await page.waitForFunction(hash => window.location.hash === hash, expectedOutcome, { timeout: 10000 });
            } else {
                await page.waitForURL(`**${expectedOutcome}`, { timeout: 10000 });
            }
            return { success: true, expectedOutcome, finalUrl: page.url() };
        } catch (e) {
            return { success: false, expectedOutcome, error: e.message, finalUrl: page.url() };
        }
    }
}

module.exports = new StateVerifier();
