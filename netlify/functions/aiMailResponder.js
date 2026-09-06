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
        console.error('Firebase Admin Init Failure in aiMailResponder:', e.message);
        return false;
    }
};

/**
 * AI Mail Responder Endpoint (Inbound Email Classification & Suggestion)
 */
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

    if (!initAdmin() || !db) {
        return { statusCode: 500, body: JSON.stringify({ error: "Database unavailable." }) };
    }

    try {
        const data = JSON.parse(event.body || '{}');
        const { campaignId, recipientEmail, messageContent } = data;

        if (!campaignId || !recipientEmail || !messageContent) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields." }) };
        }

        // Logic for AI Classification and Suggestion would go here.
        // For now, we log the reply in the conversation thread.

        const threadRef = db.collection('ai_mail_conversations').doc(`${campaignId}_${recipientEmail.replace(/[^a-zA-Z0-9]/g, '_')}`);

        await threadRef.set({
            campaignId,
            recipientEmail,
            lastMessageAt: new Date().toISOString(),
            status: 'reply_received'
        }, { merge: true });

        await threadRef.collection('messages').add({
            role: 'customer',
            content: messageContent,
            timestamp: new Date().toISOString()
        });

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ success: true, message: "Reply logged and queued for AI analysis." })
        };

    } catch (error) {
        console.error("AI Mail Responder Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
