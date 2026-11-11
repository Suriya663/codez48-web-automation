/**
 * CODEZ48 DESKTOP SCREENSHOT ADAPTER
 * Captures the full Windows desktop screen, saves it to the local workspace/screenshots directory,
 * logs executive verification details, and automatically opens it for user inspection.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const logger = require('../../core/logger');
const screenCapture = require('../browser/screen-capture');
const pilotHud = require('../hud/pilot-hud-controller');

class ScreenshotAdapter {
    /**
     * Capture full desktop screen and save to disk
     */
    async captureDesktopScreenshot(goal = 'take a screenshot') {
        logger.status(`\n\x1b[36m[SCREENSHOT] Capturing full Windows desktop screen...\x1b[0m`);
        pilotHud.setGenerating('Capturing full desktop screenshot...');

        try {
            // 1. Capture screen using high-performance GDI/Windows Forms engine
            const captureData = screenCapture.captureDesktopScreen();

            // 2. Prepare destination directory
            const screenshotsDir = path.join(process.cwd(), 'screenshots');
            if (!fs.existsSync(screenshotsDir)) {
                fs.mkdirSync(screenshotsDir, { recursive: true });
            }

            // 3. Format timestamp and filename
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
            const fileName = `screenshot_${dateStr}.png`;
            const filePath = path.join(screenshotsDir, fileName);

            // 4. Save image buffer
            const imageBuffer = Buffer.from(captureData.base64, 'base64');
            fs.writeFileSync(filePath, imageBuffer);

            const fileSizeKb = (imageBuffer.length / 1024).toFixed(1);
            const resWidth = captureData.screenshotWidth || 1536;
            const resHeight = captureData.screenshotHeight || 864;

            // 5. Open screenshot in default Windows viewer
            if (process.platform === 'win32') {
                exec(`start "" "${filePath}"`, () => {});
            }

            // 6. Print executive summary card
            let summary = `\n\x1b[36m========================================================================================\x1b[0m\n`;
            summary += `\x1b[1m\x1b[32m📸 DESKTOP SCREENSHOT CAPTURED SUCCESSFULLY\x1b[0m\n`;
            summary += `\x1b[36m========================================================================================\x1b[0m\n`;
            summary += `  \x1b[1m\x1b[37mFile Saved:\x1b[0m         \x1b[33m${filePath}\x1b[0m\n`;
            summary += `  \x1b[1m\x1b[37mResolution:\x1b[0m         \x1b[36m${resWidth} x ${resHeight} px (Primary Display)\x1b[0m\n`;
            summary += `  \x1b[1m\x1b[37mFile Size:\x1b[0m          \x1b[35m${fileSizeKb} KB\x1b[0m\n`;
            summary += `  \x1b[1m\x1b[37mCaptured At:\x1b[0m        \x1b[37m${now.toLocaleString()}\x1b[0m\n`;
            summary += `\x1b[36m========================================================================================\x1b[0m\n`;
            summary += `\x1b[32m✓ Screenshot saved and automatically opened for user verification.\x1b[0m\n`;
            summary += `\x1b[36m========================================================================================\x1b[0m\n`;

            console.log(summary);

            pilotHud.setSuccess(`Screenshot saved: ${fileName}`);
            setTimeout(() => pilotHud.hide(), 4000);

            return {
                success: true,
                filePath,
                fileName,
                fileSizeKb,
                width: resWidth,
                height: resHeight,
                timestamp: captureData.timestamp || now.toISOString()
            };
        } catch (err) {
            logger.error(`\x1b[31m[SCREENSHOT ERROR] ${err.message}\x1b[0m`);
            pilotHud.setActing(`Screenshot error: ${err.message}`);
            setTimeout(() => pilotHud.hide(), 4000);
            return {
                success: false,
                error: err.message
            };
        }
    }
}

module.exports = new ScreenshotAdapter();
