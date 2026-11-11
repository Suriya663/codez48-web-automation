const logger = require('../../core/logger');
/**
 * CODEZ48 UNIFIED AI PROVIDER
 * Connects agent intelligence to Codez48 AI model backend with robust timeouts,
 * request ID tracking, duration logging, and malformed JSON resilience.
 */

const fetch = globalThis.fetch || require('node-fetch');

class AIProvider {
    constructor() {
        this.endpoint = 'https://codez48.netlify.app/.netlify/functions/cli-ai-chat';
    }

    async analyzeScreen(pageModel, goal, options = {}) {
        const startTime = Date.now();
        const requestId = 'REQ-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        logger.status(`\x1b[36m[AI REQUEST ${requestId}] Sending screen analysis goal: "${goal}"...\x1b[0m`);

        const prompt = `You are the core semantic intelligence layer of Codez48 Generic Web Agent.
User Request: "${goal}"
Current Page Model:
${JSON.stringify(pageModel, null, 2)}

Analyze the page model and determine the correct target and action.
Return structured JSON only:
{
  "intent": "NAVIGATE" | "CLICK" | "TYPE" | "SCROLL" | "READ",
  "target": {
    "text": string,
    "role": string,
    "href": string
  },
  "action": string,
  "confidence": number,
  "expectedResult": string
}`;

        const timeoutMs = options.timeoutMs || 30000;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const res = await fetch(this.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: prompt }],
                    projectId: null
                }),
                signal: controller.signal
            });

            clearTimeout(timeout);
            const duration = Date.now() - startTime;

            if (!res.ok) {
                logger.error(`\x1b[31m[AI ERROR ${requestId}] HTTP Error ${res.status} (Duration: ${duration}ms)\x1b[0m`);
                throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
            }

            const rawText = await res.text();
            if (!rawText || !rawText.trim()) {
                console.warn(`[AI WARNING ${requestId}] Empty response received from server.`);
                throw new Error('Empty response received from AI backend.');
            }

            let data;
            try {
                data = JSON.parse(rawText);
            } catch (jsonErr) {
                console.warn(`[AI WARNING ${requestId}] Malformed JSON response: ${rawText.substring(0, 100)}`);
                throw new Error(`Malformed JSON output from AI backend: ${jsonErr.message}`);
            }

            logger.status(`\x1b[32m[AI SUCCESS ${requestId}] Status: ${res.status} | Duration: ${duration}ms\x1b[0m`);
            return {
                success: true,
                requestId,
                status: res.status,
                duration,
                timedOut: false,
                provider: 'codez48-existing-ai',
                result: data
            };
        } catch (e) {
            clearTimeout(timeout);
            const duration = Date.now() - startTime;
            const isTimeout = e.name === 'AbortError' || e.message.includes('aborted');

            if (isTimeout) {
                logger.error(`\x1b[31m[AI TIMEOUT ${requestId}] Request timed out after ${timeoutMs}ms\x1b[0m`);
            } else {
                console.warn(`[AI NOTICE ${requestId}] Error: ${e.message} (Duration: ${duration}ms)`);
            }

            if (options.strict) {
                throw e;
            }

            // Fallback for non-strict requests
            return {
                success: false,
                requestId,
                status: isTimeout ? 408 : 500,
                duration,
                timedOut: isTimeout,
                error: e.message,
                provider: 'codez48-local-fallback',
                result: {
                    intent: 'NAVIGATE',
                    target: { text: goal, role: 'link', href: '#' },
                    action: 'CLICK',
                    confidence: 0.85,
                    expectedResult: 'Target resolved via fallback'
                }
            };
        }
    }
}

module.exports = new AIProvider();
