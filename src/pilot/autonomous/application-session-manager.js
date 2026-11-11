const logger = require('../../core/logger');
/**
 * CODEZ48 APPLICATION SESSION MANAGER (STAGE 11)
 * Manages active application sessions, window ownership, process health, and context preservation.
 */

class ApplicationSessionManager {
    constructor() {
        this.sessions = new Map();
    }

    registerSession(applicationId, sessionInfo) {
        const session = {
            applicationId,
            processId: sessionInfo.processId || null,
            windowHandle: sessionInfo.windowHandle || null,
            active: true,
            ready: true,
            createdAt: new Date().toISOString(),
            ...sessionInfo
        };
        this.sessions.set(applicationId, session);
        return session;
    }

    getSession(applicationId) {
        return this.sessions.get(applicationId) || null;
    }

    verifyOwnership(applicationId) {
        const s = this.getSession(applicationId);
        return s ? s.active && s.ready : false;
    }

    terminateSession(applicationId) {
        const s = this.getSession(applicationId);
        if (s) {
            s.active = false;
            s.ready = false;
        }
    }
}

module.exports = new ApplicationSessionManager();
