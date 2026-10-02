const path = require('path');

class PopupInputManager {
    /**
     * Spawns a dedicated 200px height popup window loading input-prompt.html
     */
    async open200pxInputWindow(browserContext, runId, promptLabel = 'Enter required value:') {
        console.log(`[POPUP INPUT MANAGER] Opening 200px height input popup window for run: ${runId}`);
        if (!browserContext) {
            return { success: false, error: 'Browser context unavailable' };
        }

        try {
            // 1. Create a dedicated popup page with exact 200px viewport dimensions
            const popupPage = await browserContext.newPage();
            await popupPage.setViewportSize({ width: 450, height: 200 });

            const localFilePath = path.resolve(__dirname, '../public/input-prompt.html');
            const fileUrl = `file:///${localFilePath.replace(/\\/g, '/')}`;

            console.log(`[POPUP INPUT MANAGER] Loading 200px popup UI: ${fileUrl}`);
            await popupPage.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

            // Set prompt text inside popup page
            await popupPage.evaluate(({ runId, promptLabel }) => {
                const labelEl = document.getElementById('prompt-label');
                if (labelEl) labelEl.innerText = promptLabel;
                window.runId = runId;
            }, { runId, promptLabel }).catch(() => {});

            // 2. Automatically monitor for window closure / Firebase submission
            popupPage.on('close', () => {
                console.log(`[POPUP INPUT MANAGER] 200px popup window closed for run: ${runId}`);
            });

            return {
                success: true,
                runId,
                popupPage,
                message: '200px height input window opened successfully.'
            };

        } catch (err) {
            console.error('[POPUP INPUT MANAGER ERROR]:', err.message);
            return { success: false, error: err.message };
        }
    }
}

module.exports = new PopupInputManager();
