const logger = require('../../core/logger');
/**
 * CODEZ48 CHECKPOINT MANAGER (STAGE 11)
 * Creates and restores task checkpoints after major successful phases.
 */

class CheckpointManager {
    constructor() {
        this.checkpoints = new Map();
    }

    createCheckpoint(taskId, nodeId, stateContext) {
        const checkpointId = `CP-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
        const checkpoint = {
            checkpointId,
            taskId,
            nodeId,
            stateContext: JSON.parse(JSON.stringify(stateContext || {})),
            timestamp: new Date().toISOString()
        };
        this.checkpoints.set(checkpointId, checkpoint);
        return checkpoint;
    }

    getCheckpoint(checkpointId) {
        return this.checkpoints.get(checkpointId) || null;
    }
}

module.exports = new CheckpointManager();
