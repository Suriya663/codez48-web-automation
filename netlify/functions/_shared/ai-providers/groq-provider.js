const BaseAIProvider = require('./base-provider');

class GroqProvider extends BaseAIProvider {
    async generateText(prompt) {
        console.log("[GROQ_ADAPTER] Requesting completion...");
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.model || 'llama-3.1-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error("[GROQ_ADAPTER] API Error:", err);
            throw new Error(err.error?.message || `Groq error: ${res.status}`);
        }

        const data = await res.json();
        console.log("[GROQ_ADAPTER] Response received.");
        return { text: data.choices[0].message.content, model: data.model };
    }
}
module.exports = GroqProvider;
