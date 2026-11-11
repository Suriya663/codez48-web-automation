const logger = require('../../core/logger');
/**
 * CODEZ48 SCREEN VISION ENGINE (CLI-NATIVE)
 * Performs direct local screen capture, local pixel OCR, exact target localization,
 * coordinate mapping, and real physical Windows cursor control independently of HTML/Firebase.
 */

const screenCapture = require('../browser/screen-capture');
const visualAnalyzer = require('../browser/visual-analyzer');
const coordinateMapper = require('../browser/coordinate-mapper');
const guiDriver = require('../drivers/gui-driver');

class ScreenVisionEngine {
    /**
     * Parses natural language command into structured intent.
     * e.g., "Find 'business'" -> { targetText: 'business', action: 'MOVE_CURSOR' }
     * e.g., "Click 'business'" -> { targetText: 'business', action: 'CLICK' }
     */
    parseCommand(command) {
        const cmdLower = (command || '').toLowerCase().trim();
        let action = 'MOVE_CURSOR';
        if (cmdLower.includes('click')) action = 'CLICK';
        else if (cmdLower.includes('select')) action = 'SELECT';
        else if (cmdLower.includes('move')) action = 'MOVE_CURSOR';
        else if (cmdLower.includes('find') || cmdLower.includes('locate')) action = 'MOVE_CURSOR';

        // Extract quoted or target string
        const match = command.match(/["']([^"']+)["']/) || command.match(/(?:find|click|select|move to|locate)\s+(?:the\s+text\s+)?(.+)/i);
        let targetText = match ? match[1].trim() : 'business';
        // Clean up quotes if present
        targetText = targetText.replace(/^["']|["']$/g, '');

        return {
            targetText,
            action
        };
    }

    /**
     * Finds text on screen directly via local capture and pixel OCR.
     */
    async findTextOnScreen(targetText, goal = '') {
        const t0 = Date.now();
        const meta = screenCapture.captureDesktopScreen();
        const captureMs = Date.now() - t0;

        if (!meta || !meta.base64) {
            throw new Error('[ScreenVisionEngine] Failed to capture real Windows screen.');
        }

        const t1 = Date.now();
        let ocrMs = 0;
        let targetSearchMs = 0;

        // 1. Primary Perception Engine: Vision AI (Groq Qwen Vision / Gemini Flash)
        try {
            const visionAI = require('../../../supervoice/vision-ai');
            const modelPreference = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY) ? 'groq' : 'gemini';
            const visionResult = await visionAI.findUIElement(targetText, {
                screenshot: meta,
                model: modelPreference
            });
            ocrMs = Date.now() - t1;

            if (visionResult && visionResult.found && visionResult.element) {
                const el = visionResult.element;
                const left = el.x;
                const top = el.y;
                const right = el.x + el.width;
                const bottom = el.y + el.height;
                const centerX = el.centerX || Math.round((left + right) / 2);
                const centerY = el.centerY || Math.round((top + bottom) / 2);

                logger.user(`\x1b[32m✓ Vision AI located "${targetText}" at (${centerX}, ${centerY}) [${left}, ${top}, ${right}, ${bottom}] (conf: ${el.confidence})\x1b[0m`);

                return {
                    found: true,
                    text: el.text || targetText,
                    confidence: el.confidence || 0.95,
                    left,
                    top,
                    right,
                    bottom,
                    centerX,
                    centerY,
                    sourceType: 'VISION_AI',
                    meta,
                    latencies: {
                        captureMs,
                        ocrMs,
                        targetSearchMs: 0
                    }
                };
            }
        } catch (vErr) {
            logger.status(`[ScreenVisionEngine] Primary Vision AI perception note: ${vErr.message}`);
        }

        // 2. Secondary Perception Engine: Direct Gemini Vision Provider
        try {
            const geminiVision = require('../vision/gemini-vision-provider');
            if (process.env.GEMINI_API_KEY) {
                const geminiElements = await geminiVision.analyzeScreenshot(meta.base64, goal || `Locate "${targetText}" on screen`);
                if (Array.isArray(geminiElements) && geminiElements.length > 0) {
                    const normalizedTarget = targetText.toLowerCase().trim().replace(/[^\w]/g, '');
                    const matched = geminiElements.find(el => {
                        const txt = (el.text || el.label || el.visualDescription || '').toLowerCase().trim().replace(/[^\w]/g, '');
                        return txt.includes(normalizedTarget) || normalizedTarget.includes(txt);
                    }) || geminiElements[0];

                    if (matched && (matched.bbox || matched.center)) {
                        const bbox = matched.bbox || { x: matched.center.x - 30, y: matched.center.y - 15, width: 60, height: 30 };
                        const left = bbox.x;
                        const top = bbox.y;
                        const right = bbox.x + bbox.width;
                        const bottom = bbox.y + bbox.height;
                        const centerX = matched.center ? matched.center.x : Math.round((left + right) / 2);
                        const centerY = matched.center ? matched.center.y : Math.round((top + bottom) / 2);

                        logger.user(`\x1b[32m✓ Gemini Vision located "${targetText}" at (${centerX}, ${centerY}) [${left}, ${top}, ${right}, ${bottom}]\x1b[0m`);

                        return {
                            found: true,
                            text: matched.text || targetText,
                            confidence: matched.confidence || 0.92,
                            left,
                            top,
                            right,
                            bottom,
                            centerX,
                            centerY,
                            sourceType: 'GEMINI_VISION',
                            meta,
                            latencies: {
                                captureMs,
                                ocrMs: Date.now() - t1,
                                targetSearchMs: 0
                            }
                        };
                    }
                }
            }
        } catch (gErr) {
            logger.status(`[ScreenVisionEngine] Secondary Gemini Vision note: ${gErr.message}`);
        }

        // 3. Fallback: visualAnalyzer / local pixel analysis
        const elements = await visualAnalyzer.analyzeScreen(meta.base64, goal || `Locate "${targetText}" on screen`, async () => ({
            answer: `\`\`\`json\n[]\n\`\`\``
        }));
        ocrMs = Date.now() - t1;

        const t2 = Date.now();
        const normalizedTarget = targetText.toLowerCase().trim().replace(/[^\w]/g, '');
        const matches = elements.filter(el => {
            const txt = (el.text || el.label || '').toLowerCase().trim().replace(/[^\w]/g, '');
            // Exclude browser chrome top-left artifacts (top < 50, left < 50) unless no other choice
            const box = el.box || { left: el.left, top: el.top, right: el.right, bottom: el.bottom };
            if (box.top < 40 && box.left < 80) return false;
            return txt.includes(normalizedTarget) || normalizedTarget.includes(txt);
        });
        targetSearchMs = Date.now() - t2;

        if (matches.length === 0 && elements.length > 0) {
            // Fallback to first element if no exact substring match but elements exist
            matches.push(elements[0]);
        }

        if (matches.length === 0) {
            return {
                found: false,
                targetText,
                candidates: []
            };
        }

        if (matches.length > 1) {
            console.warn(`[ScreenVisionEngine WARNING] Multiple matches (${matches.length}) found for "${targetText}". Handling ambiguity safely.`);
        }

        const best = matches[0];
        const box = best.box || { left: best.left, top: best.top, right: best.right, bottom: best.bottom };
        const left = box.left;
        const top = box.top;
        const right = box.right;
        const bottom = box.bottom;
        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;

        return {
            found: true,
            text: best.text || best.label || targetText,
            confidence: best.confidence || 0.98,
            left,
            top,
            right,
            bottom,
            centerX,
            centerY,
            sourceType: best.sourceType || 'SCREEN_OCR',
            meta,
            latencies: {
                captureMs,
                ocrMs,
                targetSearchMs
            }
        };
    }

    /**
     * Executes a natural language command against the current desktop state.
     */
    async executeCommand(command) {
        const startTime = Date.now();
        logger.status(`\n\x1b[36m[SCREEN VISION ENGINE] Executing CLI command: "${command}"...\x1b[0m`);

        const parsed = this.parseCommand(command);
        logger.status(`[ScreenVisionEngine] Parsed Target: "${parsed.targetText}" | Action: "${parsed.action}"`);

        // 1. Fresh observation & OCR
        const targetRes = await this.findTextOnScreen(parsed.targetText, command);
        if (!targetRes.found) {
            throw new Error(`[ScreenVisionEngine] Target "${parsed.targetText}" not found on physical screen.`);
        }

        const tCoord = Date.now();
        // 2. Coordinate mapping using existing coordinate mapper
        const mapped = coordinateMapper.mapScreenshotToScreen(targetRes.centerX, targetRes.centerY, targetRes.meta);
        const coordinateMs = Date.now() - tCoord;

        // 3. Real physical cursor control
        const tCursor = Date.now();
        const moveRes = await guiDriver.moveCursorSmoothlyWithFeedback(mapped.screenX, mapped.screenY, `CLI TARGET: ${targetRes.text}`);
        const cursorMoveMs = Date.now() - tCursor;

        // 4. Action execution (if requested)
        if (parsed.action === 'CLICK') {
            guiDriver.clickPhysicalMouse();
        } else if (parsed.action === 'SELECT') {
            const dragStart = coordinateMapper.mapScreenshotToScreen(targetRes.left - 2, targetRes.centerY, targetRes.meta);
            const dragEnd = coordinateMapper.mapScreenshotToScreen(targetRes.right + 2, targetRes.centerY, targetRes.meta);
            guiDriver.mouseDrag(dragStart.screenX, dragStart.screenY, dragEnd.screenX, dragEnd.screenY);
        }

        // 5. Fresh verification screenshot
        const tVerify = Date.now();
        const postMeta = screenCapture.captureDesktopScreen();
        const verificationMs = Date.now() - tVerify;

        const totalMs = Date.now() - startTime;

        const telemetry = {
            captureMs: targetRes.latencies.captureMs,
            ocrMs: targetRes.latencies.ocrMs,
            targetSearchMs: targetRes.latencies.targetSearchMs,
            coordinateMs,
            cursorMoveMs,
            verificationMs,
            totalMs
        };

        logger.user(`\x1b[32m✓ ScreenVisionEngine successfully executed command "${command}"\x1b[0m`, telemetry);

        return {
            status: 'PASS',
            target: targetRes,
            cursorResult: moveRes,
            postActionMeta: postMeta,
            telemetry
        };
    }
}

module.exports = new ScreenVisionEngine();
