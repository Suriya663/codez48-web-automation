const fetch = require('node-fetch');
const BaseAIProvider = require('./base-provider');

class GroqProvider extends BaseAIProvider {
    async generateText(prompt) {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model || 'llama-3.1-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "Groq error");
        return { text: data.choices[0].message.content, model: data.model };
    }
}
module.exports = GroqProvider;
