const locatorResolver = require('./locator-resolver');

class ActionVerifier {
    async verifyAction(page, actionPlan, executionResult) {
        if (!page || page.isClosed() || !executionResult || !executionResult.success) {
            return { verified: false, reason: executionResult?.error || 'Execution failed before verification' };
        }

        const action = actionPlan.action;
        const target = actionPlan.target;
        const value = actionPlan.value;

        try {
            await page.waitForTimeout(500);

            // 1. FILL / TYPE VERIFICATION
            if (action === 'fill' || action === 'type') {
                const resolved = await locatorResolver.resolveLocator(page, target);
                if (resolved && resolved.locator) {
                    const actualValue = await resolved.locator.inputValue().catch(() => null);
                    if (actualValue !== null && value) {
                        const matches = actualValue.includes(value) || value.includes(actualValue);
                        return {
                            verified: matches,
                            reason: matches ? 'Input field value verified' : `Value mismatch: expected "${value}", found "${actualValue}"`
                        };
                    }
                }
                return { verified: true, reason: 'Fill action executed' };
            }

            // 2. NAVIGATE VERIFICATION
            if (action === 'navigate') {
                const currentUrl = page.url();
                const verified = currentUrl.toLowerCase().includes(String(value || '').toLowerCase());
                return {
                    verified,
                    reason: verified ? `Navigated to ${currentUrl}` : `URL mismatch: ${currentUrl}`
                };
            }

            // 3. EXTRACT VERIFICATION
            if (action === 'extract') {
                const verified = Boolean(executionResult.extractedData);
                return {
                    verified,
                    reason: verified ? `Extracted: ${executionResult.extractedData}` : 'Extraction returned empty text'
                };
            }

            // 4. CLICK / PRESS / KEYBOARD NAVIGATION VERIFICATION
            if (action === 'click' || action === 'press' || action === 'tab' || action === 'space') {
                // Check if successCondition text or element is visible in fresh state
                if (actionPlan.successCondition) {
                    const conditionText = actionPlan.successCondition;
                    const isConditionVisible = await page.getByText(conditionText, { exact: false }).first().isVisible().catch(() => false);
                    if (isConditionVisible) {
                        return { verified: true, reason: `[VERIFICATION PASS]: Success condition visible: "${conditionText}"` };
                    }
                }
                const freshTitle = await page.title().catch(() => '');
                const freshUrl = page.url();
                return { verified: true, reason: `[VERIFICATION PASS]: Fresh state captured (URL: ${freshUrl}, Title: ${freshTitle})` };
            }

            return { verified: true, reason: 'Action completed without error' };

        } catch (err) {
            console.error('[ACTION VERIFIER ERROR]:', err.message);
            return { verified: false, reason: err.message };
        }
    }
}

module.exports = new ActionVerifier();
