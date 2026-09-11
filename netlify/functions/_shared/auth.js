const admin = require('firebase-admin');

let isInitialized = false;

const initAdmin = () => {
    if (isInitialized) return;
    const saVar = process.env.FIREBASE_SERVICE_ACCOUNT;

    console.log(`[AUTH_SHARED] Firebase Admin Init. Service Account Present: ${!!saVar}`);

    if (!saVar) {
        if (admin.apps.length === 0) admin.initializeApp();
    } else {
        try {
            const serviceAccount = JSON.parse(saVar.trim());
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }
            if (admin.apps.length === 0) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            }
        } catch (e) {
            console.error("[AUTH_SHARED] JSON Parse/Init Error:", e.message);
        }
    }
    isInitialized = true;
};

const verifyToken = async (event) => {
    initAdmin();

    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error("[AUTH_SHARED] Missing Auth Header");
        throw new Error("Unauthorized: Missing Token.");
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) {
        console.error("[AUTH_SHARED] Token Verify Failure:", error.message);
        throw new Error("Unauthorized: Invalid Session.");
    }
};

module.exports = { verifyToken, admin };
