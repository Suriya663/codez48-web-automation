const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

class BrowserManager {
    constructor() {
        this.context = null;
        this.page = null;
        this.userDataDir = path.resolve(__dirname, '../.codez48_profile');
        if (!fs.existsSync(this.userDataDir)) {
            fs.mkdirSync(this.userDataDir, { recursive: true });
        }
        this._setupCleanupHooks();
    }

    async getPage(options = { headless: true }) {
        if (this.page && !this.page.isClosed()) {
            return this.page;
        }

        console.log(`[BROWSER MANAGER] Launching persistent context (headless: ${options.headless})...`);
        this.context = await chromium.launchPersistentContext(this.userDataDir, {
            headless: options.headless,
            viewport: { width: 1280, height: 800 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const pages = this.context.pages();
        this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
        return this.page;
    }

    async close() {
        try {
            if (this.context) {
                await this.context.close();
                this.context = null;
                this.page = null;
                // Allow OS / Chromium to release profile lockfile cleanly before next launch
                await new Promise(r => setTimeout(r, 600));
                console.log('[BROWSER MANAGER] Browser context closed cleanly.');
            }
        } catch (e) {
            console.error('[BROWSER MANAGER CLOSE ERROR]:', e.message);
        }
    }

    _setupCleanupHooks() {
        const cleanup = async () => {
            await this.close();
            process.exit(0);
        };
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('exit', () => {
            try {
                if (this.context) {
                    // Synchronous fallback cleanup if possible
                }
            } catch (e) {}
        });
    }
}

module.exports = new BrowserManager();
