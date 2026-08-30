const admin = require('firebase-admin');

let isInitialized = false;
let db = null;

const initAdmin = () => {
  if (isInitialized) return true;
  try {
    const saVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!saVar) throw new Error('Config Error: FIREBASE_SERVICE_ACCOUNT missing');

    let serviceAccount;
    let rawData = saVar.trim();
    if ((rawData.startsWith('"') && rawData.endsWith('"')) || (rawData.startsWith("'") && rawData.endsWith("'"))) {
      rawData = rawData.substring(1, rawData.length - 1);
    }
    serviceAccount = JSON.parse(rawData);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

    if (admin.apps.length === 0) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    db = admin.firestore();
    isInitialized = true;
    return true;
  } catch (e) {
    console.error('Firebase Admin Init Failure:', e.message);
    return false;
  }
};

exports.handler = async (event, context) => {
    // 1. Handle CORS Preflight
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
        return {
            statusCode: 405,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Method Not Allowed" })
        };
    }

    try {
        const sid = event.queryStringParameters.sid || "guest";
        const payload = JSON.parse(event.body);

        if (initAdmin()) {
            await db.collection('webhook_inbox').add({
                userId: sid,
                data: payload,
                receivedAt: admin.firestore.FieldValue.serverTimestamp(),
                source: event.headers['user-agent'] || 'unknown',
                ip: event.headers['x-nf-client-connection-ip'] || 'unknown'
            });

            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ success: true, message: "Data received by Codez48 Gateway" })
            };
        } else {
            throw new Error("Internal Protocol Failure");
        }

    } catch (error) {
        console.error("Webhook Gateway Error:", error.message);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: error.message })
        };
    }
};
