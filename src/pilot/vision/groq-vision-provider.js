const logger = require('../../core/logger');
/**
 * CODEZ48 GROQ VISION PROVIDER
 * Sends screenshots and natural language goals to Groq Vision API
 * using GROQ_API_KEY from environment variables. Returns validated structured JSON perception data.
 */

const fetch = globalThis.fetch || require('node-fetch');
const fs = require('fs');
const path = require('path');

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

class GroqVisionProvider {
    constructor() {
        this.model = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
    }

    async analyzeScreenshot(base64Image, goal = 'Analyze screenshot and detect UI elements') {
        const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('[GROQ VISION WARNING] GROQ_API_KEY is not configured. Skipping vision analysis.');
            return { status: 'SKIPPED_NO_API_KEY' };
        }

        logger.status(`\x1b[36m[GROQ VISION] Analyzing screenshot via Groq model ${this.model} for goal: "${goal}"...\x1b[0m`);

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
            const url = 'https://api.groq.com/openai/v1/chat/completions';
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: prompt },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: `data:image/png;base64,${cleanBase64}`
                                    }
                                }
                            ]
                        }
                    ],
                    temperature: 0.2
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error?.message || `Groq API error status: ${res.status}`);
            }

            const content = data.choices && data.choices[0]?.message?.content || '[]';
            let parsed;
            try {
                const jsonMatch = content.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
                parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
            } catch (err) {
                parsed = [{ status: 'PARSED_TEXT', text: content }];
            }

            logger.user(`\x1b[32m✓ Groq Vision analysis complete: Received structured perception data.\x1b[0m`);
            return parsed;
        } catch (e) {
            logger.error(`\x1b[31m[GROQ VISION ERROR] ${e.message}\x1b[0m`);
            return { status: 'ERROR', error: e.message };
        }
    }
}

module.exports = new GroqVisionProvider();
