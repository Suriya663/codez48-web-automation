const logger = require('../../core/logger');
/**
 * CODEZ48 EXECUTION CONTEXT MANAGER (STAGE 12)
 * Manages task context survival across multi-app transitions.
 */

class ExecutionContextManager {
    constructor() {
        this.currentApplication = null;
        this.previousApplication = null;
        this.activeWindow = null;
        this.workflowId = null;
        this.intermediateOutputs = new Map();
        this.verificationResults = [];
    }

    setContext(data) {
        Object.assign(this, data);
    }

    getContext() {
        return {
            currentApplication: this.currentApplication,
            previousApplication: this.previousApplication,
            activeWindow: this.activeWindow,
            workflowId: this.workflowId
        };
    }
}

module.exports = new ExecutionContextManager();
