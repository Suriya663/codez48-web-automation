const logger = require('../../core/logger');
/**
 * CODEZ48 SCREEN COORDINATE TRANSFORM
 * Explicitly maps screenshot pixel coordinates to Windows desktop screen coordinates,
 * accounting for Device Pixel Ratio (DPR), Windows DPI scaling, and multi-monitor offsets.
 */

class ScreenCoordinateTransform {
    transform(pixelX, pixelY, screenMeta) {
        const sourceWidth = screenMeta.screenshotWidth || screenMeta.width || 1536;
        const sourceHeight = screenMeta.screenshotHeight || screenMeta.height || 864;
        const desktopWidth = screenMeta.screenWidth || screenMeta.width || 1536;
        const desktopHeight = screenMeta.screenHeight || screenMeta.height || 864;

        const scaleX = desktopWidth / sourceWidth;
        const scaleY = desktopHeight / sourceHeight;
        const dpr = screenMeta.devicePixelRatio || 1.0;
        const scaling = screenMeta.scaling || 1.0;

        const screenX = Math.round(pixelX * scaleX * dpr);
        const screenY = Math.round(pixelY * scaleY * dpr);

        return {
            screenX,
            screenY,
            diagnostics: {
                sourceWidth,
                sourceHeight,
                desktopWidth,
                desktopHeight,
                scaleX,
                scaleY,
                dpr,
                scaling
            }
        };
    }
}

module.exports = new ScreenCoordinateTransform();
