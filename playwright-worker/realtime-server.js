const WebSocket = require('ws');
const admin = require('firebase-admin');
const config = require('./config');

function sanitizeFirestoreObject(obj) {
    if (obj === null || obj === undefined || typeof obj !== 'object') return obj ?? null;
    const clean = Array.isArray(obj) ? [] : {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
            clean[key] = (typeof value === 'object' && value !== null) ? sanitizeFirestoreObject(value) : value;
        }
    }
    return clean;
}

class RealtimeServer {
    constructor() {
        this.wss = null;
        this.clients = new Map(); // wsClient -> { runId, userId }
        this.db = null;
        this.initFirebase();
    }

    initFirebase() {
        try {
            if (admin.apps.length === 0) {
                if (config.FIREBASE_SERVICE_ACCOUNT) {
                    let sa = JSON.parse(config.FIREBASE_SERVICE_ACCOUNT.trim());
                    sa.private_key = sa.private_key.replace(/\\n/g, '\n');
                    admin.initializeApp({ credential: admin.credential.cert(sa) });
                } else {
                    admin.initializeApp();
                }
            }
            this.db = admin.firestore();
            console.log('[REALTIME SERVER] Firebase Admin Firestore initialized.');
        } catch (e) {
            console.warn('[REALTIME SERVER] Firebase Admin initialization warning:', e.message);
        }
    }

    attachWebSocketServer(server) {
        this.wss = new WebSocket.Server({ server, path: '/ws' });

        this.wss.on('connection', (ws, req) => {
            console.log('[REALTIME SERVER] Client connected to WebSocket.');

            ws.on('message', (message) => {
                try {
                    const msg = JSON.parse(message);
                    if (msg.type === 'SUBSCRIBE' && msg.runId) {
                        this.clients.set(ws, { runId: msg.runId, userId: msg.userId || 'guest' });
                        console.log(`[REALTIME SERVER] Client subscribed to run: ${msg.runId}`);
                        ws.send(JSON.stringify({ type: 'SUBSCRIBED', runId: msg.runId }));
                    }
                } catch (e) {}
            });

            ws.on('close', () => {
                this.clients.delete(ws);
            });
        });

        console.log('[REALTIME SERVER] WebSocket server attached on /ws endpoint.');
    }

    emitRunEvent(runId, eventType, eventData = {}) {
        const payload = {
            runId,
            eventType,
            timestamp: new Date().toISOString(),
            ...eventData
        };

        const jsonStr = JSON.stringify(payload);

        // 1. Broadcast to connected WebSocket clients for this run
        for (const [ws, info] of this.clients.entries()) {
            if (info.runId === runId && ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(jsonStr);
                } catch (e) {}
            }
        }

        // 2. Persist safe state to Firestore automations/{runId} without undefined errors
        if (this.db) {
            const autoRef = this.db.collection('automations').doc(runId);

            const docData = {
                lastEventType: eventType,
                lastAction: eventData.statusText || eventData.action || eventType,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            if (eventData.x !== undefined && eventData.y !== undefined) {
                docData.cursorState = { x: eventData.x, y: eventData.y, action: eventData.action || 'hover' };
            }

            if (eventData.extractedData) {
                docData.extractedData = eventData.extractedData;
            }

            if (eventData.activePageInfo) {
                docData.activePageInfo = eventData.activePageInfo;
            }

            const cleanDoc = sanitizeFirestoreObject(docData);
            autoRef.set(cleanDoc, { merge: true }).catch(err => {
                console.error(`[FIRESTORE WRITE ERROR] Run ${runId}:`, err.message);
            });
        }
    }
}

module.exports = new RealtimeServer();
