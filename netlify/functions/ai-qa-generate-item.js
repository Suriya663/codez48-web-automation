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
        console.log("[AI QA] pipeline initiated...");
        const uid = await verifyToken(event);
        console.log("[AI QA] User authorized:", uid);

        const { workspaceId, provider, chunk, index } = JSON.parse(event.body);

        const db = admin.firestore();
        console.log("[AI QA] Fetching connection for:", provider);

        const connSnap = await db.collection('providerConnections').doc(`${provider}_${uid}`).get();
        if (!connSnap.exists) {
            console.warn("[AI QA] Provider not linked.");
            throw new Error("Provider not connected. Please link your API key in AI Providers tab.");
        }

        const conn = connSnap.data();
        console.log("[AI QA] Decrypting API Key...");
        const apiKey = decrypt(conn.encryptedKey, conn.iv, conn.authTag);

        console.log("[AI QA] Initializing provider adapter...");
        const ai = getProvider({ provider, apiKey });

        const prompt = `Task: Convert this text into a Question and Answer pair for AI training.
Requirement: Output valid JSON only: {"question": "...", "answer": "..."}
Text to process:
${chunk}`;

        console.log("[AI QA] Requesting inference...");
        const res = await ai.generateText(prompt);
        console.log("[AI QA] Inference complete.");

        let qa;
        try {
            const jsonMatch = res.text.match(/\{.*\}/s);
            if (!jsonMatch) throw new Error("No JSON found in response");
            qa = JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error("[AI QA] JSON Parsing Error:", res.text);
            throw new Error("AI failed to produce valid structured data. Please try again.");
        }

        const qaId = `QA_${workspaceId}_${Date.now()}_${index}`;
        const qaData = {
            qaId,
            workspaceId,
            ownerId: uid,
            question: qa.question,
            answer: qa.answer,
            sourceChunk: chunk,
            provider,
            model: res.model,
            status: 'GENERATED',
            createdAt: new Date().toISOString()
        };

        console.log("[AI QA] Storing Q&A node:", qaId);
        await db.collection('qaItems').doc(qaId).set(qaData);
        console.log("[AI QA] Node stored successfully.");

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
            body: JSON.stringify({ success: true, qa: qaData })
        };
    } catch (error) {
        console.error("[AI QA] Function Crash:", error.message);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
            body: JSON.stringify({ error: error.message })
        };
    }
};
