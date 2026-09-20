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
        console.error('Firebase Admin Init Failure in cli-list-products:', e.message);
        return false;
    }
};

exports.handler = async (event, context) => {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type, x-api-key",
                "Access-Control-Allow-Methods": "GET, OPTIONS"
            }
        };
    }

    if (event.httpMethod !== "GET") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    if (!initAdmin() || !db) {
        return { statusCode: 500, body: "Database unavailable" };
    }

    try {
        const apiKey = event.headers['x-api-key'];
        if (!apiKey) {
            return {
                statusCode: 401,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ success: false, error: "Authentication Required" })
            };
        }

        const keySnap = await db.collection('api_keys').doc(apiKey).get();
        if (!keySnap.exists || keySnap.data().status !== 'ACTIVE') {
            return {
                statusCode: 403,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ success: false, error: "Invalid or inactive API Key." })
            };
        }

        const sellerId = keySnap.data().userId;

        // Fetch products for this seller
        const productsSnap = await db.collection('products').where('sellerId', '==', sellerId).get();
        const products = [];
        productsSnap.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ success: true, count: products.length, products })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};
