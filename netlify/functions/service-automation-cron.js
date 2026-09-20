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
        console.error('Firebase Admin Init Failure in service-automation-cron:', e.message);
        return false;
    }
};

/**
 * BACKGROUND AUTOMATION CRON
 * Processes all ACTIVE automations across the platform.
 */
exports.handler = async (event, context) => {
    console.log("[AUTOMATION CRON] Starting execution cycle...");

    if (!initAdmin() || !db) {
        return { statusCode: 500, body: "Database unavailable" };
    }

    try {
        const activeSnap = await db.collection('service_automations')
            .where('status', '==', 'ACTIVE')
            .get();

        if (activeSnap.empty) {
            console.log("[AUTOMATION CRON] No active automations found.");
            return { statusCode: 200, body: "No tasks" };
        }

        let processedCount = 0;

        for (const doc of activeSnap.docs) {
            const auto = doc.data();
            const autoId = doc.id;

            // Basic frequency check (don't run too often, e.g. min 4 hours between runs)
            const lastRun = auto.lastRunAt ? (auto.lastRunAt.toDate ? auto.lastRunAt.toDate() : new Date(auto.lastRunAt)) : new Date(0);
            const hoursSinceRun = (new Date() - lastRun) / (1000 * 60 * 60);

            if (hoursSinceRun >= 4) {
                console.log(`[AUTOMATION CRON] Executing ${auto.type} for ${auto.ownerId}`);
                await executeLogic(auto, autoId, auto.ownerId);
                processedCount++;
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, processed: processedCount })
        };

    } catch (error) {
        console.error("Cron Execution Error:", error.message);
        return { statusCode: 500, body: error.message };
    }
};

async function executeLogic(auto, autoId, sellerId) {
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
                details = `ALERT: ${lowStockItems.length} products have low stock (<= ${threshold}). Items: ${lowStockItems.join(', ')}`;

                // Trigger actual notification alert
                await triggerAlertNotification(sellerId, details, auto.name);
            } else {
                details = 'Stock levels verified. No low stock detected.';
            }
        }
        else if (auto.type === 'UPTIME_CHECK') {
            const url = auto.config.url;
            try {
                const res = await fetch(url, { timeout: 10000 });
                if (res.ok) {
                    details = `Uptime Check: ${url} is ONLINE (HTTP ${res.status})`;
                } else {
                    status = 'ERROR';
                    details = `Uptime Check: ${url} returned error status (HTTP ${res.status})`;
                    await triggerAlertNotification(sellerId, details, auto.name);
                }
            } catch (e) {
                status = 'ERROR';
                details = `Uptime Check: ${url} is DOWN or UNREACHABLE. Error: ${e.message}`;
                await triggerAlertNotification(sellerId, details, auto.name);
            }
        }
        else if (auto.type === 'DAILY_REPORT') {
            // Aggregate daily stats
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

            const ordersSnap = await db.collection('orders')
                .where('sellerId', '==', sellerId)
                .where('date', '>=', startOfDay)
                .get();

            let totalRevenue = 0;
            ordersSnap.forEach(d => totalRevenue += (d.data().total || 0));

            details = `REPORT [${now.toLocaleDateString()}]: ${ordersSnap.size} Orders, Total Revenue: ₹${totalRevenue.toFixed(2)}`;
            await triggerAlertNotification(sellerId, details, auto.name);
        }

        // 1. Log History
        await db.collection('service_automation_logs').add({
            automationId: autoId,
            ownerId: sellerId,
            type: auto.type,
            timestamp,
            status,
            details
        });

        // 2. Update Automation State
        await db.collection('service_automations').doc(autoId).update({
            lastRunAt: timestamp,
            lastResult: details
        });

    } catch (err) {
        console.error(`[EXECUTION FAIL] ${autoId}:`, err.message);
    }
}

async function triggerAlertNotification(sellerId, message, taskName) {
    try {
        const sellerSnap = await db.collection('sellers').doc(sellerId).get();
        if (!sellerSnap.exists) return;
        const seller = sellerSnap.data();

        // Use existing send-login-notification function for SMTP delivery
        const host = 'codez48.netlify.app';
        await fetch(`https://${host}/.netlify/functions/send-login-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'TEST_SMTP', // Reusing template
                siteId: sellerId,
                notificationEmail: seller.email,
                headerText: `Automation Alert: ${taskName}`,
                businessDescription: message,
                ctaText: 'View Dashboard',
                ctaUrl: `https://${host}/tools/index.html`
            })
        });
    } catch (e) {
        console.warn("[NOTIFICATION FAIL]:", e.message);
    }
}
