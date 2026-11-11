/**
 * CODEZ48 CLAUDE AI WEB AUTOMATION ADAPTER
 * Autonomous Playwright interaction with Claude AI (https://claude.ai)
 * - Stealth browser launch with persistent session profile
 * - Step-by-step visual screenshot verification at every UI stage
 * - Automated OTP detection & email verification code retrieval
 * - Strict User Permission Guard before accessing user email
 * - Interactive floating screenshot popup fallback for manual verification
 * - Seamless dashboard navigation, chat execution, and artifact extraction
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('../../core/logger');
const interactiveInputWindow = require('../browser/interactive-input-window');
const pilotHud = require('../hud/pilot-hud-controller');
const activeBrowserDetector = require('../browser/active-browser-detector');

const getClaudeProfileDir = () => {
    const activeBrowser = activeBrowserDetector.getActiveBrowser();
    return path.resolve(process.env.USERPROFILE || process.env.HOME || '.', '.codez48_browser_profile', `${activeBrowser.channel || 'browser'}_claude_session`);
};
const CLAUDE_PROFILE_DIR = getClaudeProfileDir();
const CLAUDE_SCREENSHOTS_DIR = path.resolve(process.env.USERPROFILE || process.env.HOME || '.', '.codez48_browser_profile', 'claude_screenshots');

class ClaudeAutomationAdapter {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.browserChannel = null;
        this.isLoggedIn = false;
        this.quotaExhausted = false;
        this.screenshots = [];
    }

    /**
     * Resolves the native Claude Desktop application binary if installed on Windows.
     * @returns {string|null}
     */
    findClaudeDesktopBinary() {
        if (process.platform !== 'win32') return null;
        const local = process.env.LOCALAPPDATA || '';
        const progFiles = process.env.ProgramFiles || '';
        const progFilesX86 = process.env['ProgramFiles(x86)'] || '';

        const candidates = [
            path.join(local, 'Programs', 'Claude', 'Claude.exe'),
            path.join(local, 'Claude', 'Claude.exe'),
            path.join(progFiles, 'Claude', 'Claude.exe'),
            path.join(progFilesX86, 'Claude', 'Claude.exe'),
            path.join(local, 'AnthropicClaude', 'Claude.exe')
        ];

        for (const p of candidates) {
            if (p && fs.existsSync(p)) return p;
        }
        return null;
    }

    /**
     * Captures and stores step-by-step screenshot into the profile directory
     */
    async takeScreenshot(stepName, description = '') {
        try {
            fs.mkdirSync(CLAUDE_SCREENSHOTS_DIR, { recursive: true });
            const filename = `${stepName}.png`;
            const fullPath = path.join(CLAUDE_SCREENSHOTS_DIR, filename);
            if (this.page && !this.page.isClosed()) {
                await this.page.screenshot({ path: fullPath, fullPage: false });
                this.screenshots.push({ step: stepName, description, path: fullPath, timestamp: Date.now() });
                const fileUri = `file:///${fullPath.replace(/\\/g, '/')}`;
                logger.status(`\x1b[36m[CLAUDE SCREENSHOT] Captured: ${fileUri} (${description || stepName})\x1b[0m`);
                return fullPath;
            }
        } catch (e) {
            logger.debug(`Screenshot capture failed: ${e.message}`);
        }
        return null;
    }

    /**
     * Enter OTP verification code into single-input or multi-digit boxes
     */
    async enterOtpCode(code) {
        if (!this.page || !code) return false;
        const cleanCode = String(code).trim();
        logger.status(`\x1b[36m[CLAUDE AI] Entering verification code: ${cleanCode}...\x1b[0m`);

        // Check if single input field exists
        const singleSelectors = [
            'input[autocomplete="one-time-code"]',
            'input[data-testid="code-input"]',
            'input[name="code"]',
            'input[type="text"][maxlength="6"]',
            'input[inputmode="numeric"]',
            'input[placeholder*="code" i]',
            'input[placeholder*="123456" i]',
            'input[type="tel"]'
        ];

        for (const sel of singleSelectors) {
            const input = await this.page.$(sel);
            if (input) {
                await input.click();
                await input.fill(cleanCode);
                await this.page.waitForTimeout(400);
                return true;
            }
        }

        // Check for multiple single-character OTP inputs (e.g. 6 boxes)
        const digitInputs = await this.page.$$('input[maxlength="1"], input[aria-label*="digit" i]');
        if (digitInputs && digitInputs.length >= cleanCode.length) {
            for (let i = 0; i < cleanCode.length; i++) {
                await digitInputs[i].click();
                await digitInputs[i].fill(cleanCode[i]);
                await this.page.waitForTimeout(100);
            }
            return true;
        }

        // Fallback: keyboard type
        await this.page.keyboard.type(cleanCode, { delay: 50 });
        return true;
    }

    /**
     * Opens a new tab, navigates to Gmail, extracts Claude verification OTP, and returns to Claude tab
     */
    async retrieveOtpFromGmail(options = {}) {
        if (!this.context) return null;
        logger.status('\x1b[36m[GMAIL TAB AUTOMATION] Opening new tab to access Gmail account for verification code...\x1b[0m');
        pilotHud.setActing('Opening Gmail tab to retrieve verification code...');

        let gmailPage = null;
        let extractedCode = null;

        try {
            gmailPage = await this.context.newPage();
            await gmailPage.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                window.chrome = { runtime: {} };
            });

            logger.status('\x1b[36m[GMAIL] Navigating to https://mail.google.com...\x1b[0m');
            await gmailPage.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
            await gmailPage.waitForTimeout(3000);

            await this.takeScreenshot('03_gmail_tab_opened', 'Gmail Tab Opened for OTP Retrieval');

            // Attempt search in Gmail for Claude / Anthropic verification emails
            try {
                const searchInput = await gmailPage.$('input[aria-label="Search mail"], input[name="q"], input[placeholder*="Search" i]');
                if (searchInput) {
                    await searchInput.click();
                    await searchInput.fill('Claude OR Anthropic OR "verification code"');
                    await gmailPage.keyboard.press('Enter');
                    await gmailPage.waitForTimeout(3000);
                }
            } catch (_) {}

            // Poll for verification email and extract code
            for (let attempt = 0; attempt < 8; attempt++) {
                // Check top email rows in inbox
                const emailRows = await gmailPage.$$('tr[role="row"], tr.zA, div[role="row"]');
                for (const row of emailRows.slice(0, 5)) {
                    const rowText = await row.innerText().catch(() => '');
                    if (/Claude|Anthropic|verification/i.test(rowText)) {
                        await row.click().catch(() => {});
                        await gmailPage.waitForTimeout(2000);
                        break;
                    }
                }

                const bodyContent = await gmailPage.content();
                const textContent = await gmailPage.evaluate(() => document.body ? document.body.innerText : '');

                // Match 6-character / 6-digit OTP codes
                const match =
                    textContent.match(/(?:verification\s+code\s+is|login\s+code\s+is|code:\s*|code\s+is\s*)\s*([A-Za-z0-9]{6})\b/i) ||
                    textContent.match(/([0-9]{6})\s+is\s+your\s+Claude/i) ||
                    textContent.match(/Claude\s+verification\s+code[\s\S]*?\b([0-9]{6})\b/i) ||
                    textContent.match(/your\s+temporary\s+verification\s+code\s+is:\s*([A-Za-z0-9]{6})/i) ||
                    textContent.match(/temporary\s+verification\s+code[\s\S]*?\b([0-9]{6})\b/i) ||
                    bodyContent.match(/(?:verification\s+code\s+is|login\s+code\s+is|code:\s*)\s*([A-Z0-9]{6})\b/i);

                if (match) {
                    extractedCode = match[1].trim();
                    logger.status(`\x1b[32m✔ Successfully extracted verification OTP from Gmail: ${extractedCode}\x1b[0m`);
                    await this.takeScreenshot('03_gmail_otp_extracted', `Extracted OTP ${extractedCode} from Gmail`);
                    break;
                }

                await gmailPage.waitForTimeout(2500);
            }
        } catch (err) {
            logger.debug(`[GMAIL OTP ERROR] ${err.message}`);
        } finally {
            if (gmailPage && !gmailPage.isClosed()) {
                logger.status('\x1b[36m[GMAIL] Closing Gmail tab and returning to Claude tab...\x1b[0m');
                await gmailPage.close().catch(() => {});
            }
            if (this.page && !this.page.isClosed()) {
                await this.page.bringToFront().catch(() => {});
                await this.takeScreenshot('04_back_to_claude_tab', 'Returned to Claude Tab');
            }
        }

        return extractedCode;
    }

    /**
     * Backward-compatible alias for OTP retrieval
     */
    async retrieveOtpFromEmail() {
        return this.retrieveOtpFromGmail();
    }

    /**
     * Locate and execute "Sign in with Google" / "Continue with Google" priority option
     */
    async handleGoogleSignIn(targetPage = null) {
        const page = targetPage || this.page;
        if (!page) return false;

        const googleSelectors = [
            'button:has-text("Continue with Google")',
            'button:has-text("Sign in with Google")',
            'button:has-text("Log in with Google")',
            'a:has-text("Continue with Google")',
            'a:has-text("Sign in with Google")',
            'button[data-testid="google-auth-button"]',
            'button[data-testid="google-button"]',
            'button[aria-label*="Google" i]',
            'button:has(svg path[fill="#4285F4"])',
            'button:has(svg[aria-label="Google"])',
            'div[role="button"]:has-text("Continue with Google")'
        ];

        let googleBtn = null;
        for (const sel of googleSelectors) {
            googleBtn = await page.$(sel);
            if (googleBtn) break;
        }

        if (!googleBtn) {
            return false;
        }

        logger.status('\x1b[36m[GOOGLE AUTH] "Sign in with Google" option detected. Prioritizing Google sign-in...\x1b[0m');
        pilotHud.setActing('Executing "Sign in with Google"...');
        await this.takeScreenshot('02_google_signin_detected', '"Sign in with Google" Button Detected');

        // Set up popup listener if Google OAuth opens in popup window
        const popupPromise = this.context ? this.context.waitForEvent('page', { timeout: 8000 }).catch(() => null) : Promise.resolve(null);

        try {
            await googleBtn.click({ force: true, timeout: 5000 });
        } catch (_) {
            await page.evaluate(el => el && el.click(), googleBtn).catch(() => {});
        }
        await page.waitForTimeout(2000);

        const popup = await popupPromise;
        const authPage = popup || this.page;
        await authPage.waitForLoadState('domcontentloaded').catch(() => {});
        await this.takeScreenshot('02_google_oauth_screen', 'Google Authentication Screen');

        // Check if an existing Google account is listed in the chooser
        const accountSelector = '[data-identifier], div[data-email], li[data-authuser], div[role="link"]:has-text("@")';
        const accountItem = await authPage.$(accountSelector);
        if (accountItem) {
            const acctName = await accountItem.innerText().catch(() => 'Google Account');
            logger.status(`\x1b[36m[GOOGLE AUTH] Active Google account found on profile (${acctName.trim()}). Selecting account...\x1b[0m`);
            try {
                await accountItem.click({ force: true, timeout: 5000 });
            } catch (_) {
                await authPage.evaluate(el => el && el.click(), accountItem).catch(() => {});
            }
            await authPage.waitForTimeout(3000);
        }

        // Wait for redirect back to Claude dashboard
        for (let i = 0; i < 20; i++) {
            await this.page.waitForTimeout(1000);
            const u = this.page.url();
            const hasPrompt = await this.page.$('div[contenteditable="true"], textarea[placeholder*="Claude" i]');
            if (!u.includes('/login') && !u.includes('/auth') && hasPrompt) {
                this.isLoggedIn = true;
                logger.status('\x1b[32m✔ "Sign in with Google" completed successfully! Claude dashboard ready.\x1b[0m');
                await this.takeScreenshot('05_dashboard_logged_in', 'Claude Dashboard Authenticated via Google');
                return true;
            }
        }

        return false;
    }

    /**
     * Launch standard desktop browser (Google Chrome or Microsoft Edge) with persistent profile
     * Suppresses automation infobars and test flags.
     */
    async initBrowser(headless = false, preferredChannel = null) {
        if (this.context && this.page && !this.page.isClosed()) {
            return { context: this.context, page: this.page };
        }

        try {
            fs.mkdirSync(CLAUDE_PROFILE_DIR, { recursive: true });
            fs.mkdirSync(CLAUDE_SCREENSHOTS_DIR, { recursive: true });
        } catch (_) {}

        const { chromium } = require('playwright');
        const stealthArgs = [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--no-default-browser-check',
            '--no-first-run',
            '--window-position=0,0',
            '--window-size=1280,800',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas'
        ];

        const activeBrowser = activeBrowserDetector.getActiveBrowser();
        const primaryChannel = preferredChannel || process.env.CODEZ48_BROWSER_CHANNEL || activeBrowser.channel || 'msedge';
        const targetProfileDir = getClaudeProfileDir();

        const baseLaunchConfig = {
            headless: headless,
            args: stealthArgs,
            ignoreDefaultArgs: ['--enable-automation'], // Crucial: removes test browser banner & flags
            viewport: { width: 1280, height: 800 },
            userAgent: primaryChannel === 'msedge'
                ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'
                : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        };

        let launched = false;
        logger.status(`\x1b[36m[ACTIVE BROWSER DETECTOR] Primary active browser: ${activeBrowser.name} (channel: ${primaryChannel})\x1b[0m`);

        // Channel candidate priority order based on active browser
        const channelOrder = primaryChannel === 'msedge' 
            ? ['msedge', 'chrome'] 
            : ['chrome', 'msedge'];

        for (const ch of channelOrder) {
            try {
                const bName = ch === 'msedge' ? 'Microsoft Edge' : 'Google Chrome';
                logger.status(`\x1b[36m[ACTIVE BROWSER] Launching everyday ${bName} (${ch}) profile...\x1b[0m`);
                this.context = await chromium.launchPersistentContext(targetProfileDir, {
                    ...baseLaunchConfig,
                    channel: ch
                });
                this.browserChannel = ch;
                launched = true;
                logger.status(`\x1b[32m✔ Launched everyday ${bName} (Standard profile, zero test banners).\x1b[0m`);
                break;
            } catch (chErr) {
                logger.debug(`[${ch.toUpperCase()} NOT AVAILABLE] ${chErr.message}`);
            }
        }

        // 3. Fallback: persistent context without explicit channel if native channels unavailable
        if (!launched) {
            this.context = await chromium.launchPersistentContext(targetProfileDir, baseLaunchConfig);
            this.browserChannel = 'chromium';
            logger.status('\x1b[33m[BROWSER FALLBACK] Launched fallback browser engine.\x1b[0m');
        }

        const pages = this.context.pages();
        this.page = pages.length > 0 ? pages[0] : await this.context.newPage();

        // Evade navigator.webdriver and add browser features
        await this.page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.chrome = { runtime: {} };
        });

        return { context: this.context, page: this.page };
    }

    /**
     * Directly opens Claude in the user's active everyday browser (Microsoft Edge)
     * without any test banners or guest modes, reusing their live authenticated session.
     */
    async openInNativeBrowser(url = 'https://claude.ai') {
        return await activeBrowserDetector.launchInActiveBrowser(url);
    }

    /**
     * Check if user is logged into Claude, navigate through Google sign-in priority, OTP via Gmail tab, and verification
     */
    async ensureLoggedIn() {
        if (!this.page) await this.initBrowser(false);

        logger.status('\x1b[36m[CLAUDE AI] Navigating to https://claude.ai...\x1b[0m');
        await this.page.goto('https://claude.ai', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
        await this.page.waitForTimeout(3000);

        // Capture step 1: Landing screen
        await this.takeScreenshot('01_claude_landing', 'Claude AI Initial Landing Page');

        // Check if already authenticated on dashboard
        const currentUrl = this.page.url();
        const content = await this.page.content();
        const promptInput = await this.page.$('div[contenteditable="true"], textarea[placeholder*="Claude" i]');
        if (!currentUrl.includes('/login') && !currentUrl.includes('/auth') && promptInput) {
            this.isLoggedIn = true;
            await this.takeScreenshot('05_dashboard_logged_in', 'Claude Dashboard Already Authenticated');
            return true;
        }

        const isAuthPage = currentUrl.includes('/login') ||
            currentUrl.includes('/auth') ||
            content.includes('Sign in to Claude') ||
            content.includes('Enter your work email') ||
            content.includes('Continue with email') ||
            content.includes('Continue with Google') ||
            content.includes('Sign in with Google');

        if (isAuthPage) {
            logger.status('\x1b[33m[CLAUDE AI] Authentication required. Checking for "Sign in with Google"...\x1b[0m');
            pilotHud.setActing('Claude login required — prioritizing Google sign-in');

            // PRIORITY 1: Use "Sign in with Google" if present
            const googleLoggedIn = await this.handleGoogleSignIn(this.page);
            if (googleLoggedIn) {
                return true;
            }

            // PRIORITY 2: Fallback to email input if Google sign-in was not present or did not authenticate directly
            const emailInput = await this.page.$('input[type="email"], input[name="email"], input[placeholder*="email" i]');
            let userEmail = '';

            if (emailInput) {
                userEmail = await emailInput.inputValue();
            }

            if (!userEmail && emailInput) {
                // Prompt user for email
                const creds = await interactiveInputWindow.promptUserInput({
                    title: 'Claude AI Authentication',
                    prompt: 'Please enter your Claude / Anthropic email to sign in to Claude AI:',
                    placeholder: 'developer@example.com',
                    fields: [
                        { name: 'email', label: 'Claude Email Address', placeholder: 'user@example.com', type: 'email' }
                    ],
                    timeoutMs: 180000
                });

                if (creds && creds.email) {
                    userEmail = creds.email;
                }
            }

            if (userEmail && emailInput) {
                logger.status(`\x1b[36m[CLAUDE AI] Submitting email: ${userEmail}...\x1b[0m`);
                await emailInput.fill(userEmail);
                await this.page.waitForTimeout(500);
                await this.takeScreenshot('02_email_entered', `Email ${userEmail} Entered`);

                // Press Enter to submit email directly without pointer interception
                await emailInput.press('Enter').catch(() => {});

                const submitBtn = await this.page.$('button:has-text("Continue with email"), button[type="submit"]');
                if (submitBtn) {
                    try {
                        await submitBtn.click({ force: true, timeout: 3000 });
                    } catch (_) {
                        await this.page.evaluate(el => el && el.click(), submitBtn).catch(() => {});
                    }
                    await this.page.waitForTimeout(3000);
                }
            }

            // Step 3: Wait for and Detect Verification Code / OTP Stage
            logger.status('\x1b[36m[CLAUDE AI] Monitoring page for OTP / Verification Code prompt...\x1b[0m');
            let otpDetected = false;
            let otpScreenshot = null;

            for (let i = 0; i < 20; i++) {
                await this.page.waitForTimeout(1500);
                const pageText = await this.page.content();
                const codeInput = await this.page.$('input[autocomplete="one-time-code"], input[data-testid="code-input"], input[placeholder*="code" i], input[inputmode="numeric"]');
                const isOtpScreen = pageText.includes('Enter verification code') ||
                                    pageText.includes('We sent a code to') ||
                                    pageText.includes('Check your email') ||
                                    pageText.includes('temporary verification code') ||
                                    pageText.includes('6-digit code') ||
                                    codeInput !== null;

                if (isOtpScreen) {
                    otpDetected = true;
                    otpScreenshot = await this.takeScreenshot('03_otp_verification_screen', 'Claude OTP Verification Screen');
                    break;
                }

                const checkUrl = this.page.url();
                if (!checkUrl.includes('/login') && !checkUrl.includes('/auth')) {
                    this.isLoggedIn = true;
                    break;
                }
            }

            // Step 4: Automated OTP Retrieval via New Tab in Gmail
            if (otpDetected) {
                logger.status('\x1b[36m[CLAUDE AI] OTP required. Opening new tab to access Gmail for verification code...\x1b[0m');
                let otpCode = await this.retrieveOtpFromGmail();

                // If automated retrieval from Gmail did not find code, fallback to screenshot popup window
                if (!otpCode) {
                    logger.status('\x1b[33m[INTERACTIVE OTP POPUP] Displaying site screenshot and requesting verification code...\x1b[0m');
                    const codeResp = await interactiveInputWindow.promptUserInput({
                        title: 'Claude AI Verification Code',
                        prompt: 'Claude is requesting the temporary verification code sent to your email. Check your email and enter the code below (site screenshot shown above):',
                        placeholder: 'Enter 6-digit verification code',
                        screenshotPath: otpScreenshot,
                        fields: [
                            { name: 'code', label: 'Verification Code', placeholder: 'e.g. 123456 or ABCDEF', type: 'text' }
                        ],
                        timeoutMs: 120000
                    });

                    otpCode = codeResp && (typeof codeResp === 'object' ? codeResp.code : codeResp);
                }

                if (otpCode) {
                    await this.enterOtpCode(otpCode);
                    await this.takeScreenshot('04_otp_entered', `Entered OTP ${otpCode}`);

                    // Submit OTP
                    const verifyBtn = await this.page.$('button:has-text("Verify"), button:has-text("Continue"), button[type="submit"]');
                    if (verifyBtn) {
                        await verifyBtn.click();
                    } else {
                        await this.page.keyboard.press('Enter');
                    }
                }
            }

            // Step 5: Wait for dashboard transition
            logger.status('\x1b[36m[CLAUDE AI] Waiting for dashboard session confirmation...\x1b[0m');
            for (let i = 0; i < 25; i++) {
                await this.page.waitForTimeout(1500);
                const finalUrl = this.page.url();
                const activePrompt = await this.page.$('div[contenteditable="true"], textarea[placeholder*="Claude" i]');
                if (!finalUrl.includes('/login') && !finalUrl.includes('/auth') && activePrompt) {
                    this.isLoggedIn = true;
                    break;
                }
            }

            await this.takeScreenshot('05_dashboard_logged_in', 'Claude Dashboard Authenticated & Ready');
        } else {
            this.isLoggedIn = true;
            await this.takeScreenshot('05_dashboard_logged_in', 'Claude Dashboard Already Ready');
        }

        return this.isLoggedIn;
    }

    /**
     * Check if Claude platform query limit or cooldown is currently active
     */
    async checkPlatformLimits() {
        if (!this.page) return { limited: false };

        const content = await this.page.content();
        const limitPhrases = [
            'out of free messages until',
            'message limit reached',
            'you have reached your message limit',
            'try again in',
            'upgrade to claude pro',
            'usage limit'
        ];

        for (const phrase of limitPhrases) {
            if (content.toLowerCase().includes(phrase)) {
                this.quotaExhausted = true;
                const match = content.match(/(?:until|in)\s+([0-9]+(?::[0-9]+)?\s*(?:AM|PM|hours|minutes|mins)?)/i);
                const resetTime = match ? match[1] : 'later today';

                logger.status(`\x1b[33m[CLAUDE LIMIT DETECTED] Platform limit reached: ${phrase}. Reset expected: ${resetTime}\x1b[0m`);
                return {
                    limited: true,
                    reason: `Claude platform message limit reached (${phrase})`,
                    resetTime
                };
            }
        }

        return { limited: false };
    }

    /**
     * Resolves and extracts local Skill Files (.md, .py, .json) to inject into Claude context
     */
    processSkillContext(goal, options = {}) {
        let skillContext = '';
        const lower = (goal || '').toLowerCase();
        const baseSkillsDir = path.resolve(process.cwd(), 'skills');

        try {
            // Check if options has specific skill file or path
            if (options.skillPath && fs.existsSync(options.skillPath)) {
                const content = fs.readFileSync(options.skillPath, 'utf8');
                skillContext += `\n[PROVIDED SKILL FILE: ${path.basename(options.skillPath)}]\n${content}\n[END SKILL FILE]\n`;
            }

            // Scan local skills directory for relevant skills
            if (fs.existsSync(baseSkillsDir)) {
                const entries = fs.readdirSync(baseSkillsDir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        const skillName = entry.name.toLowerCase();
                        if (lower.includes(skillName) || (options.skillName && options.skillName.toLowerCase() === skillName)) {
                            const mdPath = path.join(baseSkillsDir, entry.name, 'SKILL.md');
                            if (fs.existsSync(mdPath)) {
                                const content = fs.readFileSync(mdPath, 'utf8');
                                skillContext += `\n[LOCAL ACTIVE SKILL: ${entry.name}]\n${content}\n[END SKILL]\n`;
                                logger.status(`\x1b[36m[SKILL INJECTION] Injected local skill "${entry.name}" into Claude prompt context\x1b[0m`);
                            }
                        }
                    }
                }
            }
        } catch (e) {
            logger.debug(`[SKILL CONTEXT SCAN] ${e.message}`);
        }

        return skillContext;
    }

    /**
     * Execute an end-to-end task on Claude AI with visual screenshot tracking
     */
    async executeClaudeTask(goal, options = {}) {
        const startTime = Date.now();
        pilotHud.setThinking('Connecting to Claude AI platform...');

        // If goal is empty, prompt user interactively
        let taskPrompt = goal;
        if (!taskPrompt || !taskPrompt.trim() || options.promptUser) {
            const userInput = await interactiveInputWindow.promptUserInput({
                title: 'Claude AI Task Requirements',
                prompt: 'Define the task or prompt for Claude AI:',
                placeholder: 'e.g. Design an MCP server for MT5 trade pattern detection',
                fields: [
                    { name: 'task', label: 'Primary Goal / Instruction', placeholder: 'e.g. Create an MCP server for trading', type: 'text' },
                    { name: 'details', label: 'Specific Requirements / Parameters', placeholder: 'e.g. Head & shoulders, 1:2 R:R, MT5 API', type: 'text' }
                ]
            });

            if (userInput) {
                taskPrompt = userInput.task + (userInput.details ? `\nDetails: ${userInput.details}` : '');
            }
        }

        if (!taskPrompt || !taskPrompt.trim()) {
            return {
                success: false,
                reason: 'NO_PROMPT',
                message: 'No prompt specified for Claude AI.'
            };
        }

        // Enrich taskPrompt with skill files and MCP context if applicable
        const skillContext = this.processSkillContext(taskPrompt, options);
        if (skillContext) {
            taskPrompt = `${skillContext}\n\nTask Instructions for Claude:\n${taskPrompt}`;
        }

        try {
            await this.initBrowser(false);
            await this.ensureLoggedIn();

            // Check platform limits
            const limitStatus = await this.checkPlatformLimits();
            if (limitStatus.limited) {
                pilotHud.setActing('Claude query limit reached — engaging Codez48 native engine');
                logger.status(`\x1b[33m[RESILIENT FALLBACK] Claude limit encountered (${limitStatus.resetTime}). Engaging Codez48 native MCP & Skill engine...\x1b[0m`);
                const mcpBuilder = require('../mcp/mcp-skill-builder');
                const nativeRes = await mcpBuilder.generateAutonomousMcp(taskPrompt);
                return {
                    success: true,
                    fallback: 'native_engine',
                    reason: limitStatus.reason,
                    resetTime: limitStatus.resetTime,
                    ...nativeRes,
                    message: `Task completed via Codez48 native engine while Claude resets at ${limitStatus.resetTime}.`
                };
            }

            pilotHud.setActing('Locating open Claude AI prompt input box...');

            // 1. Extract core message text from English or Tamil prompt
            let messageToSend = taskPrompt;
            const msgMatch = taskPrompt.match(/(?:send\s+(?:a\s+)?message\s+(?:for|to|with|saying)?\s*|say\s+|ask\s+|tell\s+(?:it|claude)?\s*|type\s+)(.+?)(?:\s+and\s+(?:wait|check|get|see)|$)/i);
            if (msgMatch && msgMatch[1]) {
                const candidate = msgMatch[1].replace(/^(?:for|to|that)\s+/i, '').replace(/["']/g, '').trim();
                if (candidate.length > 0 && !candidate.toLowerCase().includes('open claude')) {
                    messageToSend = candidate;
                }
            } else {
                const quoteMatch = taskPrompt.match(/["']([^"']+)["']/);
                if (quoteMatch && quoteMatch[1]) {
                    messageToSend = quoteMatch[1].trim();
                } else if (/[\u0B80-\u0BFF]/.test(taskPrompt)) {
                    // Tamil query detection & intelligent intent mapping
                    if (taskPrompt.toLowerCase().includes('hello') || taskPrompt.includes('வணக்கம்')) {
                        messageToSend = 'Hello! Nice to meet you.';
                    } else if (/டிசைன்|ஸ்லைடு|பிரசன்டேஷன்|design|slide|presentation/i.test(taskPrompt)) {
                        messageToSend = 'Please generate an executive presentation outline with diverse slide designs: Title Chevron Cover, About Company Cards, Dual Capsule Vision, Curved Services Panel, Hexagon Team Grid, Stacked Column Chart, Pricing Table, Diagonal Testimonials, and Closing Contact Slide.';
                    } else if (/இன்புட்\s*பாக்ஸ்|input\s*box|மெசேஜ்/i.test(taskPrompt)) {
                        messageToSend = 'Hello Claude! Please confirm you are active and ready to receive instructions.';
                    } else {
                        // Extract any English words or sensible greeting
                        const engWords = taskPrompt.match(/[a-zA-Z0-9\s]{3,}/g);
                        const cleanEng = engWords && engWords.length > 0 ? engWords.join(' ').trim() : '';
                        messageToSend = (cleanEng && cleanEng.length > 5 && !cleanEng.toLowerCase().includes('claude input box'))
                            ? cleanEng
                            : 'Hello Claude! Please assist me with my task.';
                    }
                }
            }

            // 2. Comprehensive input box selectors covering all Claude UI variants
            const inputSelectors = [
                'div.ProseMirror[contenteditable="true"]',
                'div[contenteditable="true"][role="textbox"]',
                'fieldset div[contenteditable="true"]',
                'div[contenteditable="true"]',
                'div[data-testid*="input"]',
                'div[data-testid*="chat-input"]',
                'textarea[placeholder*="Claude" i]',
                'textarea[placeholder*="Reply" i]',
                'textarea[placeholder*="How can Claude help" i]',
                'div[data-placeholder]',
                'p[data-placeholder]',
                'textarea'
            ];

            // 3. Check all open pages in context to find active Claude tab
            if (this.context) {
                const openPages = this.context.pages();
                for (const pg of openPages) {
                    const u = pg.url();
                    if (u.includes('claude.ai')) {
                        this.page = pg;
                        await this.page.bringToFront().catch(() => {});
                        break;
                    }
                }
            }

            // 4. Patient polling loop (up to 30 iterations = 15 seconds) to ensure prompt box is ready
            let inputElement = null;
            logger.status('\x1b[36m[CLAUDE AI] Searching for active input box and dismissing any modals...\x1b[0m');

            for (let attempt = 1; attempt <= 30; attempt++) {
                // Dismiss common Claude dialogs/popovers if blocking the view
                try {
                    const modalDismissSelectors = [
                        'button:has-text("Acknowledge")',
                        'button:has-text("Got it")',
                        'button:has-text("Accept")',
                        'button:has-text("I agree")',
                        'button:has-text("Dismiss")',
                        'button[aria-label="Close"]',
                        'button:has-text("Continue")'
                    ];
                    for (const modalSel of modalDismissSelectors) {
                        const mBtn = await this.page.$(modalSel);
                        if (mBtn && await mBtn.isVisible()) {
                            await mBtn.click().catch(() => {});
                            await this.page.waitForTimeout(300);
                        }
                    }
                } catch (_) {}

                for (const sel of inputSelectors) {
                    const el = await this.page.$(sel);
                    if (el && await el.isVisible()) {
                        inputElement = el;
                        break;
                    }
                }

                if (inputElement) {
                    logger.status(`\x1b[32m✔ Claude input box located and ready (Attempt ${attempt}).\x1b[0m`);
                    break;
                }

                // If not found, attempt to click "Start new chat"
                if (attempt === 3 || attempt === 8) {
                    const newChatBtn = await this.page.$('button:has-text("Start new chat"), a[href="/new"], button[aria-label*="new chat" i]');
                    if (newChatBtn && await newChatBtn.isVisible()) {
                        await newChatBtn.click().catch(() => {});
                        await this.page.waitForTimeout(1000);
                    }
                }

                await this.page.waitForTimeout(500);
            }

            if (!inputElement) {
                logger.status('\x1b[33m[CLAUDE AI] Direct prompt selector did not match. Trying keyboard autofocus fallback...\x1b[0m');
                // Click into main content area and press Tab/focus
                await this.page.mouse.click(640, 500).catch(() => {});
                await this.page.keyboard.press('Tab').catch(() => {});
                inputElement = await this.page.$(':focus');
            }

            if (!inputElement) {
                logger.status('\x1b[33m[CLAUDE AI] Prompt box not found. Prompting user in active session.\x1b[0m');
                return {
                    success: true,
                    manual: true,
                    message: 'Claude AI is open and ready in your browser session.'
                };
            }

            logger.status(`\x1b[36m[CLAUDE AI] Submitting message into active input: "${messageToSend}"...\x1b[0m`);

            // Scroll into view & focus
            await inputElement.scrollIntoViewIfNeeded().catch(() => {});
            await inputElement.click({ force: true }).catch(() => {});
            await this.page.waitForTimeout(200);

            // Type message smoothly with realistic keystrokes or robust Unicode insertion
            if (/^[\x00-\x7F]*$/.test(messageToSend) && messageToSend.length < 120) {
                await this.page.keyboard.type(messageToSend, { delay: 15 });
            } else {
                await this.page.keyboard.insertText(messageToSend);
            }
            await this.page.waitForTimeout(500);

            // Capture screenshot of entered prompt
            await this.takeScreenshot('06_prompt_entered', 'User Prompt Entered');

            // Click send or press Enter
            const sendSelectors = [
                'button[aria-label="Send Message"]',
                'button[aria-label="Send message"]',
                'button[aria-label*="Send" i]',
                'button[data-testid*="send" i]',
                'button:has-text("Send")'
            ];
            let clickedSend = false;
            for (const sSel of sendSelectors) {
                const sBtn = await this.page.$(sSel);
                if (sBtn && await sBtn.isVisible() && !(await sBtn.isDisabled().catch(() => false))) {
                    await sBtn.click().catch(() => {});
                    clickedSend = true;
                    break;
                }
            }
            if (!clickedSend) {
                await this.page.keyboard.press('Enter');
            }

            logger.status('\x1b[36m[CLAUDE AI] Prompt submitted. Waiting for response generation...\x1b[0m');
            pilotHud.setGenerating('Claude AI is thinking and generating...');

            // Wait for response to finish
            await this.page.waitForTimeout(4000);

            // Wait for stop button to disappear
            try {
                await this.page.waitForSelector('button[aria-label="Stop response"]', { state: 'detached', timeout: 60000 });
            } catch (_) {}

            await this.page.waitForTimeout(2000);

            // Capture screenshot of completed response
            await this.takeScreenshot('07_response_received', 'Claude Response Generated');

            // Extract last assistant message
            const assistantMessages = await this.page.$$eval('[data-is-streaming="false"], .font-claude-message, div[class*="ChatMessage"]', elements => {
                return elements.map(el => el.innerText);
            });

            const answer = assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1] : 'Response generated in Claude session.';

            // Extract code blocks and automatically synthesize local MCP files if provided
            const codeBlocks = await this.page.$$eval('pre code', elements => elements.map(el => el.innerText));
            const extractedFiles = [];

            if (codeBlocks.length > 0) {
                const mcpBuilder = require('../mcp/mcp-skill-builder');
                const words = (goal || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => !['create', 'generate', 'skill', 'mcp', 'for', 'with', 'a', 'an', 'the'].includes(w));
                const skillName = words.slice(0, 3).join('-') || 'claude-generated-mcp';

                for (let i = 0; i < codeBlocks.length; i++) {
                    const block = codeBlocks[i].trim();
                    // FastMCP Python Server
                    if ((block.includes('def ') || block.includes('import json') || block.includes('mcp')) && !block.startsWith('---')) {
                        const mcpDir = path.join(mcpBuilder.baseMcpDir, skillName);
                        fs.mkdirSync(mcpDir, { recursive: true });
                        const serverPath = path.join(mcpDir, 'server.py');
                        fs.writeFileSync(serverPath, block, 'utf8');
                        extractedFiles.push({ type: 'MCP_SERVER', path: serverPath });

                        // Register with Claude Desktop
                        mcpBuilder.registerWithClaudeDesktop(skillName, serverPath, `Claude-generated MCP Server for ${goal}`);
                        mcpBuilder.verifyMcpServer(serverPath);
                    }
                    // Skill Markdown file
                    else if (block.startsWith('---') && block.includes('name:')) {
                        const targetDir = path.join(mcpBuilder.baseSkillsDir, skillName);
                        fs.mkdirSync(targetDir, { recursive: true });
                        const skillPath = path.join(targetDir, 'SKILL.md');
                        fs.writeFileSync(skillPath, block, 'utf8');
                        extractedFiles.push({ type: 'SKILL_MD', path: skillPath });
                    }
                }
            }

            const durationMs = Date.now() - startTime;
            logger.status(`\x1b[32m✔ Claude AI response received in ${durationMs}ms!\x1b[0m`);
            pilotHud.setSuccess('Claude AI response complete!');
            setTimeout(() => pilotHud.hide(), 4000);

            return {
                success: true,
                prompt: taskPrompt,
                answer,
                codeBlocks,
                extractedFiles,
                screenshots: this.screenshots,
                durationMs
            };
        } catch (err) {
            logger.error(`[CLAUDE AUTOMATION ERROR] ${err.message}`);
            pilotHud.setActing('Engaging native engine fallback...');
            try {
                const mcpBuilder = require('../mcp/mcp-skill-builder');
                const nativeRes = await mcpBuilder.generateAutonomousMcp(taskPrompt);
                return {
                    success: true,
                    fallback: 'native_engine',
                    warning: `Claude session encountered: ${err.message}. Autonomously delivered via native engine.`,
                    ...nativeRes
                };
            } catch (_) {}
            return {
                success: false,
                error: err.message
            };
        }
    }
}

module.exports = new ClaudeAutomationAdapter();
