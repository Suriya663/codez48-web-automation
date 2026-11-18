/**
 * CODEZ48 MOBILE MOUSE & PILOT REALTIME BRIDGE
 * Connects Android Mobile App to Laptop Pilot with:
 * 1. High-frequency touchpad cursor tracking & clicks
 * 2. Gyroscope air-mouse 3D motion tracking (even when minimized)
 * 3. Mobile AI Prompt execution & terminal relay
 * 4. Automatic device linking & status broadcast
 */

const http = require('http');
const os = require('os');
const WebSocket = require('ws');
const guiDriver = require('../drivers/gui-driver');
const logger = require('../../core/logger');

class MobileMouseBridge {
    constructor(port = 4849) {
        this.port = port;
        this.server = null;
        this.wss = null;
        this.isRunning = false;
        this.hostIp = this.detectHostIp();
        this.agentController = null;
    }

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

    start(agentControllerRef) {
        if (this.isRunning) return;
        this.agentController = agentControllerRef;

        this.server = http.createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }

            const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

            // DIRECT APK DOWNLOAD TO MOBILE (One-tap over Wi-Fi)
            if (url.pathname === '/download' || url.pathname === '/Codez48Pilot.apk' || url.pathname === '/apk') {
                const fs = require('fs');
                const path = require('path');
                const apkPath = path.join(os.homedir(), 'OneDrive', 'Desktop', 'Codez48Pilot.apk');
                if (fs.existsSync(apkPath)) {
                    const stat = fs.statSync(apkPath);
                    res.writeHead(200, {
                        'Content-Type': 'application/vnd.android.package-archive',
                        'Content-Length': stat.size,
                        'Content-Disposition': 'attachment; filename="Codez48Pilot.apk"'
                    });
                    fs.createReadStream(apkPath).pipe(res);
                    return;
                }
            }

            // STATUS
            if (url.pathname === '/api/status') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'ONLINE',
                    hostname: os.hostname(),
                    hostIp: this.hostIp,
                    port: this.port,
                    pilotActive: true,
                    timestamp: Date.now()
                }));
                return;
            }

            // MOUSE CONTROL
            if (url.pathname === '/api/mouse' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => {
                    try {
                        const data = JSON.parse(body || '{}');
                        this.handleMouseAction(data);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    } catch (e) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: e.message }));
                    }
                });
                return;
            }

            // WHATSAPP AUTOMATION TRIGGER (Opens WhatsApp Desktop on Laptop)
            if (url.pathname === '/api/whatsapp' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => {
                    try {
                        const data = JSON.parse(body || '{}');
                        const phone = (data.phone || '918248482844').replace(/\D/g, '');
                        const message = encodeURIComponent(data.message || 'I am connected this automation tool');
                        logger.status(`[WHATSAPP AUTOMATION] Opening WhatsApp Desktop on laptop for +${phone}...`);
                        
                        const { exec } = require('child_process');
                        exec(`start whatsapp://send?phone=${phone}^&text=${message}`, (err) => {
                            if (err) {
                                exec(`start https://web.whatsapp.com/send?phone=${phone}^&text=${message}`);
                            }
                        });

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, target: phone, message: data.message }));
                    } catch (e) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: e.message }));
                    }
                });
                return;
            }

            // PILOT GOAL EXECUTION
            if (url.pathname === '/api/execute' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', async () => {
                    try {
                        const data = JSON.parse(body || '{}');
                        const goal = data.goal;
                        if (!goal) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: 'Goal is required' }));
                            return;
                        }

                        logger.status(`[MOBILE REMOTE PILOT] Executing: "${goal}"`);
                        let answer = 'Execution completed';

                        if (this.agentController && typeof this.agentController.processGoal === 'function') {
                            const result = await this.agentController.processGoal(goal, [], null, null);
                            if (result && result.answer) answer = result.answer;
                            else if (result && result.message) answer = result.message;
                            else if (typeof result === 'string') answer = result;
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, answer }));
                    } catch (e) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: e.message }));
                    }
                });
                return;
            }

            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Endpoint not found' }));
        });

        // WEBSOCKET SERVER FOR REALTIME MOUSE & GYRO
        this.wss = new WebSocket.Server({ server: this.server });
        this.wss.on('connection', (ws) => {
            logger.info(`[MOBILE BRIDGE] Mobile app connected via WebSocket.`);
            ws.send(JSON.stringify({ type: 'CONNECTED', host: os.hostname(), ip: this.hostIp }));

            ws.on('message', (msg) => {
                try {
                    const data = JSON.parse(msg);
                    if (data.type === 'MOUSE') {
                        this.handleMouseAction(data);
                    } else if (data.type === 'GYRO') {
                        this.handleGyroAction(data);
                    } else if (data.type === 'PING') {
                        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
                    }
                } catch (_) {}
            });
        });

        this.server.listen(this.port, '0.0.0.0', () => {
            this.isRunning = true;
            logger.status(`[MOBILE BRIDGE] Online at http://${this.hostIp}:${this.port} (WebSocket ready)`);
        });

        this.server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                this.port++;
                this.server.listen(this.port, '0.0.0.0');
            }
        });
    }

    handleMouseAction(data) {
        const { action = 'move', dx = 0, dy = 0, speed = 1.5 } = data;
        const currentPos = guiDriver.getCursorPos();

        if (action === 'move') {
            const nextX = Math.round(currentPos.x + (dx * speed));
            const nextY = Math.round(currentPos.y + (dy * speed));
            guiDriver.setCursorPos(nextX, nextY);
        } else if (action === 'click' || action === 'left_click') {
            guiDriver.click();
        } else if (action === 'right_click') {
            guiDriver.rightClick();
        } else if (action === 'double_click') {
            guiDriver.doubleClick();
        } else if (action === 'scroll') {
            const scrollAmount = Math.round((dy || data.deltaY || 0) * 10);
            if (guiDriver.scroll) guiDriver.scroll(scrollAmount);
        }
    }

    handleGyroAction(data) {
        // Gyroscope delta: pitch (beta), roll (gamma)
        const { pitchDelta = 0, rollDelta = 0, sensitivity = 2.0 } = data;
        if (Math.abs(pitchDelta) < 0.1 && Math.abs(rollDelta) < 0.1) return;

        const currentPos = guiDriver.getCursorPos();
        // Roll controls horizontal (X), Pitch controls vertical (Y)
        const nextX = Math.round(currentPos.x + (rollDelta * sensitivity));
        const nextY = Math.round(currentPos.y - (pitchDelta * sensitivity));
        guiDriver.setCursorPos(nextX, nextY);
    }
}

module.exports = new MobileMouseBridge();
