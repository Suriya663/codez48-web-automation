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
        console.error('Firebase Admin Init Failure in cli-automation-manager:', e.message);
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

    if (!initAdmin() || !db) {
        return jsonResponse(500, { success: false, error: "Database unavailable" });
    }

    const apiKey = event.headers['x-api-key'];
    const sellerId = await verifyApiKey(apiKey);

    if (!sellerId) {
        return jsonResponse(401, { success: false, error: "Unauthorized: Invalid or missing API Key." });
    }

    try {
        const body = event.body ? JSON.parse(event.body) : {};
        const { action } = body;

        // --- 1. LIST AUTOMATIONS ---
        if (action === 'LIST' || event.httpMethod === 'GET') {
            const snap = await db.collection('service_automations')
                .where('ownerId', '==', sellerId)
                .get();

            const automations = [];
            snap.forEach(doc => {
                const data = doc.data();
                automations.push({ id: doc.id, ...data });
            });

            return jsonResponse(200, { success: true, automations });
        }

        // --- 2. CREATE AUTOMATION ---
        if (action === 'CREATE') {
            const { type, name, config } = body;
            if (!type || !name || !config) {
                return jsonResponse(400, { success: false, error: "Missing type, name or config" });
            }

            const autoId = 'AUTO-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            const newAuto = {
                ownerId: sellerId,
                name,
                type,
                status: 'ACTIVE',
                config,
                lastRunAt: null,
                lastResult: 'Waiting for first run',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('service_automations').doc(autoId).set(newAuto);

            return jsonResponse(201, { success: true, message: "Automation created", automationId: autoId });
        }

        // --- 3. TOGGLE AUTOMATION ---
        if (action === 'TOGGLE') {
            const { automationId, status } = body;
            if (!automationId || !status) {
                return jsonResponse(400, { success: false, error: "Missing automationId or status" });
            }

            const autoRef = db.collection('service_automations').doc(automationId);
            const snap = await autoRef.get();

            if (!snap.exists || snap.data().ownerId !== sellerId) {
                return jsonResponse(403, { success: false, error: "Forbidden: Ownership mismatch" });
            }

            await autoRef.update({
                status: status.toUpperCase(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return jsonResponse(200, { success: true, message: `Automation ${status.toLowerCase()}d` });
        }

        // --- 4. GET LOGS ---
        if (action === 'LOGS') {
            const { automationId } = body;
            if (!automationId) return jsonResponse(400, { success: false, error: "Missing automationId" });

            const logsSnap = await db.collection('service_automation_logs')
                .where('automationId', '==', automationId)
                .where('ownerId', '==', sellerId)
                .orderBy('timestamp', 'desc')
                .limit(15)
                .get();

            const logs = [];
            logsSnap.forEach(doc => logs.push({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() }));

            return jsonResponse(200, { success: true, logs });
        }

        // --- 5. RUN NOW (Manual Trigger) ---
        if (action === 'RUN') {
            const { automationId } = body;
            if (!automationId) return jsonResponse(400, { success: false, error: "Missing automationId" });

            const autoRef = db.collection('service_automations').doc(automationId);
            const snap = await autoRef.get();

            if (!snap.exists || snap.data().ownerId !== sellerId) {
                return jsonResponse(403, { success: false, error: "Forbidden" });
            }

            const autoData = snap.data();
            const executionResult = await executeAutomationLogic(autoData, automationId, sellerId);

            return jsonResponse(200, { success: true, result: executionResult });
        }

        // --- 6. VISUAL OCR & AI DOM VERIFICATION (CLI & Web Unified Automation) ---
        if (action === 'VISUAL_VERIFY') {
            const { screenshotData, goal, pageState } = body;
            if (!goal) return jsonResponse(400, { success: false, error: "Missing goal" });

            // Record visual analysis request to Firebase if screenshot data provided
            if (screenshotData) {
                try {
                    await db.collection('visual_analysis_requests').add({
                        requestId: 'VISUAL-CLI-' + Date.now(),
                        type: 'CLI_SCREEN_ANALYSIS',
                        status: 'ANALYZING',
                        screenshotData: screenshotData,
                        screenshotWidth: 1280,
                        screenshotHeight: 800,
                        originalGoal: goal,
                        createdAt: new Date().toISOString()
                    });
                } catch (dbErr) {
                    console.warn('[DB WARNING] Failed to record visual analysis request:', dbErr.message);
                }
            }

            const buttons = pageState?.buttons || [];
            const inputs = pageState?.inputs || [];
            const links = pageState?.links || [];

            const systemPrompt = `You are a Visual Web Automation AI Pilot.
Analyze the provided screenshot, DOM state, and user goal.
Determine if the target element for the goal is currently visible.
If found, return the precise action and target.
If not found, but there's a clear 'Next', 'Get Started', 'Login' or similar button leading to the required path, return a click on it.
If not found and no obvious path, return a 'scroll' action.

DOM STATE:
Buttons: ${JSON.stringify(buttons)}
Inputs: ${JSON.stringify(inputs)}
Links: ${JSON.stringify(links)}

USER GOAL: "${goal}"

OUTPUT STRICT JSON ONLY:
{
  "action": "click|fill|scroll",
  "target": { "role": "button|link|input", "name": "Name", "id": "id", "placeholder": "P" },
  "value": "text to fill or 'down' for scroll",
  "successCondition": "Expected outcome",
  "statusText": "User friendly status message",
  "explanation": "Why you chose this action"
}`;

            let aiResponse = null;

            // Try Groq First
            const rawGroqKeys = process.env.GROQ_API_KEY;
            const groqKeys = rawGroqKeys ? Array.from(new Set(rawGroqKeys.split(',').map(k => k.trim()).filter(Boolean))) : [];
            const geminiApiKey = process.env.GEMINI_API_KEY || "";

            // Clean base64
            let cleanBase64 = screenshotData;
            if (screenshotData && screenshotData.startsWith('data:image')) {
                cleanBase64 = screenshotData.split(',')[1];
            }

            if (groqKeys.length > 0) {
                const shuffledKeys = [...groqKeys].sort(() => 0.5 - Math.random());
                for (const groqApiKey of shuffledKeys) {
                    try {
                        const messages = [{ role: "system", content: systemPrompt }];

                        if (cleanBase64) {
                            messages.push({
                                role: "user",
                                content: [
                                    { type: "text", text: `Here is the current screenshot and DOM. Goal: ${goal}` },
                                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${cleanBase64}` } }
                                ]
                            });
                        } else {
                            messages.push({ role: "user", content: `Goal: ${goal}` });
                        }

                        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${groqApiKey}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                model: "openai/gpt-oss-120b",
                                messages: messages,
                                temperature: 0.2,
                                max_tokens: 1024
                            })
                        });

                        const data = await response.json();
                        if (response.ok) {
                            aiResponse = data.choices[0].message.content;
                            break;
                        }
                    } catch (err) {
                        console.warn(`[Groq VISUAL_VERIFY Retry] Key failure:`, err.message);
                    }
                }
            }

            // Fallback to Gemini
            if (!aiResponse && geminiApiKey) {
                try {
                    let systemInstruction = { parts: [{ text: "SYSTEM INSTRUCTIONS: " + systemPrompt }] };
                    const contents = [];

                    if (cleanBase64) {
                        contents.push({
                            role: 'user',
                            parts: [
                                { text: `Goal: ${goal}` },
                                { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } }
                            ]
                        });
                    } else {
                        contents.push({ role: 'user', parts: [{ text: `Goal: ${goal}` }] });
                    }

                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contents: contents, systemInstruction: systemInstruction })
                    });

                    const data = await response.json();
                    if (response.ok && data.candidates && data.candidates[0]) {
                        aiResponse = data.candidates[0].content.parts[0].text;
                    }
                } catch (err) {
                    console.error("[Gemini VISUAL_VERIFY Fallback Error]:", err.message);
                }
            }

            let analysisMessage = "";
            let recommendedAction = {};
            let verified = false;

            if (aiResponse) {
                try {
                    // Extract JSON
                    let jsonString = aiResponse;
                    const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                    if (jsonMatch) {
                        jsonString = jsonMatch[1];
                    } else {
                        const firstBrace = aiResponse.indexOf('{');
                        const lastBrace = aiResponse.lastIndexOf('}');
                        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                            jsonString = aiResponse.substring(firstBrace, lastBrace + 1);
                        }
                    }

                    recommendedAction = JSON.parse(jsonString.trim());
                    verified = (recommendedAction.action !== "scroll");
                    analysisMessage = `[AI VISUAL VERIFY] ${recommendedAction.explanation || recommendedAction.statusText || 'Analysis complete.'}`;

                } catch(e) {
                    console.error("Failed to parse AI VISUAL_VERIFY JSON:", e.message, aiResponse);
                }
            }

            // Fallback to old regex logic if AI failed to return valid response
            if (!recommendedAction.action) {
                let foundStartButton = buttons.find(b => /start|proceed|next|submit|continue|send/i.test(b.name));
                let foundInput = inputs.find(i => /search|input|email|query|prompt|name|text|what|idea|chat|message|textbox/i.test(i.placeholder || i.name || i.label || i.id || i.type));

                if (foundStartButton) {
                    analysisMessage = `[OCR & DOM VERIFY FALLBACK] Verified target element "${foundStartButton.name}" present in current view. Ready to click.`;
                    recommendedAction = {
                        action: "click",
                        target: { name: foundStartButton.name, role: foundStartButton.role, id: foundStartButton.id },
                        successCondition: "Transitioned to next page",
                        statusText: `Clicking ${foundStartButton.name} to proceed...`
                    };
                    verified = true;
                } else if (foundInput) {
                    analysisMessage = `[OCR & DOM VERIFY FALLBACK] Verified target input field present. Ready to fill.`;
                    recommendedAction = {
                        action: "fill",
                        target: { name: foundInput.name, id: foundInput.id, placeholder: foundInput.placeholder },
                        value: goal,
                        successCondition: "Input populated",
                        statusText: `Filling input field...`
                    };
                    verified = true;
                } else {
                    analysisMessage = `[OCR & DOM VERIFY FALLBACK] Target element not immediately visible in current viewport. Recommending scroll discovery.`;
                    recommendedAction = {
                        action: "scroll",
                        value: "down",
                        successCondition: "New elements visible",
                        statusText: `Scrolling page to locate interactive element...`
                    };
                    verified = false;
                }
            }

            return jsonResponse(200, {
                success: true,
                verified: verified,
                analysisMessage,
                recommendedAction,
                pageSummary: {
                    buttonsCount: buttons.length,
                    inputsCount: inputs.length,
                    url: pageState?.url || 'unknown'
                }
            });
        }

        return jsonResponse(400, { success: false, error: "Invalid action" });

    } catch (error) {
        console.error("Automation Manager Error:", error.message);
        return jsonResponse(500, { success: false, error: error.message });
    }
};

async function executeAutomationLogic(auto, autoId, sellerId) {
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    let status = 'SUCCESS';
    let details = '';

    try {
        if (auto.type === 'LOW_STOCK') {
            const threshold = parseInt(auto.config.threshold) || 5;
            const prodsSnap = await db.collection('products')
                .where('sellerId', '==', sellerId)
                .where('stock', '<=', threshold)
                .get();

            const lowStockItems = [];
            prodsSnap.forEach(d => lowStockItems.push(d.data().name));

            if (lowStockItems.length > 0) {
                status = 'WARNING';
                details = `Low stock detected for: ${lowStockItems.join(', ')}`;
            } else {
                details = 'All stock levels healthy.';
            }
        }
        else if (auto.type === 'UPTIME_CHECK') {
            const url = auto.config.url;
            try {
                const res = await fetch(url, { timeout: 5000 });
                if (res.ok) {
                    details = `Website ${url} is ONLINE (HTTP ${res.status})`;
                } else {
                    status = 'ERROR';
                    details = `Website ${url} is reporting issues (HTTP ${res.status})`;
                }
            } catch (e) {
                status = 'ERROR';
                details = `Website ${url} is UNREACHABLE: ${e.message}`;
            }
        }
        else if (auto.type === 'DAILY_REPORT') {
            const today = new Date();
            today.setHours(0,0,0,0);

            const ordersSnap = await db.collection('orders')
                .where('sellerId', '==', sellerId)
                .where('date', '>=', today.toISOString())
                .get();

            let totalRevenue = 0;
            let orderCount = ordersSnap.size;
            ordersSnap.forEach(d => totalRevenue += (d.data().total || 0));

            details = `Daily Summary: ${orderCount} Orders, Total Revenue: ₹${totalRevenue}.`;
        }

        await db.collection('service_automation_logs').add({
            automationId: autoId,
            ownerId: sellerId,
            type: auto.type,
            timestamp,
            status,
            details
        });

        await db.collection('service_automations').doc(autoId).update({
            lastRunAt: timestamp,
            lastResult: details
        });

        return details;

    } catch (err) {
        console.error("Execution Logic Error:", err.message);
        return "Execution failed: " + err.message;
    }
}
