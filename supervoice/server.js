const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const busboy = require('busboy');
const voiceProfileManager = require('./voice-profile-manager');
const supervoiceEngine = require('./supervoice-engine');

class SupervoiceServer {
    constructor() {
        this.app = express();
        this.port = 4848;
        this._setupMiddleware();
        this._setupRoutes();
    }

    _setupMiddleware() {
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            if (req.method === 'OPTIONS') return res.sendStatus(200);
            next();
        });
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(express.static(path.resolve(__dirname, 'public')));
        this.app.use('/output', express.static(path.resolve(__dirname, '../.codez48_output')));
    }

    _setupRoutes() {
        this.app.get('/api/profiles', (req, res) => {
            try {
                res.json(voiceProfileManager.listProfiles());
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        this.app.post('/api/profiles', (req, res) => {
            const bb = busboy({ headers: req.headers });
            let name = 'Voice 1';
            let transcript = 'வணக்கம்';
            let tmpAudioPath = null;

            bb.on('field', (fieldname, val) => {
                if (fieldname === 'name') name = val;
                if (fieldname === 'transcript') transcript = val;
            });

            bb.on('file', (fieldname, file, info) => {
                const savePath = path.join(os.tmpdir(), `upload_${Date.now()}.wav`);
                tmpAudioPath = savePath;
                const writeStream = fs.createWriteStream(savePath);
                file.pipe(writeStream);
            });

            bb.on('finish', () => {
                try {
                    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    const profile = voiceProfileManager.createProfile(id, name, transcript, tmpAudioPath);
                    if (tmpAudioPath && fs.existsSync(tmpAudioPath)) {
                        try { fs.unlinkSync(tmpAudioPath); } catch (e) {}
                    }
                    res.json({ success: true, profile });
                } catch (e) {
                    res.status(500).json({ success: false, error: e.message });
                }
            });

            req.pipe(bb);
        });

        this.app.post('/api/speak', (req, res) => {
            try {
                const { text, profileId } = req.body;
                if (!text) {
                    return res.status(400).json({ success: false, error: 'Text is required' });
                }
                const result = supervoiceEngine.synthesize(text, profileId);
                const filename = path.basename(result.outputPath);
                const audioUrl = `output/${filename}`;
                res.json({
                    success: true,
                    audioUrl,
                    engine: result.engine
                });
            } catch (e) {
                res.status(500).json({ success: false, error: e.message });
            }
        });

        // ── SUPERVISOR ROUTES ──────────────────────────────────────────────

        // Process a voice command text through the full Supervisor workflow
        this.app.post('/api/supervisor/command', async (req, res) => {
            try {
                const { text, profileId, contactOverride } = req.body;
                if (!text || !text.trim()) {
                    return res.status(400).json({ success: false, error: 'text is required' });
                }
                const supervisorController = require('./supervisor-controller');

                // Server-side approval: in web mode we always require UI approval,
                // so we return the proposed reply for client-side confirmation instead of blocking here.
                const result = await supervisorController.processVoiceCommand(text, {
                    profileId: profileId || null,
                    onApprovalQuery: async ({ recipient, replyText, audioPath }) => {
                        // Delegate approval to client — signal that approval is needed
                        res.json({
                            success: true,
                            awaitingApproval: true,
                            recipient,
                            replyText,
                            audioUrl: audioPath ? `output/${path.basename(audioPath)}` : null
                        });
                        return { approved: false, action: 'cancel' }; // Pause workflow; client will re-call /send
                    },
                    onStatusUpdate: (msg) => console.log('[SUPERVISOR API]', msg)
                });

                // If approval was already sent in onApprovalQuery, don't double-send
                if (!res.headersSent) {
                    res.json(result);
                }
            } catch (e) {
                if (!res.headersSent) res.status(500).json({ success: false, error: e.message });
            }
        });

        // Transcribe browser audio blob via Groq Whisper
        this.app.post('/api/supervisor/transcribe', (req, res) => {
            const bb = require('busboy')({ headers: req.headers });
            let audioBuffer = null;
            let ext = 'webm';

            bb.on('file', (fieldname, file, info) => {
                ext = (info.filename || '').split('.').pop() || 'webm';
                const chunks = [];
                file.on('data', chunk => chunks.push(chunk));
                file.on('end', () => { audioBuffer = Buffer.concat(chunks); });
            });

            bb.on('finish', async () => {
                try {
                    const stt = require('./speech-to-text');
                    const result = await stt.transcribe(audioBuffer, { ext });
                    res.json(result);
                } catch (e) {
                    res.status(500).json({ success: false, error: e.message });
                }
            });

            req.pipe(bb);
        });

        // Check WhatsApp open/auth status
        this.app.get('/api/supervisor/whatsapp-status', async (req, res) => {
            try {
                const wasm = require('./whatsapp-session-manager');
                const isOpen = wasm.isWhatsAppWindowOpen();
                const isDesktopInstalled = wasm.isWhatsAppDesktopInstalled();
                res.json({ isOpen, isDesktopInstalled });
            } catch (e) {
                res.status(500).json({ success: false, error: e.message });
            }
        });

        // Open WhatsApp
        this.app.post('/api/supervisor/open-whatsapp', async (req, res) => {
            try {
                const wasm = require('./whatsapp-session-manager');
                const result = await wasm.openAndVerify(req.body && req.body.contact);
                res.json(result);
            } catch (e) {
                res.status(500).json({ success: false, error: e.message });
            }
        });

        // Poll for WhatsApp auth completion (called after user scans QR)
        this.app.post('/api/supervisor/auth-wait', async (req, res) => {
            try {
                const wasm = require('./whatsapp-session-manager');
                const maxWait = (req.body && req.body.maxWaitMs) ? req.body.maxWaitMs : 90000;
                const completed = await wasm.waitForAuthCompletion(Math.min(maxWait, 120000));
                res.json({ success: completed, authenticated: completed });
            } catch (e) {
                res.status(500).json({ success: false, error: e.message });
            }
        });

        // Send approved message (after client-side approval)
        this.app.post('/api/supervisor/send', async (req, res) => {
            try {
                const wasm = require('./whatsapp-session-manager');
                const { contact, text, audioFilename } = req.body;
                const audioPath = audioFilename
                    ? path.resolve(__dirname, '../.codez48_output', audioFilename)
                    : null;
                const result = await wasm.sendMessage({ contact, text, audioPath });
                res.json(result);
            } catch (e) {
                res.status(500).json({ success: false, error: e.message });
            }
        });


                // ── WHATSAPP AUTONOMOUS & DIRECT MONITORING ROUTES ──────────────────
        this.app.post('/api/whatsapp/send', async (req, res) => {
            try {
                const wa = require('./whatsapp-automation');
                const { contact, text } = req.body;
                if (!contact || !text) {
                    return res.status(400).json({ success: false, error: 'contact and text are required' });
                }
                const result = await wa.sendMessageToContact(contact, text);
                res.json(result);
            } catch (e) {
                res.status(500).json({ success: false, error: e.message });
            }
        });

        this.app.post('/api/whatsapp/monitor-cycle', async (req, res) => {
            try {
                const wa = require('./whatsapp-automation');
                const result = await wa.runAutonomousVisionMonitorCycle();
                res.json(result);
            } catch (e) {
                res.status(500).json({ success: false, error: e.message });
            }
        });

        this.app.post('/api/whatsapp/contextual-reply', async (req, res) => {
            try {
                const wa = require('./whatsapp-automation');
                const { incomingText } = req.body;
                const result = await wa.generateContextualReply(incomingText || '');
                res.json({ success: true, ...result });
            } catch (e) {
                res.status(500).json({ success: false, error: e.message });
            }
        });

        this.app.get('/api/whatsapp/audit-log', (req, res) => {
            try {
                const auditPath = path.resolve(__dirname, '../.codez48_output/whatsapp_monitor_audit.json');
                if (fs.existsSync(auditPath)) {
                    const data = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
                    res.json({ success: true, entries: data });
                } else {
                    res.json({ success: true, entries: [] });
                }
            } catch (e) {
                res.status(500).json({ success: false, error: e.message });
            }
        });

        // Credit Vault & Razorpay Payment Endpoints
        this.app.get('/api/credits/status', (req, res) => {
            try {
                const creditVault = require('../src/core/credit-vault');
                res.json({
                    success: true,
                    userId: creditVault.getUserIdentifier(),
                    creditBalance: creditVault.getBalance(),
                    plan: creditVault.getPlan().id,
                    planName: creditVault.getPlan().name
                });
            } catch (e) {
                res.status(500).json({ success: false, error: e.message });
            }
        });

        this.app.post('/api/credits/verify-payment', async (req, res) => {
            try {
                const creditVault = require('../src/core/credit-vault');
                const { userId, planId, amount, credits, paymentId, orderId } = req.body;

                if (!planId || !credits) {
                    return res.status(400).json({ success: false, error: 'Missing planId or credits' });
                }

                const result = creditVault.addCredits(Number(credits), planId, { paymentId, orderId, amount });
                res.json({
                    success: true,
                    newBalance: result.newBalance,
                    plan: result.plan,
                    message: `Successfully activated ${result.plan} with ${credits} credits added!`
                });
            } catch (e) {
                res.status(500).json({ success: false, error: e.message });
            }
        });
    }  // end _setupRoutes

    start() {
        return new Promise((resolve) => {
            this.server = this.app.listen(this.port, () => {
                console.log(`[SUPERVOICE SERVER] Running at http://localhost:${this.port}`);
                resolve(this.port);
            });
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
        }
    }
}

module.exports = new SupervoiceServer();
