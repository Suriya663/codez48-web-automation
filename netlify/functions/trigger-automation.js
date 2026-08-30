const admin = require('firebase-admin');
const fetch = require('node-fetch');

let isInitialized = false;
let db = null;

const initAdmin = () => {
    if (isInitialized) return true;
    try {
        const saVar = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!saVar) {
            if (admin.apps.length === 0) admin.initializeApp();
            db = admin.firestore();
            isInitialized = true;
            return true;
        }

        let serviceAccount = JSON.parse(saVar.trim());
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        if (admin.apps.length === 0) {
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        }
        db = admin.firestore();
        isInitialized = true;
        return true;
    } catch (e) {
        console.error('Firebase Admin Init Failure in trigger-automation:', e.message);
        return false;
    }
};

const maskSensitiveData = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const masked = Array.isArray(obj) ? [] : {};
    for (const [key, val] of Object.entries(obj)) {
        const isSecret = /password|otp|secret|token|apikey/i.test(key);
        if (isSecret && typeof val === 'string') {
            masked[key] = val.length > 4 ? `****${val.slice(-4)}` : '****';
        } else if (typeof val === 'object' && val !== null) {
            masked[key] = maskSensitiveData(val);
        } else {
            masked[key] = val;
        }
    }
    return masked;
};

exports.handler = async (event, context) => {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST, OPTIONS"
            }
        };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    try {
        const data = JSON.parse(event.body || '{}');
        const { automationId, userId, target, task, payload, webhookUrl } = data;

        if (!automationId || !target || !task) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing required fields: automationId, target, or task" })
            };
        }

        const safePayload = maskSensitiveData(payload);
        const authenticatedUserId = userId || 'guest';

        initAdmin();

        // 1. Initialize Run Metadata Document in Firestore
        if (db) {
            const autoRef = db.collection('automations').doc(automationId);
            await autoRef.set({
                id: automationId,
                userId: authenticatedUserId,
                target,
                task,
                status: 'CREATED',
                lastAction: 'Run created. Dispatching to Railway Playwright Browser Worker...',
                payload: safePayload,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }

        // 2. Deterministically Construct Worker Endpoints
        const rawWorkerBase = process.env.PLAYWRIGHT_WORKER_BASE_URL || process.env.PLAYWRIGHT_WORKER_URL || 'http://localhost:8080';
        const workerBase = rawWorkerBase.replace(/\/+$/, '').replace(/\/api\/runs$/, '');
        const startUrl = `${workerBase}/api/runs`;
        const wsUrl = `${workerBase.replace(/^http/, 'ws')}/ws`;
        const workerSecret = process.env.PLAYWRIGHT_WORKER_SECRET || 'codez48_secret_worker_token';

        console.log(`[NETLIFY WORKER FORWARD] Target Base: ${workerBase} | Start URL: ${startUrl}`);

        let workerResponse = null;
        let workerErrorMsg = null;

        try {
            const res = await fetch(startUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-worker-secret': workerSecret
                },
                body: JSON.stringify({
                    runId: automationId,
                    userId: authenticatedUserId,
                    goal: task,
                    targetUrl: target,
                    payload: safePayload,
                    webhookUrl
                }),
                timeout: 10000
            });

            if (res.ok) {
                workerResponse = await res.json();
            } else {
                workerErrorMsg = `Worker HTTP ${res.status}: ${res.statusText}`;
                console.error(`[NETLIFY GATEWAY ERROR] ${workerErrorMsg}`);
            }
        } catch (workerErr) {
            workerErrorMsg = workerErr.message;
            console.error(`[NETLIFY GATEWAY DISCONNECT] Failed to reach Railway worker at ${startUrl}:`, workerErrorMsg);
        }

        // 3. STRICT PRODUCTION DISCONNECT HANDLING: NO Fake Standalone Simulation
        if (!workerResponse || !workerResponse.success) {
            // Update Firestore state to FAILED
            if (db) {
                await db.collection('automations').doc(automationId).set({
                    status: 'FAILED',
                    lastAction: 'Browser Worker Offline: Unable to reach Railway Playwright Worker service.',
                    lastEventType: 'STATUS_UPDATE',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true }).catch(() => {});
            }

            return {
                statusCode: 503,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    success: false,
                    workerConnected: false,
                    errorCode: "PLAYWRIGHT_WORKER_UNAVAILABLE",
                    message: "The Playwright browser automation worker on Railway could not be reached. Please ensure the Railway service is running.",
                    details: workerErrorMsg
                })
            };
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                success: true,
                automationId,
                userId: authenticatedUserId,
                workerConnected: true,
                realtimeUrl: wsUrl,
                message: "Playwright Worker triggered successfully."
            })
        };

    } catch (error) {
        console.error("Trigger Automation Error:", error.message);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: error.message })
        };
    }
};
