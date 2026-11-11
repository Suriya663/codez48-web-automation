const logger = require('../../core/logger');
/**
 * CODEZ48 BROWSER STATE MACHINE
 * Explicit state machine for browser agent task lifecycle.
 * Prevents silent fallbacks and manages state transitions cleanly.
 */

const STATES = {
    IDLE: 'IDLE',
    OPENING_BROWSER: 'OPENING_BROWSER',
    OPENING_NEW_TAB: 'OPENING_NEW_TAB',
    FOCUSING_ADDRESS_BAR: 'FOCUSING_ADDRESS_BAR',
    ENTERING_URL: 'ENTERING_URL',
    NAVIGATING: 'NAVIGATING',
    WAITING_FOR_PAGE: 'WAITING_FOR_PAGE',
    VERIFYING_URL: 'VERIFYING_URL',
    SHOWING_WELCOME: 'SHOWING_WELCOME',
    OBSERVING_PAGE: 'OBSERVING_PAGE',
    WAITING_FOR_AI: 'WAITING_FOR_AI',
    RESOLVING_ACTION: 'RESOLVING_ACTION',
    EXECUTING_ACTION: 'EXECUTING_ACTION',
    VERIFYING_ACTION: 'VERIFYING_ACTION',
    REOBSERVING: 'REOBSERVING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED'
};

class BrowserStateMachine {
    constructor() {
        this.currentState = STATES.IDLE;
        this.history = [];
    }

    setState(newState, details = '') {
        if (!STATES[newState]) {
            logger.error(`\x1b[31m[STATE MACHINE ERROR] Unknown state: ${newState}\x1b[0m`);
            return false;
        }

        this.history.push({
            from: this.currentState,
            to: newState,
            details,
            timestamp: new Date().toISOString()
        });

        this.currentState = newState;
        logger.status(`\x1b[35m[BROWSER STATE TRANSITION] ${newState}${details ? ' - ' + details : ''}\x1b[0m`);
        return true;
    }

    getCurrentState() {
        return this.currentState;
    }

    isCompleted() {
        return this.currentState === STATES.COMPLETED;
    }

    isFailed() {
        return this.currentState === STATES.FAILED;
    }
}

module.exports = {
    STATES,
    BrowserStateMachine
};
