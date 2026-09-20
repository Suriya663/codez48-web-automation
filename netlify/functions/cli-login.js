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
        console.error('Firebase Admin Init Failure in cli-login:', e.message);
        return false;
    }
};

exports.handler = async (event, context) => {
    // 1. Preflight
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
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    if (!initAdmin() || !db) {
        return { statusCode: 500, body: "Database unavailable" };
    }

    try {
        const { sellerId, password } = JSON.parse(event.body);

        if (!sellerId || !password) {
            return jsonResponse(400, { success: false, error: "Validation Failed: 'sellerId' and 'password' are required." });
        }

        // 2. Search for Seller in 'sellers' or 'seller_requests'
        let q = db.collection('sellers').where('sellerId', '==', sellerId);
        let snap = await q.get();
        let folder = 'sellers';

        if (snap.empty) {
            q = db.collection('seller_requests').where('sellerId', '==', sellerId);
            snap = await q.get();
            folder = 'seller_requests';
        }

        if (snap.empty) {
            return jsonResponse(401, { success: false, error: "Authentication Failed: Merchant identity not found." });
        }

        const sellerDoc = snap.docs[0];
        const sellerData = sellerDoc.data();

        // 3. Verify Password (Existing raw-string logic)
        if (sellerData.password !== password) {
            return jsonResponse(401, { success: false, error: "Authentication Failed: Invalid password." });
        }

        const userId = sellerDoc.id; // Usually same as sellerId but using doc ID for consistency

        // 4. Retrieve or Create API Key
        let apiKey = null;
        const keyQ = db.collection('api_keys')
            .where('userId', '==', userId)
            .where('status', '==', 'ACTIVE')
            .limit(1);

        const keySnap = await keyQ.get();

        if (!keySnap.empty) {
            apiKey = keySnap.docs[0].id;
        } else {
            // Create a new CLI Session Key
            const keyId = 'c48_cli_' + Math.random().toString(36).substring(2, 12);
            const keyData = {
                keyId,
                userId,
                keyName: `CLI Session Key (${new Date().toLocaleDateString()})`,
                planType: 'CLI_SESSION',
                tokensTotal: 100,
                tokensRemaining: 100,
                emailsAllowed: 200,
                emailsSent: 0,
                dailyQuota: 50,
                dailySent: 0,
                recipientHistory: [],
                lastResetAt: new Date().toISOString(),
                status: 'ACTIVE',
                createdAt: new Date().toISOString()
            };
            await db.collection('api_keys').doc(keyId).set(keyData);
            apiKey = keyId;
        }

        return jsonResponse(200, {
            success: true,
            message: "CLI Login Successful",
            apiKey: apiKey,
            brand: sellerData.brand || sellerData.username
        });

    } catch (error) {
        console.error("CLI Login Error:", error.message);
        return jsonResponse(500, { success: false, error: "Internal Server Error: " + error.message });
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
