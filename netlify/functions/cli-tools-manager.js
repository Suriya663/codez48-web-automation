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
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        db = admin.firestore();
        isInitialized = true;
        return true;
    } catch (e) {
        console.error('Firebase Admin Init Failure in cli-tools-manager:', e.message);
        return false;
    }
};

const verifyApiKey = async (apiKey) => {
    if (!apiKey) return null;
    const keySnap = await db.collection('api_keys').doc(apiKey).get();
    if (!keySnap.exists || keySnap.data().status !== 'ACTIVE') return null;
    return keySnap.data().userId;
};

exports.handler = async (event, context) => {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type, x-api-key",
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
            }
        };
    }

    if (!initAdmin() || !db) {
        return { statusCode: 500, body: "Database unavailable" };
    }

    const apiKey = event.headers['x-api-key'];
    const sellerId = await verifyApiKey(apiKey);

    if (!sellerId) {
        return {
            statusCode: 401,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ success: false, error: "Unauthorized: Invalid or missing API Key." })
        };
    }

    try {
        const body = event.body ? JSON.parse(event.body) : {};
        const { tool, action } = body;

        if (!tool) {
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({
                    success: true,
                    tools: ["tracker", "notifications", "mail", "webhook", "ai-studio"],
                    message: "Use 'tool' parameter to access specific tool data."
                })
            };
        }

        // --- 1. WEBSITE TRACKER ---
        if (tool === 'tracker') {
            if (action === 'LIST') {
                const snap = await db.collection('external_sites').where('ownerId', '==', sellerId).get();
                const sites = [];
                snap.forEach(doc => sites.push({ id: doc.id, ...doc.data() }));
                return { statusCode: 200, body: JSON.stringify({ success: true, sites }) };
            }
            if (action === 'ADD') {
                const { url } = body;
                if (!url) return { statusCode: 400, body: JSON.stringify({ error: "URL required" }) };
                const siteId = 'SITE_' + Math.random().toString(36).substring(2, 9).toUpperCase();
                await db.collection('external_sites').doc(siteId).set({
                    ownerId: sellerId,
                    websiteUrl: url,
                    status: 'waiting_for_installation',
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                return { statusCode: 201, body: JSON.stringify({ success: true, siteId }) };
            }
            if (action === 'STATS') {
                const { siteId } = body;
                if (!siteId) return { statusCode: 400, body: JSON.stringify({ error: "siteId required" }) };
                const siteSnap = await db.collection('external_sites').doc(siteId).get();
                if (!siteSnap.exists || siteSnap.data().ownerId !== sellerId) return { statusCode: 403, body: "Forbidden" };

                const eventsSnap = await db.collection('external_sites').doc(siteId).collection('events').limit(100).get();
                const sessionsSnap = await db.collection('external_sites').doc(siteId).collection('sessions').limit(100).get();

                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: true,
                        eventCount: eventsSnap.size,
                        sessionCount: sessionsSnap.size,
                        recentEvents: eventsSnap.docs.slice(0, 5).map(d => d.data())
                    })
                };
            }
        }

        // --- 2. PUSH NOTIFICATIONS ---
        if (tool === 'notifications') {
            if (action === 'LIST') {
                // List campaigns across all tracked sites
                const sitesSnap = await db.collection('external_sites').where('ownerId', '==', sellerId).get();
                let allCampaigns = [];
                for (const siteDoc of sitesSnap.docs) {
                    const campsSnap = await siteDoc.ref.collection('campaigns').get();
                    campsSnap.forEach(c => allCampaigns.push({ id: c.id, siteId: siteDoc.id, ...c.data() }));
                }
                return { statusCode: 200, body: JSON.stringify({ success: true, campaigns: allCampaigns }) };
            }
            // Direct Send logic would be complex here, so we mainly list for now.
        }

        // --- 3. MAIL AUTOMATION ---
        if (tool === 'mail') {
            const settingsRef = db.collection('mail_automation_settings').doc(sellerId);
            if (action === 'STATUS') {
                const snap = await settingsRef.get();
                return { statusCode: 200, body: JSON.stringify({ success: true, settings: snap.exists ? snap.data() : null }) };
            }
            if (action === 'TOGGLE') {
                const { enabled } = body;
                await settingsRef.set({ mailAutomation: enabled, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
                return { statusCode: 200, body: JSON.stringify({ success: true, message: `Mail automation ${enabled ? 'enabled' : 'disabled'}` }) };
            }
        }

        // --- 4. WEBHOOK GATEWAY ---
        if (tool === 'webhook') {
            if (action === 'INBOX') {
                const snap = await db.collection('webhook_inbox')
                    .where('userId', '==', sellerId)
                    .orderBy('receivedAt', 'desc')
                    .limit(20)
                    .get();
                const messages = [];
                snap.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
                return { statusCode: 200, body: JSON.stringify({ success: true, messages }) };
            }
        }

        // --- 5. AI MODEL STUDIO ---
        if (tool === 'ai-studio') {
            if (action === 'LIST') {
                const snap = await db.collection('ai_workspaces').where('ownerId', '==', sellerId).get();
                const workspaces = [];
                snap.forEach(doc => workspaces.push({ id: doc.id, ...doc.data() }));
                return { statusCode: 200, body: JSON.stringify({ success: true, workspaces }) };
            }
        }

        return { statusCode: 400, body: JSON.stringify({ error: "Invalid tool or action" }) };

    } catch (error) {
        console.error("CLI Tools Manager Error:", error.message);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};
