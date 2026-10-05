/**
 * Intent Ranker Module (Heuristic scoring over Page Index with Screen Coordinate Mapping)
 */
class IntentRanker {
    async enrichCandidatesWithScreenBounds(page, candidates) {
        // Get browser window position and screen rect
        const windowBox = await page.evaluate(() => ({
            screenX: window.screenX || window.screenLeft || 0,
            screenY: window.screenY || window.screenTop || 0,
            outerWidth: window.outerWidth || 1280,
            outerHeight: window.outerHeight || 800,
            innerWidth: window.innerWidth || 1280,
            innerHeight: window.innerHeight || 800
        })).catch(() => ({ screenX: 100, screenY: 100, outerWidth: 1280, outerHeight: 800, innerWidth: 1280, innerHeight: 800 }));

        // Chrome frame header offset approximation (~80px top for title/toolbar)
        const chromeHeaderHeight = 80;
        const chromeBorderWidth = 10;

        const baseScreenX = windowBox.screenX + chromeBorderWidth;
        const baseScreenY = windowBox.screenY + chromeHeaderHeight;

        for (const cand of candidates) {
            try {
                const box = await page.locator(cand.tag.toLowerCase(), { hasText: cand.name }).first().boundingBox().catch(() => null);
                if (box) {
                    cand.screenBox = {
                        x: baseScreenX + box.x,
                        y: baseScreenY + box.y,
                        width: box.width,
                        height: box.height,
                        centerX: baseScreenX + box.x + box.width / 2,
                        centerY: baseScreenY + box.y + box.height / 2
                    };
                }
            } catch (e) {
                cand.screenBox = null;
            }
        }
        return candidates;
    }

    rankCandidates(pageIndex, targetName, expectedOutcome) {
        const query = (targetName || '').toLowerCase();
        const outcome = (expectedOutcome || '').toLowerCase();

        return pageIndex.filter(el => {
            const nameMatch = el.name && el.name.toLowerCase().includes(query);
            const hrefMatch = el.href && el.href.toLowerCase().includes(outcome);
            return nameMatch || hrefMatch;
        }).sort((a, b) => {
            if (a.visible !== b.visible) return b.visible ? 1 : -1;
            return a.index - b.index;
        });
    }
}

module.exports = new IntentRanker();
