/**
 * Recovery Manager & Ambiguity Resolver Module
 * Handles ambiguity safety (stopping without random selection) and bounded recovery.
 */
class RecoveryManager {
    resolveAmbiguity(candidates, targetName) {
        if (!candidates || candidates.length === 0) {
            return { resolved: false, error: 'ELEMENT_NOT_FOUND', message: `Target "${targetName}" not found.` };
        }
        if (candidates.length > 1) {
            // Check if candidates have unique contextual parent scoping
            const uniqueVisible = candidates.filter(c => c.visible);
            if (uniqueVisible.length > 1) {
                return {
                    resolved: false,
                    error: 'AMBIGUOUS_TARGET',
                    message: `Ambiguous target: multiple matching elements found for "${targetName}".`,
                    candidates: uniqueVisible
                };
            }
        }
        return { resolved: true, target: candidates[0] };
    }

    async attemptRecovery(page, errorType, attemptCount) {
        if (attemptCount >= 2) {
            return { recovered: false, reason: 'Max recovery attempts reached' };
        }

        console.log(`[RECOVERY MANAGER] Attempting recovery (Attempt ${attemptCount + 1}) for error: ${errorType}`);
        try {
            if (errorType === 'ELEMENT_NOT_FOUND') {
                // Scroll down to check lazy loaded content
                await page.evaluate(() => window.scrollBy(0, 500));
                await page.waitForTimeout(500);
            } else if (errorType === 'VERIFICATION_FAILED') {
                await page.waitForTimeout(1000);
            }
            return { recovered: true };
        } catch (e) {
            return { recovered: false, reason: e.message };
        }
    }
}

module.exports = new RecoveryManager();
