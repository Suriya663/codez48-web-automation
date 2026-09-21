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
        const parsedBody = JSON.parse(event.body || '{}');

        // Direct Preview Persistence Endpoint
        if (parsedBody.storePreview && parsedBody.htmlContent) {
            const projectId = parsedBody.projectId || 'web-' + Math.random().toString(36).substring(2, 8);
            await db.collection('generated_websites').doc(projectId).set({
                projectId,
                ownerId: sellerId,
                html: parsedBody.htmlContent,
                prompt: parsedBody.prompt || 'Codez48 Static Preview',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            return jsonResponse(200, {
                success: true,
                isWebsite: true,
                projectId: projectId,
                previewUrl: `https://codez48.netlify.app/preview/${projectId}`
            });
        }

        const { messages, projectId: existingProjectId } = parsedBody;

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

        const systemPrompt = `You are Codez48 AI, a professional full-stack developer, software engineer, and business assistant.

        CAPABILITIES:
        1. WEBSITE GENERATION (Public Preview): Generate complete HTML/CSS/JS for a web-hosted preview.
           Return as JSON: {"isWebsite": true, "html": "...", "explanation": "..."}

        2. LOCAL CODING AGENT & SOFTWARE DEVELOPMENT AGENT: Create or edit LOCAL projects and files across ANY programming language or framework (Node.js, Express, React, Vite, Next.js, Python, Flask, FastAPI, Django, Java, Maven, Gradle, Android/Kotlin, C#, .NET, Flutter, C/C++, PHP, etc.).
           - When creating a new project, suggest a concise directory name.
           - Use relative paths (e.g. "my-app/package.json", "my-app/server.js", "my-app/app.py", "my-app/src/main.rs").
           - For follow-up edits on an existing project, DO NOT create duplicate files like app-new.js. Update the exact existing file path.
           - Write COMPLETE, production-ready, usable code. Never leave TODOs, fake functions, or placeholder stubs.
           Allowed Actions:
           - create_file: { "type": "create_file", "path": "path/to/file", "content": "..." }
           - update_file: { "type": "update_file", "path": "path/to/file", "content": "..." }
           - create_folder: { "type": "create_folder", "path": "foldername" }
           - open_vscode: { "type": "open_vscode" }
           - run_project: { "type": "run_project" }
           - install_dependencies: { "type": "install_dependencies" }
           Return as JSON: {"isAction": true, "actions": [...], "explanation": "..."}

        3. APP & URL CONTROL: Open local apps or URLs.
           Allowed Actions:
           - open_app: { "type": "open_app", "name": "chrome|vscode|notepad|clock|whatsapp|calculator" }
           - open_url: { "type": "open_url", "url": "https://..." }
           Return as JSON: {"isAction": true, "actions": [...], "explanation": "..."}

        4. LOCAL FIND & ANALYZE:
           - find_file: { "type": "find_file", "query": "filename" }
           - find_folder: { "type": "find_folder", "query": "foldername" }
           Return as JSON: {"isAction": true, "actions": [...], "explanation": "..."}

        5. GENERAL CHAT: Respond with plain text.

        RULES:
        - If generating a website preview for the public web, use "isWebsite": true.
        - If performing local file/app actions or building local projects, use "isAction": true.
        - For local coding, ALWAYS use relative paths.
        - Always write FULL usable code without TODOs or placeholders.
        - If the user asks to "Open in VS Code", always trigger "open_vscode".`;

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

        // Fallback to Gemini
        if (!aiResponse && geminiApiKey) {
            try {
                const contents = messages.map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content || " " }]
                }));
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
            // Check if it's a JSON response
            const parsed = JSON.parse(aiResponse.trim().replace(/^```json/, '').replace(/```$/, ''));

            // 1. Handle Website Generation (Public Preview)
            if (parsed.isWebsite && parsed.html) {
                const projectId = existingProjectId || 'web-' + Math.random().toString(36).substring(2, 8);
                await db.collection('generated_websites').doc(projectId).set({
                    projectId,
                    ownerId: sellerId,
                    html: parsed.html,
                    prompt: messages[messages.length - 1].content,
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

            // 2. Handle Local Actions (Coding Agent / App Control)
            if (parsed.isAction && Array.isArray(parsed.actions)) {
                return jsonResponse(200, {
                    success: true,
                    isAction: true,
                    actions: parsed.actions,
                    answer: parsed.explanation || "Action(s) prepared."
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
