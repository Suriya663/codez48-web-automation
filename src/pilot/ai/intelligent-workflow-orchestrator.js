const logger = require('../../core/logger');
/**
 * CODEZ48 INTELLIGENT WORKFLOW ORCHESTRATOR (STAGE 10)
 * Orchestrates task understanding, capability analysis, application resolution, workflow generation (Stage 9),
 * execution, dynamic replanning, and final verification.
 */

const taskUnderstandingEngine = require('./task-understanding-engine');
const capabilityAnalyzer = require('./capability-analyzer');
const aiProvider = require('./ai-provider');
const applicationResolver = require('../apps/application-resolver');
const workflowExecutor = require('../workflows/workflow-executor');

class IntelligentWorkflowOrchestrator {
    async executeGoal(goal) {
        logger.status(`\n\x1b[36m[STAGE 10 ORCHESTRATOR] Starting intelligent orchestration for goal: "${goal}"\x1b[0m`);

        // 1. Task Understanding
        const understanding = await taskUnderstandingEngine.understand(goal);
        if (understanding.requiresClarification) {
            return { status: 'NEEDS_CLARIFICATION', understanding };
        }

        // 2. Capability Analysis
        const capabilities = await capabilityAnalyzer.analyze(goal);

        // 3. Application Resolution
        const appResolution = applicationResolver.resolveIntent(goal);
        if (!appResolution.candidates || appResolution.candidates.length === 0) {
            return { status: 'FAILED', reason: 'NO_SUPPORTED_APPLICATION', understanding };
        }

        // 4. Workflow Generation via AI Provider / Planner
        const plan = await aiProvider.generateWorkflow(understanding);

        // 5. Execute via Stage 9 Workflow Executor
        const executionResult = await workflowExecutor.executePlan(plan);

        // 6. Verification
        const verification = await aiProvider.validateResult(plan, executionResult);

        return {
            taskId: understanding.taskId,
            status: executionResult.status === 'SUCCESS' ? 'COMPLETED' : 'FAILED',
            understanding,
            capabilities,
            selectedApplication: appResolution.candidates[0],
            workflowId: plan.workflowId,
            completedSteps: executionResult.context?.completedSteps?.length || 0,
            totalSteps: plan.steps.length,
            adaptations: [],
            verification,
            output: { result: executionResult.status },
            errors: executionResult.context?.errors || []
        };
    }
}

module.exports = new IntelligentWorkflowOrchestrator();
