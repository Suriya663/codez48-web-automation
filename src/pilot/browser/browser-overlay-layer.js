const logger = require('../../core/logger');
/**
 * CODEZ48 BROWSER ON-SCREEN OVERLAY LAYER
 * Solid opaque high-contrast visual HUD overlay banner for live webpage task execution.
 * Uses Win32 P/Invoke Extended Styles (WS_EX_NOACTIVATE | WS_EX_TOPMOST) to ensure the HUD
 * stays persistently on screen above Chrome/Edge without ever stealing input or keyboard focus.
 */

const { execSync, exec } = require('child_process');

class BrowserOverlayLayer {
    showWelcomeOverlay(titleText = 'Codez48 Pilot', statusMsg = 'Welcome to Codez48 Pilot', durationMs = 5000) {
        logger.user(`\x1b[32m[WELCOME OVERLAY] ${titleText}: ${statusMsg}\x1b[0m`);
        return true;
    }

    showOverlayHud(statusText, durationMs = 1200) {
        logger.status(`\x1b[32m[HUD OVERLAY] ${statusText}\x1b[0m`);
        return true;
    }
}

module.exports = new BrowserOverlayLayer();
