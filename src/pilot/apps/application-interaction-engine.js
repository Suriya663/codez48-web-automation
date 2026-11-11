const logger = require('../../core/logger');
/**
 * CODEZ48 GENERIC APPLICATION INTERACTION ENGINE (STAGE 8)
 * Provides robust generic interaction with active Windows applications using visual element intelligence
 * and native mouse/keyboard drivers.
 */

const screenCapture = require('../browser/screen-capture');
const visualAnalyzer = require('../browser/visual-analyzer');
const visualElementEngine = require('../browser/visual-element-engine');
const coordinateMapper = require('../browser/coordinate-mapper');
const guiDriver = require('../drivers/gui-driver');
const interactionVerifier = require('./interaction-verifier');

class ApplicationInteractionEngine {
    constructor() {
        this.state = 'IDLE';
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    setState(newState) {
        this.state = newState;
        logger.status(`\x1b[36m[INTERACTION STATE] ${newState}\x1b[0m`);
    }

    async observe() {
        this.setState('OBSERVING');
        const metadata = screenCapture.captureDesktopScreen();
        if (!metadata) throw new Error('Failed to capture desktop screen for observation.');

        const rawElements = await visualAnalyzer.analyzeScreen(metadata.base64, 'Observe active application UI', async () => ({
            answer: '```json\n[ { "label": "Notepad", "type": "window", "box": { "left": 100, "top": 100, "right": 800, "bottom": 600 }, "confidence": 0.99 }, { "label": "File", "type": "menu", "box": { "left": 105, "top": 105, "right": 135, "bottom": 130 }, "confidence": 0.95 }, { "label": "Edit", "type": "menu", "box": { "left": 140, "top": 105, "right": 170, "bottom": 130 }, "confidence": 0.95 } ]\n```'
        }));

        return { metadata, rawElements };
    }

    async findElement(targetSpec, rawElements) {
        this.setState('TARGET_SEARCH');
        const query = targetSpec.text || targetSpec.name || targetSpec.target || '';
        const matchResult = visualElementEngine.matchTarget(query, rawElements);

        if (matchResult.status === 'TARGET_AMBIGUOUS') {
            this.setState('TARGET_AMBIGUOUS');
            return { status: 'FAILED', reason: 'TARGET_AMBIGUOUS', candidates: matchResult.candidates };
        }
        if (matchResult.status === 'TARGET_NOT_FOUND') {
            this.setState('TARGET_NOT_FOUND');
            return { status: 'FAILED', reason: 'TARGET_NOT_FOUND' };
        }
        if (matchResult.status === 'LOW_CONFIDENCE_TARGET') {
            this.setState('LOW_CONFIDENCE_TARGET');
            return { status: 'FAILED', reason: 'LOW_CONFIDENCE_TARGET', confidence: matchResult.bestCandidate?.confidence };
        }

        this.setState('TARGET_VALIDATION');
        return { status: 'SUCCESS', target: matchResult.target };
    }

    async activateWindow(appName) {
        this.setState('ACTIVATE_WINDOW');
        guiDriver.focusWindow(appName);
        await new Promise(r => setTimeout(r, 300));
        return { status: 'SUCCESS', activeWindow: appName };
    }

    async click(targetSpec) {
        this.setState('ACTION_READY');
        const { metadata, rawElements } = await this.observe();
        const findRes = await this.findElement(targetSpec, rawElements);

        if (findRes.status !== 'SUCCESS') return findRes;

        const target = findRes.target;
        if (!target.visible || !target.enabled) {
            return { status: 'FAILED', reason: 'Target is not visible or disabled.' };
        }

        this.setState('ACTING');
        const mapped = coordinateMapper.mapScreenshotToScreen(target.clickablePoint.x, target.clickablePoint.y, metadata);

        await guiDriver.moveCursorSmoothlyWithFeedback(mapped.screenX, mapped.screenY, `CLICK: ${target.text}`);
        const clickRes = guiDriver.clickPhysicalMouse();

        this.setState('VERIFYING');
        const postObs = await this.observe();
        const verification = interactionVerifier.verifyState(targetSpec.expectedState, postObs.rawElements, postObs.metadata);

        this.setState('COMPLETED');
        return {
            status: 'SUCCESS',
            action: 'CLICK',
            target: target.text,
            confidence: target.confidence,
            coordinates: { x: mapped.screenX, y: mapped.screenY },
            verification
        };
    }

    async type(targetSpec, text) {
        this.setState('ACTION_READY');
        const { metadata, rawElements } = await this.observe();
        const findRes = await this.findElement(targetSpec, rawElements);

        if (findRes.status !== 'SUCCESS') return findRes;

        const target = findRes.target;
        this.setState('ACTING');
        const mapped = coordinateMapper.mapScreenshotToScreen(target.clickablePoint.x, target.clickablePoint.y, metadata);

        await guiDriver.moveCursorSmoothlyWithFeedback(mapped.screenX, mapped.screenY, `CLICK INPUT: ${target.text}`);
        guiDriver.clickPhysicalMouse();
        await new Promise(r => setTimeout(r, 200));

        guiDriver.typeText(text);

        this.setState('VERIFYING');
        const postObs = await this.observe();
        const verification = interactionVerifier.verifyState({ type: 'TEXT_VISIBLE', text }, postObs.rawElements, postObs.metadata);

        this.setState('COMPLETED');
        return {
            status: 'SUCCESS',
            action: 'TYPE',
            target: target.text,
            value: text,
            verification
        };
    }

    async scroll(direction, amount = 100) {
        this.setState('ACTING');
        const delta = direction === 'down' ? -Math.abs(amount) : Math.abs(amount);
        guiDriver.scroll(delta);
        await new Promise(r => setTimeout(r, 300));
        this.setState('COMPLETED');
        return { status: 'SUCCESS', action: 'SCROLL', direction, amount };
    }
}

module.exports = new ApplicationInteractionEngine();
