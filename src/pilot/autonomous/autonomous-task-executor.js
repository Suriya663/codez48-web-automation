const logger = require('../../core/logger');
/**
 * CODEZ48 AUTONOMOUS TASK EXECUTOR (STAGE 11)
 * Main Stage 11 execution controller linking task understanding, task graphs, sessions, intermediate results, checkpoints, and execution.
 */

const TaskGraph = require('./task-graph');
const applicationSessionManager = require('./application-session-manager');
const intermediateResultManager = require('./intermediate-result-manager');
const checkpointManager = require('./checkpoint-manager');
const recoveryManager = require('./recovery-manager');
const intelligentWorkflowOrchestrator = require('../ai/intelligent-workflow-orchestrator');

class AutonomousTaskExecutor {
    async executeGoal(goal) {
        logger.status(`\x1b[36m[AUTONOMOUS EXECUTOR] Starting multi-application task execution for goal: "${goal}"\x1b[0m`);

        const taskId = `AUTO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const graph = new TaskGraph(taskId, goal);

        // Build execution graph nodes
        graph.addNode('start', 'TASK_START');
        graph.addNode('understand', 'APPLICATION_RESOLUTION');
        graph.addNode('execute', 'WORKFLOW_EXECUTION');
        graph.addNode('verify', 'VERIFICATION');
        graph.addNode('complete', 'TASK_COMPLETE');

        graph.addEdge('start', 'understand', 'SUCCESS');
        graph.addEdge('understand', 'execute', 'SUCCESS');
        graph.addEdge('execute', 'verify', 'SUCCESS');
        graph.addEdge('verify', 'complete', 'SUCCESS');

        // Create initial checkpoint
        checkpointManager.createCheckpoint(taskId, 'start', { goal });

        // Execute via Stage 10 Orchestrator
        const result = await intelligentWorkflowOrchestrator.executeGoal(goal);

        if (result.status === 'COMPLETED') {
            return {
                taskId,
                status: 'COMPLETED',
                goal,
                result
            };
        } else {
            const recovery = recoveryManager.handleFailure(new Error(result.reason || 'Task execution failed'), 0);
            return {
                taskId,
                status: recovery.action === 'FAIL_TASK' ? 'FAILED' : 'RECOVERING',
                goal,
                recovery
            };
        }
    }
}

module.exports = new AutonomousTaskExecutor();
