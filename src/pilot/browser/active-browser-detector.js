/**
 * CODEZ48 ACTIVE BROWSER DETECTOR & RUNTIME LAUNCHER
 * Dynamically detects the user's primary/everyday active browser (Microsoft Edge vs Google Chrome vs Brave)
 * based on saved user preference, Windows Default Browser Registry, running OS processes, and profile modification recency.
 * 
 * Ensures:
 * - Real everyday browser is opened without "test mode" or "guest mode" flags.
 * - Existing logged-in sessions (Google, Claude, Microsoft) are natively accessible.
 * - One-time interactive user selection (Edge vs Chrome) remembered permanently in config.
 * - Prioritizes Microsoft Edge when chosen or actively used.
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('../../core/logger');

class ActiveBrowserDetector {
    constructor() {
        this.cachedActiveBrowser = null;
        this.cacheTimestamp = 0;
        this.CACHE_TTL = 30000; // 30 seconds
        this.configPath = path.join(os.homedir(), '.codez48_browser_config.json');
    }

    /**
     * Reads saved browser preference from disk.
     * @returns {'msedge'|'chrome'|'brave'|null}
     */
    getSavedBrowserPreference() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                if (data && data.preferredBrowser) {
                    return data.preferredBrowser;
                }
            }
        } catch (_) {}
        return null;
    }

    /**
     * Saves user browser preference permanently to disk.
     * @param {'msedge'|'chrome'|'brave'} channel
     */
    setSavedBrowserPreference(channel) {
        try {
            const data = fs.existsSync(this.configPath)
                ? JSON.parse(fs.readFileSync(this.configPath, 'utf8'))
                : {};
            data.preferredBrowser = channel;
            data.updatedAt = Date.now();
            fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2), 'utf8');
            this.cachedActiveBrowser = null; // Invalidate cache
            logger.status(`\x1b[32m✔ Browser preference saved: ${channel === 'msedge' ? 'Microsoft Edge' : 'Google Chrome'} (Remembered permanently)\x1b[0m`);
        } catch (e) {
            logger.debug(`Failed to save browser preference: ${e.message}`);
        }
    }

    /**
     * Prompts the user once to select their preferred logged-in browser, and saves it permanently.
     * If already chosen previously, skips immediately without asking.
     * @param {import('readline').Interface} rl
     */
    async ensureBrowserPreference(rl) {
        const saved = this.getSavedBrowserPreference();
        if (saved) return saved;

        if (!rl) return 'msedge'; // Default fallback when running non-interactively

        return new Promise((resolve) => {
            console.log(`\n\x1b[36m========================================================================================\x1b[0m`);
            console.log(`\x1b[1m\x1b[33m🌐 CODEZ48 ACTIVE BROWSER SELECTION\x1b[0m`);
            console.log(`Which browser do you use for your everyday logged-in accounts (Google, Claude, etc.)?`);
            console.log(`  [1] \x1b[1m\x1b[32mMicrosoft Edge\x1b[0m (Recommended)`);
            console.log(`  [2] \x1b[1m\x1b[34mGoogle Chrome\x1b[0m`);
            console.log(`\x1b[90m(Your selection will be remembered permanently so you will never be asked again)\x1b[0m`);
            console.log(`\x1b[36m========================================================================================\x1b[0m`);

            rl.question(`Select browser [1 for Edge, 2 for Chrome, default: 1]: `, (ans) => {
                const clean = (ans || '').trim();
                const choice = (clean === '2' || clean.toLowerCase().includes('chrome')) ? 'chrome' : 'msedge';
                this.setSavedBrowserPreference(choice);
                resolve(choice);
            });
        });
    }

    /**
     * Inspects Windows Registry, running processes, saved config, and profile activity.
     */
    detectActiveBrowser(forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && this.cachedActiveBrowser && (now - this.cacheTimestamp < this.CACHE_TTL)) {
            return this.cachedActiveBrowser;
        }

        const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'Local');
        const edgeDataDir = path.join(localAppData, 'Microsoft', 'Edge', 'User Data');
        const chromeDataDir = path.join(localAppData, 'Google', 'Chrome', 'User Data');
        const braveDataDir = path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data');

        // Check if user has explicitly saved a preference
        const savedPref = this.getSavedBrowserPreference();
        if (savedPref === 'msedge') {
            const detected = {
                channel: 'msedge',
                name: 'Microsoft Edge',
                command: 'msedge',
                processName: 'msedge.exe',
                userDataDir: edgeDataDir,
                profileName: 'Default',
                profileDir: path.join(edgeDataDir, 'Default'),
                isDefault: true,
                isRunning: true,
                score: 100,
                isSavedPreference: true
            };
            this.cachedActiveBrowser = detected;
            this.cacheTimestamp = now;
            return detected;
        } else if (savedPref === 'chrome') {
            const detected = {
                channel: 'chrome',
                name: 'Google Chrome',
                command: 'chrome',
                processName: 'chrome.exe',
                userDataDir: chromeDataDir,
                profileName: 'Default',
                profileDir: path.join(chromeDataDir, 'Default'),
                isDefault: true,
                isRunning: true,
                score: 100,
                isSavedPreference: true
            };
            this.cachedActiveBrowser = detected;
            this.cacheTimestamp = now;
            return detected;
        }

        // 1. Query Default Browser Association from Windows Registry
        let defaultProgId = null;
        try {
            const regOut = execSync('reg query "HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice" /v ProgId', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore'],
                timeout: 3000
            });
            const match = regOut.match(/ProgId\s+REG_SZ\s+(\S+)/);
            if (match) {
                defaultProgId = match[1].trim();
            }
        } catch (_) {}

        // 2. Query Running Browser Processes
        let edgeRunning = false;
        let chromeRunning = false;
        let braveRunning = false;
        try {
            const tasklist = execSync('tasklist /NH', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore'],
                timeout: 3000
            });
            edgeRunning = /msedge\.exe/i.test(tasklist);
            chromeRunning = /chrome\.exe/i.test(tasklist);
            braveRunning = /brave\.exe/i.test(tasklist);
        } catch (_) {}

        const getRecency = (userDataDir) => {
            let maxTime = 0;
            const candidateFiles = [
                path.join(userDataDir, 'Default', 'History'),
                path.join(userDataDir, 'Default', 'Preferences'),
                path.join(userDataDir, 'Default', 'Network', 'Cookies'),
                path.join(userDataDir, 'Default', 'Web Data'),
                path.join(userDataDir, 'Last Version')
            ];
            for (const file of candidateFiles) {
                try {
                    if (fs.existsSync(file)) {
                        const stats = fs.statSync(file);
                        if (stats.mtimeMs > maxTime) maxTime = stats.mtimeMs;
                    }
                } catch (_) {}
            }
            return maxTime;
        };

        const edgeRecency = getRecency(edgeDataDir);
        const chromeRecency = getRecency(chromeDataDir);
        const braveRecency = getRecency(braveDataDir);

        // 4. Scoring Algorithm (Edge prioritised by default)
        let edgeScore = 20; // Base edge preference
        let chromeScore = 0;
        let braveScore = 0;

        if (defaultProgId && /MSEdge/i.test(defaultProgId)) edgeScore += 50;
        else if (defaultProgId && /Chrome/i.test(defaultProgId)) chromeScore += 50;
        else if (defaultProgId && /Brave/i.test(defaultProgId)) braveScore += 50;

        if (edgeRunning) edgeScore += 30;
        if (chromeRunning) chromeScore += 30;
        if (braveRunning) braveScore += 30;

        const maxRecency = Math.max(edgeRecency, chromeRecency, braveRecency);
        if (maxRecency > 0) {
            if (edgeRecency === maxRecency) edgeScore += 40;
            else if (chromeRecency === maxRecency) chromeScore += 40;
            else if (braveRecency === maxRecency) braveScore += 40;
        }

        let detected = null;
        if (edgeScore >= chromeScore && edgeScore >= braveScore) {
            detected = {
                channel: 'msedge',
                name: 'Microsoft Edge',
                command: 'msedge',
                processName: 'msedge.exe',
                userDataDir: edgeDataDir,
                profileName: 'Default',
                profileDir: path.join(edgeDataDir, 'Default'),
                isDefault: /MSEdge/i.test(defaultProgId || ''),
                isRunning: edgeRunning,
                score: edgeScore
            };
        } else if (chromeScore >= braveScore) {
            detected = {
                channel: 'chrome',
                name: 'Google Chrome',
                command: 'chrome',
                processName: 'chrome.exe',
                userDataDir: chromeDataDir,
                profileName: 'Default',
                profileDir: path.join(chromeDataDir, 'Default'),
                isDefault: /Chrome/i.test(defaultProgId || ''),
                isRunning: chromeRunning,
                score: chromeScore
            };
        } else {
            detected = {
                channel: 'brave',
                name: 'Brave Browser',
                command: 'brave',
                processName: 'brave.exe',
                userDataDir: braveDataDir,
                profileName: 'Default',
                profileDir: path.join(braveDataDir, 'Default'),
                isDefault: /Brave/i.test(defaultProgId || ''),
                isRunning: braveRunning,
                score: braveScore
            };
        }

        this.cachedActiveBrowser = detected;
        this.cacheTimestamp = now;
        return detected;
    }

    /**
     * Gets the active browser object (cached or fresh)
     */
    getActiveBrowser() {
        return this.detectActiveBrowser(false);
    }

    /**
     * Opens a URL directly inside the user's active, everyday browser WITHOUT any test/guest mode flags.
     * Reuses their existing running browser window where they are already logged in to Claude/Google.
     */
    async launchInActiveBrowser(url = 'https://claude.ai', options = {}) {
        const browser = this.getActiveBrowser();
        const targetUrl = url || 'https://claude.ai';

        logger.status(`\x1b[36m[ACTIVE BROWSER LAUNCH] Launching URL in user's primary browser: ${browser.name} (${browser.command})...\x1b[0m`);
        logger.status(`\x1b[32m✔ Mode: Standard Everyday Profile (No test banners, no guest mode, active logged-in session)\x1b[0m`);

        return new Promise((resolve) => {
            const cmd = `start ${browser.command} "${targetUrl}"`;
            exec(cmd, (err) => {
                if (err) {
                    try {
                        execSync(`powershell -NoProfile -Command "Start-Process '${browser.command}' '${targetUrl}'"`, { stdio: 'ignore' });
                    } catch (_) {}
                }

                setTimeout(() => {
                    try {
                        const guiDriver = require('../drivers/gui-driver');
                        if (guiDriver && typeof guiDriver.focusWindow === 'function') {
                            guiDriver.focusWindow(browser.name) || guiDriver.focusWindow(browser.command);
                        }
                    } catch (_) {}
                }, 800);

                resolve({
                    success: true,
                    browser: browser.name,
                    channel: browser.channel,
                    command: browser.command,
                    url: targetUrl,
                    isNativeEverydaySession: true
                });
            });
        });
    }

    /**
     * Generates Playwright launch configuration aligned with the user's active everyday browser
     */
    getPlaywrightConfig(options = {}) {
        const browser = this.getActiveBrowser();
        const baseSessionDir = path.resolve(process.env.USERPROFILE || process.env.HOME || '.', '.codez48_browser_profile', `${browser.channel}_session`);

        try {
            fs.mkdirSync(baseSessionDir, { recursive: true });
        } catch (_) {}

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

        return {
            channel: browser.channel,
            browserName: browser.name,
            userDataDir: baseSessionDir,
            headless: options.headless || false,
            args: stealthArgs,
            ignoreDefaultArgs: ['--enable-automation'], // Crucial: removes test browser banner & flags
            viewport: { width: 1280, height: 800 },
            userAgent: browser.channel === 'msedge'
                ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'
                : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        };
    }
}

module.exports = new ActiveBrowserDetector();
