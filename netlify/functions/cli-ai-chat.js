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


const repairActionLinkage = (actions) => {
    if (!Array.isArray(actions)) return actions;
    const htmlAction = actions.find(a => a && a.type === 'create_file' && typeof a.path === 'string' && a.path.endsWith('index.html'));
    const cssAction = actions.find(a => a && a.type === 'create_file' && typeof a.path === 'string' && a.path.endsWith('.css'));
    const jsAction = actions.find(a => a && a.type === 'create_file' && typeof a.path === 'string' && a.path.endsWith('.js') && !a.path.endsWith('server.js'));

    if (htmlAction && typeof htmlAction.content === 'string') {
        let hContent = htmlAction.content;
        const cssFile = cssAction ? cssAction.path.split(/[\/\\]/).pop() : 'style.css';
        const jsFile = jsAction ? jsAction.path.split(/[\/\\]/).pop() : 'script.js';

        const hasCssLink = /<link[^>]+rel=["']stylesheet["'][^>]*>/i.test(hContent) || hContent.includes(cssFile);
        if (!hasCssLink) {
            if (hContent.includes('</head>')) {
                hContent = hContent.replace('</head>', '    <link rel="stylesheet" href="' + cssFile + '">\n</head>');
            } else if (hContent.includes('<body')) {
                hContent = '<link rel="stylesheet" href="' + cssFile + '">\n' + hContent;
            }
        }

        const hasJsTag = /<script[^>]+src=["'][^"']+\.js["'][^>]*>/i.test(hContent) || hContent.includes(jsFile);
        if (!hasJsTag) {
            if (hContent.includes('</body>')) {
                hContent = hContent.replace('</body>', '    <script src="' + jsFile + '" defer></script>\n</body>');
            } else {
                hContent = hContent + '\n<script src="' + jsFile + '" defer></script>';
            }
        }

        if (cssAction && typeof cssAction.content === 'string' && !hContent.includes('id="codez48-embedded-styles"')) {
            const safetyStyleTag = '\n    <style id="codez48-embedded-styles">\n' + cssAction.content.trim() + '\n    </style>\n</head>';
            if (hContent.includes('</head>')) {
                hContent = hContent.replace('</head>', safetyStyleTag);
            }
        }

        htmlAction.content = hContent;
    }
    return actions;
};

const verifyApiKey = async (apiKey) => {
    if (!apiKey) return null;
    try {
        const keySnap = await db.collection('api_keys').doc(apiKey).get();
        if (!keySnap.exists || keySnap.data().status !== 'ACTIVE') return null;
        return keySnap.data().userId;
    } catch (e) {
        console.warn('API Key Verification failed (Firebase Quota?):', e.message);
        // If Firebase is exhausted, we still want the AI chat to work anonymously
        return 'anonymous-quota-fallback';
    }
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

        // Pilot Client Acknowledgement Endpoint
        if (parsedBody.ackRequestId) {
            const reqId = parsedBody.ackRequestId;
            const ackStatus = parsedBody.status || 'LOCAL_EXECUTION_COMPLETED';
            try {
                await db.collection('pilot_requests').doc(reqId).set({
                    requestId: reqId,
                    status: ackStatus,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            } catch (e) {
                console.warn('Firebase pilot_requests ack failed:', e.message);
            }

            return jsonResponse(200, { success: true, acknowledged: reqId, status: ackStatus });
        }

        // Direct Preview Persistence Endpoint
        if (parsedBody.storePreview && parsedBody.htmlContent) {
            const projectId = parsedBody.projectId || 'web-' + Math.random().toString(36).substring(2, 8);
            try {
                await db.collection('generated_websites').doc(projectId).set({
                    projectId,
                    ownerId: sellerId,
                    html: parsedBody.htmlContent,
                    prompt: parsedBody.prompt || 'Codez48 Static Preview',
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            } catch (e) {
                console.warn('Firebase generated_websites set failed:', e.message);
            }

            return jsonResponse(200, {
                success: true,
                isWebsite: true,
                projectId: projectId,
                previewUrl: `https://codez48.netlify.app/preview/${projectId}`
            });
        }

        const requestId = 'req-' + Math.random().toString(36).substring(2, 10);
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
        const groqKeys = rawGroqKeys
            ? Array.from(new Set(rawGroqKeys.split(',').map(k => k.trim()).filter(Boolean)))
            : [];
        const geminiApiKey = process.env.GEMINI_API_KEY || "AIzaSyAbCLiq_qTnWNR3QRYi_UTuL7WSOKEJEzM";

        if (groqKeys.length === 0 && !geminiApiKey) {
            return jsonResponse(500, { success: false, error: "AI Service Unconfigured on Server." });
        }

                let userPlan = parsedBody.plan || parsedBody.planId || "MICRO";
        if (sellerId && sellerId !== "anonymous" && !parsedBody.plan && !parsedBody.planId) {
            try {
                const userDoc = await db.collection("pilot_users").doc(sellerId).get();
                if (userDoc.exists && userDoc.data().plan) {
                    userPlan = userDoc.data().plan;
                }
            } catch (e) {
                // Ignore fallback to default
            }
        }

        const normalizedPlan = String(userPlan).toUpperCase();
        let tierDirectives = "";
        if (normalizedPlan.includes("PROFIT") || normalizedPlan.includes("ADVANCED")) {
            tierDirectives = "SUBSCRIPTION TIER DIRECTIVE: TIER 3 (PROFIT-ORIENTED / ADVANCED PLAN)\n" +
                "- Deliver elite, state-of-the-art software architecture in a league of its own.\n" +
                "- LUXURY UI/UX: Dark mode by default, glassmorphic card containers (backdrop-filter: blur), subtle neon/gradient accents, smooth 60fps CSS transitions, responsive mobile-first navigation drawer.\n" +
                "- ADVANCED INTERACTIVITY: Real-time telemetry/metrics, animated SVG/Canvas charts, keyboard navigation shortcuts (e.g. Ctrl+K / Esc), full search & filter controls, undo/redo history, and toast notification queues.\n" +
                "- ROBUST CODEBASE: Complete error boundaries, defensive programming, input sanitization, automated unit tests, and comprehensive architecture.";
        } else if (normalizedPlan.includes("ENTERPRISE") || normalizedPlan.includes("INTERMEDIATE")) {
            tierDirectives = "SUBSCRIPTION TIER DIRECTIVE: TIER 2 (ENTERPRISE / INTERMEDIATE PLAN)\n" +
                "- Deliver an impressive, full-featured, enterprise-grade software project with a significant step up from Basic in design and depth.\n" +
                "- SOPHISTICATED DESIGN: Modern design system using CSS custom variables (:root), responsive card grid, tabbed interfaces, modal dialogs, smooth hover/active feedback, and polished typography.\n" +
                "- DYNAMIC STATE: LocalStorage persistence, structured JSON state stores, input debounce, dynamic list rendering, and clear user status feedback.\n" +
                "- FULL-STACK COHESION: When backend server is requested, implement clean Express REST endpoints with static middleware and seamless client fetch integration.";
        } else {
            tierDirectives = "SUBSCRIPTION TIER DIRECTIVE: TIER 1 (BASIC / MICRO PLAN)\n" +
                "- Even for simple requests, deliver a complete, exceptionally well-crafted, production-ready codebase.\n" +
                "- NO TRUNCATION: Zero placeholders, zero TODOs, zero missing functions. Every feature requested must be 100% implemented and working.\n" +
                "- POLISHED MODERN STYLING: Beautiful responsive CSS with Flexbox/Grid, clean color palette, card elevations, smooth button states, and readable modern typography.\n" +
                "- FLAWLESS LINKING: index.html MUST explicitly link <link rel=\"stylesheet\" href=\"style.css\"> in <head> AND <script src=\"script.js\" defer></script> before </body>. Ensure all button IDs and element selectors in script.js match index.html exactly.";
        }

        const systemPrompt = `You are Codez48 AI, a professional full-stack developer, software engineer, and business assistant.
Subscription Plan Tier: ${userPlan}

${tierDirectives}

        CAPABILITIES:
        1. WEBSITE GENERATION (Public Preview): Generate complete HTML/CSS/JS for a web-hosted preview.
           Return as JSON: {"isWebsite": true, "html": "...", "explanation": "..."}

        2. LOCAL CODING AGENT & SOFTWARE DEVELOPMENT AGENT: Create or edit LOCAL projects and files across ANY programming language or framework (Node.js, Express, React, Vite, Next.js, Python, Flask, FastAPI, Django, Java, Maven, Gradle, Android/Kotlin, C#, .NET, Flutter, C/C++, PHP, etc.).
           - When creating a Node.js/Express project, generate:
             1. "foldername/package.json" with dependencies (e.g. "express") and "scripts": { "start": "node server.js" }.
             2. "foldername/server.js" configured with "app.use(express.static('public'))" and Express API routes.
             3. "foldername/public/index.html" with a complete, rich, multi-section responsive web layout (navbar, hero, feature/product cards, dynamic UI, interactive elements, footer).
             4. "foldername/public/style.css" with complete CSS rules.
             5. "foldername/public/script.js" with client-side interactive DOM logic.
             6. Link CSS and JS in public/index.html using <link rel="stylesheet" href="style.css"> and <script src="script.js"></script>.
           - When creating a static website, generate "foldername/index.html", "foldername/style.css", and "foldername/script.js". Link them properly in index.html.
           - BROWSER JAVASCRIPT ENVIRONMENT RULES: Client-side script.js or browser HTML scripts run in the web browser. They MUST NOT use Node.js server globals (process, process.env, process.argv, __dirname, __filename, require, module.exports, fs, path, http). Use native browser DOM APIs (window, document, fetch, localStorage, addEventListener).
           - Write RICH, COMPLETE, production-ready, usable code. Never generate bare 2-line placeholder files.
           - For follow-up edits on an existing project, DO NOT create duplicate files like app-new.js. Update the exact existing file path.
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

        5. PILOT DESKTOP TASK ENGINE: Generate structured content for Codez48 Pilot Desktop Automation Agent requests.
           Return as JSON based on request:
           - TEXT/STORY: {"isPilotTask": true, "taskType": "TEXT", "content": "Full story/text content...", "explanation": "..."}
           - PRESENTATION: {"isPilotTask": true, "taskType": "PRESENTATION", "title": "...", "slides": [
               {
                 "title": "...",
                 "layout": "title_slide|problem_solution_split|architecture_blueprint|three_cards|stat_callout|two_column|timeline_roadmap|conclusion",
                 "bullets": ["..."],
                 "subtitle": "...",
                 "problem": "...", "solution": "...",
                 "pillars": [{"title": "...", "desc": "..."}],
                 "cards": [{"title": "...", "desc": "..."}],
                 "stat": "99.9%", "statLabel": "...",
                 "leftColTitle": "...", "leftBullets": ["..."], "rightColTitle": "...", "rightBullets": ["..."],
                 "steps": [{"phase": "PHASE 1", "title": "...", "desc": "..."}],
                 "cta": "..."
               }
             ], "explanation": "..."}
             CRITICAL PRESENTATION RULE: Every slide MUST have a distinct, appropriate layout archetype. Do NOT use the same layout for consecutive slides. Curate section designs to eliminate repetition.
           - DOCUMENT: {"isPilotTask": true, "taskType": "DOCUMENT", "title": "...", "sections": [{"heading": "...", "body": "..."}], "explanation": "..."}
           - SPREADSHEET: {"isPilotTask": true, "taskType": "SPREADSHEET", "title": "...", "headers": ["..."], "rows": [["..."]], "explanation": "..."}
           - PROJECT: {"isPilotTask": true, "taskType": "PROJECT", "projectDir": "...", "files": [{"path": "...", "content": "..."}], "explanation": "..."}

        6. GENERAL CHAT: Respond with plain text.

        RULES:
        - If generating a website preview for the public web, use "isWebsite": true.
        - If performing local file/app actions or building local projects, use "isAction": true.
        - If generating structured content for desktop tasks (stories, slides, docs, spreadsheets), use "isPilotTask": true.
        - For local coding, ALWAYS use relative paths.
        - Always write FULL usable code and text without TODOs, fake functions, or placeholder stubs.
        - If the user asks to "Open in VS Code", always trigger "open_vscode".`;

        let aiResponse = null;
        let aiErrors = [];

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
                    } else {
                        aiErrors.push(`Groq (${response.status}): ${data.error?.message || JSON.stringify(data)}`);
                    }
                } catch (err) {
                    console.warn(`[Groq Retry] Key failure:`, err.message);
                    aiErrors.push(`Groq Exception: ${err.message}`);
                }
            }
        } else {
            aiErrors.push("No Groq API Keys configured in environment.");
        }

        // DUMP GROQ MODELS FOR DEBUG
        if (groqKeys.length > 0 && !aiResponse) {
            try {
                const res = await fetch("https://api.groq.com/openai/v1/models", {
                    headers: { "Authorization": `Bearer ${groqKeys[0]}` }
                });
                const data = await res.json();
                aiErrors.push("AVAILABLE GROQ MODELS: " + data.data.map(m => m.id).join(", "));
            } catch (e) {
                aiErrors.push("Failed to fetch Groq models: " + e.message);
            }
        }

        // Fallback to Gemini
        if (!aiResponse && geminiApiKey) {
            try {
                let systemInstruction = { parts: [{ text: "SYSTEM INSTRUCTIONS: " + systemPrompt }] };
                const contents = [];
                let currentRole = null;
                let currentText = "";

                messages.forEach(m => {
                    if (m.role === 'system') {
                        systemInstruction.parts[0].text += "\n" + m.content;
                    } else {
                        const role = m.role === 'assistant' ? 'model' : 'user';
                        if (currentRole === role) {
                            currentText += "\n\n" + (m.content || " ");
                        } else {
                            if (currentRole) {
                                contents.push({ role: currentRole, parts: [{ text: currentText || " " }] });
                            }
                            currentRole = role;
                            currentText = m.content || " ";
                        }
                    }
                });
                if (currentRole) {
                    contents.push({ role: currentRole, parts: [{ text: currentText || " " }] });
                }
                if (contents.length === 0) contents.push({ role: 'user', parts: [{ text: 'Hello' }] });

                const reqBody = { contents: contents, systemInstruction: systemInstruction };

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(reqBody)
                });

                const data = await response.json();
                if (response.ok && data.candidates && data.candidates[0]) {
                    aiResponse = data.candidates[0].content.parts[0].text;
                } else {
                    aiErrors.push(`Gemini (${response.status}): ${data.error?.message || JSON.stringify(data)}`);
                }
            } catch (err) {
                console.error("[Gemini Fallback Error]:", err.message);
                aiErrors.push(`Gemini Exception: ${err.message}`);
            }
        } else if (!geminiApiKey) {
            aiErrors.push("No Gemini API Key available.");
        }

        if (!aiResponse) {
            return jsonResponse(502, {
                success: false,
                error: "AI Services unreachable. Details: " + aiErrors.join(' | ')
            });
        }

        // Process Response
        try {
            // Robust JSON extraction to handle model conversational wrappers
            let jsonString = aiResponse;
            const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                jsonString = jsonMatch[1];
            } else {
                // Fallback: extract substring from first { to last }
                const firstBrace = aiResponse.indexOf('{');
                const lastBrace = aiResponse.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    jsonString = aiResponse.substring(firstBrace, lastBrace + 1);
                }
            }

            // Attempt to parse the extracted string
            const parsed = JSON.parse(jsonString.trim());

            // Record status in Firestore pilot_requests for Request Monitor tracking
            try {
                await db.collection('pilot_requests').doc(requestId).set({
                    requestId,
                    timestamp: new Date().toISOString(),
                    prompt: messages[messages.length - 1].content,
                    taskType: parsed.taskType || (parsed.isWebsite ? 'WEBSITE' : (parsed.isAction ? 'ACTION' : 'CHAT')),
                    status: 'SENT_TO_PILOT',
                    responseLength: aiResponse.length,
                    artifactsCount: (parsed.actions ? parsed.actions.length : 0) + (parsed.files ? parsed.files.length : 0) + (parsed.slides ? parsed.slides.length : 0)
                }, { merge: true });
            } catch (e) {}

            // 1. Handle Website Generation (Public Preview)
            if (parsed.isWebsite && parsed.html) {
                const projectId = existingProjectId || 'web-' + Math.random().toString(36).substring(2, 8);

                // Clean up any markdown code blocks from the HTML string if the AI included them
                let cleanHtml = parsed.html;
                if (cleanHtml.startsWith('```html')) {
                    cleanHtml = cleanHtml.replace(/^```html\n?/, '').replace(/\n?```$/, '');
                } else if (cleanHtml.startsWith('```')) {
                    cleanHtml = cleanHtml.replace(/^```\n?/, '').replace(/\n?```$/, '');
                }

                await db.collection('generated_websites').doc(projectId).set({
                    projectId,
                    ownerId: sellerId,
                    html: cleanHtml,
                    prompt: messages[messages.length - 1].content,
                    updatedAt: new Date().toISOString()
                }, { merge: true });

                return jsonResponse(200, {
                    success: true,
                    requestId: requestId,
                    isWebsite: true,
                    projectId: projectId,
                    previewUrl: `https://codez48.netlify.app/preview/${projectId}`,
                    answer: parsed.explanation || "Website generated successfully."
                });
            }

            // 2. Handle Local Actions (Coding Agent / App Control)
            if (parsed.isAction && Array.isArray(parsed.actions)) {
                parsed.actions = repairActionLinkage(parsed.actions);
                return jsonResponse(200, {
                    success: true,
                    requestId: requestId,
                    isAction: true,
                    actions: parsed.actions,
                    answer: parsed.explanation || "Action(s) prepared."
                });
            }

            // 3. Handle Pilot Desktop Task Engine Structured Responses
            if (parsed.isPilotTask) {
                return jsonResponse(200, {
                    success: true,
                    requestId: requestId,
                    isPilotTask: true,
                    taskType: parsed.taskType,
                    data: parsed,
                    content: parsed.content,
                    title: parsed.title,
                    slides: parsed.slides,
                    sections: parsed.sections,
                    headers: parsed.headers,
                    rows: parsed.rows,
                    files: parsed.files,
                    answer: parsed.explanation || "Pilot task content generated successfully."
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
