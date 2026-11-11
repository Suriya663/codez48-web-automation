const logger = require('../../core/logger');
const interactiveInputWindow = require('./interactive-input-window');

/**
 * CODEZ48 CREDENTIAL HANDOFF ENGINE
 * Ensures passwords, OTPs, and sensitive secrets are NEVER transmitted to AI backend models.
 * Receives target field purpose (email, password, name, otp, phone) and injects local authorized credentials
 * or prompts the user via a small dedicated floating input window.
 */

class CredentialHandoff {
    extractAuthorizedValue(purpose, goalPrompt) {
        if (!purpose) return '';

        const pKey = purpose.toLowerCase();

        // 1. Email Field Injection
        if (pKey === 'email') {
            const emailMatch = goalPrompt.match(/email\s+['"]?([^'"]\S+@\S+)['"]?/i) || goalPrompt.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i);
            return emailMatch ? emailMatch[1] : '';
        }

        // 2. Name Field Injection
        if (pKey === 'name') {
            const nameMatch = goalPrompt.match(/name\s+['"]?([^'"]+?)(?:,|\s+email|\s+password|\s+and|\$)/i);
            return nameMatch ? nameMatch[1].trim() : '';
        }

        // 3. Password Field Injection
        if (pKey === 'password') {
            const passMatch = goalPrompt.match(/password\s+(?:is\s+)?['"]?([^'"]\S+)['"]?/i);
            return passMatch ? passMatch[1].trim() : '';
        }

        // 4. Phone Field Injection
        if (pKey === 'phone' || pKey === 'mobile') {
            const phoneMatch = goalPrompt.match(/(?:\+?91)?[6-9]\d{9}/);
            return phoneMatch ? phoneMatch[0] : '';
        }

        // 5. OTP / Verification Code Injection
        if (pKey === 'otp' || pKey === 'code') {
            const otpMatch = goalPrompt.match(/\b\d{4,8}\b/);
            return otpMatch ? otpMatch[0] : '';
        }

        // 6. Check User Profile / Settings before showing popup
        try {
            const userDetailsManager = require('../../../supervoice/user-details-manager');
            const profiles = userDetailsManager.listProfiles ? userDetailsManager.listProfiles() : [];
            const active = profiles.length > 0 ? profiles[0] : null;
            if (active) {
                if (pKey === 'email' && active.email) return active.email;
                if (pKey === 'name' && (active.name || active.businessName)) return active.name || active.businessName;
                if ((pKey === 'phone' || pKey === 'mobile') && active.phone) return active.phone;
            }
        } catch (_) {}

        return '';
    }

    /**
     * Interactively prompts user for missing credentials or OTP via the dedicated mini window
     */
    async promptForMissingCredential(purpose, serviceName = 'Service', options = {}) {
        const pKey = (purpose || 'credential').toLowerCase();
        let title = `${serviceName} // Authentication Required`;
        let prompt = `Please enter your ${purpose} to continue authentication:`;
        let placeholder = `Enter ${purpose}...`;
        let isPassword = false;

        if (pKey.includes('email')) {
            title = `${serviceName} Login // Email Required`;
            prompt = `${serviceName} requires your account email address to log in:`;
            placeholder = 'e.g. yourname@gmail.com';
        } else if (pKey.includes('password')) {
            title = `${serviceName} Login // Password Required`;
            prompt = `Please enter your password for ${serviceName}:`;
            placeholder = 'Enter password';
            isPassword = true;
        } else if (pKey.includes('otp') || pKey.includes('code') || pKey.includes('verify')) {
            title = `${serviceName} Verification // Enter OTP`;
            prompt = `Please enter the verification code / OTP sent to your phone or authenticator:`;
            placeholder = 'e.g. 123456';
        } else if (pKey.includes('phone') || pKey.includes('mobile')) {
            title = `${serviceName} // Phone Number Required`;
            prompt = `Enter your mobile number with country code (e.g. +91 98765 43210):`;
            placeholder = '+91 ...';
        }

        const res = await interactiveInputWindow.promptUserInput({
            title,
            prompt,
            placeholder,
            isPassword,
            timeoutMs: options.timeoutMs || 180000
        });

        return typeof res === 'string' ? res : (res?.value || '');
    }
}

module.exports = new CredentialHandoff();
