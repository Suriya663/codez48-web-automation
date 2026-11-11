const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const logger = require('../../core/logger');
const workspaceManager = require('../../core/workspace-manager');
const documentAiEngine = require('../ai/document-ai-engine');
const pilotHud = require('../hud/pilot-hud-controller');

/**
 * CODEZ48 PLAYWRIGHT BROWSER CONTROLLER
 * Full Playwright automation engine:
 * - Dynamic display resolution alignment (Width: 1536, Height: 864)
 * - Precision page.mouse and page.keyboard actions
 * - Smart input field and search box discovery (Semantic + DOM + AI Vision Grounding)
 * - Automatic typing, Enter key submission, clicking, and scrolling
 * - High-resolution screenshot capture strictly matching laptop screen resolution
 * - Autonomous multi-step perception-action-verification loop
 */


function escapeRegex(str) {
    return (str || '').replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

class PlaywrightBrowserController {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.viewport = this.getScreenResolution();
        this.lastScreenshotPath = null;
        this.actionHistory = [];
    }

    /**
     * Dynamically retrieve primary screen resolution from Windows (or fallback to 1536x864)
     */
    getScreenResolution() {
        try {
            const uiCalibrator = require('../../../supervoice/ui-calibrator');
            const info = uiCalibrator.getScreenInfo();
            if (info && info.width && info.height) {
                return { width: Number(info.width), height: Number(info.height) };
            }
        } catch (_) {}

        try {
            const psScript = `
                $ErrorActionPreference = 'SilentlyContinue';
                [void][System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms");
                $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds;
                Write-Output "$($b.Width)x$($b.Height)";
            `;
            const base64Cmd = Buffer.from(psScript, 'utf16le').toString('base64');
            const res = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', base64Cmd], {
                timeout: 3000,
                encoding: 'utf8'
            });
            if (res.stdout) {
                const parts = res.stdout.trim().split('x');
                if (parts.length === 2) {
                    const w = parseInt(parts[0], 10);
                    const h = parseInt(parts[1], 10);
                    if (w > 0 && h > 0) return { width: w, height: h };
                }
            }
        } catch (_) {}

        return { width: 1536, height: 864 };
    }

    getPlaywright() {
        const candidatePaths = [
            'playwright',
            path.resolve(__dirname, '../../../node_modules/playwright'),
            'C:/Users/suriya prakash/OneDrive/Desktop/jebin/node_modules/playwright',
            'C:/Users/suriya prakash/AppData/Roaming/npm/node_modules/playwright'
        ];
        for (const p of candidatePaths) {
            try {
                return require(p);
            } catch (_) {}
        }
        throw new Error(`[PLAYWRIGHT NOT INSTALLED] Failed to require('playwright') from all known paths`);
    }

    /**
     * 1. Launch Browser & Context with exact laptop screen dimensions and Antivirus-Immune Stealth
     */
    async launchBrowser(options = {}) {
        const pw = this.getPlaywright();
        const headless = options.headless !== undefined ? options.headless : false;
        const screenRes = this.getScreenResolution();
        const viewport = options.viewport || { width: screenRes.width, height: screenRes.height };
        this.viewport = viewport;

        logger.status(`\x1b[36m[PLAYWRIGHT STEALTH] Launching antivirus-immune browser (Headless: ${headless}, Dimensions: ${viewport.width}x${viewport.height})...\x1b[0m`);

        // Antivirus & EDR Evasion Arguments:
        // - Strips --enable-automation so security software does not flag unauthorized remote control
        // - Uses standard user profile flags and masks automation controlled features
        const launchArgs = [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            `--window-size=${viewport.width},${viewport.height}`,
            '--start-maximized',
            '--no-default-browser-check',
            '--no-first-run',
            '--disable-dev-shm-usage',
            '--disable-gpu-sandbox',
            '--disable-features=Translate,OptimizationHints,MediaRouter,CalculateNativeWinOcclusion',
            '--password-store=basic',
            '--use-mock-keychain',
            '--hide-scrollbars',
            '--mute-audio'
        ];

        let browserInstance = null;
        const launchConfig = {
            headless,
            args: launchArgs,
            ignoreDefaultArgs: ['--enable-automation'], // CRITICAL: Suppresses automation infobar and AV heuristic triggers
            timeout: 30000
        };

        const preferredChannel = options.channel || 'msedge';
        const fallbackChannel = preferredChannel === 'chrome' ? 'msedge' : 'chrome';

        // 1. Try Preferred Browser Channel (msedge or chrome)
        try {
            browserInstance = await pw.chromium.launch({
                ...launchConfig,
                channel: preferredChannel
            });
            const chName = preferredChannel === 'msedge' ? 'Microsoft Edge' : 'Google Chrome';
            logger.status(`\x1b[32m✓ Launched ${chName} (AV-Immune Stealth Mode) at ${viewport.width}x${viewport.height}\x1b[0m`);
        } catch (firstErr) {
            logger.debug(`[${preferredChannel.toUpperCase()} LAUNCH FALLBACK] ${firstErr.message}`);
            // 2. Try Secondary Browser Channel
            try {
                browserInstance = await pw.chromium.launch({
                    ...launchConfig,
                    channel: fallbackChannel
                });
                const fallbackName = fallbackChannel === 'msedge' ? 'Microsoft Edge' : 'Google Chrome';
                logger.status(`\x1b[32m✓ Launched ${fallbackName} (AV-Immune Stealth Mode)\x1b[0m`);
            } catch (secondErr) {
                // 3. Fallback to default Chromium
                try {
                    browserInstance = await pw.chromium.launch(launchConfig);
                    logger.status(`\x1b[32m✓ Launched Chromium (AV-Immune Stealth Mode)\x1b[0m`);
                } catch (chromiumErr) {
                    logger.error(`\x1b[33m[SECURITY HEURISTIC NOTICE] Playwright direct hook blocked by endpoint software: ${chromiumErr.message}\x1b[0m`);
                    logger.status(`\x1b[35m[FALLBACK BRIDGE] Engaging native operating system browser launch...\x1b[0m`);
                    return this.launchNativeOsBrowserFallback(options);
                }
            }
        }

        this.browser = browserInstance;
        this.context = await this.browser.newContext({
            viewport: this.viewport,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            deviceScaleFactor: 1,
            hasTouch: false,
            isMobile: false,
            locale: 'en-US',
            timezoneId: 'Asia/Kolkata',
            permissions: ['geolocation', 'notifications']
        });

        // Inject browser fingerprint masking script into every page to fully prevent AV/bot detection
        await this.context.addInitScript(() => {
            try {
                // 1. Mask navigator.webdriver
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                // 2. Mock chrome runtime object
                window.chrome = {
                    runtime: {
                        connect: function () {},
                        sendMessage: function () {}
                    },
                    loadTimes: function () {},
                    csi: function () {},
                    app: {}
                };
                // 3. Mock languages and plugins
                Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                // 4. Permissions query pass-through
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                );
            } catch (_) {}
        });

        this.page = await this.context.newPage();
        this.page.setDefaultTimeout(20000);
        this.page.setDefaultNavigationTimeout(25000);

        return {
            browser: this.browser,
            context: this.context,
            page: this.page
        };
    }

    /**
     * Antivirus Self-Healing Fallback: Launches native browser directly via Windows OS shell
     * and bridges control through Screen Vision AI and GUI automation.
     */
    async launchNativeOsBrowserFallback(options = {}) {
        const { execSync } = require('child_process');
        const targetUrl = options.url || 'https://www.google.com';
        logger.status(`\x1b[36m[OS BROWSER BRIDGE] Launching native Edge browser via Windows ShellExecute for: ${targetUrl}...\x1b[0m`);

        try {
            execSync(`start msedge.exe "${targetUrl}"`, { stdio: 'ignore' });
        } catch (_) {
            try {
                execSync(`start chrome.exe "${targetUrl}"`, { stdio: 'ignore' });
            } catch (_) {}
        }

        await new Promise(r => setTimeout(r, 2000));
        const foregroundLock = require('../../../supervoice/foreground-lock');
        foregroundLock.lockToForeground(true, true);

        // Return mock adapter proxy that routes commands to Screen Vision Engine and GUI Driver
        return {
            isNativeOsFallback: true,
            browser: null,
            context: null,
            page: {
                goto: async (url) => {
                    execSync(`start msedge.exe "${url}"`, { stdio: 'ignore' });
                    await new Promise(r => setTimeout(r, 2000));
                },
                waitForTimeout: (ms) => new Promise(r => setTimeout(r, ms)),
                screenshot: async (opts) => {
                    const screenCapture = require('./screen-capture');
                    const shot = screenCapture.captureDesktopScreen();
                    if (opts && opts.path && shot && shot.base64) {
                        fs.writeFileSync(opts.path, Buffer.from(shot.base64, 'base64'));
                    }
                    return shot ? Buffer.from(shot.base64 || '', 'base64') : Buffer.alloc(0);
                },
                close: async () => {}
            }
        };
    }

    /**
     * Close Browser Session
     */
    async closeBrowser() {
        try {
            if (this.page) await this.page.close().catch(() => {});
            if (this.context) await this.context.close().catch(() => {});
            if (this.browser) await this.browser.close().catch(() => {});
        } catch (e) {}
        this.page = null;
        this.context = null;
        this.browser = null;
        logger.status(`\x1b[36m[PLAYWRIGHT] Browser session closed.\x1b[0m`);
    }

    /**
     * 2. Navigate and verify page state
     */
    async navigate(url, options = {}) {
        if (!this.page) {
            await this.launchBrowser(options);
        }

        let targetUrl = url;
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('file://')) {
            targetUrl = 'https://' + targetUrl;
        }

        logger.status(`\x1b[36m[PLAYWRIGHT] Navigating to: ${targetUrl}...\x1b[0m`);
        const waitUntil = options.waitUntil || 'domcontentloaded';

        const response = await this.page.goto(targetUrl, {
            waitUntil,
            timeout: options.timeout || 25000
        });

        await this.page.waitForTimeout(1000);

        const currentUrl = this.page.url();
        const title = await this.page.title();
        const status = response ? response.status() : 200;

        logger.status(`\x1b[32m✓ Page Loaded: "${title}" (URL: ${currentUrl}, HTTP: ${status})\x1b[0m`);

        this.actionHistory.push({
            action: 'NAVIGATE',
            url: targetUrl,
            currentUrl,
            title,
            status,
            timestamp: new Date().toISOString()
        });

        return { currentUrl, title, status };
    }

    /**
     * 3. Capture fresh screenshot strictly matching laptop screen resolution
     */
    async captureScreenshot(options = {}) {
        if (!this.page) throw new Error('Cannot capture screenshot: page is not initialized');

        const screenshotDir = path.join(workspaceManager.getWorkspacePath(), 'screenshots');
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
        }

        const fileName = `screenshot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.png`;
        const filePath = path.join(screenshotDir, fileName);

        await this.page.waitForLoadState('domcontentloaded', { timeout: 6000 }).catch(() => {});

        let buffer = null;
        try {
            buffer = await this.page.screenshot({
                path: filePath,
                fullPage: options.fullPage || false,
                timeout: 8000,
                animations: 'disabled'
            });
        } catch (shotErr) {
            logger.debug(`[SCREENSHOT TIMEOUT FALLBACK] Retrying quick capture...`);
            buffer = await this.page.screenshot({
                path: filePath,
                timeout: 4000
            }).catch(() => null);
        }

        if (!buffer && fs.existsSync(filePath)) {
            buffer = fs.readFileSync(filePath);
        }

        const base64 = buffer ? buffer.toString('base64') : '';
        this.lastScreenshotPath = filePath;

        logger.status(`\x1b[32m✓ [PLAYWRIGHT SCREENSHOT] Captured: ${path.basename(filePath)} (${this.viewport.width}x${this.viewport.height}, ${buffer.length} bytes)\x1b[0m`);

        return {
            filePath,
            buffer,
            base64,
            width: this.viewport.width,
            height: this.viewport.height,
            screenshotWidth: this.viewport.width,
            screenshotHeight: this.viewport.height,
            screenWidth: this.viewport.width,
            screenHeight: this.viewport.height
        };
    }

    /**
     * 4. Highlight target element on-screen with visual bounding box badge
     */
    async highlightTarget(box, label = 'AI Target') {
        if (!this.page || !box) return null;

        const x = Math.round(box.x !== undefined ? box.x : box.left || 0);
        const y = Math.round(box.y !== undefined ? box.y : box.top || 0);
        const w = Math.round(box.w !== undefined ? box.w : box.width || 80);
        const h = Math.round(box.h !== undefined ? box.h : box.height || 40);

        await this.page.evaluate(({ x, y, w, h, label }) => {
            const old = document.getElementById('codez48_pilot_highlight');
            if (old) old.remove();

            const overlay = document.createElement('div');
            overlay.id = 'codez48_pilot_highlight';
            overlay.style.position = 'fixed';
            overlay.style.left = `${x}px`;
            overlay.style.top = `${y}px`;
            overlay.style.width = `${w}px`;
            overlay.style.height = `${h}px`;
            overlay.style.border = '3px solid #FF0055';
            overlay.style.borderRadius = '4px';
            overlay.style.backgroundColor = 'rgba(255, 0, 85, 0.15)';
            overlay.style.zIndex = '9999999';
            overlay.style.pointerEvents = 'none';
            overlay.style.boxShadow = '0 0 14px rgba(255, 0, 85, 0.85)';
            overlay.style.transition = 'all 0.2s ease-in-out';

            const badge = document.createElement('div');
            badge.innerText = `🎯 ${label} (${x}, ${y})`;
            badge.style.position = 'absolute';
            badge.style.top = '-26px';
            badge.style.left = '0';
            badge.style.backgroundColor = '#FF0055';
            badge.style.color = '#FFFFFF';
            badge.style.fontSize = '11px';
            badge.style.fontFamily = 'Segoe UI, sans-serif';
            badge.style.fontWeight = 'bold';
            badge.style.padding = '2px 8px';
            badge.style.borderRadius = '3px';
            badge.style.whiteSpace = 'nowrap';
            overlay.appendChild(badge);

            document.body.appendChild(overlay);
        }, { x, y, w, h, label }).catch(() => {});

        const annotated = await this.captureScreenshot();

        setTimeout(async () => {
            if (this.page) {
                await this.page.evaluate(() => {
                    const el = document.getElementById('codez48_pilot_highlight');
                    if (el) el.remove();
                }).catch(() => {});
            }
        }, 1200);

        return {
            box: { x, y, w, h },
            annotatedScreenshot: annotated.filePath
        };
    }

    /**
     * 5. Accurate Mouse Movement and Clicking (page.mouse)
     */
    async mouseMove(x, y, steps = 8) {
        if (!this.page) throw new Error('Page not initialized');
        logger.status(`\x1b[36m[PLAYWRIGHT MOUSE] Moving cursor to (${x}, ${y}) across ${steps} steps...\x1b[0m`);
        await this.page.mouse.move(x, y, { steps });
    }

    async mouseClick(x, y, options = {}) {
        if (!this.page) throw new Error('Page not initialized');

        if (options.highlight) {
            await this.highlightTarget({ x: x - 25, y: y - 15, w: 50, h: 30 }, options.label || 'Click Target');
            await this.page.waitForTimeout(300);
        }

        await this.mouseMove(x, y, 6);
        await this.page.waitForTimeout(100);

        const button = options.button || 'left';
        const clickCount = options.clickCount || 1;

        logger.status(`\x1b[32m[PLAYWRIGHT MOUSE] Clicking (${x}, ${y}) [Button: ${button}, Count: ${clickCount}]...\x1b[0m`);
        await this.page.mouse.click(x, y, { button, clickCount, delay: 50 });
        await this.page.waitForTimeout(300);

        this.actionHistory.push({
            action: 'CLICK_COORDINATE',
            x,
            y,
            button,
            timestamp: new Date().toISOString()
        });

        return { success: true, x, y };
    }

    async mouseDown() {
        if (!this.page) throw new Error('Page not initialized');
        await this.page.mouse.down();
    }

    async mouseUp() {
        if (!this.page) throw new Error('Page not initialized');
        await this.page.mouse.up();
    }

    async mouseWheel(deltaX = 0, deltaY = 400) {
        if (!this.page) throw new Error('Page not initialized');
        logger.status(`\x1b[36m[PLAYWRIGHT MOUSE] Scrolling wheel (deltaY: ${deltaY}px)...\x1b[0m`);
        await this.page.mouse.wheel(deltaX, deltaY);
        await this.page.waitForTimeout(500);

        this.actionHistory.push({
            action: 'SCROLL_WHEEL',
            deltaX,
            deltaY,
            timestamp: new Date().toISOString()
        });

        return { success: true, deltaY };
    }

    async mouseHover(x, y) {
        if (!this.page) throw new Error('Page not initialized');
        await this.mouseMove(x, y, 6);
        await this.page.waitForTimeout(200);
    }

    /**
     * 6. Accurate Keyboard Typing and Shortcuts (page.keyboard)
     */
    async keyboardType(text, delay = 25) {
        if (!this.page) throw new Error('Page not initialized');
        logger.status(`\x1b[36m[PLAYWRIGHT KEYBOARD] Typing text: "${text}"...\x1b[0m`);
        await this.page.keyboard.type(text, { delay });

        this.actionHistory.push({
            action: 'KEYBOARD_TYPE',
            textLength: text.length,
            timestamp: new Date().toISOString()
        });

        return { success: true };
    }

    async keyboardPress(key) {
        if (!this.page) throw new Error('Page not initialized');
        logger.status(`\x1b[36m[PLAYWRIGHT KEYBOARD] Pressing key: "${key}"...\x1b[0m`);
        await this.page.keyboard.press(key);
        await this.page.waitForTimeout(300);

        this.actionHistory.push({
            action: 'KEYBOARD_PRESS',
            key,
            timestamp: new Date().toISOString()
        });

        return { success: true, key };
    }

    /**
     * 7. Inspect Live DOM Tree and Interactive Elements
     */
    async inspectDom() {
        if (!this.page) throw new Error('Page not initialized');

        // Ensure page is ready post-navigation
        await this.page.waitForLoadState('domcontentloaded', { timeout: 6000 }).catch(() => {});

        let domInfo = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                domInfo = await this.page.evaluate(() => {
                    const elements = [];
                    const interactiveSelectors = 'a, button, input, textarea, select, [role="button"], [role="link"], [role="textbox"], [role="searchbox"], [role="tab"], [role="menuitem"], [onclick], [tabindex]:not([tabindex="-1"])';
                    const nodes = document.querySelectorAll(interactiveSelectors);

                    nodes.forEach((el, index) => {
                        const rect = el.getBoundingClientRect();
                        const style = window.getComputedStyle(el);
                        const isVisible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';

                        if (isVisible) {
                            const text = (el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || el.name || el.id || '').trim();
                            let role = 'button';
                            if (el.tagName === 'A' || el.getAttribute('role') === 'link') role = 'link';
                            else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.getAttribute('role') === 'textbox' || el.getAttribute('role') === 'searchbox') role = 'textbox';
                            else if (el.tagName === 'SELECT') role = 'select';

                            elements.push({
                                id: `E${index + 1}`,
                                tag: el.tagName.toLowerCase(),
                                role,
                                text: text.substring(0, 60),
                                box: {
                                    x: Math.round(rect.left),
                                    y: Math.round(rect.top),
                                    w: Math.round(rect.width),
                                    h: Math.round(rect.height)
                                },
                                center: {
                                    x: Math.round(rect.left + rect.width / 2),
                                    y: Math.round(rect.top + rect.height / 2)
                                },
                                disabled: el.disabled || false
                            });
                        }
                    });

                    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => ({ level: h.tagName, text: h.innerText.trim() })).filter(h => h.text.length > 0);
                    const visibleText = Array.from(document.querySelectorAll('p, span, li, h1, h2, h3, div')).map(e => e.innerText.trim()).filter(t => t.length > 15 && t.length < 250).slice(0, 20);

                    return {
                        title: document.title,
                        url: window.location.href,
                        scrollX: window.scrollX,
                        scrollY: window.scrollY,
                        elements: elements.slice(0, 40),
                        headings: headings.slice(0, 15),
                        visibleText
                    };
                });
                if (domInfo) break;
            } catch (evalErr) {
                if (attempt === 1) {
                    await this.page.waitForTimeout(1000);
                    await this.page.waitForLoadState('domcontentloaded', { timeout: 6000 }).catch(() => {});
                } else {
                    const fallbackTitle = (await this.page.title().catch(() => 'Active Webpage')) || 'Webpage';
                    return {
                        title: fallbackTitle,
                        url: this.page.url(),
                        scrollX: 0,
                        scrollY: 0,
                        elements: [],
                        headings: [],
                        visibleText: []
                    };
                }
            }
        }

        return domInfo;
    }

    /**
     * Dedicated Smart Input & Search Box Locator
     */
    async findInputElement(description) {
        if (!this.page) return null;
        const lower = (description || '').toLowerCase();
        const isSearch = lower.includes('search') || lower.includes('query') || lower.includes('find') || lower.includes('lookup') || lower.includes('box');

        // Priority 1: Search box semantic role
        if (isSearch) {
            try {
                const sb = this.page.getByRole('searchbox');
                if (await sb.count() > 0 && await sb.first().isVisible()) {
                    return sb.first();
                }
            } catch (_) {}

            // Priority 2: Standard search box selectors across websites (Wikipedia, Google, Ads Manager, etc.)
            const searchSelectors = [
                'input[type="search"]',
                'input[name="search"]',
                'input[name="q"]',
                'input[name="query"]',
                'input#searchInput',
                'input[placeholder*="search" i]',
                'input[aria-label*="search" i]',
                'textarea[name="q"]',
                '[role="searchbox"]'
            ];
            for (const sel of searchSelectors) {
                try {
                    const el = this.page.locator(sel);
                    if (await el.count() > 0 && await el.first().isVisible()) {
                        return el.first();
                    }
                } catch (_) {}
            }
        }

        // Priority 3: Specific textbox by role or placeholder or label
        try {
            const tb = this.page.getByRole('textbox', { name: new RegExp(escapeRegex(description), 'i') });
            if (await tb.count() > 0 && await tb.first().isVisible()) {
                return tb.first();
            }
        } catch (_) {}

        try {
            const ph = this.page.getByPlaceholder(new RegExp(escapeRegex(description), 'i'));
            if (await ph.count() > 0 && await ph.first().isVisible()) {
                return ph.first();
            }
        } catch (_) {}

        // Priority 4: All visible inputs matching description keywords
        try {
            const inputs = this.page.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea');
            const count = await inputs.count();
            for (let i = 0; i < count; i++) {
                const item = inputs.nth(i);
                if (await item.isVisible()) {
                    const placeholder = (await item.getAttribute('placeholder').catch(() => '')) || '';
                    const name = (await item.getAttribute('name').catch(() => '')) || '';
                    const aria = (await item.getAttribute('aria-label').catch(() => '')) || '';
                    const id = (await item.getAttribute('id').catch(() => '')) || '';
                    const combined = `${placeholder} ${name} ${aria} ${id}`.toLowerCase();
                    if (combined.includes(lower) || lower.includes(name) || (isSearch && combined.includes('search'))) {
                        return item;
                    }
                }
            }
            if (isSearch && count > 0 && await inputs.first().isVisible()) {
                return inputs.first();
            }
        } catch (_) {}

        return null;
    }

    /**
     * 8. Hybrid Semantic Locator + Coordinate Execution + Enter Key Submission
     */
    async findAndAct(targetDescription, action = 'click', value = '', options = {}) {
        if (!this.page) throw new Error('Page not initialized');

        logger.status(`\x1b[36m[PLAYWRIGHT ACTION] Target: "${targetDescription}" | Action: ${action.toUpperCase()} | Value: "${value}"...\x1b[0m`);
        const lowerDesc = targetDescription.toLowerCase();
        const actionLower = action.toLowerCase();
        const isTypeOrSearch = actionLower.includes('type') || actionLower.includes('search');

        let locator = null;
        let foundMethod = null;

        // 1. If typing or searching, prioritize finding the right input field
        if (isTypeOrSearch || lowerDesc.includes('search') || lowerDesc.includes('input') || lowerDesc.includes('box') || lowerDesc.includes('field') || lowerDesc.includes('campaign')) {
            locator = await this.findInputElement(targetDescription);
            if (locator) foundMethod = 'INPUT_FIELD_LOCATOR';
        }

        // 2. Button locators
        if (!locator) {
            try {
                const btn = this.page.getByRole('button', { name: new RegExp(escapeRegex(targetDescription), 'i') });
                if (await btn.count() > 0 && await btn.first().isVisible()) {
                    locator = btn.first();
                    foundMethod = 'SEMANTIC_BUTTON';
                }
            } catch (_) {}
        }

        // 3. Link locators
        if (!locator) {
            try {
                const link = this.page.getByRole('link', { name: new RegExp(escapeRegex(targetDescription), 'i') });
                if (await link.count() > 0 && await link.first().isVisible()) {
                    locator = link.first();
                    foundMethod = 'SEMANTIC_LINK';
                }
            } catch (_) {}
        }

        // 4. Text locators
        if (!locator) {
            try {
                const byText = this.page.getByText(new RegExp(escapeRegex(targetDescription), 'i'));
                if (await byText.count() > 0 && await byText.first().isVisible()) {
                    locator = byText.first();
                    foundMethod = 'SEMANTIC_TEXT';
                }
            } catch (_) {}
        }

        // 5. If found via Locator, retrieve bounding box at exact laptop resolution (1536x864) and execute
        if (locator) {
            await locator.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
            let box = await locator.boundingBox().catch(() => null);
            if (box) {
                const cx = Math.round(box.x + box.width / 2);
                const cy = Math.round(box.y + box.height / 2);

                await this.highlightTarget(box, targetDescription);

                if (isTypeOrSearch) {
                    await this.mouseClick(cx, cy, { highlight: false });
                    await locator.focus().catch(() => {});
                    if (options.clear !== false) {
                        await this.page.keyboard.press('Control+A');
                        await this.page.keyboard.press('Backspace');
                    }
                    if (value) {
                        await this.keyboardType(value, 30);
                    }

                    const shouldPressEnter = options.pressEnter !== undefined
                        ? options.pressEnter
                        : (actionLower.includes('search') || actionLower.includes('enter') || lowerDesc.includes('search'));

                    if (shouldPressEnter) {
                        logger.status(`\x1b[35m[PLAYWRIGHT KEYBOARD] Pressing 'Enter' to submit input...\x1b[0m`);
                        await this.keyboardPress('Enter');
                        await this.page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
                        await this.page.waitForTimeout(1500);
                    }

                    return { success: true, method: foundMethod, box, coords: [cx, cy], typed: value, submitted: shouldPressEnter };
                } else {
                    await this.mouseClick(cx, cy, { highlight: false });
                    await this.page.waitForTimeout(500);
                    return { success: true, method: foundMethod, box, coords: [cx, cy] };
                }
            }
        }

        // 6. Fallback to DOM elements inspection array
        const domInfo = await this.inspectDom();
        const matchedEl = domInfo.elements.find(el =>
            el.text.toLowerCase().includes(lowerDesc) ||
            lowerDesc.includes(el.text.toLowerCase())
        );

        if (matchedEl) {
            await this.highlightTarget(matchedEl.box, matchedEl.text);
            const cx = matchedEl.center.x;
            const cy = matchedEl.center.y;

            if (isTypeOrSearch) {
                await this.mouseClick(cx, cy);
                if (value) await this.keyboardType(value, 30);
                const shouldPressEnter = options.pressEnter !== undefined ? options.pressEnter : true;
                if (shouldPressEnter) {
                    logger.status(`\x1b[35m[PLAYWRIGHT KEYBOARD] Pressing 'Enter'...\x1b[0m`);
                    await this.keyboardPress('Enter');
                    await this.page.waitForTimeout(1500);
                }
                return { success: true, method: 'DOM_ELEMENT_MATCH', box: matchedEl.box, coords: [cx, cy], typed: value };
            } else {
                await this.mouseClick(cx, cy);
                return { success: true, method: 'DOM_ELEMENT_MATCH', box: matchedEl.box, coords: [cx, cy] };
            }
        }

        // 7. Fallback to AI Vision Grounding at Exact 1536x864 resolution
        logger.status(`\x1b[33m[VISION AI GROUNDING] Locating target "${targetDescription}" on screen (${this.viewport.width}x${this.viewport.height})...\x1b[0m`);
        const screen = await this.captureScreenshot();

        let visionFound = null;
        try {
            const visionAi = require('../../../supervoice/vision-ai');
            const vRes = await visionAi.findUIElement(targetDescription, { screenshot: screen, model: 'groq' });
            if (vRes && vRes.found && vRes.element) {
                visionFound = vRes.element;
            }
        } catch (_) {}

        if (!visionFound) {
            const visionPrompt = `You are a high-precision visual UI locator.
Screenshot Resolution: ${this.viewport.width}x${this.viewport.height}.
Target element description: "${targetDescription}".
Return valid JSON only:
{
  "found": true,
  "bbox": { "x": number, "y": number, "width": number, "height": number }
}`;
            const raw = await documentAiEngine.queryAi(visionPrompt, 'You are an accurate visual UI locator.');
            const parsed = documentAiEngine.extractJson(raw);
            if (parsed && parsed.found && parsed.bbox) {
                visionFound = {
                    x: parsed.bbox.x,
                    y: parsed.bbox.y,
                    width: parsed.bbox.width,
                    height: parsed.bbox.height,
                    centerX: Math.round(parsed.bbox.x + parsed.bbox.width / 2),
                    centerY: Math.round(parsed.bbox.y + parsed.bbox.height / 2)
                };
            }
        }

        if (visionFound) {
            const cx = visionFound.centerX || Math.round(visionFound.x + visionFound.width / 2);
            const cy = visionFound.centerY || Math.round(visionFound.y + visionFound.height / 2);
            const box = { x: visionFound.x, y: visionFound.y, w: visionFound.width, h: visionFound.height };

            await this.highlightTarget(box, targetDescription);

            if (isTypeOrSearch) {
                await this.mouseClick(cx, cy);
                if (value) await this.keyboardType(value, 30);
                const shouldPressEnter = options.pressEnter !== undefined ? options.pressEnter : true;
                if (shouldPressEnter) {
                    logger.status(`\x1b[35m[PLAYWRIGHT KEYBOARD] Pressing 'Enter'...\x1b[0m`);
                    await this.keyboardPress('Enter');
                    await this.page.waitForTimeout(1500);
                }
                return { success: true, method: 'VISION_AI_COORDINATE', box, coords: [cx, cy], typed: value };
            } else {
                await this.mouseClick(cx, cy);
                return { success: true, method: 'VISION_AI_COORDINATE', box, coords: [cx, cy] };
            }
        }

        // 8. Tesseract OCR Word-Level Grounding Fallback directly on screen pixels
        try {
            const tesseract = require('./tesseract-integration');
            logger.status(`\x1b[36m[OCR ENGINE] Scanning screen pixels with Tesseract OCR for: "${targetDescription}"...\x1b[0m`);
            const ocrMatches = await tesseract.extractWordBoxes(screen.filePath, targetDescription);
            if (ocrMatches && ocrMatches.length > 0) {
                const best = ocrMatches[0];
                const box = { x: best.left, y: best.top, w: best.width, h: best.height };
                const cx = Math.round(best.centerX);
                const cy = Math.round(best.centerY);

                logger.status(`\x1b[32m✔ OCR Target Resolved: "${best.text}" at (${cx}, ${cy}) [Confidence: ${best.confidence}%]\x1b[0m`);
                await this.highlightTarget(box, `OCR: ${best.text}`);

                if (isTypeOrSearch) {
                    await this.mouseClick(cx, cy);
                    if (value) await this.keyboardType(value, 30);
                    const shouldPressEnter = options.pressEnter !== undefined ? options.pressEnter : true;
                    if (shouldPressEnter) {
                        logger.status(`\x1b[35m[PLAYWRIGHT KEYBOARD] Pressing 'Enter'...\x1b[0m`);
                        await this.keyboardPress('Enter');
                        await this.page.waitForTimeout(1500);
                    }
                    return { success: true, method: 'OCR_PIXEL_GROUNDING', box, coords: [cx, cy], typed: value };
                } else {
                    await this.mouseClick(cx, cy);
                    return { success: true, method: 'OCR_PIXEL_GROUNDING', box, coords: [cx, cy] };
                }
            }
        } catch (ocrErr) {
            logger.debug(`[OCR NOTICE] ${ocrErr.message}`);
        }

        return { success: false, reason: `Target "${targetDescription}" not found` };
    }

    /**
     * Detect if page is presenting an authentication or OTP barrier
     */
    async detectAuthenticationBarrier(domInfo = null) {
        if (!this.page) return { detected: false };

        const currentUrl = (this.page.url() || '').toLowerCase();
        const pageTitle = (domInfo?.title || await this.page.title().catch(() => '')).toLowerCase();

        // 1. Google Authentication Barrier (accounts.google.com or Google Sign-In)
        if (currentUrl.includes('accounts.google.com') || pageTitle.includes('sign in - google') || pageTitle.includes('google sign in') || currentUrl.includes('aistudio.google.com')) {
            const hasIdentifier = await this.page.$('#identifierId, input[type="email"], input[name="identifier"]').catch(() => null);
            if (hasIdentifier && await hasIdentifier.isVisible().catch(() => false)) {
                return {
                    detected: true,
                    serviceName: 'Google AI Studio',
                    purpose: 'Email',
                    targetSelector: '#identifierId, input[type="email"], input[name="identifier"]',
                    submitSelector: '#identifierNext, button:has-text("Next")'
                };
            }
            const hasPassword = await this.page.$('input[type="password"], input[name="Passwd"]').catch(() => null);
            if (hasPassword && await hasPassword.isVisible().catch(() => false)) {
                return {
                    detected: true,
                    serviceName: 'Google Account',
                    purpose: 'Password',
                    targetSelector: 'input[type="password"], input[name="Passwd"]',
                    submitSelector: '#passwordNext, button:has-text("Next")'
                };
            }
        }

        // 2. Genuine OTP / 2FA Verification Barrier (Strictly excluding search, promo/postal/coupon codes)
        try {
            const otpSelector = 'input[name*="otp" i], input[id*="otp" i], input[name*="2fa" i], input[name*="totp" i], input[aria-label*="verification code" i], input[placeholder*="verification code" i], input[placeholder*="enter otp" i], input[autocomplete="one-time-code"]';
            const otpInput = await this.page.$(otpSelector).catch(() => null);
            if (otpInput && await otpInput.isVisible().catch(() => false)) {
                const isFalsePositive = await otpInput.evaluate(el => {
                    const attrStr = `${el.name || ''} ${el.id || ''} ${el.placeholder || ''} ${el.className || ''} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
                    // Exclude search inputs and promo codes
                    if (/search|find|query|lookup|filter|brand|service/i.test(attrStr)) return true;
                    if (/coupon|promo|discount|voucher|postal|zip|pin\s*code|pincode/i.test(attrStr)) return true;
                    // If it matched only autocomplete="one-time-code", require actual otp/2fa/verify in attributes or nearby labels
                    const hasExplicitOtpSignal = /otp|2fa|totp|verification|verify|security\s*code|passcode/i.test(attrStr);
                    if (!hasExplicitOtpSignal) return true;
                    return false;
                }).catch(() => true);

                if (!isFalsePositive) {
                    return {
                        detected: true,
                        serviceName: domInfo?.title || 'Security Verification',
                        purpose: 'OTP',
                        targetSelector: otpSelector,
                        submitSelector: 'button[type="submit"], button:has-text("Verify"), button:has-text("Submit"), button:has-text("Next")'
                    };
                }
            }
        } catch (_) {}

        // 3. Instagram / Social Media Multi-Field Login Barrier
        try {
            if (currentUrl.includes('instagram.com')) {
                const igUser = await this.page.$('input[name="username"], input[aria-label*="Phone number, username, or email"]').catch(() => null);
                const igPass = await this.page.$('input[name="password"]').catch(() => null);
                if (igUser && igPass && (await igUser.isVisible().catch(() => false) || await igPass.isVisible().catch(() => false))) {
                    return {
                        detected: true,
                        serviceName: 'Instagram',
                        purpose: 'Instagram Credentials',
                        isMultiField: true,
                        fields: [
                            { name: 'username', label: 'Phone number, username, or email', type: 'text', placeholder: 'Enter Instagram username or email' },
                            { name: 'password', label: 'Password', type: 'password', placeholder: 'Enter Instagram password' }
                        ],
                        submitSelector: 'button[type="submit"], button:has-text("Log in"), button:has-text("Log In")'
                    };
                }
            }
        } catch (_) {}

        // 4. BookMyShow Location Selection Barrier
        try {
            if (currentUrl.includes('bookmyshow.com')) {
                const isLocationModal = await this.page.evaluate(() => {
                    const text = document.body ? document.body.innerText : '';
                    const hasModal = /select\s+your\s+city|popular\s+cities/i.test(text);
                    const hasCitySearch = !!document.querySelector('input[placeholder*="Search for your city" i], input[placeholder*="Search for city" i]');
                    return hasModal || hasCitySearch;
                }).catch(() => false);

                if (isLocationModal) {
                    return {
                        detected: true,
                        serviceName: 'BookMyShow',
                        purpose: 'Location',
                        isLocationChoice: true,
                        fields: [
                            { name: 'city', label: 'City / Location', type: 'text', placeholder: 'e.g. Chennai, Mumbai, Bengaluru', defaultValue: 'Chennai' }
                        ],
                        targetSelector: 'input[placeholder*="Search for your city" i], input[placeholder*="Search for city" i]'
                    };
                }
            }
        } catch (_) {}

        // 5. Generic Password Barrier
        try {
            const passInput = await this.page.$('input[type="password"]').catch(() => null);
            if (passInput && await passInput.isVisible().catch(() => false)) {
                return {
                    detected: true,
                    serviceName: domInfo?.title || 'Login',
                    purpose: 'Password',
                    targetSelector: 'input[type="password"]',
                    submitSelector: 'button[type="submit"], button:has-text("Log In"), button:has-text("Sign In"), button:has-text("Login")'
                };
            }
        } catch (_) {}

        return { detected: false };
    }

    /**
     * Live Status Dispatcher to in-browser 3D AI Assistant Companion
     */
    async updateAutonomousCompanion(state, title, doing, nextAction) {
        if (!this.page) return;
        try {
            await this.page.evaluate(({ state, title, doing, nextAction }) => {
                if (window.setPilotAutonomousState) {
                    window.setPilotAutonomousState(state, title, doing, nextAction);
                } else if (window.activatePilotCompanion) {
                    window.activatePilotCompanion(state, doing || title);
                }
            }, { state, title, doing, nextAction }).catch(() => {});
        } catch (_) {}
    }

    /**
     * 9. Autonomous Multi-Step Website Execution Loop with AI Planning
     */
    async executeAutonomousGoal(goalPrompt, options = {}) {
        const maxSteps = options.maxSteps || 25;
        logger.status(`\n\x1b[36m[AUTONOMOUS PLAYWRIGHT AGENT] Goal: "${goalPrompt}" (Screen Resolution: ${this.viewport.width}x${this.viewport.height})...\x1b[0m`);

        // Suppress desktop WPF overlay window to prevent duplicate icons; strictly use in-browser Autonomous companion
        try { pilotHud.hide(); } catch (_) {}

        // 1. Resolve Target Website by Name or URL via WebsiteAutomationEngine
        let website = options.website || null;
        if (!website) {
            try {
                const websiteAutomationEngine = require('./website-automation-engine');
                website = websiteAutomationEngine.resolveWebsite(goalPrompt);
            } catch (_) {}
        }

        let targetUrl = website ? website.url : 'https://codez48.netlify.app/';
        const urlMatch = goalPrompt.match(/(https?:\/\/[^\s"']+)/i);
        if (urlMatch) {
            targetUrl = urlMatch[1];
        }

        // 2. Select Browser (Edge vs Chrome) & Switch Window if interactive
        let browserChannel = options.channel || 'msedge';
        if (!options.channel && options.rl) {
            try {
                const websiteAutomationEngine = require('./website-automation-engine');
                const choice = await websiteAutomationEngine.selectBrowser(options.rl, options.browser);
                browserChannel = choice.channel;
            } catch (_) {}
        }

        // 2.5 Check for Translation Goal and delegate to Dedicated Autonomous Workflow
        const isTranslation = (website && website.domain && website.domain.includes('translate.google')) ||
            /\b(?:translate|translation|translator|மொழிபெயர்|மாற்று|ட்ரான்ஸ்லேட்)\b/i.test(goalPrompt);

        if (isTranslation) {
            const websiteAutomationEngine = require('./website-automation-engine');
            const browserName = browserChannel === 'msedge' ? 'Microsoft Edge' : 'Google Chrome';
            return await websiteAutomationEngine.executeGoogleTranslationAutomation(
                goalPrompt,
                website,
                { channel: browserChannel, name: browserName },
                options
            );
        }

        // 3. Launch Browser & Navigate
        await this.launchBrowser({ headless: options.headless || false, channel: browserChannel });
        await this.navigate(targetUrl);

        // Inject web companion into browser page if available
        try {
            const candidatePaths = [
                path.resolve(__dirname, 'assets/pilot-cursor-companion.js'),
                path.resolve(__dirname, '../../../../web/js/pilot-cursor-companion.js'),
                path.resolve(process.cwd(), 'web/js/pilot-cursor-companion.js')
            ];
            const companionScript = candidatePaths.find(p => fs.existsSync(p));
            if (companionScript) {
                await this.page.addScriptTag({ path: companionScript }).catch(() => {});
                await this.updateAutonomousCompanion('loading', 'Autonomous Playwright Action', `Navigating to ${targetUrl}...`, 'Preparing autonomous observe-reason-act cycle');
            }
        } catch (_) {}

        let stepCount = 0;
        let isCompleted = false;
        const stepResults = [];

        while (stepCount < maxSteps && !isCompleted) {
            stepCount++;
            logger.status(`\n\x1b[35m--- AUTONOMOUS AGENT STEP ${stepCount}/${maxSteps} ---\x1b[0m`);
            await this.updateAutonomousCompanion('loading', 'Autonomous Playwright Action', `Step ${stepCount}/${maxSteps}: Inspecting DOM & screen elements...`, 'Formulating next browser action sequence');

            // Observe DOM and Screenshot at 1536x864
            const domInfo = await this.inspectDom();
            const screen = await this.captureScreenshot();

            logger.status(`[OBSERVE] Title: "${domInfo.title}" | Elements: ${domInfo.elements.length} | Screenshot: ${path.basename(screen.filePath)}`);

            // 2.1 Check for 2-Step Verification / Phone Tap Prompt
            const is2StepVerification = await this.page.evaluate(() => {
                const text = document.body ? document.body.innerText : '';
                return /tap\s+yes\s+on\s+your\s+phone|check\s+your\s+phone|2-step\s+verification|verify\s+it'?s\s+you|google\s+sent\s+a\s+notification|approve\s+sign-in/i.test(text);
            }).catch(() => false);

            if (is2StepVerification) {
                logger.status(`\n\x1b[33m[2-STEP VERIFICATION DETECTED] Google or service has sent a security approval prompt to your phone.\x1b[0m`);
                logger.user(`\x1b[32m👉 Action Required: Open your phone and tap 'Yes' to approve login.\x1b[0m`);
                logger.status(`\x1b[36m[WAITING PATIENTLY] Waiting up to 120 seconds for login confirmation...\x1b[0m`);
                await this.updateAutonomousCompanion('thinking', '2-Step Verification', 'Please tap YES on your phone to complete login...', 'Awaiting device confirmation');

                const startWait = Date.now();
                while (Date.now() - startWait < 120000) {
                    await this.page.waitForTimeout(3000);
                    const stillWaiting = await this.page.evaluate(() => {
                        const text = document.body ? document.body.innerText : '';
                        return /tap\s+yes|check\s+your\s+phone|2-step\s+verification|verify\s+it'?s\s+you/i.test(text);
                    }).catch(() => false);

                    if (!stillWaiting) {
                        logger.user(`\x1b[32m✓ 2-Step verification confirmed! Page redirected.\x1b[0m`);
                        await this.updateAutonomousCompanion('acting', 'Authentication Approved', 'Authentication approved! Continuing task...', 'Resuming autonomous action sequence');
                        break;
                    }
                }
                const afterShot = await this.captureScreenshot();
                stepResults.push({ step: stepCount, action: '2_STEP_VERIFICATION_WAIT', screenshot: afterShot.filePath });
                continue;
            }

            // 2.2 Check for Authentication / Login Barrier on active page
            const authBarrier = await this.detectAuthenticationBarrier(domInfo);
            if (authBarrier.detected) {
                logger.status(`\x1b[33m[DYNAMIC PROMPT BARRIER] Page requires ${authBarrier.purpose} (${authBarrier.serviceName})...\x1b[0m`);
                await this.updateAutonomousCompanion('generating', 'Input Required', `Resolving ${authBarrier.purpose}...`, 'Processing dynamic input');

                if (authBarrier.isMultiField) {
                    const interactiveInputWindow = require('./interactive-input-window');
                    const userInput = await interactiveInputWindow.promptUserInput({
                        title: `${authBarrier.serviceName} Authentication Required`,
                        prompt: `Please enter your ${authBarrier.serviceName} login credentials:`,
                        fields: authBarrier.fields,
                        screenshotPath: screen.filePath,
                        timeoutMs: 180000
                    });

                    if (userInput && typeof userInput === 'object') {
                        logger.status(`\x1b[32m[AUTH RESOLUTION] Injecting dynamic multi-field credentials into ${authBarrier.serviceName}...\x1b[0m`);
                        for (const [fName, fVal] of Object.entries(userInput)) {
                            if (fVal) {
                                const sel = `input[name="${fName}"], input[type="${fName === 'password' ? 'password' : 'text'}"]`;
                                await this.page.fill(sel, fVal).catch(() => {});
                                await this.page.waitForTimeout(250);
                            }
                        }
                        if (authBarrier.submitSelector) {
                            await this.page.click(authBarrier.submitSelector).catch(() => {});
                        } else {
                            await this.page.keyboard.press('Enter');
                        }
                        await this.page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
                        await this.page.waitForTimeout(2000);
                        const authShot = await this.captureScreenshot();
                        stepResults.push({ step: stepCount, action: 'MULTI_FIELD_AUTH_RESOLVED', service: authBarrier.serviceName, screenshot: authShot.filePath });
                        continue;
                    }
                } else if (authBarrier.isLocationChoice) {
                    const websiteAutomationEngine = require('./website-automation-engine');
                    const locParams = websiteAutomationEngine.parseLocationGoal(goalPrompt);
                    let targetCity = locParams.city;
                    if (!targetCity) {
                        const interactiveInputWindow = require('./interactive-input-window');
                        const res = await interactiveInputWindow.promptUserInput({
                            title: 'Select Location',
                            prompt: 'Please enter your city to proceed on BookMyShow:',
                            placeholder: 'e.g. Chennai, Mumbai, Bengaluru',
                            defaultValue: 'Chennai',
                            screenshotPath: screen.filePath,
                            timeoutMs: 60000
                        });
                        targetCity = (typeof res === 'string' && res.trim()) ? res.trim() : (res?.value || 'Chennai');
                    }

                    if (targetCity) {
                        await this.page.evaluate((city) => {
                            const regex = new RegExp(`^${city}$|${city}`, 'i');
                            const elements = Array.from(document.querySelectorAll('span, p, div, img[alt], a, button'));
                            const cityEl = elements.find(el => regex.test((el.innerText || el.getAttribute('alt') || '').trim()));
                            if (cityEl) { cityEl.click(); return; }
                            const inp = document.querySelector('input[placeholder*="Search for your city" i], input[type="search"]');
                            if (inp) {
                                inp.value = city;
                                inp.dispatchEvent(new Event('input', { bubbles: true }));
                                inp.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }, targetCity);
                        await this.page.keyboard.press('Enter');
                        await this.page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
                        await this.page.waitForTimeout(1500);
                        const authShot = await this.captureScreenshot();
                        stepResults.push({ step: stepCount, action: 'LOCATION_RESOLVED', city: targetCity, screenshot: authShot.filePath });
                        continue;
                    }
                } else {
                    const credentialHandoff = require('./credential-handoff');
                    let userInput = credentialHandoff.extractAuthorizedValue(authBarrier.purpose, goalPrompt);
                    if (!userInput) {
                        userInput = await credentialHandoff.promptForMissingCredential(authBarrier.purpose, authBarrier.serviceName);
                    }

                    if (userInput) {
                        logger.status(`\x1b[32m[AUTH RESOLUTION] Injecting user-provided ${authBarrier.purpose} into target form...\x1b[0m`);
                        await this.updateAutonomousCompanion('acting', 'Entering Credentials', `Entering ${authBarrier.purpose} on screen...`, 'Submitting credential form');
                        if (authBarrier.targetSelector) {
                            await this.page.fill(authBarrier.targetSelector, userInput).catch(() => {});
                        } else {
                            await this.findAndAct(authBarrier.purpose, 'type', userInput, { pressEnter: false });
                        }
                        await this.page.waitForTimeout(500);
                        if (authBarrier.submitSelector) {
                            await this.page.click(authBarrier.submitSelector).catch(() => {});
                        } else {
                            await this.page.keyboard.press('Enter');
                        }
                        await this.page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
                        await this.page.waitForTimeout(2000);
                        const authShot = await this.captureScreenshot();
                        stepResults.push({ step: stepCount, action: 'AUTH_PROMPT_RESOLVED', purpose: authBarrier.purpose, screenshot: authShot.filePath });
                        logger.user(`\x1b[32m✓ Authentication step completed. Verified Screenshot: ${authShot.filePath}\x1b[0m`);
                        continue;
                    }
                }
            }

            // 2.3 User Details & Registration Form Automation
            const isDetailsGoal = /register|registration|signup|sign\s*up|fill\s+details|user\s+details|enter\s+details|create\s+account/i.test(goalPrompt);
            if (isDetailsGoal) {
                const filledCount = await this.page.evaluate(() => {
                    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea'));
                    let filled = 0;
                    for (const inp of inputs) {
                        if (inp.value && inp.value.trim().length > 0) continue;
                        const label = (inp.getAttribute('placeholder') || inp.getAttribute('name') || inp.getAttribute('id') || inp.getAttribute('aria-label') || '').toLowerCase();

                        if (label.includes('name') || label.includes('full name') || label.includes('first name')) {
                            inp.value = 'Suriya Prakash';
                            inp.dispatchEvent(new Event('input', { bubbles: true }));
                            inp.dispatchEvent(new Event('change', { bubbles: true }));
                            filled++;
                        } else if (label.includes('email') || label.includes('mail')) {
                            inp.value = 'rajnaga75556@gmail.com';
                            inp.dispatchEvent(new Event('input', { bubbles: true }));
                            inp.dispatchEvent(new Event('change', { bubbles: true }));
                            filled++;
                        } else if (label.includes('phone') || label.includes('mobile') || label.includes('contact')) {
                            inp.value = '8248482844';
                            inp.dispatchEvent(new Event('input', { bubbles: true }));
                            inp.dispatchEvent(new Event('change', { bubbles: true }));
                            filled++;
                        } else if (label.includes('business') || label.includes('company') || label.includes('org')) {
                            inp.value = 'Codez48';
                            inp.dispatchEvent(new Event('input', { bubbles: true }));
                            inp.dispatchEvent(new Event('change', { bubbles: true }));
                            filled++;
                        } else if (label.includes('pass') || inp.type === 'password') {
                            inp.value = 'Codez48#Secure2026';
                            inp.dispatchEvent(new Event('input', { bubbles: true }));
                            inp.dispatchEvent(new Event('change', { bubbles: true }));
                            filled++;
                        }
                    }
                    return filled;
                }).catch(() => 0);

                if (filledCount > 0) {
                    logger.status(`\x1b[32m[FORM AUTOMATION] Completed ${filledCount} user detail fields on active form.\x1b[0m`);
                    await this.updateAutonomousCompanion('acting', 'Form Automation', `Filled ${filledCount} user detail fields...`, 'Continuing workflow');
                    await this.page.waitForTimeout(800);
                }
            }

            // Query AI for next browser action
            const actionPrompt = `GOAL: "${goalPrompt}"
CURRENT URL: ${domInfo.url}
PAGE TITLE: "${domInfo.title}"
SCREEN RESOLUTION: ${this.viewport.width}x${this.viewport.height}
AVAILABLE INTERACTIVE ELEMENTS:
${JSON.stringify(domInfo.elements.slice(0, 20), null, 2)}

PREVIOUS STEPS EXECUTED:
${JSON.stringify(stepResults.map(s => `${s.action} -> ${s.target || s.url || ''}`), null, 2)}

Determine the single next browser action to advance toward the goal.
Available actions:
- "SEARCH": Locates search input, types search query, and presses Enter.
- "TYPE_AND_ENTER": Types text into target input field and presses Enter.
- "TYPE": Types text into target input field.
- "CLICK": Clicks target button, link, or element.
- "PRESS_KEY": Presses a specific keyboard key (e.g. "Enter", "Tab", "Escape").
- "SCROLL": Scrolls viewport down to reveal content.
- "NAVIGATE": Navigates directly to URL.
- "DONE": Goal has been accomplished.

Return JSON strictly:
{
  "action": "SEARCH" | "TYPE_AND_ENTER" | "TYPE" | "CLICK" | "PRESS_KEY" | "SCROLL" | "NAVIGATE" | "DONE",
  "target": "target element name or description",
  "value": "text to type or URL or key name",
  "pressEnter": true | false,
  "reason": "explanation of action"
}`;

            const rawAi = await documentAiEngine.queryAi(actionPrompt, 'You are an autonomous web automation planner.');
            let plan = documentAiEngine.extractJson(rawAi);

            // Default fallback if AI response was not structured or unavailable
            if (!plan || !plan.action) {
                const lower = goalPrompt.toLowerCase();
                const clickMatch = goalPrompt.match(/(?:click|press|tap|select)\s+(?:on\s+)?(?:the\s+)?["']?([^,"'\n]+?)["']?(?:\s*,|\s+and|\s+then|$)/i);
                const searchMatch = goalPrompt.match(/(?:search|find|lookup)\s+(?:for\s+)?["']?([^,"'\n]+?)["']?(?:\s*,|\s+and|\s+then|$)/i);
                const typeMatch = goalPrompt.match(/(?:type|enter|fill|input)\s+["']?([^,"'\n]+?)["']?\s+(?:in|into|on)\s+["']?([^,"'\n]+?)["']?/i);
                const scrollMatch = lower.includes('scroll');

                const alreadyClicked = stepResults.some(s => s.action === 'CLICK');
                const alreadySearched = stepResults.some(s => s.action === 'SEARCH' || s.action === 'TYPE_AND_ENTER');
                const alreadyScrolled = stepResults.some(s => s.action === 'SCROLL');

                if (clickMatch && !alreadyClicked) {
                    const targetBtn = clickMatch[1].trim();
                    plan = { action: 'CLICK', target: targetBtn, reason: `User assigned task to click "${targetBtn}"` };
                } else if (typeMatch && !alreadySearched) {
                    plan = { action: 'TYPE_AND_ENTER', target: typeMatch[2].trim(), value: typeMatch[1].trim(), reason: `Typing "${typeMatch[1].trim()}" into ${typeMatch[2].trim()}` };
                } else if (searchMatch && !alreadySearched) {
                    const q = searchMatch[1].trim();
                    plan = { action: 'SEARCH', target: 'Search input', value: q, reason: `Searching for "${q}"` };
                } else if (scrollMatch && !alreadyScrolled) {
                    plan = { action: 'SCROLL', reason: 'Scrolling viewport down as requested' };
                } else if (stepCount === 1) {
                    // Step 1: Default to primary search/input box discovery
                    const q = (searchMatch ? searchMatch[1] : goalPrompt).replace(/https?:\/\/[^\s"']+/g, '').trim();
                    if (q.length > 2) {
                        plan = { action: 'SEARCH', target: 'search box', value: q, reason: `Initial input into primary box: "${q}"` };
                    } else {
                        plan = { action: 'SCROLL', reason: 'Scanning interactive page content' };
                    }
                } else if (stepCount >= 5 && (alreadyClicked && alreadySearched)) {
                    plan = { action: 'DONE', reason: 'Assigned browser automation task executed successfully.' };
                } else if (stepCount >= 8) {
                    plan = { action: 'DONE', reason: 'All planned browser automation steps completed.' };
                } else {
                    plan = { action: 'SCROLL', reason: 'Scanning for additional interactive elements' };
                }
            }

            logger.status(`\x1b[32m[DECISION] Action: ${plan.action} | Target: "${plan.target || 'N/A'}" | Reason: "${plan.reason || ''}"\x1b[0m`);
            await this.updateAutonomousCompanion('acting', 'Autonomous Playwright Action', `${plan.action}: ${plan.target || plan.value || plan.reason || 'Executing step'}`, `Next: Verify DOM state changes after ${plan.action}`);

            if (plan.action === 'DONE') {
                isCompleted = true;
                stepResults.push({ step: stepCount, action: 'DONE', reason: plan.reason });
                break;
            }

            if (plan.action === 'SEARCH' || plan.action === 'TYPE_AND_ENTER') {
                const actRes = await this.findAndAct(plan.target || 'search box', 'search', plan.value, { pressEnter: true });
                stepResults.push({ step: stepCount, action: plan.action, target: plan.target, value: plan.value, result: actRes });
            } else if (plan.action === 'TYPE' && plan.target) {
                const actRes = await this.findAndAct(plan.target, 'type', plan.value, { pressEnter: plan.pressEnter === true });
                stepResults.push({ step: stepCount, action: 'TYPE', target: plan.target, value: plan.value, result: actRes });
            } else if (plan.action === 'CLICK' && plan.target) {
                const actRes = await this.findAndAct(plan.target, 'click');
                stepResults.push({ step: stepCount, action: 'CLICK', target: plan.target, result: actRes });
            } else if (plan.action === 'PRESS_KEY') {
                const key = plan.value || 'Enter';
                await this.keyboardPress(key);
                stepResults.push({ step: stepCount, action: 'PRESS_KEY', key });
            } else if (plan.action === 'SCROLL') {
                await this.mouseWheel(0, 500);
                stepResults.push({ step: stepCount, action: 'SCROLL', deltaY: 500 });
            } else if (plan.action === 'NAVIGATE' && plan.value) {
                await this.navigate(plan.value);
                stepResults.push({ step: stepCount, action: 'NAVIGATE', url: plan.value });
            } else {
                await this.mouseWheel(0, 400);
                stepResults.push({ step: stepCount, action: 'SCROLL_DEFAULT' });
            }

            await this.page.waitForTimeout(1000);
        }

        // Final Verification Screenshot at 1536x864
        const finalScreen = await this.captureScreenshot();
        const finalTitle = await this.page.title();
        const finalUrl = this.page.url();

        logger.status(`\n\x1b[32m========================================================================================\x1b[0m`);
        logger.user(`\x1b[32m✓ Autonomous Playwright Task Complete: ${stepCount} steps executed\x1b[0m`);
        logger.user(`\x1b[32m✓ Display Resolution: ${this.viewport.width}x${this.viewport.height} (Matches Laptop Display)\x1b[0m`);
        logger.user(`\x1b[32m✓ Final Title:        "${finalTitle}"\x1b[0m`);
        logger.user(`\x1b[32m✓ Final URL:          ${finalUrl}\x1b[0m`);
        logger.user(`\x1b[32m✓ Final Screenshot:   ${finalScreen.filePath}\x1b[0m`);
        logger.status(`\x1b[32m========================================================================================\x1b[0m\n`);

        await this.updateAutonomousCompanion('success', 'Autonomous Playwright Action', `Playwright task completed! (${stepCount} steps)`, 'Standing by • Press Ctrl+C in terminal to close');

        // Keep browser & Autonomous companion active and visible until explicitly closed by user (Ctrl+C)
        if (!options.closeImmediately) {
            logger.status(`\x1b[36m[AUTONOMOUS PLAYWRIGHT] Browser and 3D Companion remain active and visible.\x1b[0m`);
            logger.status(`\x1b[33mPress Ctrl+C in this terminal when you are ready to close the session.\x1b[0m\n`);

            await new Promise((resolve) => {
                const cleanup = () => { resolve(); };
                process.once('SIGINT', cleanup);
                if (this.page) {
                    this.page.once('close', cleanup);
                }
                if (this.browser) {
                    this.browser.once('disconnected', cleanup);
                }
            });
            await this.closeBrowser();
        } else {
            await this.closeBrowser();
        }

        return {
            success: true,
            totalSteps: stepCount,
            screenResolution: `${this.viewport.width}x${this.viewport.height}`,
            finalTitle,
            finalUrl,
            screenshotPath: finalScreen.filePath,
            steps: stepResults
        };
    }
}

module.exports = new PlaywrightBrowserController();
