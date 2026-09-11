const { verifyToken, admin } = require('./_shared/auth');
const { decrypt } = require('./_shared/crypto');
const { getProvider } = require('./_shared/ai-providers/provider-factory');

exports.handler = async (event) => {
    // CORS
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Methods": "POST, OPTIONS"
            }
        };
    }

    if (event.httpMethod !== "POST") return { statusCode: 405 };

    try {
        if (!event.body) throw new Error("Missing request body");

        const uid = await verifyToken(event);
        const body = JSON.parse(event.body);
        const { workspaceId, provider, chunk, index } = body;

        const db = admin.firestore();

        // 1. Get Connection
        const connSnap = await db.collection('providerConnections').doc(`${provider}_${uid}`).get();
        if (!connSnap.exists) {
            return {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ error: `Provider '${provider}' not linked. Please connect it in the AI Providers tab.` })
            };
        }

        const conn = connSnap.data();
        const apiKey = decrypt(conn.encryptedKey, conn.iv, conn.authTag);

        // 2. Initialize Provider
        const ai = getProvider({ provider, apiKey });

        const prompt = `Task: Generate a single Question and Answer pair from the text below.
Requirement: JSON output only: {"question": "...", "answer": "..."}.
Text:
${chunk}`;

        // 3. Inference
        const res = await ai.generateText(prompt);

        // 4. Parse AI Output
        let qa;
        try {
            const jsonStr = res.text.match(/\{.*\}/s)[0];
            qa = JSON.parse(jsonStr);
        } catch (e) {
            console.error("[AI QA] Parse Failed:", res.text);
            throw new Error("AI failed to return valid structured data. Please try a different chunk.");
        }

        // 5. Persist
        const qaId = `QA_${workspaceId}_${Date.now()}_${index}`;
        const qaData = {
            qaId, workspaceId, ownerId: uid,
            question: qa.question, answer: qa.answer,
            sourceChunk: chunk, provider, model: res.model,
            status: 'GENERATED', createdAt: new Date().toISOString()
        };

        await db.collection('qaItems').doc(qaId).set(qaData);

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ success: true, qa: qaData })
        };

    } catch (error) {
        console.error("[AI QA] Execution Failure:", error.message);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
            body: JSON.stringify({ error: error.message || "Internal Server Error" })
        };
    }
};
