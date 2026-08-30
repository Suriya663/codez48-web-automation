import { auth } from './firebase-config.js';

/**
 * CODEZ48 MAIL AUTOMATION FRONTEND CONTROLLER
 * Manages notification email settings, toggle state, and triggers login notifications via Netlify Functions.
 */
export const MailAutomationController = {
    settings: {
        notificationEmail: '',
        mailAutomation: true
    },

    init() {
        console.log("[MAIL AUTOMATION] Controller Initialized.");
        window.MailAutomationController = MailAutomationController;
        window.openMailAutomationModal = () => MailAutomationController.openModal();
        window.closeMailAutomationModal = () => MailAutomationController.closeModal();
        window.saveMailSettings = () => MailAutomationController.saveSettings();

        // Auto-bind save button if present
        const btnSave = document.getElementById('btn-save-mail-settings');
        if (btnSave) {
            btnSave.onclick = () => MailAutomationController.saveSettings();
        }
    },

    async openModal() {
        const modal = document.getElementById('mail-automation-modal');
        if (modal) {
            modal.classList.remove('hidden');
            await MailAutomationController.loadSettings();
        }
    },

    closeModal() {
        const modal = document.getElementById('mail-automation-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    getSiteId() {
        return localStorage.getItem('tori_seller_id') || auth.currentUser?.uid || 'site_001';
    },

    async loadSettings() {
        const emailInput = document.getElementById('mail-notification-email');
        const toggleInput = document.getElementById('mail-automation-toggle');
        const statusText = document.getElementById('mail-status-text');

        if (statusText) statusText.innerText = 'Loading saved settings...';

        try {
            const siteId = MailAutomationController.getSiteId();
            const res = await fetch('/.netlify/functions/save-mail-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'GET',
                    siteId,
                    userId: auth.currentUser?.uid || siteId
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.settings) {
                    MailAutomationController.settings = data.settings;
                    if (emailInput) emailInput.value = data.settings.notificationEmail || '';
                    if (toggleInput) toggleInput.checked = Boolean(data.settings.mailAutomation);
                    if (statusText) statusText.innerText = data.settings.notificationEmail ? `Active: ${data.settings.notificationEmail}` : 'No notification email saved.';
                }
            }
        } catch (e) {
            console.warn('[MAIL AUTOMATION] Load settings notice:', e.message);
            if (statusText) statusText.innerText = 'Ready to configure.';
        }
    },

    async saveSettings() {
        const emailInput = document.getElementById('mail-notification-email');
        const toggleInput = document.getElementById('mail-automation-toggle');
        const statusText = document.getElementById('mail-status-text');
        const btnSave = document.getElementById('btn-save-mail-settings');

        const emailVal = emailInput ? emailInput.value.trim() : '';
        const enabledVal = toggleInput ? toggleInput.checked : true;

        if (!emailVal || !emailVal.includes('@')) {
            return alert("Please enter a valid notification receiver email address.");
        }

        if (btnSave) {
            btnSave.disabled = true;
            btnSave.innerText = 'Saving...';
        }
        if (statusText) statusText.innerText = 'Saving email configuration to database...';

        try {
            const siteId = MailAutomationController.getSiteId();
            const res = await fetch('/.netlify/functions/save-mail-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'SAVE',
                    siteId,
                    userId: auth.currentUser?.uid || siteId,
                    notificationEmail: emailVal,
                    mailAutomation: enabledVal
                })
            });

            if (!res.ok) throw new Error("Failed to save settings to server.");

            const result = await res.json();
            MailAutomationController.settings = { notificationEmail: emailVal, mailAutomation: enabledVal };

            if (statusText) statusText.innerText = `Settings saved successfully for ${emailVal}!`;
            alert("Mail Automation settings saved successfully!");
            MailAutomationController.closeModal();

        } catch (e) {
            console.error('[MAIL AUTOMATION SAVE ERROR]:', e.message);
            alert("Save Error: " + e.message);
            if (statusText) statusText.innerText = 'Save failed. Please try again.';
        } finally {
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.innerText = 'Save Settings';
            }
        }
    },

    /**
     * VISITOR / LOGIN TRIGGER
     * Triggered on actual successful login event. Uses loginEventId to prevent duplicate sends on refresh.
     */
    async sendLoginNotification(userName = 'Merchant', userEmail = '') {
        const siteId = MailAutomationController.getSiteId();
        const loginEventId = `LOGIN_${siteId}_${new Date().toISOString().slice(0, 10)}`;

        // Deduplication check: Send only ONCE per login session
        if (sessionStorage.getItem(`login_mail_sent_${loginEventId}`)) {
            console.log("[MAIL AUTOMATION] Login notification already sent for this session. Skipping.");
            return;
        }

        console.log("[MAIL AUTOMATION] Triggering login notification email event...");

        try {
            const res = await fetch('/.netlify/functions/send-login-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'LOGIN_SUCCESS',
                    siteId,
                    userName: userName || 'Merchant User',
                    userEmail: userEmail || 'Not provided',
                    time: new Date().toISOString(),
                    loginEventId
                })
            });

            if (res.ok) {
                sessionStorage.setItem(`login_mail_sent_${loginEventId}`, 'true');
                console.log("[MAIL AUTOMATION] Login notification event dispatched successfully.");
            }
        } catch (e) {
            console.warn("[MAIL AUTOMATION] Login notification dispatch warning:", e.message);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    MailAutomationController.init();
});
