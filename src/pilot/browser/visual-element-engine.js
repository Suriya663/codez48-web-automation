const logger = require('../../core/logger');
/**
 * CODEZ48 VISUAL ELEMENT INTELLIGENCE ENGINE (STAGE 6)
 * Provides text normalization, scoring-based target matching, ambiguity detection,
 * safe click-point calculation, disabled element filtering, and confidence gating.
 */

class VisualElementEngine {
    normalizeText(str) {
        if (!str) return '';
        return String(str)
            .toLowerCase()
            .replace(/[^\w\s]/gi, ' ') // replace punctuation with space
            .replace(/\s+/g, ' ')       // collapse multiple whitespace
            .trim();
    }

    normalizeElement(el, index = 0) {
        const text = el.label || el.text || el.name || '';
        const normalizedText = this.normalizeText(text);
        const box = el.box || el.boundingBox || { left: 0, top: 0, right: 100, bottom: 40 };
        const width = box.right - box.left;
        const height = box.bottom - box.top;
        const centerX = Math.round(box.left + width / 2);
        const centerY = Math.round(box.top + height / 2);

        // Safe clickable point calculation (inset slightly from edges, avoiding outer 10%)
        const insetX = Math.round(width * 0.1);
        const insetY = Math.round(height * 0.1);
        const clickablePoint = {
            x: Math.round(box.left + Math.max(5, insetX)),
            y: Math.round(box.top + Math.max(5, insetY))
        };

        const isVisible = el.visible !== undefined ? el.visible : true;
        const isEnabled = el.enabled !== undefined ? el.enabled : true;
        const isPartiallyVisible = el.partiallyVisible || false;

        return {
            id: el.id || `element-${String(index + 1).padStart(3, '0')}`,
            type: (el.type || 'text').toLowerCase(),
            text,
            normalizedText,
            bbox: { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width, height },
            center: { x: centerX, y: centerY },
            clickablePoint,
            confidence: el.confidence !== undefined ? el.confidence : 0.90,
            visible: isVisible,
            partiallyVisible: isPartiallyVisible,
            enabled: isEnabled,
            source: el.source || 'visual-analysis',
            parentId: el.parentId || null,
            attributes: el.attributes || {}
        };
    }

    matchTarget(query, rawElements) {
        const elements = rawElements.map((el, i) => this.normalizeElement(el, i));
        const normQuery = this.normalizeText(query);

        const scored = elements.map(el => {
            let score = 0;
            const reasons = [];

            // 1. Text Matching
            if (el.text.trim() === query.trim()) {
                score += 50;
                reasons.push('exact-text-match');
            } else if (el.normalizedText === normQuery) {
                score += 40;
                reasons.push('normalized-text-match');
            } else if (el.normalizedText.includes(normQuery) || normQuery.includes(el.normalizedText)) {
                score += 25;
                reasons.push('partial-text-match');
            }

            // 2. Confidence & Visibility
            score += Math.round(el.confidence * 20);
            if (el.visible) {
                score += 15;
            } else {
                score -= 30;
                reasons.push('not-visible-penalty');
            }

            // 3. Enabled State & Partial Visibility Penalties
            if (el.enabled === false || el.enabled === 'false') {
                score -= 100;
                reasons.push('disabled-element-strong-penalty');
            }
            if (el.partiallyVisible) {
                score -= 15;
                reasons.push('partially-visible-penalty');
            }

            // 4. Low Confidence Rejection (< 0.60)
            if (el.confidence < 0.60) {
                score -= 50;
                reasons.push('low-confidence-penalty');
            }

            return { element: el, score, reasons };
        });

        // Filter out heavily penalized / disabled / negative score elements
        const validMatches = scored.filter(s => s.score > 20 && s.element.enabled !== false);
        validMatches.sort((a, b) => b.score - a.score);

        if (validMatches.length === 0) {
            return { status: 'TARGET_NOT_FOUND', candidates: [] };
        }

        // Check for multiple identical/close matches (Ambiguity detection)
        if (validMatches.length > 1 && Math.abs(validMatches[0].score - validMatches[1].score) < 5) {
            return {
                status: 'TARGET_AMBIGUOUS',
                candidates: validMatches.map(v => ({ id: v.element.id, text: v.element.text, score: v.score, reasons: v.reasons }))
            };
        }

        const best = validMatches[0];
        if (best.element.confidence < 0.70 || best.score < 35) {
            return { status: 'LOW_CONFIDENCE_TARGET', bestCandidate: best.element, score: best.score };
        }

        return {
            status: 'TARGET_VALIDATED',
            target: best.element,
            score: best.score,
            reasons: best.reasons,
            allCandidates: validMatches.map(v => ({ id: v.element.id, text: v.element.text, score: v.score }))
        };
    }
}

module.exports = new VisualElementEngine();
