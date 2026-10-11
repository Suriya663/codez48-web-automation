const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getCursor } = require('./win32-cursor');

class OsCapabilityRegistry {
    async runFullCapabilityProbe() {
        console.log('[CAPABILITY REGISTRY] Executing genuine runtime capability probes...');

        const system = this.probeOsSystem();
        const runtimes = this.probeRuntimes();
        const display = this.probeDisplayAndSession();
        const uiAutomation = this.probeUiAutomation();
        const filesystem = this.probeFilesystemAccess();
        const android = this.probeAndroidTools();
        const runningApps = this.probeRunningApplications();

        const capabilities = {
            os_platform: system.platform === 'win32' ? 'SUPPORTED' : 'PARTIALLY_SUPPORTED',
            browser_automation: runtimes.playwrightInstalled ? 'SUPPORTED' : 'UNAVAILABLE',
            filesystem_operations: filesystem.desktopWritable ? 'SUPPORTED' : 'BLOCKED',
            native_ui_automation: uiAutomation.cursorReaderWorking ? 'SUPPORTED' : 'UNAVAILABLE',
            python_integration: runtimes.pythonAvailable ? 'SUPPORTED' : 'UNAVAILABLE',
            metatrader5_bridge: runtimes.mt5ModuleInstalled ? 'SUPPORTED' : 'UNAVAILABLE',
            android_adb_tools: android.adbAvailable ? 'SUPPORTED' : 'UNAVAILABLE'
        };

        return {
            timestamp: new Date().toISOString(),
            capabilities,
            system,
            runtimes,
            display,
            uiAutomation,
            filesystem,
            android,
            runningApps
        };
    }

    probeOsSystem() {
        return {
            platform: process.platform,
            type: os.type(),
            release: os.release(),
            arch: os.arch(),
            hostname: os.hostname(),
            cpuCount: os.cpus().length,
            totalMemMB: Math.round(os.totalmem() / (1024 * 1024)),
            freeMemMB: Math.round(os.freemem() / (1024 * 1024))
        };
    }

    probeRuntimes() {
        let pythonAvailable = false;
        let pythonVersion = 'Unavailable';
        let mt5ModuleInstalled = false;
        let mt5Version = 'None';
        let docxModuleInstalled = false;
        let pptxModuleInstalled = false;

        try {
            const pyVer = execSync('python --version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
            pythonAvailable = true;
            pythonVersion = pyVer;
        } catch (e) {}

        if (pythonAvailable) {
            try {
                mt5Version = execSync('python -c "import MetaTrader5 as mt5; print(mt5.__version__)"', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
                mt5ModuleInstalled = true;
            } catch (e) {}
        }

        try {
            require.resolve('docx');
            docxModuleInstalled = true;
        } catch (e) {}

        try {
            require.resolve('pptxgenjs');
            pptxModuleInstalled = true;
        } catch (e) {}

        let playwrightInstalled = false;
        let playwrightVersion = 'Unknown';
        try {
            playwrightVersion = require('playwright/package.json').version;
            playwrightInstalled = true;
        } catch (e) {
            try {
                playwrightVersion = require(path.resolve(__dirname, 'node_modules/playwright/package.json')).version;
                playwrightInstalled = true;
            } catch (err) {}
        }

        return {
            nodeVersion: process.version,
            pythonAvailable,
            pythonVersion,
            playwrightInstalled,
            playwrightVersion,
            mt5ModuleInstalled,
            mt5Version,
            docxModuleInstalled,
            pptxModuleInstalled
        };
    }

    probeDisplayAndSession() {
        let isHeadlessSession = !process.env.DISPLAY && process.platform !== 'win32' && process.platform !== 'darwin';
        let sessionType = process.platform === 'win32' ? 'Windows Desktop Session' : process.env.XDG_SESSION_TYPE || 'GUI Desktop';

        return {
            isHeadlessSession,
            sessionType,
            displayEnv: process.env.DISPLAY || 'Win32 Desktop Default'
        };
    }

    probeUiAutomation() {
        let cursorReaderWorking = false;
        let cursorPosition = null;
        let latencyMs = 0;

        try {
            const cur = getCursor();
            cursorReaderWorking = typeof cur.x === 'number' && typeof cur.y === 'number';
            cursorPosition = { x: cur.x, y: cur.y };
            latencyMs = cur.latencyMs || 0;
        } catch (e) {}

        return {
            provider: process.platform === 'win32' ? 'Win32 UI Automation & Koffi Cursor Reader' : 'X11 / AT-SPI Provider',
            cursorReaderWorking,
            cursorPosition,
            latencyMs
        };
    }

    probeFilesystemAccess() {
        const home = os.homedir();
        const desktop = path.join(home, 'Desktop');
        const documents = path.join(home, 'Documents');
        const downloads = path.join(home, 'Downloads');

        let desktopWritable = false;
        try {
            if (!fs.existsSync(desktop)) fs.mkdirSync(desktop, { recursive: true });
            const testFile = path.join(desktop, `.perm_test_${Date.now()}`);
            fs.writeFileSync(testFile, 'test', 'utf8');
            fs.unlinkSync(testFile);
            desktopWritable = true;
        } catch (e) {}

        return {
            homeDir: home,
            desktopDir: desktop,
            desktopWritable,
            documentsDir: documents,
            downloadsDir: downloads
        };
    }

    probeAndroidTools() {
        let adbAvailable = false;
        let adbPath = '';

        try {
            const whichCmd = process.platform === 'win32' ? 'where adb' : 'which adb';
            adbPath = execSync(whichCmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\r\n')[0];
            if (adbPath && fs.existsSync(adbPath)) adbAvailable = true;
        } catch (e) {}

        if (!adbAvailable) {
            const cand = path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk', 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
            if (fs.existsSync(cand)) {
                adbAvailable = true;
                adbPath = cand;
            }
        }

        return {
            adbAvailable,
            adbPath: adbPath || 'Not Found',
            androidHome: process.env.ANDROID_HOME || path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk')
        };
    }

    probeRunningApplications() {
        let runningProcs = [];
        if (process.platform === 'win32') {
            try {
                const psCmd = `powershell -NoProfile -NonInteractive -Command "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -First 10 ProcessName, Id, MainWindowTitle | ConvertTo-Json"`;
                const jsonStr = execSync(psCmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
                const parsed = JSON.parse(jsonStr);
                runningProcs = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {}
        }
        return runningProcs;
    }
}

module.exports = new OsCapabilityRegistry();
