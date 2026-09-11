const { verifyToken, admin } = require('./_shared/auth');
const { encrypt } = require('./_shared/crypto');

exports.handler = async (event) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "POST, OPTIONS" } };
    if (event.httpMethod !== "POST") return { statusCode: 405 };

    try {
        const uid = await verifyToken(event);
        const { provider, apiKey } = JSON.parse(event.body);
        if (!provider || !apiKey) throw new Error("Provider and Key required");

        const { encryptedKey, iv, authTag } = encrypt(apiKey);
        const db = admin.firestore();
        await db.collection('providerConnections').doc(`${provider}_${uid}`).set({
            ownerId: uid, provider, encryptedKey, iv, authTag, keyLast4: apiKey.slice(-4),
            status: 'CONNECTED', createdAt: new Date().toISOString(), lastValidatedAt: new Date().toISOString()
        });

        return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ success: true }) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
