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
        if (!event.body) throw new Error("Missing request body.");

        const uid = await verifyToken(event);
        const { name, description } = JSON.parse(event.body);

        if (!name) return { statusCode: 400, body: JSON.stringify({ error: "Workspace name required." }) };

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

        await db.collection('ai_workspaces').doc(wsId).set(workspaceData);

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ success: true, workspaceId: wsId })
        };

    } catch (error) {
        console.error("[AI WORKSPACE] Registry Error:", error.message);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
            body: JSON.stringify({ error: error.message || "Internal Server Error" })
        };
    }
};
