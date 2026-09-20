const admin = require('firebase-admin');
const fetch = require('node-fetch');

let isInitialized = false;
let db = null;

const initAdmin = () => {
    if (isInitialized) return true;
    try {
        const saVar = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!saVar) {
            if (admin.apps.length === 0) admin.initializeApp();
            db = admin.firestore();
            isInitialized = true;
            return true;
        }

        let serviceAccount = JSON.parse(saVar.trim());
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        db = admin.firestore();
        isInitialized = true;
        return true;
    } catch (e) {
        console.error('Firebase Admin Init Failure in cli-ai-chat:', e.message);
        return false;
    }
};

const verifyApiKey = async (apiKey) => {
    if (!apiKey) return null;
    const keySnap = await db.collection('api_keys').doc(apiKey).get();
    if (!keySnap.exists || keySnap.data().status !== 'ACTIVE') return null;
    return keySnap.data().userId;
};

const jsonResponse = (statusCode, data) => ({
    statusCode,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(data)
});

exports.handler = async (event, context) => {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type, x-api-key",
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
            }
        };
    }

    if (event.httpMethod !== "POST") {
        return jsonResponse(405, { success: false, error: "Method Not Allowed" });
    }

    if (!initAdmin() || !db) {
        return jsonResponse(500, { success: false, error: "Database unavailable" });
    }

    const apiKey = event.headers['x-api-key'];
    const sellerId = await verifyApiKey(apiKey);

    if (!sellerId) {
        return jsonResponse(401, { success: false, error: "Unauthorized: Invalid or missing API Key. Please login via 'codez48 login' first." });
    }

    try {
        const { messages } = JSON.parse(event.body || '{}');

        if (!messages || !Array.isArray(messages)) {
            return jsonResponse(400, { success: false, error: "Invalid request: 'messages' array required." });
        }

        const rawGroqKeys = process.env.GROQ_API_KEY;
        const groqKeys = rawGroqKeys ? rawGroqKeys.split(',').map(k => k.trim()).filter(Boolean) : [];
        const geminiApiKey = process.env.GEMINI_API_KEY || "";

        if (groqKeys.length === 0 && !geminiApiKey) {
            return jsonResponse(500, { success: false, error: "AI Service Unconfigured on Server." });
        }

        // Try Groq First
        if (groqKeys.length > 0) {
            const shuffledKeys = [...groqKeys].sort(() => 0.5 - Math.random());
            for (const groqApiKey of shuffledKeys) {
                try {
                    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${groqApiKey}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            model: "llama3-70b-8192", // High performance model for CLI
                            messages: [
                                { role: "system", content: "You are Codez48 AI, a helpful assistant integrated into the Codez48 CLI. Provide concise and accurate answers." },
                                ...messages
                            ],
                            temperature: 0.7,
                            max_tokens: 2048
                        })
                    });

                    const data = await response.json();
                    if (response.ok) {
                        return jsonResponse(200, { success: true, answer: data.choices[0].message.content });
                    }
                } catch (err) {
                    console.warn(`[Groq Retry] Key failure:`, err.message);
                }
            }
        }

        // Fallback to Gemini
        if (geminiApiKey) {
            try {
                const contents = messages.map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content || " " }]
                }));

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: contents })
                });

                const data = await response.json();
                if (response.ok) {
                    return jsonResponse(200, { success: true, answer: data.candidates[0].content.parts[0].text });
                }
            } catch (err) {
                console.error("[Gemini Fallback Error]:", err.message);
            }
        }

        return jsonResponse(502, { success: false, error: "AI Providers currently unreachable. Please try again later." });

    } catch (error) {
        console.error("CLI AI Chat Error:", error.message);
        return jsonResponse(500, { success: false, error: error.message });
    }
};
