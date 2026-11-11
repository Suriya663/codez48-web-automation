const logger = require('../../core/logger');
/**
 * CODEZ48 Tesseract.js Word-Level OCR Integration
 * Extracts exact word-level bounding boxes and canonical target geometry from screenshot pixels.
 */

class TesseractIntegration {
    async extractWordBoxes(imageSource, targetText) {
        // If running in browser or node with tesseract.js
        const Tesseract = globalThis.Tesseract || require('tesseract.js');

        logger.status(`\x1b[36m[TESSERACT OCR] Processing image source for target: "${targetText}"...\x1b[0m`);

        const result = await Tesseract.recognize(imageSource, 'eng');
        const words = result.data.words || [];

        const normalizedTarget = (targetText || '').toLowerCase().trim().replace(/[^\w]/g, '');

        const matches = words
            .filter(word => {
                const text = (word.text || '').toLowerCase().trim().replace(/[^\w]/g, '');
                return text === normalizedTarget;
            })
            .map(word => {
                const left = word.bbox.x0;
                const top = word.bbox.y0;
                const right = word.bbox.x1;
                const bottom = word.bbox.y1;
                const centerX = (left + right) / 2;
                const centerY = (top + bottom) / 2;

                return {
                    text: word.text,
                    confidence: word.confidence,
                    left,
                    top,
                    right,
                    bottom,
                    width: right - left,
                    height: bottom - top,
                    centerX,
                    centerY,
                    sourceType: 'IMAGE_OCR'
                };
            });

        logger.user(`\x1b[32m✓ Tesseract OCR completed: Found ${matches.length} matching word(s) for "${targetText}"\x1b[0m`);
        return matches;
    }
}

module.exports = new TesseractIntegration();
