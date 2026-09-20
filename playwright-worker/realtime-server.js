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
        this.clients = new Map(); // wsClient -> { type, runId, userId, room, name }
        this.rooms = new Map();   // roomCode -> Set of clients
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
        // Change: No path restriction. Listen on root (/) for best proxy compatibility.
        this.wss = new WebSocket.Server({ server });

        this.wss.on('connection', (ws, req) => {
            console.log(`[REALTIME SERVER] Client connected. Path: ${req.url}`);

            ws.on('message', (message) => {
                try {
                    const msg = JSON.parse(message);

                    // --- 1. Automation Subscription ---
                    if (msg.type === 'SUBSCRIBE' && msg.runId) {
                        this.clients.set(ws, { type: 'automation', runId: msg.runId, userId: msg.userId || 'guest' });
                        console.log(`[REALTIME SERVER] Subscribed to run: ${msg.runId}`);
                        ws.send(JSON.stringify({ type: 'SUBSCRIBED', runId: msg.runId }));
                    }

                    // --- 2. Room-Based Chat & Share ---
                    if (msg.type === 'JOIN_ROOM' && msg.room) {
                        const roomCode = String(msg.room);
                        const name = msg.name || 'Anonymous';

                        this.clients.set(ws, { type: 'room', room: roomCode, name });

                        if (!this.rooms.has(roomCode)) {
                            this.rooms.set(roomCode, new Set());
                        }
                        this.rooms.get(roomCode).add(ws);

                        console.log(`[REALTIME SERVER] ${name} joined room: ${roomCode}`);

                        // Notify room
                        this.broadcastToRoom(roomCode, {
                            type: 'ROOM_EVENT',
                            action: 'USER_JOINED',
                            name,
                            userCount: this.rooms.get(roomCode).size
                        }, ws);

                        ws.send(JSON.stringify({ type: 'JOINED', room: roomCode, userCount: this.rooms.get(roomCode).size }));
                    }

                    if (msg.type === 'CHAT_MESSAGE' && msg.text) {
                        const info = this.clients.get(ws);
                        if (info && info.room) {
                            this.broadcastToRoom(info.room, {
                                type: 'CHAT_MESSAGE',
                                sender: info.name,
                                text: msg.text,
                                timestamp: new Date().toISOString()
                            });
                        }
                    }

                    // --- 3. File Sharing ---
                    if (msg.type === 'FILE_OFFER' && msg.file) {
                        const info = this.clients.get(ws);
                        if (info && info.room) {
                            this.broadcastToRoom(info.room, {
                                type: 'FILE_OFFER',
                                sender: info.name,
                                file: msg.file, // { name, size, uploadId }
                                timestamp: new Date().toISOString()
                            }, ws);
                        }
                    }
                } catch (e) {
                    console.error('[REALTIME SERVER] Message error:', e.message);
                }
            });

            ws.on('close', () => {
                const info = this.clients.get(ws);
                if (info && info.room && this.rooms.has(info.room)) {
                    const roomClients = this.rooms.get(info.room);
                    roomClients.delete(ws);
                    if (roomClients.size === 0) {
                        this.rooms.delete(info.room);
                    } else {
                        this.broadcastToRoom(info.room, {
                            type: 'ROOM_EVENT',
                            action: 'USER_LEFT',
                            name: info.name,
                            userCount: roomClients.size
                        });
                    }
                }
                this.clients.delete(ws);
            });
        });

        console.log('[REALTIME SERVER] WebSocket server attached to root (/).');
    }

    handleUpgrade(request, socket, head) {
        // Not used with direct server attachment
    }

    broadcastToRoom(roomCode, payload, excludeWs = null) {
        const clients = this.rooms.get(roomCode);
        if (!clients) return;

        const jsonStr = JSON.stringify(payload);
        for (const client of clients) {
            if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
                try {
                    client.send(jsonStr);
                } catch (e) {}
            }
        }
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
