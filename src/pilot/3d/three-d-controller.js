const logger = require('../../core/logger');
/**
 * CODEZ48 3D CREATION CONTROLLER
 * Main orchestrator for natural-language 3D modeling tasks,
 * 3D intent extraction, app selection, scene planning, and 3D adapter execution.
 */

const threeDIntent = require('./three-d-intent');
const appSelector = require('./app-selector');
const scenePlanner = require('./scene-planner');
const blenderAdapter = require('./adapters/blender-adapter');

class ThreeDController {
    async process3DGoal(goal, apiCall = null) {
        logger.status(`\n\x1b[36m[3D CONTROLLER] Processing 3D creation goal: "${goal}"...\x1b[0m`);

        // 1. Extract structured 3D intent
        const intentObj = threeDIntent.extractIntent(goal);
        logger.user(`\x1b[32m✓ 3D Intent Extracted: Subject="${intentObj.subject}", Style="${intentObj.style}"\x1b[0m`);

        // 2. Audit 3D software & select best adapter
        const selectedApp = appSelector.selectBestAdapter(intentObj);
        logger.user(`\x1b[32m✓ Selected 3D Software: ${selectedApp.name} (${selectedApp.status})\x1b[0m`);

        // 3. Generate structured 10-stage 3D scene plan
        const scenePlan = scenePlanner.createScenePlan(intentObj);
        logger.user(`\x1b[32m✓ Generated 10-Stage 3D Scene Plan: ${scenePlan.objects.length} objects, ${scenePlan.materials.length} PBR materials\x1b[0m`);

        // 4. Execute 3D creation via Blender Adapter
        return await blenderAdapter.build3DScene(scenePlan);
    }
}

module.exports = new ThreeDController();
