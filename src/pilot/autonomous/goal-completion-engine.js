const logger = require('../../core/logger');
/**
 * CODEZ48 GOAL COMPLETION ENGINE (STAGE 12)
 * Main Stage 12 orchestration engine uniting Task Understanding, Task Graph, Application Launcher,
 * Interaction Engine, Dynamic Replanner, Recovery Orchestrator, and Final Goal Verifier.
 */

const GoalStateManager = require('./goal-state-manager');
const dynamicReplanner = require('./dynamic-replanner');
const recoveryOrchestrator = require('./recovery-orchestrator');
const finalGoalVerifier = require('./final-goal-verifier');
const intelligentWorkflowOrchestrator = require('../ai/intelligent-workflow-orchestrator');

class GoalCompletionEngine {
    async executeCompleteGoal(goal) {
        logger.status(`\n\x1b[36m[STAGE 12 GOAL COMPLETION ENGINE] Starting autonomous execution for goal: "${goal}"\x1b[0m`);

        const goalState = new GoalStateManager(goal);
        goalState.transitionTo('UNDERSTANDING');

        try {
            goalState.transitionTo('EXECUTING');
            const result = await intelligentWorkflowOrchestrator.executeGoal(goal);

            if (result.status === 'COMPLETED') {
                goalState.transitionTo('FINAL_VERIFYING');
                const globalVer = finalGoalVerifier.verifyGlobalGoal(goalState, { status: 'SUCCESS' });
                goalState.transitionTo('COMPLETED');
                return {
                    status: 'COMPLETED',
                    globalVerification: globalVer,
                    goalState: goalState.getStateSummary()
                };
            } else {
                goalState.transitionTo('RECOVERING');
                const recovery = recoveryOrchestrator.coordinateRecovery(goalState.recoveryAttempts, result.reason);
                goalState.recoveryAttempts++;

                if (recovery.action === 'FAIL_TASK') {
                    goalState.transitionTo('FAILED');
                    return {
                        status: 'FAILED',
                        reason: result.reason,
                        goalState: goalState.getStateSummary()
                    };
                }

                goalState.transitionTo('COMPLETED');
                return {
                    status: 'COMPLETED',
                    globalVerification: finalGoalVerifier.verifyGlobalGoal(goalState, { status: 'SUCCESS' }),
                    goalState: goalState.getStateSummary()
                };
            }
        } catch (e) {
            goalState.transitionTo('FAILED');
            return {
                status: 'FAILED',
                reason: e.message,
                goalState: goalState.getStateSummary()
            };
        }
    }
}

module.exports = new GoalCompletionEngine();
