const logger = require('../../core/logger');
/**
 * CODEZ48 VISUAL ANALYZER ADAPTER (STAGE 14 / PRODUCTION)
 * Sends full-screen screenshots to the Codez48 multimodal AI visual-analysis service
 * for OCR, image-text detection, and visual element detection across native UI, banners, buttons, and graphics.
 */

class VisualAnalyzer {
    async analyzeScreen(base64Image, goal, apiCall) {
        logger.status(`\x1b[36m[VISUAL ANALYZER] Sending screenshot to Codez48 visual-analysis service for goal: "${goal}"...\x1b[0m`);

        try {
            const promptMsg = `Goal: "${goal}"\nAnalyze this screenshot thoroughly. Perform OCR and visual element detection across the ENTIRE screenshot, including text rendered INSIDE images, banners, buttons, canvas, and graphical UI. Identify all relevant text and elements and return their exact pixel bounding boxes.\n\nIMPORTANT: Return a JSON array of objects with: { "text": "string", "label": "string", "left": number, "top": number, "right": number, "bottom": number, "box": { "left": number, "top": number, "right": number, "bottom": number }, "confidence": number, "sourceType": "NATIVE_OCR|IMAGE_OCR|VISION|UI_ELEMENT" }`;

            const aiData = await apiCall('cli-ai-chat', 'POST', {
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: promptMsg },
                            { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } }
                        ]
                    }
                ],
                projectId: null
            }, false);

            if (aiData && aiData.answer) {
                const match = aiData.answer.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
                if (match && match[1]) {
                    const parsed = JSON.parse(match[1]);
                    if (Array.isArray(parsed)) {
                        logger.user(`\x1b[32m✓ Visual Analysis completed: Detected ${parsed.length} visual/image-text elements\x1b[0m`);
                        return parsed.map(item => ({
                            ...item,
                            label: item.label || item.text,
                            box: item.box || { left: item.left, top: item.top, right: item.right, bottom: item.bottom }
                        }));
                    }
                }
            }
            return [];
        } catch (e) {
            logger.error(`\x1b[31m[VISUAL ANALYZER NOTICE] Multimodal analysis warning: ${e.message}\x1b[0m`);
            return [];
        }
    }
}

module.exports = new VisualAnalyzer();
