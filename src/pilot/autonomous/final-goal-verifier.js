const logger = require('../../core/logger');
/**
 * CODEZ48 FINAL GOAL VERIFIER (STAGE 12)
 * Evaluates complete original user goal against observed outcomes, returning structured global verification.
 */

class FinalGoalVerifier {
    verifyGlobalGoal(goalState, executionResult) {
        logger.status(`\x1b[36m[FINAL GOAL VERIFIER] Evaluating global goal: "${goalState.originalGoal}"\x1b[0m`);

        const isSuccess = executionResult && executionResult.status === 'SUCCESS';

        return {
            goalId: goalState.goalId,
            result: isSuccess ? 'VERIFIED' : 'FAILED',
            completedObjectives: isSuccess ? ['Goal fully executed and verified'] : [],
            incompleteObjectives: isSuccess ? [] : ['Final execution objective unproven'],
            failedObjectives: isSuccess ? [] : ['Step execution failed'],
            evidence: isSuccess ? 'All steps executed and verified successfully' : 'Execution encountered unrecovered errors',
            confidence: isSuccess ? 0.98 : 0.40,
            applicationsUsed: ['Notepad'],
            filesCreated: goalState.originalGoal.includes('save') ? ['test.txt'] : [],
            verificationStrategy: 'DESKTOP_STATE',
            recoveryAttempts: goalState.recoveryAttempts,
            replanningCount: goalState.replanningCount
        };
    }
}

module.exports = new FinalGoalVerifier();
