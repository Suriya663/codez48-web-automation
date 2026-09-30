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
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
            }
        };
    }

    if (!initAdmin() || !db) {
        return jsonResponse(500, { success: false, error: "Database unavailable" });
    }

    try {
        if (event.httpMethod === "POST") {
            const body = JSON.parse(event.body || '{}');
            const requestId = body.requestId || `VISUAL-${Date.now()}`;

            console.log(`[FIREBASE_REQUEST_CREATED] requestId=${requestId}, size=${body.fileSize || 'unknown'} bytes`);

            await db.collection('visual_analysis_requests').doc(requestId).set({
                ...body,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            return jsonResponse(200, { success: true, requestId, message: "Visual analysis request recorded successfully" });
        }

        // GET request: Fetch requests from pilot_requests and visual_analysis_requests
        const snapshot = await db.collection('pilot_requests')
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();

        const visualSnapshot = await db.collection('visual_analysis_requests')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        const requests = [];
        snapshot.forEach(doc => {
            const d = doc.data();
            requests.push({
                requestId: d.requestId || doc.id,
                timestamp: d.timestamp || new Date().toISOString(),
                taskType: d.taskType || 'GENERAL',
                application: d.application || 'unknown',
                promptPreview: (d.prompt || d.originalGoal || '').substring(0, 150),
                originalGoal: d.originalGoal || d.prompt || 'Open Codez48 and click CLI from the top navigation.',
                website: d.website || d.url || 'https://codez48.netlify.app',
                status: d.status || 'SENT_TO_PILOT',
                target: d.target || d.semanticTarget || null,
                responseLength: d.responseLength || 0,
                artifactsCount: d.artifactsCount || 0,
                updatedAt: d.updatedAt || null
            });
        });

        const visualRequests = [];
        visualSnapshot.forEach(doc => {
            const d = doc.data();
            visualRequests.push({
                requestId: d.requestId || doc.id,
                type: d.type || 'SCREEN_ANALYSIS',
                status: d.status || 'COMPLETED',
                screenshotWidth: d.screenshotWidth || 0,
                screenshotHeight: d.screenshotHeight || 0,
                screenshotData: d.screenshotData || null, // INCLUDE COMPLETE SCREENSHOT DATA FOR LIVE PREVIEW
                ocrCount: d.ocrCount || (d.ocr ? d.ocr.length : 0),
                elementsCount: d.elementsCount || (d.elements ? d.elements.length : 0),
                targetElement: d.targetElement || null,
                createdAt: d.createdAt || new Date().toISOString(),
                updatedAt: d.updatedAt || null,
                ocr: d.ocr || [],
                elements: d.elements || []
            });
        });

        return jsonResponse(200, {
            success: true,
            totalRequests: requests.length,
            requests,
            visualRequests
        });
    } catch (error) {
        console.error("Pilot Monitor Error:", error.message);
        return jsonResponse(500, { success: false, error: error.message });
    }
};
