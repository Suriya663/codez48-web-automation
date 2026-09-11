const { verifyToken, admin } = require('./_shared/auth');

exports.handler = async (event) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "POST, OPTIONS" } };
    if (event.httpMethod !== "POST") return { statusCode: 405 };

    try {
        const uid = await verifyToken(event);
        const { name, description } = JSON.parse(event.body);
        if (!name) return { statusCode: 400, body: JSON.stringify({ error: "Name required" }) };

        const db = admin.firestore();
        const wsId = 'WS-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        await db.collection('ai_workspaces').doc(wsId).set({
            workspaceId: wsId, ownerId: uid, name, description: description || '',
            status: 'DRAFT', currentStep: 1,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastOpenedAt: new Date().toISOString()
        });

        return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ success: true, workspaceId: wsId }) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
