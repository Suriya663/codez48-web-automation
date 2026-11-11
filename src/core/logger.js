/**
 * CODEZ48 CENTRALIZED OUTPUT & LOGGING LAYER
 * Supports separate output levels: USER, STATUS, DEBUG, ERROR, TRACE.
 * Automatically redacts API keys, tokens, credentials, and sensitive environment data.
 */

class Logger {
    constructor() {
        this.LEVELS = {
            USER: 1,
            STATUS: 2,
            DEBUG: 3,
            TRACE: 4
        };

        this.currentLevel = this.determineLogLevel();
    }

    determineLogLevel() {
        const envLevel = (process.env.CODEZ48_LOG_LEVEL || '').toLowerCase();
        if (envLevel === 'trace') return this.LEVELS.TRACE;
        if (envLevel === 'debug' || process.env.DEBUG === 'true' || process.env.CODEZ48_DEBUG === 'true') {
            return this.LEVELS.DEBUG;
        }
        return this.LEVELS.STATUS; // Default clean user session level
    }

    redactSecrets(input) {
        if (!input) return input;
        let str = typeof input === 'object' ? JSON.stringify(input) : String(input);

        // API Key & Token Patterns
        str = str.replace(/sk-[a-zA-Z0-9_-]{10,}/g, '[REDACTED_API_KEY]');
        str = str.replace(/AIzaSy[a-zA-Z0-9_-]{30,}/g, '[REDACTED_API_KEY]');
        str = str.replace(/gsk_[a-zA-Z0-9_-]{20,}/g, '[REDACTED_API_KEY]');
        str = str.replace(/key-[a-zA-Z0-9]{20,}/g, '[REDACTED_API_KEY]');
        str = str.replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED_TOKEN]');

        // JSON Secret Fields
        str = str.replace(/("(?:password|apiKey|api_key|token|secret|authorization)"\s*:\s*)"[^"]+"/gi, '$1"[REDACTED]"');

        // Sensitive Header Patterns
        str = str.replace(/(x-api-key\s*:\s*)[^\s,\n]+/gi, '$1[REDACTED]');

        return str;
    }

    formatUserMessage(msg) {
        return this.redactSecrets(msg);
    }

    formatStatusMessage(msg) {
        const cleaned = this.redactSecrets(msg);

        // Transform noisy technical logs into clean user-facing progress updates
        if (cleaned.includes('[SCREENSHOT] Capturing COMPLETE visible Windows desktop screen')) {
            return '\x1b[36mAnalyzing current screen...\x1b[0m';
        }
        if (cleaned.includes('[SCREENSHOT]') || cleaned.includes('[SCREEN CAPTURE]')) {
            return null; // Hide internal screenshot capture byte sizes & validation details
        }
        if (cleaned.includes('[GEMINI VISION]') || cleaned.includes('[GROQ VISION]')) {
            return '\x1b[36mProcessing visual request...\x1b[0m';
        }
        if (cleaned.includes('[STAGE 12 GOAL COMPLETION ENGINE]') || cleaned.includes('[AUTONOMOUS EXECUTOR]')) {
            return '\x1b[36mProcessing your request...\x1b[0m';
        }
        if (cleaned.includes('[MOTOR]') || cleaned.includes('[CURSOR ARRIVED]') || cleaned.includes('[CURSOR POSITION VERIFIED]')) {
            return null; // Hide low-level mouse motor coordinates in normal output
        }
        if (cleaned.includes('[FIREBASE REQUEST]') || cleaned.includes('[FIREBASE]')) {
            return null; // Hide backend telemetry sync logs
        }
        if (cleaned.includes('[ACTION EXECUTOR]') || cleaned.includes('[ACTION ROUTER]') || cleaned.includes('[KEYBOARD ENGINE]')) {
            return null; // Hide internal browser action executor logs
        }
        if (cleaned.includes('[PAGE OBSERVER') || cleaned.includes('[LIVE CDP]')) {
            return null; // Hide live CDP observation dumps
        }
        if (cleaned.includes('[DESKTOP ANALYSIS] Inspecting active desktop state')) {
            return '\x1b[36mInspecting desktop state...\x1b[0m';
        }

        return cleaned;
    }

    _clearProgressLine() {
        try {
            const uiProgress = require('./ui-progress');
            if (uiProgress && uiProgress.isActive && process.stdout.isTTY) {
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
            }
        } catch (_) {}
    }

    info(msg, ...args) {
        return this.status(msg, ...args);
    }

    user(msg, ...args) {
        if (this.currentLevel >= this.LEVELS.USER) {
            const formatted = this.formatUserMessage(msg);
            if (formatted !== null) {
                this._clearProgressLine();
                console.log(formatted, ...args.map(a => this.redactSecrets(a)));
            }
        }
    }

    status(msg, ...args) {
        if (this.currentLevel >= this.LEVELS.STATUS) {
            const formatted = this.formatStatusMessage(msg);
            if (formatted !== null) {
                this._clearProgressLine();
                console.log(formatted, ...args.map(a => this.redactSecrets(a)));
            }
        }
    }

    debug(msg, ...args) {
        if (this.currentLevel >= this.LEVELS.DEBUG) {
            const redacted = this.redactSecrets(msg);
            this._clearProgressLine();
            console.log(`\x1b[90m[DEBUG] ${redacted}\x1b[0m`, ...args.map(a => this.redactSecrets(a)));
        }
    }

    error(msg, ...args) {
        const redacted = this.redactSecrets(msg);
        this._clearProgressLine();
        console.error(redacted, ...args.map(a => this.redactSecrets(a)));
    }

    trace(msg, ...args) {
        if (this.currentLevel >= this.LEVELS.TRACE) {
            const redacted = this.redactSecrets(msg);
            this._clearProgressLine();
            console.log(`\x1b[90m[TRACE] ${redacted}\x1b[0m`, ...args.map(a => this.redactSecrets(a)));
        }
    }
}

module.exports = new Logger();
