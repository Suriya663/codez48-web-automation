const RunState = {
    CREATED: 'CREATED',
    STARTING_BROWSER: 'STARTING_BROWSER',
    OPENING_PAGE: 'OPENING_PAGE',
    RUNNING: 'RUNNING',
    WAITING_FOR_PAGE: 'WAITING_FOR_PAGE',
    WAITING_FOR_USER: 'WAITING_FOR_USER',
    VERIFYING: 'VERIFYING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED'
};

class RunManager {
    constructor() {
        this.runs = new Map(); // runId -> RunInstance
    }

    createRun(runId, userId, goal, targetUrl, payload = {}) {
        const run = {
            runId,
            userId,
            goal,
            targetUrl,
            payload,

            status: RunState.CREATED,

            // Real Playwright Memory References (NOT serialized to Firebase)
            browserContext: null,
            activePage: null, // Playwright Page Object
            pagesMap: new Map(), // pageId -> Playwright Page Object

            // Safe Serialized Metadata for UI & Firestore
            activePageInfo: {
                pageId: null,
                url: targetUrl,
                title: 'Initializing...',
                isActive: true
            },
            pagesInfo: [],

            currentStep: 0,
            lastAction: 'Run created. Launching browser worker...',
            lastResult: null,

            collectedData: null,
            waitingForUser: false,
            waitingReason: null,

            retryCount: 0,
            maxRetries: 3,
            watchdogTimer: null,

            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.runs.set(runId, run);
        console.log(`[RUN MANAGER] Created run: ${runId} for user: ${userId}`);
        return run;
    }

    getRun(runId) {
        return this.runs.get(runId) || null;
    }

    getRunForUser(runId, userId) {
        const run = this.runs.get(runId);
        if (!run) return null;
        if (run.userId !== userId && run.userId !== 'guest') {
            console.warn(`[RUN MANAGER SECURITY] Unauthorized run access attempt: ${runId} by ${userId}`);
            return null;
        }
        return run;
    }

    updateRunStatus(runId, status, lastAction = '', lastResult = null) {
        const run = this.runs.get(runId);
        if (!run) return null;

        run.status = status;
        if (lastAction) run.lastAction = lastAction;
        if (lastResult !== null) run.lastResult = lastResult;
        run.updatedAt = new Date().toISOString();

        if (status === RunState.WAITING_FOR_USER) {
            run.waitingForUser = true;
        } else if (status === RunState.RUNNING) {
            run.waitingForUser = false;
            run.waitingReason = null;
        }

        return run;
    }

    getSafeRunMetadata(run) {
        if (!run) return null;
        return {
            runId: run.runId,
            userId: run.userId,
            goal: run.goal,
            targetUrl: run.targetUrl,
            status: run.status,
            activePageInfo: run.activePageInfo,
            pagesCount: run.pagesMap.size,
            currentStep: run.currentStep,
            lastAction: run.lastAction,
            lastResult: run.lastResult,
            collectedData: run.collectedData,
            waitingForUser: run.waitingForUser,
            waitingReason: run.waitingReason,
            createdAt: run.createdAt,
            updatedAt: run.updatedAt
        };
    }

    deleteRun(runId) {
        const run = this.runs.get(runId);
        if (run) {
            if (run.watchdogTimer) clearInterval(run.watchdogTimer);
            run.pagesMap.clear();
            run.activePage = null;
            run.browserContext = null;
            this.runs.delete(runId);
            console.log(`[RUN MANAGER] Run deleted: ${runId}`);
        }
    }
}

module.exports = {
    RunManager: new RunManager(),
    RunState
};
