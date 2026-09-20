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
        console.error('Firebase Admin Init Failure in add-product:', e.message);
        return false;
    }
};

const slugify = (text) => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');

exports.handler = async (event, context) => {
    // 1. Preflight
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
        // 2. Authenticate CLI via API Key
        const apiKey = event.headers['x-api-key'];
        if (!apiKey) {
            return jsonResponse(401, { success: false, error: "Authentication Required: Missing x-api-key header." });
        }

        const keySnap = await db.collection('api_keys').doc(apiKey).get();
        if (!keySnap.exists || keySnap.data().status !== 'ACTIVE') {
            return jsonResponse(403, { success: false, error: "Forbidden: Invalid or inactive API Key." });
        }

        const keyData = keySnap.data();
        const sellerId = keyData.userId;

        // 3. Parse and Validate Payload
        const body = JSON.parse(event.body);
        const { name, category, price, mrp, stock, description, image, type } = body;

        if (!name || isNaN(price)) {
            return jsonResponse(400, { success: false, error: "Validation Failed: 'name' and numeric 'price' are required." });
        }

        // 4. Schema Sync with Website
        const pid = slugify(name) + '-' + Math.random().toString(36).substr(2, 5);
        const productData = {
            name,
            category: category || 'Uncategorized',
            image: image || '',
            images: image ? [image] : [],
            stock: parseInt(stock) || 0,
            mrp: parseInt(mrp) || parseInt(price),
            price: parseInt(price),
            shippingCharge: 0,
            purchaseCount: 0,
            isDynamic: true,
            type: type || 'physical',
            isSpecialOffer: false,
            offerBackground: '',
            description: description || '',
            seoDescription: '',
            sellerId: sellerId,
            lastUpdated: new Date().toISOString()
        };

        await db.collection('products').doc(pid).set(productData);

        // 5. Fetch Seller Info for Email
        const sellerSnap = await db.collection('sellers').doc(sellerId).get();
        const sellerInfo = sellerSnap.exists ? sellerSnap.data() : {};

        // 6. Trigger Automated Notification
        const host = event.headers.host || 'codez48.netlify.app';
        const protocol = event.headers['x-forwarded-proto'] || 'https';

        try {
            await fetch(`${protocol}://${host}/.netlify/functions/productCreated`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'SELLER_PRODUCT_CREATED',
                    sellerId,
                    sellerBrand: sellerInfo.brand || sellerInfo.name || 'Merchant',
                    sellerEmail: sellerInfo.email || 'codez4848@gmail.com',
                    sellerMobile: sellerInfo.mobile || 'N/A',
                    productId: pid,
                    productName: name,
                    price: price,
                    category: productData.category,
                    createdAt: new Date().toISOString(),
                    productUrl: `${protocol}://${host}/seller/index.html?s=${sellerInfo.username || sellerId}`
                })
            });
        } catch (emailErr) {
            console.warn("[CLI_EMAIL_WARN] Notification could not be dispatched:", emailErr.message);
        }

        return jsonResponse(200, {
            success: true,
            message: "Product created successfully via Codez48 CLI",
            productId: pid,
            sellerId: sellerId
        });

    } catch (error) {
        console.error("CLI Add Product Error:", error.message);
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
