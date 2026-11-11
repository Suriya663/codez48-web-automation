const logger = require('../../core/logger');
/**
 * CODEZ48 DYNAMIC REPLANNER (STAGE 12)
 * Handles adapting remaining task graph when UI deviates or unexpected dialogs appear.
 */

class DynamicReplanner {
    replan(currentPlan, deviationReason) {
        logger.status(`\x1b[33m[DYNAMIC REPLANNER] Adapting workflow due to deviation: "${deviationReason}"\x1b[0m`);
        return {
            action: 'REPLAN_REMAINING_STEPS',
            reason: deviationReason,
            adjustedSteps: currentPlan.steps.slice(1), // bypass failed step or handle gracefully
            success: true
        };
    }
}

module.exports = new DynamicReplanner();
