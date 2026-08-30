const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST, OPTIONS"
            }
        };
    }

    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed" })
        };
    }

    try {
        const { messages, useGemini = false } = JSON.parse(event.body);
        const model = "openai/gpt-oss-120b";

        const rawGroqKeys = process.env.GROQ_API_KEY;
        const groqKeys = rawGroqKeys ? rawGroqKeys.split(',').map(k => k.trim()).filter(Boolean) : [];
        const geminiApiKey = process.env.GEMINI_API_KEY || "";

        if (groqKeys.length === 0 && !geminiApiKey) {
            console.error("[CRITICAL AI CONFIG ERROR] GROQ_API_KEY environment variable is not configured.");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "AI Service Unconfigured: GROQ_API_KEY environment variable is missing." })
            };
        }

        if (!useGemini && groqKeys.length > 0) {
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
                            model: model,
                            messages: messages,
                            temperature: 0.5,
                            max_tokens: 2048,
                            top_p: 1,
                            stream: false
                        })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        return {
                            statusCode: 200,
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ content: data.choices[0].message.content })
                        };
                    } else {
                        console.error(`[Backend Groq Error] Status: ${response.status} | Msg: ${JSON.stringify(data.error || data)}`);
                    }
                } catch (err) {
                    console.error(`[Groq Exception]:`, err.message);
                }
            }
        }

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
                    return {
                        statusCode: 200,
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ content: data.candidates[0].content.parts[0].text })
                    };
                }
            } catch (err) {
                console.error("[Gemini Exception]:", err.message);
            }
        }

        return {
            statusCode: 500,
            body: JSON.stringify({ error: "AI Service Unavailable. Check GROQ_API_KEY environment variable." })
        };

    } catch (error) {
        console.error("Critical AI Proxy Error:", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error", details: error.message })
        };
    }
};
