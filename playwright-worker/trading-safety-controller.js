const userInputDialog = require('./user-input-dialog.js');

/**
 * Trading & Financial Safety Controller
 * Enforces paper trading / simulation by default and requires explicit human verification for live execution.
 */
class TradingSafetyController {
    constructor() {
        this.liveExecutionEnabled = false; // Default safe mode
    }

    enableLiveExecution(authCode) {
        // In a real system, authCode would be verified against an environment variable or secure token.
        this.liveExecutionEnabled = true;
    }

    /**
     * Evaluates an order and requests confirmation if live.
     * @param {Object} orderDetails - The parsed order parameters.
     */
    async verifyOrderSafety(orderDetails) {
        console.log(`[TRADING SAFETY] Evaluating order parameters:`, orderDetails);

        if (!this.liveExecutionEnabled || orderDetails.isDemoOrPaper) {
            console.log(`[TRADING SAFETY] Order classified as Demo/Paper/Simulation. Auto-execution permitted.`);
            return { safeToExecute: true, mode: 'PAPER' };
        }

        console.log(`[TRADING SAFETY] LIVE ORDER DETECTED. Human confirmation required.`);

        const promptMsg = `LIVE ORDER: ${orderDetails.side} ${orderDetails.quantity} ${orderDetails.instrument} @ ${orderDetails.price || 'MKT'}. Type "CONFIRM" to execute.`;

        const response = await userInputDialog.promptUser(promptMsg);

        if (response.cancelled || response.value.toUpperCase() !== 'CONFIRM') {
            console.warn(`[TRADING SAFETY] Live order rejected by user or cancelled.`);
            return { safeToExecute: false, mode: 'LIVE', reason: 'USER_CANCELLED' };
        }

        console.log(`[TRADING SAFETY] Live order EXPLICITLY CONFIRMED by user.`);
        return { safeToExecute: true, mode: 'LIVE' };
    }
}

module.exports = new TradingSafetyController();
