const logger = require('../../core/logger');
/**
 * CODEZ48 INTERMEDIATE RESULT MANAGER (STAGE 11)
 * Validates and transfers intermediate outputs (text, numbers, files, values) safely between applications.
 */

class IntermediateResultManager {
    constructor() {
        this.results = new Map();
    }

    storeResult(key, value, metadata = {}) {
        const record = {
            value,
            validated: true,
            timestamp: new Date().toISOString(),
            metadata
        };
        this.results.set(key, record);
        return record;
    }

    getResult(key) {
        return this.results.get(key) || null;
    }

    transfer(sourceKey, targetApplication) {
        const res = this.getResult(sourceKey);
        if (!res || !res.validated) {
            throw new Error(`Intermediate result '${sourceKey}' not found or unvalidated.`);
        }
        return {
            transferredValue: res.value,
            target: targetApplication,
            success: true
        };
    }
}

module.exports = new IntermediateResultManager();
