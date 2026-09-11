const fetch = require('node-fetch');
const BaseAIProvider = require('./base-provider');

class OpenAIProvider extends BaseAIProvider {
    async generateText(prompt) {
        console.log("[OPENAI_ADAPTER] Dispatching Request...");

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model || 'gpt-4o',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3
                })
            });

            const data = await res.json();

            if (!res.ok) {
                console.error("[OPENAI_ADAPTER] API Rejection:", data);
                throw new Error(data.error?.message || `OpenAI error: ${res.status}`);
            }

            console.log("[OPENAI_ADAPTER] Success.");
            return { text: data.choices[0].message.content, model: data.model };
        } catch (e) {
            console.error("[OPENAI_ADAPTER] Network/Runtime Error:", e.message);
            throw e;
        }
    }
}
module.exports = OpenAIProvider;
