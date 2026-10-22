const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
}


if (!process.env.GROQ_API_KEY) {
    // Local GROQ_API_KEY not set; requests will transparently use the deployed Netlify AI proxy fallback.
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
