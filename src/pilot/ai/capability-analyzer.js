const logger = require('../../core/logger');
/**
 * CODEZ48 CAPTURE CAPABILITY ANALYZER (STAGE 10)
 * Determines required application capabilities for a given task using AI provider and Stage 7 metadata.
 */

const aiProvider = require('./ai-provider');

class CapabilityAnalyzer {
    async analyze(goal) {
        logger.status(`\x1b[36m[CAPABILITY ANALYZER] Analyzing capabilities for goal: "${goal}"...\x1b[0m`);
        return await aiProvider.analyzeCapabilities(goal);
    }
}

module.exports = new CapabilityAnalyzer();
