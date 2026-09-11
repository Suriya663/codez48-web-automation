const crypto = require('crypto');

const algorithm = 'aes-256-gcm';
const secretKey = process.env.PROVIDER_KEY_ENCRYPTION_KEY || '12345678901234567890123456789012'; // fallback for dev

const encrypt = (text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return { encryptedKey: encrypted, iv: iv.toString('hex'), authTag: cipher.getAuthTag().toString('hex') };
};

const decrypt = (encryptedKey, iv, authTag) => {
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

module.exports = { encrypt, decrypt };
