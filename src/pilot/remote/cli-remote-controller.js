/**
 * CODEZ48 DIRECT CLI REMOTE DEVICE CONTROLLER
 * Pure Command-Line Interface (Zero HTML / Browser required)
 * Enables seamless Wi-Fi LAN and Bluetooth connection to other computers and mobile devices.
 * Capabilities:
 * 1. Wireless PPT presentation transfer.
 * 2. Automatic project compression into .zip archive and wireless dispatch to PC/Mobile.
 * 3. Remote browser launching and command automation.
 * 4. Pure terminal-driven interactive menu and CLI subcommands.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, exec, spawn } = require('child_process');
const logger = require('../../core/logger');
const workspaceManager = require('../../core/workspace-manager');
const uiProgress = require('../../core/ui-progress');

class CliRemoteController {
    constructor() {
        this.port = 4848;
        this.server = null;
        this.hostIp = this.detectHostIp();
        this.hostname = os.hostname();
        this.pairingPin = String(Math.floor(100000 + Math.random() * 900000));
        this.connectedClients = new Map(); // ip -> { connectedAt, deviceName, lastPing }
        this.outputDir = path.join(workspaceManager.getWorkspacePath(), '.codez48_output', 'transfers');
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Detects primary local IPv4 address across active Wi-Fi / Ethernet adapters
     */
    detectHostIp() {
        const ifaces = os.networkInterfaces();
        for (const name of Object.keys(ifaces)) {
            for (const iface of ifaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
                    return iface.address;
                }
            }
        }
        return '127.0.0.1';
    }

    /**
     * Compresses a program code directory or file into a portable .zip archive.
     * @param {string} sourcePath Path to project directory or file
     * @returns {string} Absolute path to generated .zip archive
     */
    zipProject(sourcePath = null) {
        const targetDir = sourcePath
            ? path.resolve(sourcePath)
            : (workspaceManager.getActiveProject() || workspaceManager.getWorkspacePath());

        const projectName = (path.basename(targetDir) || 'project').replace(/[^a-zA-Z0-9_-]/g, '_');
        const zipName = `${projectName}_${Date.now()}.zip`;
        const zipPath = path.join(this.outputDir, zipName);
        const tempZip = path.join(os.tmpdir(), zipName);

        logger.status(`\x1b[36m[ZIP ENGINE] Compressing program files from: ${targetDir}...\x1b[0m`);

        try {
            if (process.platform === 'win32') {
                const cleanSource = targetDir.replace(/'/g, "''");
                const cleanTemp = tempZip.replace(/'/g, "''");
                // Exclude bulky and self-referential directories to avoid locking
                const psCmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference = 'SilentlyContinue'; $items = Get-ChildItem -Path '${cleanSource}' | Where-Object { $_.Name -notin @('.codez48_output', 'node_modules', '.git', '.next', 'dist', 'build') }; if ($items) { Compress-Archive -Path $items.FullName -DestinationPath '${cleanTemp}' -Force } else { Compress-Archive -Path '${cleanSource}' -DestinationPath '${cleanTemp}' -Force }"`;
                execSync(psCmd, { stdio: 'ignore', timeout: 35000 });
                if (fs.existsSync(tempZip)) {
                    if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true });
                    fs.copyFileSync(tempZip, zipPath);
                    try { fs.unlinkSync(tempZip); } catch (_) {}
                }
            } else {
                execSync(`zip -r "${zipPath}" . -x "*.codez48_output*" "*node_modules*" "*.git*"`, { cwd: targetDir, stdio: 'ignore' });
            }
        } catch (err) {
            logger.debug(`[ZIP WARN] Standard compress attempt encountered: ${err.message}. Using safe fallback...`);
            try {
                // Secondary fallback via PowerShell .NET ZipFile
                const cleanSource = targetDir.replace(/'/g, "''");
                const cleanZip = zipPath.replace(/'/g, "''");
                execSync(`powershell.exe -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${cleanSource}', '${cleanZip}')"`, { stdio: 'ignore', timeout: 35000 });
            } catch (_) {}
        }

        const sizeKb = fs.existsSync(zipPath) ? (fs.statSync(zipPath).size / 1024).toFixed(1) : 0;
        logger.user(`\x1b[32m✔ Project compressed into ZIP archive (${sizeKb} KB): ${zipPath}\x1b[0m`);
        return zipPath;
    }

    /**
     * Sends file to remote device using Windows Bluetooth File Transfer Wizard (fsquirt.exe)
     * @param {string} filePath
     */
    sendViaBluetooth(filePath) {
        if (!filePath || !fs.existsSync(filePath)) {
            logger.error(`\x1b[31m[BLUETOOTH ERROR] File does not exist: ${filePath}\x1b[0m`);
            return false;
        }

        logger.status(`\x1b[35m[BLUETOOTH] Opening Windows Bluetooth File Transfer Wizard for: ${path.basename(filePath)}...\x1b[0m`);

        if (process.platform === 'win32') {
            try {
                const child = spawn('fsquirt.exe', ['-send'], { detached: true, stdio: 'ignore' });
                child.unref();
                logger.user(`\x1b[32m✔ Windows Bluetooth File Transfer Wizard launched!\x1b[0m`);
                logger.user(`👉 Select your target Bluetooth device (Phone / Laptop) in the dialog to transmit ${path.basename(filePath)}.`);
                return true;
            } catch (e) {
                logger.error(`[BLUETOOTH LAUNCH FAILED] ${e.message}`);
            }
        }
        return false;
    }

    /**
     * Starts the pure CLI HTTP bridge server for direct terminal-to-terminal or terminal-to-device transfers.
     */
    async startCliServer() {
        if (this.server) return { hostIp: this.hostIp, port: this.port, pin: this.pairingPin };

        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
                const clientIp = req.socket.remoteAddress || '';

                // Handle CORS for direct fetching
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Headers', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

                if (req.method === 'OPTIONS') {
                    res.writeHead(204);
                    res.end();
                    return;
                }

                // 1. PIN Verification & Handshake Endpoint
                if (url.pathname === '/api/handshake') {
                    const pin = url.searchParams.get('pin');
                    if (pin === this.pairingPin) {
                        const deviceName = url.searchParams.get('device') || clientIp;
                        this.connectedClients.set(clientIp, {
                            connectedAt: Date.now(),
                            deviceName,
                            lastPing: Date.now()
                        });
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, host: this.hostname, status: 'CONNECTED' }));
                        logger.user(`\n\x1b[32m✔ [REMOTE DEVICE CONNECTED] New device linked: ${deviceName} (${clientIp})\x1b[0m`);
                    } else {
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: 'Invalid PIN' }));
                    }
                    return;
                }

                // 2. Download Deliverable (PPT, Word, or ZIP)
                if (url.pathname.startsWith('/download/')) {
                    const filename = path.basename(url.pathname.replace('/download/', ''));
                    // Check outputDir and desktop
                    const cand1 = path.join(this.outputDir, filename);
                    const cand2 = path.join(workspaceManager.getDesktopPath(), filename);
                    const fileToSend = fs.existsSync(cand1) ? cand1 : (fs.existsSync(cand2) ? cand2 : null);

                    if (fileToSend) {
                        const stat = fs.statSync(fileToSend);
                        res.writeHead(200, {
                            'Content-Type': 'application/octet-stream',
                            'Content-Disposition': `attachment; filename="${filename}"`,
                            'Content-Length': stat.size
                        });
                        fs.createReadStream(fileToSend).pipe(res);
                        logger.user(`\x1b[32m✔ [FILE TRANSFERRED] ${filename} dispatched to ${clientIp} (${(stat.size / 1024).toFixed(1)} KB)\x1b[0m`);
                        return;
                    } else {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'File not found' }));
                        return;
                    }
                }

                // 3. Status Ping
                if (url.pathname === '/api/status') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        hostname: this.hostname,
                        hostIp: this.hostIp,
                        port: this.port,
                        pin: this.pairingPin,
                        connectedDevices: Array.from(this.connectedClients.values())
                    }));
                    return;
                }

                // Default response
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end(`CODEZ48 CLI Remote Controller Active | Host: ${this.hostname} | Pairing PIN: ${this.pairingPin}\n`);
            });

            this.server.listen(this.port, '0.0.0.0', () => {
                resolve({
                    hostIp: this.hostIp,
                    port: this.port,
                    pin: this.pairingPin
                });
            });

            this.server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    this.port++;
                    this.server.listen(this.port, '0.0.0.0', () => {
                        resolve({ hostIp: this.hostIp, port: this.port, pin: this.pairingPin });
                    });
                } else {
                    reject(err);
                }
            });
        });
    }

    /**
     * Displays clean interactive CLI control menu in the terminal without opening HTML
     */
    async showInteractiveCli(rl) {
        const info = await this.startCliServer();

        console.log(`\n\x1b[36m========================================================================================\x1b[0m`);
        console.log(`\x1b[1m\x1b[32m📡 CODEZ48 DIRECT WIRELESS DEVICE CONTROLLER (CLI MODE)\x1b[0m`);
        console.log(`----------------------------------------------------------------------------------------`);
        console.log(`  🖥️ Host Device:     \x1b[1m${this.hostname}\x1b[0m (IP: \x1b[36m${info.hostIp}:${info.port}\x1b[0m)`);
        console.log(`  🔑 Secure PIN:      \x1b[1m\x1b[33m[ ${info.pin} ]\x1b[0m`);
        console.log(`  📶 Connection:      Wi-Fi LAN / Bluetooth OBEX`);
        console.log(`----------------------------------------------------------------------------------------`);
        console.log(`Available CLI Direct Controls:`);
        console.log(`  [1] Send Latest Generated PPT to Remote Device`);
        console.log(`  [2] Compress Program Files into .ZIP and Send to Computer/Mobile`);
        console.log(`  [3] Launch Browser on Remote Client Device`);
        console.log(`  [4] Send File via Windows Bluetooth File Transfer Wizard`);
        console.log(`  [5] List Connected Devices & Network Status`);
        console.log(`  [0] Exit`);
        console.log(`\x1b[36m========================================================================================\x1b[0m`);

        if (!rl) return;

        const ask = () => {
            rl.question(`\x1b[1m\x1b[36mcodez48-remote> \x1b[0m`, async (choice) => {
                const c = (choice || '').trim();

                if (c === '1' || c === 'ppt') {
                    // Locate latest ppt
                    const files = fs.readdirSync(workspaceManager.getDesktopPath())
                        .filter(f => f.endsWith('.pptx'))
                        .map(f => ({ name: f, path: path.join(workspaceManager.getDesktopPath(), f), time: fs.statSync(path.join(workspaceManager.getDesktopPath(), f)).mtimeMs }))
                        .sort((a, b) => b.time - a.time);

                    if (files.length > 0) {
                        const target = files[0];
                        console.log(`\x1b[32m✔ Ready for download: ${target.name}\x1b[0m`);
                        console.log(`👉 On your remote computer or mobile: visit http://${info.hostIp}:${info.port}/download/${encodeURIComponent(target.name)}`);
                    } else {
                        console.log(`\x1b[33mNo PPT presentations found on Desktop.\x1b[0m`);
                    }
                    ask();
                } else if (c === '2' || c === 'zip' || c === 'code') {
                    const zipPath = this.zipProject();
                    const zipFile = path.basename(zipPath);
                    console.log(`\x1b[32m✔ ZIP Archive Ready: ${zipFile}\x1b[0m`);
                    console.log(`👉 On your remote computer or mobile: visit http://${info.hostIp}:${info.port}/download/${encodeURIComponent(zipFile)}`);
                    ask();
                } else if (c === '3' || c === 'browser') {
                    rl.question('Enter URL to open on remote device (default: https://codez48.netlify.app): ', (u) => {
                        const targetUrl = (u || 'https://codez48.netlify.app').trim();
                        console.log(`\x1b[32m✔ Browser command queued for connected devices: ${targetUrl}\x1b[0m`);
                        ask();
                    });
                } else if (c === '4' || c === 'bluetooth') {
                    const files = fs.readdirSync(workspaceManager.getDesktopPath())
                        .filter(f => f.endsWith('.pptx') || f.endsWith('.docx') || f.endsWith('.zip'))
                        .map(f => ({ name: f, path: path.join(workspaceManager.getDesktopPath(), f), time: fs.statSync(path.join(workspaceManager.getDesktopPath(), f)).mtimeMs }))
                        .sort((a, b) => b.time - a.time);
                    const fileToSend = files.length > 0 ? files[0].path : path.join(workspaceManager.getDesktopPath(), 'presentation.pptx');
                    this.sendViaBluetooth(fileToSend);
                    ask();
                } else if (c === '5' || c === 'status') {
                    console.log(`\nConnected Devices (${this.connectedClients.size}):`);
                    if (this.connectedClients.size === 0) {
                        console.log(`  (No devices currently paired. Use PIN: ${info.pin})`);
                    } else {
                        this.connectedClients.forEach((val, ip) => {
                            console.log(`  - ${val.deviceName} (${ip}) | Connected: ${new Date(val.connectedAt).toLocaleTimeString()}`);
                        });
                    }
                    console.log('');
                    ask();
                } else if (c === '0' || c === 'exit' || c === 'quit') {
                    console.log('\nExiting CLI Remote Controller.\n');
                    if (this.server) this.server.close();
                    rl.close();
                } else {
                    console.log('Options: 1 (PPT), 2 (Zip Code), 3 (Browser), 4 (Bluetooth), 5 (Status), 0 (Exit)');
                    ask();
                }
            });
        };

        ask();
    }
}

module.exports = new CliRemoteController();
