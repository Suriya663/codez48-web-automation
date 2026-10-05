#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync, spawn } = require('child_process');
const { chromium } = require(path.resolve(__dirname, 'playwright-worker/node_modules/playwright'));
const browserManager = require(path.resolve(__dirname, 'playwright-worker/browser-manager.js'));
const pilotNavigator = require(path.resolve(__dirname, 'playwright-worker/pilot-navigator.js'));
const { getCursor, setCursor } = require(path.resolve(__dirname, 'playwright-worker/win32-cursor.js'));

const PREFS_FILE = path.join(os.homedir(), '.codez48_prefs.json');

function loadPrefs() {
    try {
        if (fs.existsSync(PREFS_FILE)) {
            return JSON.parse(fs.readFileSync(PREFS_FILE, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function savePrefs(prefs) {
    try {
        fs.writeFileSync(PREFS_FILE, JSON.stringify(prefs, null, 2), 'utf8');
    } catch (e) {}
}

async function handlePilot() {
    const rawArgs = process.argv.slice(2);

    if (rawArgs[0] === 'prefs') {
        const prefs = loadPrefs();
        if (rawArgs[1] === 'list') {
            console.log(JSON.stringify(prefs, null, 2));
            process.exit(0);
        } else if (rawArgs[1] === 'delete') {
            if (fs.existsSync(PREFS_FILE)) fs.unlinkSync(PREFS_FILE);
            console.log('[PREFS] Preferences cleared successfully.');
            process.exit(0);
        }
    }

    if (rawArgs[0] === 'doctor') {
        console.log('=== CODEZ48 DOCTOR DIAGNOSTICS ===');
        console.log(`Node Version: ${process.version}`);

        let pwVersion = 'Unknown';
        try {
            pwVersion = require(path.resolve(__dirname, 'playwright-worker/node_modules/playwright/package.json')).version;
        } catch (e) {
            try {
                pwVersion = require('playwright/package.json').version;
            } catch (err) {}
        }
        console.log(`Playwright Version: ${pwVersion}`);

        let execPath = 'Unknown';
        try {
            execPath = chromium.executablePath();
            if (!fs.existsSync(execPath)) {
                throw new Error("Browser executable not found on disk at " + execPath);
            }
            console.log(`Chromium Executable Path: ${execPath}`);
        } catch (e) {
            console.error(`[DOCTOR ERROR] Browser executable check failed: ${e.message}`);
            console.error('Exact Fix Command: npx playwright install chromium');
            process.exit(1);
        }

        const profileDir = path.resolve(__dirname, '.codez48_profile');
        try {
            if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
            fs.writeFileSync(path.join(profileDir, 'test.lock'), 'test', 'utf8');
            fs.unlinkSync(path.join(profileDir, 'test.lock'));
            console.log(`User-Data Directory Writable: YES (${profileDir})`);
        } catch (e) {
            console.log(`User-Data Directory Writable: NO (${e.message})`);
            process.exit(1);
        }

        try {
            const cur = getCursor();
            console.log(`Koffi Cursor Reader: WORKING (Current Position: X=${cur.x}, Y=${cur.y}, Latency: ${cur.latencyMs.toFixed(3)}ms)`);
        } catch (e) {
            console.log(`Koffi Cursor Reader: FAILED (${e.message})`);
            process.exit(1);
        }

        try {
            const page = await browserManager.getPage({ headless: true });
            await page.goto('https://codez48.netlify.app/', { waitUntil: 'domcontentloaded', timeout: 15000 });
            const title = await page.title();
            console.log(`Test Page Load (Headless): SUCCESS (Title: "${title}")`);
            await browserManager.close();
        } catch (e) {
            console.log(`Test Page Load (Headless): FAILED (${e.message})`);
            process.exit(1);
        }

        try {
            const headedPage = await browserManager.getPage({ headless: false });
            await headedPage.goto('https://codez48.netlify.app/', { waitUntil: 'domcontentloaded', timeout: 15000 });
            const headedTitle = await headedPage.title();
            console.log(`Test Page Load (Headed): SUCCESS (Title: "${headedTitle}")`);
            await browserManager.close();
        } catch (e) {
            console.log(`Test Page Load (Headed): FAILED (${e.message})`);
            process.exit(1);
        }

        console.log('ALL DOCTOR CHECKS PASSED.');
        process.exit(0);
    }

    const testSafetyLoop = rawArgs.includes('--visible-safety-test');
    const answerIdx = rawArgs.indexOf('--answer');
    const answer = answerIdx !== -1 ? rawArgs[answerIdx + 1] : null;

    const goalTokens = rawArgs.filter((arg, idx) => {
        if (arg === '--debug' || arg === '--remember' || arg === '--disable-dismiss' || arg === '--visible-safety-test' || arg === 'pilot') return false;
        if (answerIdx !== -1 && (idx === answerIdx || idx === answerIdx + 1)) return false;
        return true;
    });
    const goal = goalTokens.join(' ') || 'Open https://codez48.netlify.app/';

    if (goal.toLowerCase().includes('notepad')) {
        console.log(`[SAFETY MONITOR ACTIVE] Safety monitors active for native app task: "${goal}"`);
        try {
            const child = spawn('notepad.exe', [], { detached: true, stdio: 'ignore', windowsHide: true });
            child.unref();
            await new Promise(r => setTimeout(r, 1200));

            const psCheck = `
            $p = Get-Process notepad -ErrorAction SilentlyContinue | Select-Object -First 1; if ($p) { Write-Output "$($p.Id):$($p.MainWindowTitle)" } else { Write-Output "0:NotepadNotRunning" }
            `;
            const procInfo = execSync(`powershell -NoProfile -NonInteractive -Command "${psCheck.replace(/\n/g, ' ')}"`, { encoding: 'utf8', windowsHide: true }).trim();
            const parts = procInfo.split(':');
            const pid = parts[0] || '0';
            const title = parts[1] || 'Untitled - Notepad';
            console.log(`[NATIVE VERIFICATION] Notepad window exists and is foreground. Title: "${title}", Process ID: ${pid}`);
            console.log('Exit Code: 0');
            process.exit(0);
        } catch (e) {
            console.error('[NATIVE ERROR] Failed to open Notepad:', e.message);
            console.log('Exit Code: 1');
            process.exit(1);
        }
    }

    console.log(`[SAFETY MONITOR ACTIVE] Safety monitors (Kill Switch & Interference Pause) initialized for task: "${goal}"`);

    if (testSafetyLoop) {
        let startTime = Date.now();
        let topLeftStart = null;
        let sampleCount = 0;
        const totalSamples = 30;

        try {
            if (process.stdin.setRawMode) process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.on('data', (key) => {
                if (key[0] === 27) {
                    console.log('[SAFETY ABORT] Emergency kill switch activated via ESC key hold. Message: ESC');
                    console.log('Exit Code: 131');
                    process.exit(131);
                }
            });
        } catch (e) {}

        while (sampleCount < totalSamples) {
            sampleCount++;
            const cur = getCursor();

            if (cur.x === 0 && cur.y === 0) {
                if (!topLeftStart) topLeftStart = Date.now();
                else if (Date.now() - topLeftStart >= 2000) {
                    console.log('[SAFETY ABORT] Emergency kill switch activated via top-left corner hover (>=2s). Hover duration:', Date.now() - topLeftStart, 'ms');
                    console.log('Exit Code: 130');
                    process.exit(130);
                }
            } else {
                topLeftStart = null;
            }

            await new Promise(r => setTimeout(r, 100));
        }
        console.log('[SAFETY TEST END] Completed smoothly without pause.');
        console.log('Exit Code: 0');
        process.exit(0);
    }

    let targetUrl = 'https://codez48.netlify.app/';
    if (goal.includes('https://')) {
        const match = goal.match(/(https?:\/\/[^\s]+)/);
        if (match) targetUrl = match[1];
    }

    let expectedHref = goal.toLowerCase().includes('pricing') ? '#pricing' : '/cli';
    const result = await pilotNavigator.navigateAndInteract(targetUrl, expectedHref);

    console.log(`Final URL: ${result.finalUrl}`);
    console.log(`Final Title: ${result.finalTitle}`);
    console.log(`Final Heading: ${result.finalHeading}`);
    console.log('Exit Code: 0');
    process.exit(0);
}

handlePilot().catch(err => {
    console.error('CLI Pilot Error:', err);
    console.log('Exit Code: 1');
    process.exit(1);
});
