class BaseAIProvider {
    constructor(config) { this.apiKey = config.apiKey; this.model = config.model; }
    async generateText() { throw new Error("Not implemented"); }
}
module.exports = BaseAIProvider;
