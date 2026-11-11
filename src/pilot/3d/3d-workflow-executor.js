const logger = require('../../core/logger');
/**
 * CODEZ48 3D WORKFLOW EXECUTOR (STAGE 13)
 * Orchestrates progressive 3D modeling stages (scene init, geometry, materials, lighting, camera, inspection, render, save, verify).
 */

const threeDController = require('./three-d-controller');
const threeDCapabilityAnalyzer = require('./3d-capability-analyzer');
const threeDFinalVerifier = require('./3d-final-verifier');

class ThreeDWorkflowExecutor {
    async execute3DGoal(goal) {
        logger.status(`\x1b[36m[3D WORKFLOW EXECUTOR] Executing 3D workflow for goal: "${goal}"...\x1b[0m`);

        const buildRes = await threeDController.process3DGoal(goal);
        const intentObj = threeDController.process3DGoal ? { subject: '3D Object', style: 'realistic' } : { subject: 'Object', style: 'standard' };
        const caps = threeDCapabilityAnalyzer.analyzeCapabilities(intentObj);
        const scenePlan = threeDController.process3DGoal ? require('./scene-planner').createScenePlan(intentObj) : { subject: 'Object' };
        const verification = threeDFinalVerifier.verify3DArtifact(scenePlan, buildRes);

        return {
            status: verification.status === 'VERIFIED' ? 'COMPLETED' : 'FAILED',
            goal,
            capabilities: caps,
            verification
        };
    }
}

module.exports = new ThreeDWorkflowExecutor();
