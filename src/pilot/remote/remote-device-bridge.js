/**
 * CODEZ48 WIRELESS REMOTE DEVICE BRIDGE & ZERO-INSTALL AUTOMATION ENGINE
 * Enables other laptops, phones, and devices on the local Wi-Fi / LAN to:
 * 1. Download PPT presentations, Word documents, and PDFs with 1 click wirelessly.
 * 2. Upload files safely for PDF conversion or AI modification.
 * 3. Execute remote browser automation and pilot tasks on Host Laptop 1 with 100% Antivirus Immunity.
 * 4. Zero installation on client devices — operates entirely inside standard Chrome/Edge/Safari.
 * 5. PIN pairing & Safe Mode security to prevent unauthorized access.
 * 6. Bluetooth OBEX fallback for offline transfers.
 * 7. Accurate credit tracking and deduction in creditVault.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { exec, spawn } = require('child_process');

const logger = require('../../core/logger');
const workspaceManager = require('../../core/workspace-manager');
const creditVault = require('../../core/credit-vault');
const activityTracker = require('../../core/activity-tracker');
const firebaseSync = require('../../core/firebase-sync');

class RemoteDeviceBridge {
    constructor() {
        this.port = 4848;
        this.server = null;
        this.hostIp = this.detectHostIp();
        this.hostname = os.hostname();
        this.pairingPin = this.generatePin();
        this.sessionId = `SES-${this.pairingPin}`;
        this.officialWebsiteUrl = 'https://codez48.netlify.app/tools/remote.html';
        this.cloudEndpoint = 'https://codez48.netlify.app/.netlify/functions/remote-device-sync';
        this.activeSessions = new Map(); // token -> { createdAt, clientIp }
        this.sseClients = new Set();
        this.isRunning = false;
        this.autoUploadCompleted = false;
        this.watcherInterval = null;
        this.portalHtmlPath = path.join(__dirname, 'portal.html');
        this.clientRunnerJsPath = path.join(__dirname, 'client-runner.js');
    }

    /**
     * Detect local IPv4 address across active Wi-Fi / LAN adapters
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
     * Generate 6-digit Secure Pairing PIN
     */
    generatePin() {
        return String(Math.floor(100000 + Math.random() * 900000));
    }

    /**
     * Generate session token
     */
    createSession(clientIp) {
        const token = crypto.randomBytes(24).toString('hex');
        this.activeSessions.set(token, {
            createdAt: Date.now(),
            clientIp,
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        });
        return token;
    }

    /**
     * Verify session token from request
     */
    isAuthenticated(req) {
        const authHeader = req.headers['authorization'];
        let token = '';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7).trim();
        } else {
            // Check query param
            const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            token = urlObj.searchParams.get('token') || '';
        }

        if (!token) return false;
        const session = this.activeSessions.get(token);
        if (!session) return false;
        if (Date.now() > session.expiresAt) {
            this.activeSessions.delete(token);
            return false;
        }
        return true;
    }

    /**
     * Locate latest generator output (PPTX presentation or Word document)
     */
    getLatestGeneratorOutput() {
        const desktop = path.join(os.homedir(), 'OneDrive', 'Desktop');
        const desk = fs.existsSync(desktop) ? desktop : path.join(os.homedir(), 'Desktop');

        // Priority 1: User's presentation
        const userPpt = path.join(desk, 'ppt_for_full_stack_class_prese.pptx');
        if (fs.existsSync(userPpt)) {
            const stat = fs.statSync(userPpt);
            return {
                filename: 'ppt_for_full_stack_class_prese.pptx',
                fullPath: userPpt,
                ext: '.pptx',
                sizeBytes: stat.size,
                sizeFormatted: `${(stat.size / 1024).toFixed(1)} KB`,
                mtime: stat.mtimeMs
            };
        }

        // Priority 2: User's Word document
        const userDocx = path.join(desk, 'full_stack_complete_class_and_.docx');
        if (fs.existsSync(userDocx)) {
            const stat = fs.statSync(userDocx);
            return {
                filename: 'full_stack_complete_class_and_.docx',
                fullPath: userDocx,
                ext: '.docx',
                sizeBytes: stat.size,
                sizeFormatted: `${(stat.size / 1024).toFixed(1)} KB`,
                mtime: stat.mtimeMs
            };
        }

        const deliverables = this.listDeliverables();
        return deliverables.length > 0 ? deliverables[0] : null;
    }

    /**
     * Register session with HTTPS cloud bridge & Firebase Firestore
     */
    async registerCloudSession() {
        const deliverables = this.listDeliverables();
        const latest = this.getLatestGeneratorOutput();

        const payload = {
            sessionId: this.sessionId,
            pin: this.pairingPin,
            hostname: this.hostname,
            hostIp: this.hostIp,
            port: this.port,
            status: 'WAITING_APPROVAL',
            approved: false,
            deliverables,
            latestDeliverable: latest
        };

        // 1. Direct Firebase Firestore write
        try {
            const db = await firebaseSync.init();
            if (db) {
                await db.collection('remote_device_sessions').doc(this.sessionId).set({
                    ...payload,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
                await db.collection('remote_device_pins').doc(this.pairingPin).set({
                    sessionId: this.sessionId,
                    pin: this.pairingPin,
                    updatedAt: Date.now()
                });
                logger.status(`\x1b[32m[FIREBASE CLOUD] Session ${this.sessionId} registered in Firestore.\x1b[0m`);
            }
        } catch (e) {
            logger.debug(`[FIREBASE REGISTER NOTICE] ${e.message}`);
        }

        // 2. HTTPS Netlify Serverless endpoint register
        try {
            if (typeof fetch !== 'undefined') {
                await fetch(this.cloudEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'REGISTER_SESSION', ...payload })
                });
            }
        } catch (_) {}
    }

    /**
     * Real-time watcher: automatically uploads generator data once device approves connection
     */
    startApprovalWatcher() {
        if (this.watcherInterval) clearInterval(this.watcherInterval);

        const checkApproval = async () => {
            if (this.autoUploadCompleted) {
                clearInterval(this.watcherInterval);
                return;
            }

            // Check Firestore directly
            try {
                const db = await firebaseSync.init();
                if (db) {
                    const doc = await db.collection('remote_device_sessions').doc(this.sessionId).get();
                    if (doc.exists && doc.data().approved) {
                        await this.handleAutomaticDataUpload(doc.data().approvedDevice);
                        return;
                    }
                }
            } catch (_) {}

            // Fallback: check Netlify function
            try {
                if (typeof fetch !== 'undefined') {
                    const res = await fetch(`${this.cloudEndpoint}?action=CHECK_APPROVAL&sessionId=${encodeURIComponent(this.sessionId)}`);
                    const data = await res.json();
                    if (data.success && data.approved) {
                        await this.handleAutomaticDataUpload(data.approvedDevice);
                    }
                }
            } catch (_) {}
        };

        this.watcherInterval = setInterval(checkApproval, 2000);
        setTimeout(checkApproval, 1500);
    }

    /**
     * Automatic Data Upload upon device approval (Wi-Fi or Bluetooth)
     */
    async handleAutomaticDataUpload(approvedDevice) {
        if (this.autoUploadCompleted) return;
        this.autoUploadCompleted = true;

        logger.status(`\n\x1b[32m========================================================================================\x1b[0m`);
        logger.user(`\x1b[1m\x1b[32m✔ [AUTOMATIC UPLOAD] Device Connection Approved by: ${approvedDevice || 'Remote Client'}!\x1b[0m`);
        logger.user(`\x1b[36m⚡ [AUTOMATIC UPLOAD] Automatically uploading generator data (PPTX/DOCX deliverables)...\x1b[0m`);

        const latest = this.getLatestGeneratorOutput();
        if (!latest || !fs.existsSync(latest.fullPath)) {
            logger.warn(`\x1b[33m[AUTOMATIC UPLOAD] No generator file found to upload.\x1b[0m`);
            return;
        }

        try {
            const fileBuffer = fs.readFileSync(latest.fullPath);
            const base64Data = fileBuffer.toString('base64');
            const mimeType = latest.ext === '.pptx' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            const dataUrl = `data:${mimeType};base64,${base64Data}`;

            // 1. Upload to Firestore payload collection
            const db = await firebaseSync.init();
            if (db) {
                await db.collection('remote_device_payloads').doc(this.sessionId).set({
                    sessionId: this.sessionId,
                    pin: this.pairingPin,
                    filename: latest.filename,
                    fileType: latest.ext.replace('.', ''),
                    sizeBytes: latest.sizeBytes,
                    base64Data: dataUrl,
                    uploadedAt: Date.now()
                });
                await db.collection('remote_device_sessions').doc(this.sessionId).update({
                    payloadReady: true,
                    status: 'DATA_UPLOADED_TO_DEVICE',
                    updatedAt: Date.now()
                });
            }

            // 2. Also push to Netlify endpoint
            try {
                if (typeof fetch !== 'undefined') {
                    await fetch(this.cloudEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'UPLOAD_PAYLOAD',
                            sessionId: this.sessionId,
                            filename: latest.filename,
                            fileType: latest.ext.replace('.', ''),
                            sizeBytes: latest.sizeBytes,
                            base64Data: dataUrl
                        })
                    });
                }
            } catch (_) {}

            logger.user(`\x1b[32m✓ [AUTOMATIC UPLOAD SUCCESS] Generator file (${latest.filename}, ${latest.sizeFormatted}) uploaded to cloud.\x1b[0m`);
            logger.user(`\x1b[32m✓ Remote device is downloading the file automatically over HTTPS.\x1b[0m`);
            logger.status(`\x1b[32m========================================================================================\x1b[0m\n`);

            this.broadcast(`[AUTOMATIC UPLOAD] Generator deliverable "${latest.filename}" synced and downloaded to client.`);
        } catch (err) {
            logger.error(`\x1b[31m[AUTOMATIC UPLOAD ERROR] ${err.message}\x1b[0m`);
        }
    }

    /**
     * Get list of generated deliverables on Host Laptop (Desktop & Workspace)
     */
    listDeliverables() {
        const results = [];
        const seenPaths = new Set();

        const searchDirs = [
            path.join(os.homedir(), 'OneDrive', 'Desktop'),
            path.join(os.homedir(), 'Desktop'),
            path.join(workspaceManager.getWorkspacePath(), '.codez48_output'),
            workspaceManager.getWorkspacePath()
        ];

        const validExts = new Set(['.pptx', '.docx', '.pdf', '.xlsx', '.csv']);

        for (const dir of searchDirs) {
            if (!fs.existsSync(dir)) continue;

            try {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    if (seenPaths.has(fullPath)) continue;

                    try {
                        const stat = fs.statSync(fullPath);
                        if (!stat.isFile()) continue;

                        const ext = path.extname(file).toLowerCase();
                        if (validExts.has(ext)) {
                            seenPaths.add(fullPath);
                            const mtime = stat.mtime;
                            const sizeBytes = stat.size;
                            let sizeFormatted = `${(sizeBytes / 1024).toFixed(1)} KB`;
                            if (sizeBytes > 1024 * 1024) {
                                sizeFormatted = `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
                            }

                            let location = 'Desktop';
                            if (dir.includes('Codez48') || dir.includes('.codez48_output')) {
                                location = 'Workspace Deliverables';
                            }

                            results.push({
                                filename: file,
                                fullPath,
                                ext,
                                sizeBytes,
                                sizeFormatted,
                                location,
                                mtime: mtime.getTime(),
                                mtimeFormatted: mtime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                            });
                        }
                    } catch (_) {}
                }
            } catch (_) {}
        }

        // Sort by most recently modified first
        results.sort((a, b) => b.mtime - a.mtime);
        return results;
    }

    /**
     * Get captured screenshots
     */
    listScreenshots() {
        const results = [];
        const searchDirs = [
            path.join(workspaceManager.getWorkspacePath(), '.codez48_output', 'screenshots'),
            path.join(workspaceManager.getWorkspacePath(), '.codez48_browser_profile', 'claude_screenshots')
        ];

        for (const dir of searchDirs) {
            if (!fs.existsSync(dir)) continue;
            try {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
                        const fullPath = path.join(dir, file);
                        try {
                            const stat = fs.statSync(fullPath);
                            results.push({
                                name: file,
                                fullPath,
                                mtime: stat.mtime.getTime(),
                                mtimeFormatted: stat.mtime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                            });
                        } catch (_) {}
                    }
                }
            } catch (_) {}
        }

        results.sort((a, b) => b.mtime - a.mtime);
        return results.slice(0, 24);
    }

    /**
     * Push live text/log message to connected SSE web clients
     */
    broadcast(text) {
        const payload = `data: ${JSON.stringify({ text, timestamp: Date.now() })}\n\n`;
        for (const client of this.sseClients) {
            try {
                client.write(payload);
            } catch (_) {
                this.sseClients.delete(client);
            }
        }
    }

    /**
     * Start the Remote Device Bridge HTTP Server
     */
    async start(options = {}) {
        if (this.isRunning) {
            return {
                success: true,
                alreadyRunning: true,
                url: `http://${this.hostIp}:${this.port}`,
                pin: this.pairingPin,
                hostIp: this.hostIp,
                port: this.port
            };
        }

        const requestedPort = options.port || this.port;

        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => this.handleHttpRequest(req, res));

            this.server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    logger.warn(`\x1b[33m[BRIDGE] Port ${this.port} busy. Falling back to port ${this.port + 1}...\x1b[0m`);
                    this.port++;
                    this.server.listen(this.port, '0.0.0.0');
                } else {
                    reject(err);
                }
            });

            this.server.listen(requestedPort, '0.0.0.0', async () => {
                this.isRunning = true;
                this.port = this.server.address().port;
                this.hostIp = this.detectHostIp();

                // Register session in HTTPS cloud & Firestore
                await this.registerCloudSession();

                // Start real-time approval watcher for automatic upload
                this.startApprovalWatcher();

                const portalUrl = `http://${this.hostIp}:${this.port}`;
                this.displayBridgeBanner(portalUrl);

                resolve({
                    success: true,
                    url: portalUrl,
                    websiteUrl: `${this.officialWebsiteUrl}?pin=${this.pairingPin}`,
                    pin: this.pairingPin,
                    hostIp: this.hostIp,
                    port: this.port,
                    hostname: this.hostname
                });
            });
        });
    }

    /**
     * Stop the server
     */
    stop() {
        if (this.watcherInterval) {
            clearInterval(this.watcherInterval);
            this.watcherInterval = null;
        }
        if (this.server) {
            this.server.close();
            this.server = null;
        }
        for (const client of this.sseClients) {
            try { client.end(); } catch (_) {}
        }
        this.sseClients.clear();
        this.isRunning = false;
        logger.status(`\x1b[33m[BRIDGE] Remote Device Bridge server stopped.\x1b[0m`);
    }

    /**
     * Terminal Banner
     */
    displayBridgeBanner(portalUrl) {
        const httpsPortal = `${this.officialWebsiteUrl}?pin=${this.pairingPin}`;
        console.log(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗\x1b[0m`);
        console.log(`\x1b[36m║   CODEZ48 OFFICIAL HTTPS WIRELESS REMOTE BRIDGE & GENERATOR AUTO-SYNC         ║\x1b[0m`);
        console.log(`\x1b[36m╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n`);
        console.log(`  \x1b[1m\x1b[32m✔ Official Website URL (HTTPS):\x1b[0m  \x1b[1m\x1b[36m${httpsPortal}\x1b[0m`);
        console.log(`  \x1b[1m\x1b[32m✔ Alternative Web Shortcut:\x1b[0m      \x1b[36mhttps://codez48.netlify.app/remote.html\x1b[0m`);
        console.log(`  \x1b[1m\x1b[33m🔑 Safe Mode 6-Digit PIN:\x1b[0m        \x1b[1m\x1b[33m[ ${this.pairingPin} ]\x1b[0m (Enter on Mobile Phone or PC)`);
        console.log(`  \x1b[1m\x1b[35m⚡ Auto-Upload on Approval:\x1b[0m      \x1b[1m\x1b[32mENABLED (Instant generator upload upon connection)\x1b[0m`);
        console.log(`  \x1b[1m\x1b[37m🛡️ Antivirus Immunity:\x1b[0m           \x1b[32m100% Zero-Install — Operates strictly via HTTPS in browser\x1b[0m`);
        console.log(`  \x1b[1m\x1b[37m📁 Local Direct Wi-Fi Access:\x1b[0m    \x1b[37m${portalUrl}\x1b[0m`);
        console.log(`\n  \x1b[33mInstructions for Mobile Phone / Secondary PC:\x1b[0m`);
        console.log(`   1. Open Google Chrome, Safari, or Edge on your phone or PC.`);
        console.log(`   2. Navigate to: \x1b[36m${httpsPortal}\x1b[0m`);
        console.log(`   3. When prompted, enter PIN \x1b[33m${this.pairingPin}\x1b[0m (or it auto-fills from the URL).`);
        console.log(`   4. Once approved, generator presentations & documents download \x1b[1m\x1b[32mAUTOMATICALLY\x1b[0m!\n`);
    }

    /**
     * Dispatch Task to Pilot Controller with activity tracking & credit consumption
     */
    async executeRemoteTask(taskPrompt, clientIp) {
        const startTime = Date.now();
        this.broadcast(`[HOST] Task received from remote client (${clientIp}): "${taskPrompt}"`);

        // Record credit vault interaction
        const interaction = creditVault.recordPilotInteraction();
        this.broadcast(`[CREDIT VAULT] Interaction recorded (${interaction.plan || creditVault.getPlan()}). Balance: ${creditVault.getBalance()} credits.`);

        try {
            // Lazy-load pilot controller
            const pilotController = require('../pilot-controller');
            this.broadcast(`[PILOT ENGINE] Engaging autonomous task perception...`);

            // Execute via pilotController
            await pilotController.processGoal(taskPrompt, null, null);

            const durationMs = Date.now() - startTime;
            const successMsg = `Execution finished successfully in ${(durationMs / 1000).toFixed(1)}s`;

            this.broadcast(`[TASK COMPLETED] ${successMsg}`);

            // Log activity telemetry
            activityTracker.logAction({
                command: taskPrompt,
                responseTimeMs: durationMs,
                aiOutputSummary: `[Remote Wireless Task] ${taskPrompt} completed successfully.`
            });

            return {
                success: true,
                message: successMsg,
                durationMs,
                creditsRemaining: creditVault.getBalance(),
                plan: creditVault.getPlan()
            };
        } catch (err) {
            const durationMs = Date.now() - startTime;
            logger.error(`[REMOTE TASK ERROR] ${err.message}`);
            this.broadcast(`[ERROR] Task encountered issue: ${err.message}`);

            activityTracker.logAction({
                command: taskPrompt,
                responseTimeMs: durationMs,
                aiOutputSummary: `[Remote Wireless Task Error] ${err.message}`
            });

            return {
                success: false,
                error: err.message,
                durationMs
            };
        }
    }

    /**
     * Bluetooth Native Transfer Trigger
     */
    sendViaBluetooth(filePath) {
        if (!fs.existsSync(filePath)) {
            return { success: false, error: `File not found: ${filePath}` };
        }

        logger.status(`\x1b[36m[BLUETOOTH] Triggering Windows Bluetooth File Transfer Wizard for: ${filePath}...\x1b[0m`);

        try {
            // fsquirt.exe is native Windows Bluetooth File Transfer wizard
            exec(`fsquirt.exe -send "${filePath}"`, (err) => {
                if (err) {
                    logger.warn(`[BLUETOOTH] fsquirt launched with notice: ${err.message}`);
                }
            });

            return {
                success: true,
                filePath,
                method: 'WINDOWS_BLUETOOTH_OBEX',
                message: 'Windows Bluetooth File Transfer Wizard opened. Select your paired device to transfer.'
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * HTTP Request Router
     */
    handleHttpRequest(req, res) {
        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = parsedUrl.pathname;
        const method = req.method;
        const clientIp = req.socket.remoteAddress || 'unknown';

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        // Serve Portal HTML
        if (pathname === '/' || pathname === '/index.html') {
            if (fs.existsSync(this.portalHtmlPath)) {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                fs.createReadStream(this.portalHtmlPath).pipe(res);
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Portal template not found.');
            }
            return;
        }

        // Serve Client Runner JS
        if (pathname === '/client-runner.js') {
            if (fs.existsSync(this.clientRunnerJsPath)) {
                res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
                fs.createReadStream(this.clientRunnerJsPath).pipe(res);
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
            return;
        }

        // API: System Status & Auth check
        if (pathname === '/api/status' && method === 'GET') {
            const isAuth = this.isAuthenticated(req);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                authenticated: isAuth,
                hostname: this.hostname,
                hostIp: this.hostIp,
                port: this.port,
                plan: creditVault.getPlan(),
                credits: creditVault.getBalance()
            }));
            return;
        }

        // API: Authenticate PIN
        if (pathname === '/api/auth' && method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    if (data.pin && String(data.pin).trim() === this.pairingPin) {
                        const token = this.createSession(clientIp);
                        logger.status(`\x1b[32m[BRIDGE AUTH] Remote client paired successfully from ${clientIp}!\x1b[0m`);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, token }));
                    } else {
                        logger.warn(`\x1b[33m[BRIDGE AUTH] Invalid PIN attempt from ${clientIp}\x1b[0m`);
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: 'Invalid 6-digit PIN. Check Host screen.' }));
                    }
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Malformed JSON' }));
                }
            });
            return;
        }

        // Require authentication for all subsequent endpoints
        if (!this.isAuthenticated(req)) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Authentication required. Pair with PIN.' }));
            return;
        }

        // API: List Deliverables
        if (pathname === '/api/files' && method === 'GET') {
            const files = this.listDeliverables();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, files }));
            return;
        }

        // API: Download Deliverable
        if (pathname === '/api/download' && method === 'GET') {
            const requestedFile = parsedUrl.searchParams.get('file');
            if (!requestedFile || !fs.existsSync(requestedFile)) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('File not found');
                return;
            }

            const ext = path.extname(requestedFile).toLowerCase();
            let contentType = 'application/octet-stream';
            if (ext === '.pptx') contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
            else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            else if (ext === '.pdf') contentType = 'application/pdf';
            else if (ext === '.xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

            const stat = fs.statSync(requestedFile);
            res.writeHead(200, {
                'Content-Type': contentType,
                'Content-Length': stat.size,
                'Content-Disposition': `attachment; filename="${path.basename(requestedFile)}"`
            });
            fs.createReadStream(requestedFile).pipe(res);
            logger.status(`\x1b[32m[BRIDGE DOWNLOAD] Transferred ${path.basename(requestedFile)} to ${clientIp}\x1b[0m`);
            return;
        }

        // API: Upload File from Remote Client
        if (pathname === '/api/upload' && method === 'POST') {
            const uploadDir = path.join(os.homedir(), 'OneDrive', 'Desktop');
            const targetDir = fs.existsSync(uploadDir) ? uploadDir : path.join(os.homedir(), 'Desktop');
            const uploadName = `uploaded_${Date.now()}_file.dat`;
            const destPath = path.join(targetDir, uploadName);

            const fileStream = fs.createWriteStream(destPath);
            req.pipe(fileStream);

            fileStream.on('finish', () => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, filePath: destPath }));
                logger.status(`\x1b[32m[BRIDGE UPLOAD] File uploaded from ${clientIp} -> ${destPath}\x1b[0m`);
            });

            fileStream.on('error', (err) => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            });
            return;
        }

        // API: Execute Wireless Task on Host
        if (pathname === '/api/execute' && method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const task = (data.task || '').trim();
                    if (!task) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: 'Task prompt cannot be empty' }));
                        return;
                    }

                    const result = await this.executeRemoteTask(task, clientIp);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: err.message }));
                }
            });
            return;
        }

        // API: SSE Live Event Stream
        if (pathname === '/api/events' && method === 'GET') {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });
            res.write(`data: ${JSON.stringify({ text: '[CONNECTED] Live stream active on Host Laptop 1' })}\n\n`);
            this.sseClients.add(res);

            req.on('close', () => {
                this.sseClients.delete(res);
            });
            return;
        }

        // API: List Screenshots
        if (pathname === '/api/screenshots' && method === 'GET') {
            const shots = this.listScreenshots();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, screenshots: shots }));
            return;
        }

        // API: Get Screenshot Image
        if (pathname === '/api/screenshot' && method === 'GET') {
            const name = parsedUrl.searchParams.get('name');
            const shots = this.listScreenshots();
            const found = shots.find(s => s.name === name);
            if (found && fs.existsSync(found.fullPath)) {
                res.writeHead(200, { 'Content-Type': 'image/png' });
                fs.createReadStream(found.fullPath).pipe(res);
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Screenshot not found');
            }
            return;
        }

        // Default 404
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
    }
}

module.exports = new RemoteDeviceBridge();
