import { db, auth } from './firebase-config.js';
import {
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    collection,
    query,
    where,
    limit
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

/**
 * PLAYWRIGHT AGENT FRONTEND CLIENT
 * Subscribes to Playwright Worker realtime events (WebSocket / Firestore),
 * manages active run metadata, handles user input submissions, and updates UI controls.
 */

export function sanitizeFirestoreObject(obj) {
    if (obj === null || obj === undefined || typeof obj !== 'object') return obj ?? null;
    const clean = Array.isArray(obj) ? [] : {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
            clean[key] = (typeof value === 'object' && value !== null) ? sanitizeFirestoreObject(value) : value;
        }
    }
    return clean;
}

export const RunState = {
    CREATED: 'CREATED',
    STARTING_BROWSER: 'STARTING_BROWSER',
    OPENING_PAGE: 'OPENING_PAGE',
    RUNNING: 'RUNNING',
    WAITING_FOR_PAGE: 'WAITING_FOR_PAGE',
    WAITING_FOR_USER: 'WAITING_FOR_USER',
    VERIFYING: 'VERIFYING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED'
};

export class PlaywrightAgentClient {
    constructor() {
        this.activeRunId = null;
        this.unsubscribeFirestore = null;
        this.ws = null;
        this.onEventCallbacks = new Set();
        console.log('[PLAYWRIGHT AGENT CLIENT] Client initialized.');
    }

    onEvent(callback) {
        this.onEventCallbacks.add(callback);
        return () => this.onEventCallbacks.delete(callback);
    }

    emitEvent(eventType, payload) {
        for (const cb of this.onEventCallbacks) {
            try { cb(eventType, payload); } catch (e) {}
        }
    }

    async subscribeToRun(runId, realtimeUrl = null, runToken = null) {
        this.activeRunId = runId;
        localStorage.setItem('codez48_active_auto_id', runId);

        // 1. Connect to Playwright Worker WebSocket (Production WSS or Local WS)
        let wsUrl = realtimeUrl;
        if (!wsUrl) {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isLocal) {
                wsUrl = `ws://${window.location.hostname}:8080/ws`;
            }
        }

        if (wsUrl) {
            if (wsUrl.startsWith('https://')) wsUrl = wsUrl.replace(/^https:/, 'wss:');
            else if (wsUrl.startsWith('http://')) wsUrl = wsUrl.replace(/^http:/, 'ws:');

            try {
                if (this.ws) { try { this.ws.close(); } catch (e) {} }
                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    console.log('[PLAYWRIGHT CLIENT] Realtime WebSocket connected to worker:', wsUrl);
                    this.ws.send(JSON.stringify({
                        type: 'SUBSCRIBE',
                        runId,
                        token: runToken,
                        userId: auth.currentUser?.uid || 'guest'
                    }));
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.eventType) {
                            this.emitEvent(data.eventType, data);
                        }
                    } catch (e) {}
                };

                this.ws.onerror = () => {
                    console.log('[PLAYWRIGHT CLIENT] WebSocket standby. Relying on Firestore realtime listener.');
                };
            } catch (wsErr) {
                console.log('[PLAYWRIGHT CLIENT] WebSocket standby. Relying on Firestore realtime listener.');
            }
        }

        // 2. Subscribe to Firestore Document automations/{runId} as universal realtime listener
        if (this.unsubscribeFirestore) this.unsubscribeFirestore();

        this.unsubscribeFirestore = onSnapshot(doc(db, "automations", runId), (snapshot) => {
            if (!snapshot.exists()) return;
            const data = snapshot.data();

            const eventType = data.lastEventType || 'STATUS_UPDATE';
            this.emitEvent(eventType, data);
        });
    }

    async resumeAutomationRun(runId, userResponse = '') {
        console.log('[PLAYWRIGHT CLIENT] Resuming run with user response:', runId);
        try {
            const uid = auth.currentUser?.uid || 'guest';
            const workerUrl = `${window.location.origin}/api/runs/${runId}/resume`;

            await fetch(workerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: uid, userResponse })
            }).catch(() => null);

            // Firestore sync update
            const autoRef = doc(db, "automations", runId);
            await setDoc(autoRef, sanitizeFirestoreObject({
                status: RunState.RUNNING,
                waitingForUser: false,
                lastAction: 'User response provided. Resuming Playwright agent...',
                lastActionResult: userResponse,
                lastEventType: 'STATUS_UPDATE',
                updatedAt: serverTimestamp()
            }), { merge: true });

            return true;
        } catch (e) {
            console.error('[PLAYWRIGHT CLIENT RESUME ERROR]:', e.message);
            return false;
        }
    }

    async stopAutomationRun(runId) {
        if (!runId) return;
        try {
            const uid = auth.currentUser?.uid || 'guest';
            await fetch(`/api/runs/${runId}/stop`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: uid })
            }).catch(() => null);

            const autoRef = doc(db, "automations", runId);
            await setDoc(autoRef, sanitizeFirestoreObject({
                status: RunState.CANCELLED,
                lastAction: 'Session terminated by user',
                lastEventType: 'STATUS_UPDATE',
                updatedAt: serverTimestamp()
            }), { merge: true });

            if (this.ws) { try { this.ws.close(); } catch (e) {} }
            if (this.unsubscribeFirestore) this.unsubscribeFirestore();
            console.log('[PLAYWRIGHT CLIENT] Run terminated:', runId);
        } catch (e) {}
    }
}

export const globalPlaywrightAgentClient = new PlaywrightAgentClient();
window.globalPlaywrightAgentClient = globalPlaywrightAgentClient;
