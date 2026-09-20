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
        console.error('Firebase Admin Init Failure in cli-update-product:', e.message);
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
        const body = JSON.parse(event.body);
        const { productId, ...updateData } = body;

        if (!productId) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ success: false, error: "Product ID is required for update." })
            };
        }

        const productRef = db.collection('products').doc(productId);
        const productSnap = await productRef.get();

        if (!productSnap.exists) {
            return {
                statusCode: 404,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ success: false, error: "Product not found." })
            };
        }

        const productData = productSnap.data();
        if (productData.sellerId !== sellerId) {
            return {
                statusCode: 403,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ success: false, error: "Unauthorized: You do not own this product." })
            };
        }

        // Apply partial updates
        const allowedFields = ['name', 'category', 'price', 'mrp', 'stock', 'description', 'image', 'type'];
        const finalUpdate = { lastUpdated: new Date().toISOString() };

        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                finalUpdate[field] = (field === 'price' || field === 'mrp' || field === 'stock')
                    ? parseInt(updateData[field])
                    : updateData[field];
            }
        });

        await productRef.update(finalUpdate);

        // Fetch Seller Info for Email
        const sellerSnap = await db.collection('sellers').doc(sellerId).get();
        const sellerInfo = sellerSnap.exists ? sellerSnap.data() : {};

        // Trigger Notification
        const host = event.headers.host || 'codez48.netlify.app';
        const protocol = event.headers['x-forwarded-proto'] || 'https';

        try {
            await fetch(`${protocol}://${host}/.netlify/functions/productUpdated`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'SELLER_PRODUCT_UPDATED',
                    sellerId,
                    sellerBrand: sellerInfo.brand || sellerInfo.name || 'Merchant',
                    sellerEmail: sellerInfo.email || 'codez4848@gmail.com',
                    productId,
                    productName: finalUpdate.name || productData.name,
                    updatedAt: new Date().toISOString()
                })
            });
        } catch (e) {}

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ success: true, message: "Product updated successfully.", productId })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};
