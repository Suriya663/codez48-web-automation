/**
 * CODEZ48 HTTPS REMOTE DEVICE SYNC FUNCTION (Netlify Serverless)
 * Serves: https://codez48.netlify.app/.netlify/functions/remote-device-sync
 * 
 * Provides secure HTTPS cloud pairing and automated data upload/download between
 * Host Laptop (CLI generator) and remote client devices (Mobile phones, PCs, tablets).
 * Zero-install, eliminates localhost limitations, supports automatic data upload on approval.
 */

const admin = require('firebase-admin');

let isInitialized = false;
let db = null;

const initAdmin = () => {
    if (isInitialized) return true;
    try {
        let saVar = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!saVar) {
            const fs = require('fs');
            const path = require('path');
            const envPaths = [
                path.join(__dirname, '../../.env'),
                'C:/Users/suriya prakash/OneDrive/Desktop/web/.env'
            ];
            for (const ep of envPaths) {
                if (fs.existsSync(ep)) {
                    const c = fs.readFileSync(ep, 'utf8');
                    const m = c.match(/FIREBASE_SERVICE_ACCOUNT='([\s\S]*?)'/);
                    if (m) { saVar = m[1]; break; }
                }
            }
        }

        if (!saVar) {
            if (admin.apps.length === 0) admin.initializeApp({ projectId: 'nshandlooms-a19be' });
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
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id || 'nshandlooms-a19be'
            });
        }
        db = admin.firestore();
        isInitialized = true;
        return true;
    } catch (e) {
        console.error('Firebase Admin Init Failure in remote-device-sync:', e.message);
        return false;
    }
};

const jsonResponse = (statusCode, data) => ({
    statusCode,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
    },
    body: JSON.stringify(data)
});

exports.handler = async (event, context) => {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
            }
        };
    }

    if (!initAdmin() || !db) {
        return jsonResponse(500, { success: false, error: "Cloud database unavailable" });
    }

    const method = event.httpMethod;
    let body = {};
    if (method === 'POST') {
        try {
            body = event.body ? JSON.parse(event.body) : {};
        } catch (_) {
            return jsonResponse(400, { success: false, error: "Invalid JSON body" });
        }
    }

    const action = (body.action || event.queryStringParameters?.action || '').toUpperCase();

    try {
        // 1. REGISTER ACTIVE SESSION (Called by Laptop 1 CLI)
        if (action === 'REGISTER_SESSION') {
            const pin = String(body.pin || '').trim();
            const sessionId = body.sessionId || `SES-${pin}-${Date.now()}`;
            if (!pin || pin.length !== 6) {
                return jsonResponse(400, { success: false, error: "A valid 6-digit PIN is required." });
            }

            const sessionData = {
                sessionId,
                pin,
                hostname: body.hostname || 'Host PC',
                hostIp: body.hostIp || '127.0.0.1',
                port: body.port || 4848,
                status: 'WAITING_APPROVAL',
                approved: false,
                approvedDevice: null,
                approvedAt: null,
                autoUpload: true,
                deliverables: body.deliverables || [],
                latestDeliverable: body.latestDeliverable || null,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            await db.collection('remote_device_sessions').doc(sessionId).set(sessionData, { merge: true });
            // Also store pin lookup index
            await db.collection('remote_device_pins').doc(pin).set({
                sessionId,
                pin,
                updatedAt: Date.now()
            });

            return jsonResponse(200, {
                success: true,
                sessionId,
                pin,
                websiteUrl: `https://codez48.netlify.app/tools/remote.html?pin=${pin}`,
                message: "Session registered securely on HTTPS cloud bridge"
            });
        }

        // 2. VERIFY PIN & APPROVE CONNECTION (Called by Mobile Phone or PC over HTTPS)
        if (action === 'VERIFY_PIN_AND_APPROVE') {
            const pin = String(body.pin || '').trim();
            const deviceUserAgent = body.userAgent || event.headers['user-agent'] || 'Remote Client Device';

            if (!pin || pin.length !== 6) {
                return jsonResponse(400, { success: false, error: "Please enter a valid 6-digit PIN" });
            }

            // Look up session by PIN
            const pinDoc = await db.collection('remote_device_pins').doc(pin).get();
            if (!pinDoc.exists) {
                return jsonResponse(404, { success: false, error: "PIN not found or expired. Check Host Laptop screen." });
            }

            const { sessionId } = pinDoc.data();
            const sessionRef = db.collection('remote_device_sessions').doc(sessionId);
            const sessionSnap = await sessionRef.get();

            if (!sessionSnap.exists) {
                return jsonResponse(404, { success: false, error: "Session record expired." });
            }

            // Mark session as approved
            const now = Date.now();
            await sessionRef.update({
                approved: true,
                status: 'APPROVED_AUTOMATIC_UPLOAD_READY',
                approvedDevice: deviceUserAgent,
                approvedAt: now,
                updatedAt: now
            });

            const sessionData = sessionSnap.data();

            // Check if payload is already attached
            const payloadSnap = await db.collection('remote_device_payloads').doc(sessionId).get();
            const payloadData = payloadSnap.exists ? payloadSnap.data() : null;

            return jsonResponse(200, {
                success: true,
                approved: true,
                sessionId,
                hostname: sessionData.hostname,
                deliverables: sessionData.deliverables || [],
                latestDeliverable: sessionData.latestDeliverable,
                payloadReady: !!payloadData,
                payload: payloadData,
                autoUpload: true,
                message: "Connection approved successfully. Generator data auto-upload triggered."
            });
        }

        // 3. CHECK APPROVAL STATUS (Called by Laptop 1 CLI)
        if (action === 'CHECK_APPROVAL') {
            const sessionId = body.sessionId || event.queryStringParameters?.sessionId;
            if (!sessionId) {
                return jsonResponse(400, { success: false, error: "sessionId required" });
            }

            const doc = await db.collection('remote_device_sessions').doc(sessionId).get();
            if (!doc.exists) {
                return jsonResponse(404, { success: false, error: "Session not found" });
            }

            const data = doc.data();
            return jsonResponse(200, {
                success: true,
                approved: !!data.approved,
                approvedDevice: data.approvedDevice,
                approvedAt: data.approvedAt,
                status: data.status
            });
        }

        // 4. UPLOAD GENERATOR PAYLOAD (Called by Laptop 1 CLI once approved)
        if (action === 'UPLOAD_PAYLOAD') {
            const sessionId = body.sessionId;
            if (!sessionId) {
                return jsonResponse(400, { success: false, error: "sessionId required" });
            }

            const payload = {
                sessionId,
                filename: body.filename,
                fileType: body.fileType || 'pptx',
                sizeBytes: body.sizeBytes,
                base64Data: body.base64Data, // data URL or base64 chunk
                uploadedAt: Date.now()
            };

            await db.collection('remote_device_payloads').doc(sessionId).set(payload);
            await db.collection('remote_device_sessions').doc(sessionId).update({
                payloadReady: true,
                latestDeliverable: {
                    filename: body.filename,
                    fileType: body.fileType,
                    sizeBytes: body.sizeBytes,
                    uploadedAt: Date.now()
                },
                updatedAt: Date.now()
            });

            return jsonResponse(200, {
                success: true,
                message: "Generator payload uploaded successfully to HTTPS cloud"
            });
        }

        // 5. GET PAYLOAD (Called by Mobile Phone / PC to automatically download the file)
        if (action === 'GET_PAYLOAD') {
            const sessionId = body.sessionId || event.queryStringParameters?.sessionId;
            const pin = body.pin || event.queryStringParameters?.pin;

            let targetSessionId = sessionId;
            if (!targetSessionId && pin) {
                const pDoc = await db.collection('remote_device_pins').doc(pin).get();
                if (pDoc.exists) targetSessionId = pDoc.data().sessionId;
            }

            if (!targetSessionId) {
                return jsonResponse(400, { success: false, error: "sessionId or pin required" });
            }

            const payloadSnap = await db.collection('remote_device_payloads').doc(targetSessionId).get();
            if (!payloadSnap.exists) {
                return jsonResponse(404, { success: false, error: "Payload not ready yet." });
            }

            const payload = payloadSnap.data();
            return jsonResponse(200, {
                success: true,
                payloadReady: true,
                filename: payload.filename,
                fileType: payload.fileType,
                sizeBytes: payload.sizeBytes,
                base64Data: payload.base64Data
            });
        }

        // 6. GET ACTIVE SESSION INFO
        if (action === 'GET_SESSION') {
            const pin = event.queryStringParameters?.pin || body.pin;
            if (!pin) return jsonResponse(400, { success: false, error: "PIN required" });

            const pinDoc = await db.collection('remote_device_pins').doc(pin).get();
            if (!pinDoc.exists) return jsonResponse(404, { success: false, error: "PIN not found" });

            const { sessionId } = pinDoc.data();
            const sDoc = await db.collection('remote_device_sessions').doc(sessionId).get();
            if (!sDoc.exists) return jsonResponse(404, { success: false, error: "Session not found" });

            return jsonResponse(200, { success: true, session: sDoc.data() });
        }

        return jsonResponse(400, { success: false, error: `Unknown action: ${action}` });

    } catch (err) {
        console.error('remote-device-sync error:', err);
        return jsonResponse(500, { success: false, error: err.message });
    }
};
