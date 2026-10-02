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
        // Return 200 instead of 500 so the frontend doesn't crash, but indicate DB is offline
        return jsonResponse(200, { success: false, error: "Database unavailable", requests: [], visualRequests: [] });
    }

    try {
        if (event.httpMethod === "POST") {
            let body = {};
            try {
                body = event.body ? JSON.parse(event.body) : {};
            } catch (parseErr) {
                console.warn('[BODY PARSE WARNING] Failed to parse request body as JSON:', parseErr.message);
                body = { screenshotData: event.body };
            }
            const requestId = body.requestId || `VISUAL-${Date.now()}`;

            console.log(`[FIREBASE_REQUEST_CREATED] requestId=${requestId}, size=${body.fileSize || 'unknown'} bytes`);

            await db.collection('visual_analysis_requests').doc(requestId).set({
                createdAt: new Date().toISOString(),
                ...body,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            return jsonResponse(200, { success: true, requestId, message: "Visual analysis request recorded successfully" });
        }

        // GET request: Fetch requests
        const snapshot = await db.collection('pilot_requests')
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get();

        const visualSnapshot = await db.collection('visual_analysis_requests')
            .orderBy('createdAt', 'desc')
            .limit(3) // Reduced to 3 to prevent Netlify 6MB payload size limits
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
        let index = 0;
        visualSnapshot.forEach(doc => {
            const d = doc.data();
            visualRequests.push({
                requestId: d.requestId || doc.id,
                type: d.type || 'SCREEN_ANALYSIS',
                status: d.status || 'COMPLETED',
                originalGoal: d.originalGoal || d.userRequirement || d.query || null,
                url: d.url || d.website || null,
                title: d.title || d.pageTitle || null,
                scrollPosition: d.scrollPosition || null,
                screenshotWidth: d.screenshotWidth || 0,
                screenshotHeight: d.screenshotHeight || 0,
                // Only send large base64 payload for the most recent request to avoid HTTP 500 payload limit crash
                screenshotData: index < 1 ? d.screenshotData : null,
                domContent: index < 1 ? (d.domContent ? d.domContent.substring(0, 10000) : null) : null,
                ocrCount: d.ocrCount || (d.ocr ? d.ocr.length : 0),
                elementsCount: d.elementsCount || (d.elements ? d.elements.length : 0),
                targetElement: d.targetElement || null,
                createdAt: d.createdAt || new Date().toISOString(),
                updatedAt: d.updatedAt || null,
                ocr: d.ocr || [],
                elements: d.elements || []
            });
            index++;
        });

        return jsonResponse(200, {
            success: true,
            totalRequests: requests.length,
            requests,
            visualRequests
        });
    } catch (error) {
        console.error("Pilot Monitor Error:", error.message);
        // Fallback to empty array so frontend doesn't throw 500 console errors
        return jsonResponse(200, { success: false, error: error.message, requests: [], visualRequests: [] });
    }
};
