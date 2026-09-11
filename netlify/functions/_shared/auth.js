const admin = require('firebase-admin');

let isInitialized = false;

const initAdmin = () => {
    if (isInitialized) return;
    const saVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!saVar) {
        if (admin.apps.length === 0) admin.initializeApp();
    } else {
        try {
            const serviceAccount = JSON.parse(saVar.trim());
            if (serviceAccount.private_key) serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            if (admin.apps.length === 0) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        } catch (e) {}
    }
    isInitialized = true;
};

const verifyToken = async (event) => {
    initAdmin();
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new Error("Unauthorized.");
    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) { throw new Error("Unauthorized."); }
};

module.exports = { verifyToken, admin };
