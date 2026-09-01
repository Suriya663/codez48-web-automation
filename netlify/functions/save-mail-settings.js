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
        const {
            action = 'SAVE',
            siteId = 'site_001',
            userId,
            notificationEmail,
            mailAutomation,
            enableDailyCron = false,
            recipients = [],
            templatePayload = {},
            activeApiKey = ''
        } = payload;

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
                        settings: { siteId, notificationEmail: '', mailAutomation: true, enableDailyCron: false }
                    })
                };
            }
        }

        // SAVE SETTINGS
        const targetEmail = (notificationEmail && notificationEmail.includes('@')) ? notificationEmail.trim().toLowerCase() : 'codez4848@gmail.com';

        const settingsData = {
            siteId,
            userId: userId || siteId,
            notificationEmail: targetEmail,
            mailAutomation: mailAutomation !== false,
            enableDailyCron: Boolean(enableDailyCron),
            activeApiKey: activeApiKey || '',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await settingsRef.set(settingsData, { merge: true });

        // Save Daily Background Schedule in mail_automation_schedules
        const scheduleRef = db.collection('mail_automation_schedules').doc(siteId);
        await scheduleRef.set({
            siteId,
            userId: userId || siteId,
            notificationEmail: targetEmail,
            mailAutomation: mailAutomation !== false,
            enableDailyCron: Boolean(enableDailyCron),
            recipients: recipients || [],
            templatePayload: templatePayload || {},
            activeApiKey: activeApiKey || '',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`[MAIL SETTINGS & SCHEDULE SAVED] Site: ${siteId} -> Email: ${targetEmail} | Daily Cron: ${enableDailyCron}`);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                success: true,
                message: "Mail Automation settings & daily schedule saved successfully.",
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
