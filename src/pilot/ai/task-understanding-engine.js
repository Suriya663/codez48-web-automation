const logger = require('../../core/logger');
/**
 * CODEZ48 TASK UNDERSTANDING ENGINE (STAGE 10)
 * Converts natural-language user requests into structured intents, entities, constraints, and ambiguity checks.
 */

const aiProvider = require('./ai-provider');

class TaskUnderstandingEngine {
    async understand(goal) {
        if (!goal) throw new Error('Goal is required for task understanding.');
        logger.status(`\x1b[36m[TASK UNDERSTANDING] Parsing natural-language goal: "${goal}"...\x1b[0m`);

        const understanding = await aiProvider.understandTask(goal);

        // Check for potential ambiguity
        if (goal.toLowerCase().includes('open the file') || goal.toLowerCase().includes('open presentation')) {
            understanding.ambiguity.push({ type: 'MULTIPLE_CANDIDATES', details: 'Ambiguous target reference detected.' });
            understanding.requiresClarification = true;
        }

        return understanding;
    }
}

module.exports = new TaskUnderstandingEngine();
