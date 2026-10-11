/**
 * Intelligent Waiting Manager
 * Supports state-aware polling and long-running condition monitoring without fixed arbitrary sleeps.
 */
class WaitManager {
    /**
     * Polls a condition function until it returns true or a timeout is reached.
     * @param {Function} conditionFn - Async function returning a boolean or truthy value representing success state.
     * @param {number} intervalMs - Polling interval.
     * @param {number} maxWaitMs - Maximum time to wait. Set to 0 for infinite (long-running monitor).
     * @param {Function} heartbeatFn - Optional callback to report progress.
     */
    async waitForCondition(conditionFn, intervalMs = 1000, maxWaitMs = 30000, heartbeatFn = null) {
        const start = Date.now();
        let attempt = 0;

        while (true) {
            attempt++;
            try {
                const result = await conditionFn();
                if (result) {
                    return { success: true, attempts: attempt, durationMs: Date.now() - start, result };
                }
            } catch (e) {
                // Ignore transient evaluation errors during polling
            }

            if (maxWaitMs > 0 && (Date.now() - start) >= maxWaitMs) {
                return { success: false, error: 'TIMEOUT', attempts: attempt, durationMs: Date.now() - start };
            }

            if (heartbeatFn) {
                await heartbeatFn(attempt, Date.now() - start);
            }

            await new Promise(r => setTimeout(r, intervalMs));
        }
    }
}

module.exports = new WaitManager();
