const admin = require('firebase-admin');
const fetch = require('node-fetch');

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
        console.error('Firebase Admin Init Failure in cli-delete-product:', e.message);
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

const verifyApiKey = async (apiKey) => {
    if (!apiKey) return null;
    const keySnap = await db.collection('api_keys').doc(apiKey).get();
    if (!keySnap.exists || keySnap.data().status !== 'ACTIVE') return null;
    return keySnap.data().userId;
};

exports.handler = async (event, context) => {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type, x-api-key",
                "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS"
            }
        };
    }

    if (event.httpMethod !== "POST" && event.httpMethod !== "DELETE") {
        return jsonResponse(405, { success: false, error: "Method Not Allowed" });
    }

    if (!initAdmin() || !db) {
        return jsonResponse(500, { success: false, error: "Database unavailable" });
    }

    try {
        const apiKey = event.headers['x-api-key'];
        const sellerId = await verifyApiKey(apiKey);

        if (!sellerId) {
            return jsonResponse(401, { success: false, error: "Authentication Required" });
        }

        const body = JSON.parse(event.body);
        const { productId } = body;

        if (!productId) {
            return jsonResponse(400, { success: false, error: "Product ID is required for deletion." });
        }

        const productRef = db.collection('products').doc(productId);
        const productSnap = await productRef.get();

        if (!productSnap.exists) {
            return jsonResponse(404, { success: false, error: "Product not found." });
        }

        const productData = productSnap.data();
        if (productData.sellerId !== sellerId) {
            return jsonResponse(403, { success: false, error: "Unauthorized: You do not own this product." });
        }

        await productRef.delete();

        const sellerSnap = await db.collection('sellers').doc(sellerId).get();
        const sellerInfo = sellerSnap.exists ? sellerSnap.data() : {};

        const host = event.headers.host || 'codez48.netlify.app';
        const protocol = event.headers['x-forwarded-proto'] || 'https';

        try {
            await fetch(`${protocol}://${host}/.netlify/functions/productDeleted`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'SELLER_PRODUCT_DELETED',
                    sellerId,
                    sellerBrand: sellerInfo.brand || sellerInfo.name || 'Merchant',
                    sellerEmail: sellerInfo.email || 'codez4848@gmail.com',
                    productId,
                    productName: productData.name,
                    price: productData.price,
                    category: productData.category,
                    deletedAt: new Date().toISOString()
                })
            });
        } catch (e) {}

        return jsonResponse(200, { success: true, message: "Product deleted successfully.", productId });

    } catch (error) {
        return jsonResponse(500, { success: false, error: error.message });
    }
};
