const fetch = require('node-fetch');
const BaseAIProvider = require('./base-provider');

class GroqProvider extends BaseAIProvider {
    async generateText(prompt) {
        console.log("[GROQ_ADAPTER] Dispatching Request...");

        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model || 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3
                })
            });

            const data = await res.json();

            if (!res.ok) {
                console.error("[GROQ_ADAPTER] API Rejection:", data);
                throw new Error(data.error?.message || `Groq error: ${res.status}`);
            }

            console.log("[GROQ_ADAPTER] Success.");
            return { text: data.choices[0].message.content, model: data.model };
        } catch (e) {
            console.error("[GROQ_ADAPTER] Network/Runtime Error:", e.message);
            throw e;
        }
    }
}
module.exports = GroqProvider;
