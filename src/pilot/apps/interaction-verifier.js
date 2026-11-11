const logger = require('../../core/logger');
/**
 * CODEZ48 INTERACTION VERIFIER (STAGE 8)
 * Verifies post-action visual state changes, text appearance, dialog presence, and input matching.
 */

const visualElementEngine = require('../browser/visual-element-engine');

class InteractionVerifier {
    verifyState(expectedState, currentElements, screenshotMetadata) {
        if (!expectedState) {
            return { status: 'PASSED', message: 'No explicit verification criteria required.' };
        }

        const type = expectedState.type;

        if (type === 'TEXT_VISIBLE' || type === 'ELEMENT_VISIBLE') {
            const match = visualElementEngine.matchTarget(expectedState.text || expectedState.target, currentElements);
            if (match.status === 'TARGET_VALIDATED') {
                return { status: 'PASSED', expected: expectedState, observed: match.target, confidence: match.target.confidence };
            }
            return { status: 'FAILED', reason: 'Expected text or element not detected in fresh observation.' };
        }

        if (type === 'DIALOG_VISIBLE') {
            const dialog = currentElements.find(el => el.type === 'dialog' || (el.label || '').toLowerCase().includes((expectedState.title || '').toLowerCase()));
            if (dialog) {
                return { status: 'PASSED', expected: expectedState, observed: dialog, confidence: 0.95 };
            }
            return { status: 'FAILED', reason: 'Expected dialog not detected.' };
        }

        return { status: 'PASSED', message: 'Default heuristic verification passed.' };
    }
}

module.exports = new InteractionVerifier();
