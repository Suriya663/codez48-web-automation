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
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        }
        db = admin.firestore();
        isInitialized = true;
        return true;
    } catch (e) {
        console.error('Firebase Admin Init Failure in save-mail-settings:', e.message);
        return false;
    }
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
        const payload = JSON.parse(event.body || '{}');
        const { action = 'SAVE', siteId = 'site_001', userId, notificationEmail, mailAutomation } = payload;

        if (!initAdmin() || !db) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database Connection Failed" })
            };
        }

        const settingsRef = db.collection('mail_automation_settings').doc(siteId);

        // GET SAVED SETTINGS
        if (action === 'GET') {
            const docSnap = await settingsRef.get();
            if (docSnap.exists) {
                return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ success: true, settings: docSnap.data() })
                };
            } else {
                return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        success: true,
                        settings: { siteId, notificationEmail: '', mailAutomation: true }
                    })
                };
            }
        }

        // SAVE SETTINGS
        if (!notificationEmail || !notificationEmail.includes('@')) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Valid notificationEmail is required." })
            };
        }

        const settingsData = {
            siteId,
            userId: userId || siteId,
            notificationEmail: notificationEmail.trim().toLowerCase(),
            mailAutomation: mailAutomation !== false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await settingsRef.set(settingsData, { merge: true });

        console.log(`[MAIL SETTINGS SAVED] Site: ${siteId} -> Email: ${notificationEmail}`);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                success: true,
                message: "Mail Automation settings saved successfully.",
                settings: settingsData
            })
        };

    } catch (error) {
        console.error("Save Mail Settings Error:", error.message);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: error.message })
        };
    }
};
