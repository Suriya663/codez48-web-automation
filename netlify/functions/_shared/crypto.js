const crypto = require('crypto');

const algorithm = 'aes-256-gcm';
// Ensure secret key is exactly 32 bytes
const rawSecret = process.env.PROVIDER_KEY_ENCRYPTION_KEY || '12345678901234567890123456789012';
const secretKey = Buffer.alloc(32, rawSecret, 'utf8');

console.log(`[CRYPTO_SHARED] Using Key Secret. Length: ${secretKey.length}. Source: ${process.env.PROVIDER_KEY_ENCRYPTION_KEY ? 'ENV' : 'FALLBACK'}`);

const encrypt = (text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return {
        encryptedKey: encrypted,
        iv: iv.toString('hex'),
        authTag: cipher.getAuthTag().toString('hex')
    };
};

const decrypt = (encryptedKey, iv, authTag) => {
    try {
        const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(iv, 'hex'));
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error("[CRYPTO_SHARED] Decryption Failure:", e.message);
        throw new Error("Failed to decrypt secure connection. Key mismatch.");
    }
};

module.exports = { encrypt, decrypt };
