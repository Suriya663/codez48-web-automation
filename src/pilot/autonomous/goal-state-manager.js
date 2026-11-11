const logger = require('../../core/logger');
/**
 * CODEZ48 GOAL STATE MANAGER (STAGE 12)
 * Manages structured goal state lifecycle throughout autonomous execution.
 */

class GoalStateManager {
    constructor(originalGoal) {
        this.goalId = `GOAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        this.originalGoal = originalGoal;
        this.state = 'CREATED';
        this.completedSteps = [];
        this.pendingSteps = [];
        this.failedSteps = [];
        this.checkpoints = [];
        this.intermediateResults = new Map();
        this.recoveryAttempts = 0;
        this.replanningCount = 0;
        this.timestamp = new Date().toISOString();
    }

    transitionTo(newState) {
        this.state = newState;
        logger.status(`\x1b[36m[GOAL STATE] Transitioned to: ${newState}\x1b[0m`);
    }

    getStateSummary() {
        return {
            goalId: this.goalId,
            originalGoal: this.originalGoal,
            state: this.state,
            completedSteps: this.completedSteps.length,
            recoveryAttempts: this.recoveryAttempts,
            replanningCount: this.replanningCount
        };
    }
}

module.exports = GoalStateManager;
