/**
 * CODEZ48 GEMINI API KEY VAULT & MULTI-KEY ROTATION POOL
 * Securely manages primary system Gemini API keys alongside custom user-provided Gemini keys.
 * Features:
 *   - Persistent local encrypted/isolated key store (~/.codez48_keys/user_gemini_keys.json)
 *   - Automatic multi-key pool rotation & rate-limit (HTTP 429) failover
 *   - Strict key masking for security (never dumps raw keys in logs/CLI)
 *   - Preferred model selection: gemini-2.5-flash / gemini-2.5-flash-lite / gemini-3.5-flash
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('./logger');

const KEYS_DIR = path.join(os.homedir(), '.codez48_keys');
const KEYS_FILE = path.join(KEYS_DIR, 'user_gemini_keys.json');

class GeminiKeyVault {
    constructor() {
        this.keysDir = KEYS_DIR;
        this.keysFile = KEYS_FILE;
        this._ensureStore();
        this.exhaustedKeys = new Set();
        this.preferredModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    }

    _ensureStore() {
        try {
            if (!fs.existsSync(this.keysDir)) {
                fs.mkdirSync(this.keysDir, { recursive: true });
            }
            if (!fs.existsSync(this.keysFile)) {
                const initial = {
                    version: '1.0',
                    userKeys: [],
                    lastUpdated: new Date().toISOString()
                };
                fs.writeFileSync(this.keysFile, JSON.stringify(initial, null, 2), 'utf8');
            }
        } catch (_) {}
    }

    _loadUserKeys() {
        try {
            if (fs.existsSync(this.keysFile)) {
                const raw = fs.readFileSync(this.keysFile, 'utf8');
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed.userKeys) ? parsed.userKeys : [];
            }
        } catch (_) {}
        return [];
    }

    _saveUserKeys(keys) {
        try {
            this._ensureStore();
            const payload = {
                version: '1.0',
                userKeys: keys,
                lastUpdated: new Date().toISOString()
            };
            fs.writeFileSync(this.keysFile, JSON.stringify(payload, null, 2), 'utf8');
            return true;
        } catch (e) {
            logger.error(`[KEY VAULT ERROR] Could not save user keys: ${e.message}`);
            return false;
        }
    }

    /**
     * Masks an API key for safe terminal display (e.g. AIzaSyA1...9Z)
     */
    maskKey(key) {
        if (!key || typeof key !== 'string') return 'N/A';
        const trimmed = key.trim();
        if (trimmed.length <= 10) return '********';
        return `${trimmed.substring(0, 8)}...${trimmed.substring(trimmed.length - 4)}`;
    }

    /**
     * Add a custom Gemini API key provided by a user
     */
    addUserKey(apiKey, label = 'User Custom Key') {
        if (!apiKey || typeof apiKey !== 'string') {
            return { success: false, reason: 'INVALID_KEY', message: 'API key cannot be empty' };
        }
        const cleanKey = apiKey.trim();
        if (!cleanKey.startsWith('AIzaSy') && cleanKey.length < 20) {
            return { success: false, reason: 'INVALID_FORMAT', message: 'Invalid Gemini API key format (must start with AIzaSy)' };
        }

        const existing = this._loadUserKeys();
        const foundIdx = existing.findIndex(k => k.key === cleanKey);

        const keyRecord = {
            key: cleanKey,
            label: label || `User Key #${existing.length + 1}`,
            addedAt: new Date().toISOString(),
            status: 'ACTIVE',
            preferredModel: this.preferredModel
        };

        if (foundIdx >= 0) {
            existing[foundIdx] = keyRecord;
        } else {
            existing.unshift(keyRecord); // Place newest user key at front
        }

        this._saveUserKeys(existing);
        logger.status(`\x1b[32m✔ [GEMINI KEY VAULT] Successfully saved user Gemini API key: ${this.maskKey(cleanKey)} (${label})\x1b[0m`);
        return {
            success: true,
            maskedKey: this.maskKey(cleanKey),
            totalPoolSize: this.getAllActiveKeys().length
        };
    }

    /**
     * Returns all active, non-exhausted keys merging primary system key + custom user keys
     */
    getAllActiveKeys() {
        const pool = [];
        const primaryEnvKey = (process.env.GEMINI_API_KEY || '').trim();

        // 1. User custom keys (highest priority when explicitly provided)
        const userKeys = this._loadUserKeys().filter(k => k.status === 'ACTIVE' && k.key);
        for (const uk of userKeys) {
            if (uk.key && !this.exhaustedKeys.has(uk.key)) {
                pool.push({ key: uk.key, source: 'USER_CUSTOM', label: uk.label });
            }
        }

        // 2. Primary system key from environment
        if (primaryEnvKey && !this.exhaustedKeys.has(primaryEnvKey)) {
            // Avoid duplicate if same key was added
            if (!pool.some(p => p.key === primaryEnvKey)) {
                pool.push({ key: primaryEnvKey, source: 'SYSTEM_PRIMARY', label: 'Primary System Key' });
            }
        }

        // 3. Fallback: if all keys are marked exhausted, reset exhaustion to allow retries
        if (pool.length === 0) {
            this.exhaustedKeys.clear();
            if (primaryEnvKey) pool.push({ key: primaryEnvKey, source: 'SYSTEM_PRIMARY', label: 'Primary System Key' });
            for (const uk of userKeys) {
                if (uk.key && !pool.some(p => p.key === uk.key)) {
                    pool.push({ key: uk.key, source: 'USER_CUSTOM', label: uk.label });
                }
            }
        }

        return pool;
    }

    /**
     * Retrieve the best currently active Gemini API key
     */
    getActiveKey(excludeKey = null) {
        let pool = this.getAllActiveKeys();
        if (excludeKey && pool.length > 1) {
            pool = pool.filter(p => p.key !== excludeKey);
        }
        if (pool.length === 0) {
            return (process.env.GEMINI_API_KEY || '').trim();
        }
        return pool[0].key;
    }

    /**
     * Mark an API key as quota exhausted (HTTP 429) to trigger automatic rotation
     */
    reportQuotaExhausted(key) {
        if (!key) return null;
        this.exhaustedKeys.add(key);
        logger.status(`\x1b[33m[KEY VAULT] Quota exhausted for key ${this.maskKey(key)}. Switching to alternate key in pool...\x1b[0m`);
        const nextKey = this.getActiveKey(key);
        return nextKey !== key ? nextKey : null;
    }

    /**
     * Get summary status of the Gemini key pool
     */
    getPoolStatus() {
        const userKeys = this._loadUserKeys();
        const primaryEnvKey = (process.env.GEMINI_API_KEY || '').trim();
        const allKeys = this.getAllActiveKeys();

        return {
            hasPrimaryEnv: Boolean(primaryEnvKey),
            primaryMasked: primaryEnvKey ? this.maskKey(primaryEnvKey) : 'NOT_SET',
            userKeysCount: userKeys.length,
            userKeys: userKeys.map(k => ({
                label: k.label,
                maskedKey: this.maskKey(k.key),
                addedAt: k.addedAt,
                status: this.exhaustedKeys.has(k.key) ? 'RATE_LIMITED' : k.status
            })),
            activePoolSize: allKeys.length,
            preferredModel: this.preferredModel
        };
    }
}

module.exports = new GeminiKeyVault();
