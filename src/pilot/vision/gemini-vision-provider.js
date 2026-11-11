const logger = require('../../core/logger');
/**
 * CODEZ48 GEMINI VISION PROVIDER
 * Sends screenshots and natural language goals to Google Gemini Vision API
 * using GEMINI_API_KEY from environment variables or GeminiKeyVault pool.
 */

const fetch = globalThis.fetch || require('node-fetch');
const fs = require('fs');
const path = require('path');
const geminiKeyVault = require('../../core/gemini-key-vault');

try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf8').split('\n');
        for (const line of lines) {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const k = parts[0].trim();
                const v = parts.slice(1).join('=').trim();
                if (k && v && !process.env[k]) process.env[k] = v;
            }
        }
    }
} catch (e) {}

class GeminiVisionProvider {
    constructor() {
        this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    }

    async analyzeScreenshot(base64Image, goal = 'Analyze screenshot and detect UI elements') {
        let apiKey = geminiKeyVault.getActiveKey() || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('[CRITICAL CONFIG ERROR] No Gemini API key configured. Please set GEMINI_API_KEY in .env or provide a user key via "node cli.js key <API_KEY>"');
        }

        logger.status(`\x1b[36m[GEMINI VISION] Analyzing screenshot via model ${this.model} for goal: "${goal}"...\x1b[0m`);

        const prompt = `You are the visual perception component of Codez48 Pilot.
Analyze the supplied Windows screenshot.
Your job is to identify visible UI elements relevant to the user's requested task: "${goal}".
Do not invent elements. Do not assume hidden elements.
Return structured JSON only as an array of objects with:
- text (string)
- role (string)
- bbox { x, y, width, height }
- center { x, y }
- confidence (0..1)
- visualDescription (string)
If the target is not visible, return {"status": "NOT_FOUND"}.
If ambiguous, return {"status": "ABORTED_AMBIGUOUS"}.`;

        const cleanBase64 = (base64Image || '').replace(/^data:image\/[a-z]+;base64,/, '');

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType: 'image/png',
                                    data: cleanBase64
                                }
                            }
                        ]
                    }],
                    generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
                })
            });

            const data = await res.json();
            if (!res.ok) {
                if (res.status === 429) {
                    geminiKeyVault.reportQuotaExhausted(apiKey);
                }
                throw new Error(data.error?.message || `Gemini API error status: ${res.status}`);
            }

            const candidate = data.candidates && data.candidates[0];
            const textResponse = candidate?.content?.parts?.[0]?.text || '[]';
            const parsed = JSON.parse(textResponse);

            logger.user(`\x1b[32m✓ Gemini Vision analysis complete: Received structured perception data.\x1b[0m`);
            return parsed;
        } catch (e) {
            logger.error(`\x1b[31m[GEMINI VISION ERROR] ${e.message}\x1b[0m`);
            throw e;
        }
    }
}

module.exports = new GeminiVisionProvider();
