const { verifyToken, admin } = require('./_shared/auth');
const { decrypt } = require('./_shared/crypto');
const { getProvider } = require('./_shared/ai-providers/provider-factory');

exports.handler = async (event) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "POST, OPTIONS" } };
    if (event.httpMethod !== "POST") return { statusCode: 405 };

    try {
        const uid = await verifyToken(event);
        const { datasetId, prompt, temperature, max_tokens } = JSON.parse(event.body);

        if (!datasetId || !prompt) throw new Error("Dataset ID and Prompt required.");

        const db = admin.firestore();

        // 1. Fetch Dataset Context (RAG Simulation for MVP)
        // We fetch the latest curated Q&A pairs for this dataset to provide context
        const qaSnap = await db.collection('qaItems')
            .where('datasetId', '==', datasetId)
            .where('status', '==', 'FINALIZED')
            .limit(5)
            .get();

        let context = "";
        qaSnap.forEach(doc => {
            const data = doc.data();
            context += `Q: ${data.question}\nA: ${data.answer}\n\n`;
        });

        // 2. Resolve AI Provider
        // For simplicity in MVP, we look for a connected Groq or OpenAI key for this user
        const connectionsSnap = await db.collection('providerConnections').where('ownerId', '==', uid).limit(1).get();
        if (connectionsSnap.empty) throw new Error("No AI Provider connected. Please link Groq or OpenAI first.");

        const conn = connectionsSnap.docs[0].data();
        const apiKey = decrypt(conn.encryptedKey, conn.iv, conn.authTag);
        const ai = getProvider({ provider: conn.provider, apiKey });

        // 3. Construct Augmented Prompt
        const finalPrompt = `
            You are a CODEZ48 AI Assistant. Use the provided context to answer the user's question.
            If the answer is not in the context, say "I don't have enough information in my knowledge base to answer that."

            CONTEXT:
            ${context || "No specific context provided."}

            USER QUESTION:
            ${prompt}
        `;

        const res = await ai.generateText(finalPrompt, { temperature: temperature || 0.7, max_tokens: max_tokens || 500 });

        // 4. Record Usage
        const usageId = `USAGE_${Date.now()}`;
        await db.collection('modelUsage').doc(usageId).set({
            ownerId: uid,
            datasetId,
            prompt,
            response: res.text,
            provider: conn.provider,
            model: res.model,
            timestamp: new Date().toISOString()
        });

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({
                success: true,
                text: res.text,
                model: res.model,
                provider: conn.provider
            })
        };

    } catch (error) {
        console.error("[AI PREDICT ERROR]:", error.message);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: error.message })
        };
    }
};
