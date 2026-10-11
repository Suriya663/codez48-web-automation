/**
 * Visual Fallback & Screen Layout Understanding
 * Converts DOM bounding boxes and UIA coordinates to physical screen coordinates.
 */
class VisualFallback {
    /**
     * Dynamically calculates the absolute screen coordinates for a Playwright locator.
     */
    async calculateScreenCoordinates(page, locator) {
        if (!locator) return null;

        const box = await locator.boundingBox().catch(() => null);
        if (!box) return null;

        const winGeometry = await page.evaluate(() => ({
            screenX: window.screenX || window.screenLeft || 0,
            screenY: window.screenY || window.screenTop || 0,
            outerWidth: window.outerWidth || 1280,
            outerHeight: window.outerHeight || 800,
            innerWidth: window.innerWidth || 1280,
            innerHeight: window.innerHeight || 800
        })).catch(() => null);

        if (!winGeometry) return null;

        const borderWidth = Math.max(0, Math.round((winGeometry.outerWidth - winGeometry.innerWidth) / 2));
        const titleBarHeight = Math.max(0, winGeometry.outerHeight - winGeometry.innerHeight);

        const clientScreenX = winGeometry.screenX + borderWidth;
        const clientScreenY = winGeometry.screenY + titleBarHeight;

        const targetScreenX = clientScreenX + box.x + box.width / 2;
        const targetScreenY = clientScreenY + box.y + box.height / 2;

        return {
            x: targetScreenX,
            y: targetScreenY,
            width: box.width,
            height: box.height,
            clientScreenX,
            clientScreenY,
            windowInfo: winGeometry
        };
    }
}

module.exports = new VisualFallback();
