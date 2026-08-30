const { chromium } = require('playwright');
const config = require('./config');

class BrowserManager {
    constructor() {
        this.browser = null;
        this.userContexts = new Map(); // userId -> BrowserContext
        this.isInitializing = false;
    }

    async getBrowser() {
        if (this.browser && this.browser.isConnected()) {
            return this.browser;
        }

        if (this.isInitializing) {
            while (this.isInitializing) {
                await new Promise(r => setTimeout(r, 100));
            }
            if (this.browser && this.browser.isConnected()) return this.browser;
        }

        this.isInitializing = true;
        try {
            console.log('[BROWSER MANAGER] Launching Playwright Chromium instance...');
            this.browser = await chromium.launch({
                headless: config.HEADLESS,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });
            console.log('[BROWSER MANAGER] Playwright Chromium process online.');
            return this.browser;
        } catch (err) {
            console.error('[BROWSER MANAGER] Failed to launch Playwright browser:', err.message);
            throw err;
        } finally {
            this.isInitializing = false;
        }
    }

    async getOrCreateContext(userId = 'guest') {
        const browser = await this.getBrowser();

        if (this.userContexts.has(userId)) {
            const existingCtx = this.userContexts.get(userId);
            try {
                if (existingCtx.pages().length >= 0) {
                    return existingCtx;
                }
            } catch (e) {
                this.userContexts.delete(userId);
            }
        }

        console.log(`[BROWSER MANAGER] Creating isolated BrowserContext for user: ${userId}`);
        const context = await browser.newContext({
            viewport: config.VIEWPORT,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Codez48Agent/2.0',
            deviceScaleFactor: 1,
            hasTouch: false,
            isMobile: false,
            permissions: [] // Sensitive permissions requested on-demand only (Module 21)
        });

        this.userContexts.set(userId, context);

        context.on('close', () => {
            console.log(`[BROWSER MANAGER] BrowserContext closed for user: ${userId}`);
            this.userContexts.delete(userId);
        });

        return context;
    }

    async healthCheck() {
        try {
            const browser = await this.getBrowser();
            const isConnected = browser.isConnected();
            return {
                status: 'online',
                browserConnected: isConnected,
                activeContextsCount: this.userContexts.size,
                version: browser.version()
            };
        } catch (e) {
            console.error('[BROWSER HEALTHCHECK FAILURE]:', e.message);
            return {
                status: 'offline',
                browserConnected: false,
                error: e.message
            };
        }
    }

    async closeUserContext(userId) {
        if (this.userContexts.has(userId)) {
            const ctx = this.userContexts.get(userId);
            try {
                await ctx.close();
            } catch (e) {}
            this.userContexts.delete(userId);
        }
    }

    async shutdown() {
        console.log('[BROWSER MANAGER] Shutting down Playwright browser manager...');
        for (const [userId, ctx] of this.userContexts.entries()) {
            try { await ctx.close(); } catch (e) {}
        }
        this.userContexts.clear();
        if (this.browser) {
            try { await this.browser.close(); } catch (e) {}
            this.browser = null;
        }
    }
}

module.exports = new BrowserManager();
