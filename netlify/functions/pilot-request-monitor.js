const admin = require('firebase-admin');

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
        console.error('Firebase Admin Init Failure in pilot-request-monitor:', e.message);
        return false;
    }
};

const jsonResponse = (statusCode, data) => ({
    statusCode,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(data)
});

exports.handler = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "GET, OPTIONS"
            }
        };
    }

    if (!initAdmin() || !db) {
        return jsonResponse(500, { success: false, error: "Database unavailable" });
    }

    try {
        // Fetch last 30 requests from Firestore pilot_requests collection
        const snapshot = await db.collection('pilot_requests')
            .orderBy('timestamp', 'desc')
            .limit(30)
            .get();

        const requests = [];
        snapshot.forEach(doc => {
            const d = doc.data();
            // EXCLUDE all secrets, headers, and keys for 100% security
            requests.push({
                requestId: d.requestId || doc.id,
                timestamp: d.timestamp || new Date().toISOString(),
                taskType: d.taskType || 'GENERAL',
                application: d.application || 'unknown',
                promptPreview: (d.prompt || '').substring(0, 100),
                status: d.status || 'SENT_TO_PILOT',
                responseLength: d.responseLength || 0,
                artifactsCount: d.artifactsCount || 0,
                updatedAt: d.updatedAt || null
            });
        });

        return jsonResponse(200, {
            success: true,
            totalRequests: requests.length,
            requests
        });
    } catch (error) {
        console.error("Pilot Monitor Error:", error.message);
        return jsonResponse(500, { success: false, error: error.message });
    }
};
