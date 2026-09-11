const OpenAIProvider = require('./openai-provider');
const GroqProvider = require('./groq-provider');

const getProvider = (config) => {
    if (config.provider === 'openai') return new OpenAIProvider(config);
    if (config.provider === 'groq') return new GroqProvider(config);
    throw new Error("Unsupported provider");
};
module.exports = { getProvider };
