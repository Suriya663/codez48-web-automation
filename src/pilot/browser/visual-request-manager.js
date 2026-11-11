const logger = require('../../core/logger');
/**
 * CODEZ48 VISUAL REQUEST MANAGER (FIREBASE & NETLIFY TELEMETRY)
 * Transmits complete screenshot data, live DOM structure, and full page HTML
 * through Netlify Functions to Firebase Firestore.
 */

const fetch = globalThis.fetch || require('node-fetch');

class VisualRequestManager {
    constructor() {
        this.latestPayload = null;
        this.clientResponses = {};
    }

    async createVisualRequest(screenshotMetadata, query = 'Analyze screen and detect UI elements') {
        const requestId = `VISUAL-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString().slice(-4)}`;
        const observationId = `OBS-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const syncTimestamp = new Date().toISOString();

        logger.status(`\x1b[36m[VISUAL REQUEST MANAGER] Transmitting synchronized state package (ObsID: ${observationId}) to Firebase...\x1b[0m`);

        const payload = {
            requestId,
            observationId,
            timestamp: syncTimestamp,
            type: 'SCREEN_ANALYSIS',
            status: screenshotMetadata.status || 'SENT_TO_PILOT',
            originalGoal: screenshotMetadata.originalGoal || query,
            userRequirement: screenshotMetadata.originalGoal || query,
            url: screenshotMetadata.url || 'https://codez48.netlify.app/',
            title: screenshotMetadata.title || 'Live Page',
            scrollPosition: screenshotMetadata.scrollPosition || { x: 0, y: 0 },
            activeElement: screenshotMetadata.activeElement || null,
            foregroundWindow: screenshotMetadata.foregroundWindow || null,
            screenshotData: screenshotMetadata.base64 ? (screenshotMetadata.base64.startsWith('data:') ? screenshotMetadata.base64 : `data:image/jpeg;base64,${screenshotMetadata.base64}`) : null,
            screenshotWidth: screenshotMetadata.screenshotWidth,
            screenshotHeight: screenshotMetadata.screenshotHeight,
            screenWidth: screenshotMetadata.screenWidth,
            screenHeight: screenshotMetadata.screenHeight,
            devicePixelRatio: screenshotMetadata.devicePixelRatio,
            dpi: screenshotMetadata.dpi,
            scaling: screenshotMetadata.scaling,
            captureMode: screenshotMetadata.captureMode,
            imageFormat: screenshotMetadata.imageFormat,
            fileSize: screenshotMetadata.fileSize,
            // Truncate domContent to 100,000 chars (~100 KB) to ensure total payload stays safely under limits
            domContent: (screenshotMetadata.domContent || screenshotMetadata.html) ? String(screenshotMetadata.domContent || screenshotMetadata.html).substring(0, 100000) : null,
            ocrCount: screenshotMetadata.ocrCount || (screenshotMetadata.ocr ? screenshotMetadata.ocr.length : 3),
            elementsCount: screenshotMetadata.elementsCount || (screenshotMetadata.elements ? screenshotMetadata.elements.length : 3),
            targetElement: screenshotMetadata.targetElement || 'Interactive Target',
            ocr: screenshotMetadata.ocr || [],
            elements: screenshotMetadata.elements || [],
            query: screenshotMetadata.originalGoal || query,
            createdAt: syncTimestamp,
            updatedAt: syncTimestamp
        };

        this.latestPayload = payload;

        const payloadJson = JSON.stringify(payload);
        logger.debug(`[FIREBASE REQUEST] Endpoint: https://codez48.netlify.app/.netlify/functions/pilot-request-monitor`);
        logger.debug(`[FIREBASE REQUEST] Payload size: ${Math.round(payloadJson.length / 1024)} KB | Screenshot included: ${!!payload.screenshotData}`);

        try {
            const res = await fetch('https://codez48.netlify.app/.netlify/functions/pilot-request-monitor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payloadJson
            });

            logger.debug(`[FIREBASE REQUEST] HTTP status: ${res.status}`);
            if (res.ok) {
                const fireData = await res.json();
                if (fireData.success) {
                    logger.status(`[FIREBASE] Screenshot upload: PASS`);
                    logger.status(`[FIREBASE] Visual payload stored: PASS (${requestId})`);
                } else {
                    console.warn(`[FIREBASE WARNING] Telemetry response error: ${fireData.error}`);
                }
            } else {
                console.warn(`[FIREBASE WARNING] HTTP ${res.status} returned from monitor endpoint.`);
            }
        } catch (e) {
            logger.error(`[FIREBASE ERROR] Visual request sync error: ${e.message}`);
        }

        return { success: true, requestId, payload };
    }

    async waitForVisualResponse(requestId, timeoutMs = 15000) {
        logger.status(`\x1b[36m[VISUAL REQUEST MANAGER] Waiting up to ${timeoutMs}ms for HUD visual response for ${requestId}...\x1b[0m`);
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            if (this.clientResponses[requestId]) {
                const response = this.clientResponses[requestId];
                logger.user(`\x1b[32m✓ Visual Response Received: ${response.type} (${response.targetText || ''})\x1b[0m`);
                return response;
            }
            await new Promise(r => setTimeout(r, 500));
        }
        console.warn(`\x1b[33m[VISUAL REQUEST MANAGER] Timed out waiting for HUD response.\x1b[0m`);
        return null;
    }
}

module.exports = new VisualRequestManager();
