const { verifyToken, admin } = require('./_shared/auth');

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
        console.log("[AI WORKSPACE] Inbound creation request...");
        const uid = await verifyToken(event);
        console.log("[AI WORKSPACE] Verified UID:", uid);

        const { name, description } = JSON.parse(event.body);
        if (!name) return { statusCode: 400, body: JSON.stringify({ error: "Name required" }) };

        const db = admin.firestore();
        const wsId = 'WS-' + Math.random().toString(36).substr(2, 9).toUpperCase();

        const workspaceData = {
            workspaceId: wsId,
            ownerId: uid,
            name,
            description: description || '',
            status: 'DRAFT',
            currentStep: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastOpenedAt: new Date().toISOString()
        };

        console.log("[AI WORKSPACE] Saving document:", wsId);
        await db.collection('ai_workspaces').doc(wsId).set(workspaceData);
        console.log("[AI WORKSPACE] Document saved successfully.");

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
            body: JSON.stringify({ success: true, workspaceId: wsId })
        };
    } catch (error) {
        console.error("[AI WORKSPACE] Function Error:", error.message);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
            body: JSON.stringify({ error: error.message })
        };
    }
};
