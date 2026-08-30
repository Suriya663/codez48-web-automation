const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

if (!process.env.GROQ_API_KEY) {
    console.warn('[CONFIG WARNING] GROQ_API_KEY environment variable is missing. Configure GROQ_API_KEY for AI planner.');
}

module.exports = {
    PORT: process.env.PLAYWRIGHT_WORKER_PORT || process.env.PORT || 8080,
    WORKER_SECRET: process.env.PLAYWRIGHT_WORKER_SECRET || 'codez48_secret_worker_token',
    HEADLESS: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT,
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
    VIEWPORT: {
        width: 1280,
        height: 720
    }
};
