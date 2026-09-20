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
        console.error('Firebase Admin Init Failure in cli-automation-manager:', e.message);
        return false;
    }
};

const verifyApiKey = async (apiKey) => {
    if (!apiKey) return null;
    const keySnap = await db.collection('api_keys').doc(apiKey).get();
    if (!keySnap.exists || keySnap.data().status !== 'ACTIVE') return null;
    return keySnap.data().userId;
};

const jsonResponse = (statusCode, data) => ({
    statusCode,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(data)
});

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
        return jsonResponse(500, { success: false, error: "Database unavailable" });
    }

    const apiKey = event.headers['x-api-key'];
    const sellerId = await verifyApiKey(apiKey);

    if (!sellerId) {
        return jsonResponse(401, { success: false, error: "Unauthorized: Invalid or missing API Key." });
    }

    try {
        const body = event.body ? JSON.parse(event.body) : {};
        const { action } = body;

        // --- 1. LIST AUTOMATIONS ---
        if (action === 'LIST' || event.httpMethod === 'GET') {
            const snap = await db.collection('service_automations')
                .where('ownerId', '==', sellerId)
                .get();

            const automations = [];
            snap.forEach(doc => {
                const data = doc.data();
                automations.push({ id: doc.id, ...data });
            });

            return jsonResponse(200, { success: true, automations });
        }

        // --- 2. CREATE AUTOMATION ---
        if (action === 'CREATE') {
            const { type, name, config } = body;
            if (!type || !name || !config) {
                return jsonResponse(400, { success: false, error: "Missing type, name or config" });
            }

            const autoId = 'AUTO-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            const newAuto = {
                ownerId: sellerId,
                name,
                type,
                status: 'ACTIVE',
                config,
                lastRunAt: null,
                lastResult: 'Waiting for first run',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('service_automations').doc(autoId).set(newAuto);

            return jsonResponse(201, { success: true, message: "Automation created", automationId: autoId });
        }

        // --- 3. TOGGLE AUTOMATION ---
        if (action === 'TOGGLE') {
            const { automationId, status } = body;
            if (!automationId || !status) {
                return jsonResponse(400, { success: false, error: "Missing automationId or status" });
            }

            const autoRef = db.collection('service_automations').doc(automationId);
            const snap = await autoRef.get();

            if (!snap.exists || snap.data().ownerId !== sellerId) {
                return jsonResponse(403, { success: false, error: "Forbidden: Ownership mismatch" });
            }

            await autoRef.update({
                status: status.toUpperCase(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return jsonResponse(200, { success: true, message: `Automation ${status.toLowerCase()}d` });
        }

        // --- 4. GET LOGS ---
        if (action === 'LOGS') {
            const { automationId } = body;
            if (!automationId) return jsonResponse(400, { success: false, error: "Missing automationId" });

            const logsSnap = await db.collection('service_automation_logs')
                .where('automationId', '==', automationId)
                .where('ownerId', '==', sellerId)
                .orderBy('timestamp', 'desc')
                .limit(15)
                .get();

            const logs = [];
            logsSnap.forEach(doc => logs.push({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() }));

            return jsonResponse(200, { success: true, logs });
        }

        // --- 5. RUN NOW (Manual Trigger) ---
        if (action === 'RUN') {
            const { automationId } = body;
            if (!automationId) return jsonResponse(400, { success: false, error: "Missing automationId" });

            const autoRef = db.collection('service_automations').doc(automationId);
            const snap = await autoRef.get();

            if (!snap.exists || snap.data().ownerId !== sellerId) {
                return jsonResponse(403, { success: false, error: "Forbidden" });
            }

            const autoData = snap.data();
            const executionResult = await executeAutomationLogic(autoData, automationId, sellerId);

            return jsonResponse(200, { success: true, result: executionResult });
        }

        return jsonResponse(400, { success: false, error: "Invalid action" });

    } catch (error) {
        console.error("Automation Manager Error:", error.message);
        return jsonResponse(500, { success: false, error: error.message });
    }
};

async function executeAutomationLogic(auto, autoId, sellerId) {
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    let status = 'SUCCESS';
    let details = '';

    try {
        if (auto.type === 'LOW_STOCK') {
            const threshold = parseInt(auto.config.threshold) || 5;
            const prodsSnap = await db.collection('products')
                .where('sellerId', '==', sellerId)
                .where('stock', '<=', threshold)
                .get();

            const lowStockItems = [];
            prodsSnap.forEach(d => lowStockItems.push(d.data().name));

            if (lowStockItems.length > 0) {
                status = 'WARNING';
                details = `Low stock detected for: ${lowStockItems.join(', ')}`;
            } else {
                details = 'All stock levels healthy.';
            }
        }
        else if (auto.type === 'UPTIME_CHECK') {
            const url = auto.config.url;
            try {
                const res = await fetch(url, { timeout: 5000 });
                if (res.ok) {
                    details = `Website ${url} is ONLINE (HTTP ${res.status})`;
                } else {
                    status = 'ERROR';
                    details = `Website ${url} is reporting issues (HTTP ${res.status})`;
                }
            } catch (e) {
                status = 'ERROR';
                details = `Website ${url} is UNREACHABLE: ${e.message}`;
            }
        }
        else if (auto.type === 'DAILY_REPORT') {
            const today = new Date();
            today.setHours(0,0,0,0);

            const ordersSnap = await db.collection('orders')
                .where('sellerId', '==', sellerId)
                .where('date', '>=', today.toISOString())
                .get();

            let totalRevenue = 0;
            let orderCount = ordersSnap.size;
            ordersSnap.forEach(d => totalRevenue += (d.data().total || 0));

            details = `Daily Summary: ${orderCount} Orders, Total Revenue: ₹${totalRevenue}.`;
        }

        await db.collection('service_automation_logs').add({
            automationId: autoId,
            ownerId: sellerId,
            type: auto.type,
            timestamp,
            status,
            details
        });

        await db.collection('service_automations').doc(autoId).update({
            lastRunAt: timestamp,
            lastResult: details
        });

        return details;

    } catch (err) {
        console.error("Execution Logic Error:", err.message);
        return "Execution failed: " + err.message;
    }
}
