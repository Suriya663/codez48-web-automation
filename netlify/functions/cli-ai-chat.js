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
    let sellerId = 'anonymous';

    if (apiKey) {
        sellerId = await verifyApiKey(apiKey);
        if (!sellerId) {
            return jsonResponse(401, { success: false, error: "Invalid API Key. Please login via 'codez48 login' or use anonymously without x-api-key header." });
        }
    }

    try {
        const { messages, projectId: existingProjectId } = JSON.parse(event.body || '{}');

        if (!messages || !Array.isArray(messages)) {
            return jsonResponse(400, { success: false, error: "Invalid request: 'messages' array required." });
        }

        // Basic Rate Limiting / Abuse Protection
        if (messages.length > 30) {
            return jsonResponse(400, { success: false, error: "Conversation history too long. Please start a new session." });
        }

        const lastMessage = messages[messages.length - 1];
        if (lastMessage.content && lastMessage.content.length > 2000) {
            return jsonResponse(400, { success: false, error: "Message too long. Please keep questions under 2000 characters." });
        }

        const rawGroqKeys = process.env.GROQ_API_KEY;
        const groqKeys = rawGroqKeys ? rawGroqKeys.split(',').map(k => k.trim()).filter(Boolean) : [];
        const geminiApiKey = process.env.GEMINI_API_KEY || "";

        if (groqKeys.length === 0 && !geminiApiKey) {
            return jsonResponse(500, { success: false, error: "AI Service Unconfigured on Server." });
        }

        const systemPrompt = `You are Codez48 AI, a professional full-stack developer and business assistant.

        WEBSITE GENERATION CAPABILITY:
        If the user asks to create, build, or develop a website, you MUST generate a complete, responsive, and polished HTML/CSS/JS solution.
        1. Always prefer a single self-contained HTML file.
        2. If you are generating a website, your entire response MUST be a valid JSON object with the following keys:
           {
             "isWebsite": true,
             "html": "...",
             "explanation": "Brief summary of what you built"
           }
        3. If you are just answering a normal question, respond with plain text as usual.
        4. If updating an existing project (context provided), ensure the new "html" is complete.

        Provide high-quality, modern, and mobile-friendly designs using standard CSS or Tailwind CDN if requested.`;

        let aiResponse = null;

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
                            model: "openai/gpt-oss-120b",
                            messages: [
                                { role: "system", content: systemPrompt },
                                ...messages
                            ],
                            temperature: 0.5,
                            max_tokens: 4096
                        })
                    });

                    const data = await response.json();
                    if (response.ok) {
                        aiResponse = data.choices[0].message.content;
                        break;
                    }
                } catch (err) {
                    console.warn(`[Groq Retry] Key failure:`, err.message);
                }
            }
        }

        // Fallback to Gemini if no response from Groq
        if (!aiResponse && geminiApiKey) {
            try {
                const contents = messages.map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content || " " }]
                }));
                // Prepend system prompt to the first user message or as a separate turn
                contents.unshift({ role: 'user', parts: [{ text: "SYSTEM INSTRUCTIONS: " + systemPrompt }] });

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: contents })
                });

                const data = await response.json();
                if (response.ok && data.candidates && data.candidates[0]) {
                    aiResponse = data.candidates[0].content.parts[0].text;
                }
            } catch (err) {
                console.error("[Gemini Fallback Error]:", err.message);
            }
        }

        if (!aiResponse) {
            return jsonResponse(502, {
                success: false,
                error: "AI Services are currently unreachable."
            });
        }

        // Process Response
        try {
            // Check if it's a JSON response (Website Generation)
            const parsed = JSON.parse(aiResponse.trim());
            if (parsed.isWebsite && parsed.html) {
                const projectId = existingProjectId || 'web-' + Math.random().toString(36).substring(2, 8);

                await db.collection('generated_websites').doc(projectId).set({
                    projectId,
                    ownerId: sellerId,
                    html: parsed.html,
                    prompt: messages[messages.length - 1].content,
                    createdAt: existingProjectId ? admin.firestore.FieldValue.serverTimestamp() : admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                return jsonResponse(200, {
                    success: true,
                    isWebsite: true,
                    projectId: projectId,
                    previewUrl: `https://codez48.netlify.app/preview/${projectId}`,
                    answer: parsed.explanation || "Website generated successfully."
                });
            }
        } catch (e) {
            // Not a JSON response, treat as normal text chat
        }

        return jsonResponse(200, { success: true, answer: aiResponse });

    } catch (error) {
        console.error("CLI AI Chat Error:", error.message);
        return jsonResponse(500, { success: false, error: error.message });
    }
};
