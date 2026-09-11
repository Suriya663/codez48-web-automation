const { verifyToken, admin } = require('./_shared/auth');
const { decrypt } = require('./_shared/crypto');
const { getProvider } = require('./_shared/ai-providers/provider-factory');

exports.handler = async (event) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "POST, OPTIONS" } };
    if (event.httpMethod !== "POST") return { statusCode: 405 };

    try {
        const uid = await verifyToken(event);
        const { workspaceId, provider, chunk, index } = JSON.parse(event.body);

        const db = admin.firestore();
        const connSnap = await db.collection('providerConnections').doc(`${provider}_${uid}`).get();
        if (!connSnap.exists) throw new Error("Provider not connected");

        const conn = connSnap.data();
        const apiKey = decrypt(conn.encryptedKey, conn.iv, conn.authTag);
        const ai = getProvider({ provider, apiKey });

        const prompt = `Convert this text into a Question and Answer pair. Return JSON only: {"question": "...", "answer": "..."}\n\nText: ${chunk}`;
        const res = await ai.generateText(prompt);

        let qa;
        try { qa = JSON.parse(res.text.match(/\{.*\}/s)[0]); } catch (e) { throw new Error("AI JSON Error"); }

        const qaId = `QA_${workspaceId}_${Date.now()}_${index}`;
        const qaData = {
            qaId, workspaceId, ownerId: uid, question: qa.question, answer: qa.answer,
            sourceChunk: chunk, provider, model: res.model, status: 'GENERATED', createdAt: new Date().toISOString()
        };
        await db.collection('qaItems').doc(qaId).set(qaData);

        return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ success: true, qa: qaData }) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
