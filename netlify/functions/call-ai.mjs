import { GoogleGenAI } from '@google/genai';

const handleRequest = async (event) => {
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

        const rawGroqKeys = Netlify.env.get('GROQ_API_KEY');
        const groqKeys = rawGroqKeys
            ? Array.from(new Set(rawGroqKeys.split(',').map(k => k.trim()).filter(Boolean)))
            : [];



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

        {
            try {
                let systemInstruction = null;
                const contents = [];
                let currentRole = null;
                let currentText = "";

                messages.forEach(m => {
                    if (m.role === 'system') {
                        systemInstruction = { parts: [{ text: m.content }] };
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
                // Fallback for empty messages
                if (contents.length === 0) contents.push({ role: 'user', parts: [{ text: 'Hello' }] });

                const reqBody = { contents: contents };
                if (systemInstruction) {
                    reqBody.systemInstruction = systemInstruction;
                }

                const ai = new GoogleGenAI({});
                const data = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: reqBody.contents,
                    config: { systemInstruction: reqBody.systemInstruction }
                });

                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
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


export default async (req) => {
    const result = await handleRequest({
        httpMethod: req.method,
        headers: Object.fromEntries(req.headers),
        body: req.method === 'POST' ? await req.text() : ''
    });
    return new Response(result.body ?? null, {
        status: result.statusCode,
        headers: result.headers
    });
};
