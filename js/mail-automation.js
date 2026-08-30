import { auth } from './firebase-config.js';

/**
 * CODEZ48 MAIL AUTOMATION FRONTEND CONTROLLER
 * Manages notification email settings, toggle state, SMTP testing, and triggers login notifications via Netlify Functions.
 */
export const MailAutomationController = {
    settings: {
        notificationEmail: '',
        mailAutomation: true
    },

    init() {
        console.log("[MAIL AUTOMATION] Controller Initialized.");
        const btnSave = document.getElementById('btn-save-mail-settings');
        if (btnSave) {
            btnSave.onclick = () => MailAutomationController.saveSettings();
        }
        const btnTest = document.getElementById('btn-test-mail-settings');
        if (btnTest) {
            btnTest.onclick = () => MailAutomationController.testSmtpConnection();
        }
    },

    ensureModalInDOM() {
        let modal = document.getElementById('mail-automation-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'mail-automation-modal';
            modal.className = 'fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md hidden flex items-center justify-center p-6 animate-in fade-in duration-200';
            modal.innerHTML = `
                <div class="glass-card w-full max-w-lg rounded-[3rem] p-10 bg-white relative space-y-8 shadow-2xl">
                    <button onclick="window.closeMailAutomationModal()" class="absolute top-8 right-8 text-slate-300 hover:text-black transition">
                        <i class="fa-solid fa-xmark text-2xl"></i>
                    </button>

                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-2xl font-black">
                            <i class="fa-solid fa-envelope-circle-check"></i>
                        </div>
                        <div>
                            <h3 class="text-2xl font-black text-black uppercase tracking-tight">Mail Automation</h3>
                            <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Configure Login Notification Recipient</p>
                        </div>
                    </div>

                    <div class="space-y-6">
                        <div>
                            <label class="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">NOTIFICATION EMAIL ADDRESS</label>
                            <input type="email" id="mail-notification-email" class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-black focus:outline-none focus:border-purple-600 transition font-bold text-sm" placeholder="e.g. owner@example.com">
                            <p class="text-[9px] text-slate-400 mt-2 font-medium">Successful login notifications will be dispatched to this email address via secure SMTP.</p>
                        </div>

                        <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                                <p class="text-xs font-black text-slate-900 uppercase">Enable Mail Automation</p>
                                <p class="text-[9px] text-slate-400 font-bold">Automatically dispatch alerts on merchant login</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="mail-automation-toggle" class="sr-only peer" checked>
                                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                        </div>

                        <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center" id="mail-status-text">
                            Ready to configure
                        </div>
                    </div>

                    <div class="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
                        <button id="btn-test-mail-settings" onclick="window.testSmtpConnection()" class="px-5 py-3 bg-purple-50 text-purple-600 hover:bg-purple-100 text-[10px] font-black uppercase tracking-widest rounded-xl transition flex items-center gap-2">
                            <i class="fa-solid fa-paper-plane"></i> Test SMTP
                        </button>
                        <div class="flex items-center gap-2">
                            <button onclick="window.closeMailAutomationModal()" class="px-5 py-3 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition">Cancel</button>
                            <button id="btn-save-mail-settings" onclick="window.saveMailSettings()" class="px-6 py-3 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-purple-700 transition shadow-lg shadow-purple-200">Save Settings</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    },

    async openModal() {
        const modal = MailAutomationController.ensureModalInDOM();
        modal.classList.remove('hidden');
        await MailAutomationController.loadSettings();
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

            const result = await res.json();
            if (!res.ok || !result.success) {
                throw new Error(result.error || result.message || "Failed to save settings to server.");
            }

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

    async testSmtpConnection() {
        const emailInput = document.getElementById('mail-notification-email');
        const statusText = document.getElementById('mail-status-text');
        const btnTest = document.getElementById('btn-test-mail-settings');

        const emailVal = emailInput ? emailInput.value.trim() : '';
        if (!emailVal || !emailVal.includes('@')) {
            return alert("Please enter a valid receiver email address to test.");
        }

        if (btnTest) {
            btnTest.disabled = true;
            btnTest.innerText = 'Testing...';
        }
        if (statusText) statusText.innerText = 'Verifying SMTP credentials & dispatching test email...';

        try {
            const siteId = MailAutomationController.getSiteId();
            const res = await fetch('/.netlify/functions/send-login-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'TEST_SMTP',
                    siteId,
                    notificationEmail: emailVal,
                    time: new Date().toISOString()
                })
            });

            const result = await res.json();
            if (!res.ok || !result.success) {
                throw new Error(result.error || result.message || "SMTP Test Failed.");
            }

            if (statusText) statusText.innerText = `Test Email Sent Successfully to ${emailVal}!`;
            alert(`Test Email Sent Successfully!\nPlease check inbox/spam for ${emailVal}.`);

        } catch (e) {
            console.error('[SMTP TEST ERROR]:', e.message);
            alert("SMTP Test Failed: " + e.message);
            if (statusText) statusText.innerText = 'SMTP Connection Failed: ' + e.message;
        } finally {
            if (btnTest) {
                btnTest.disabled = false;
                btnTest.innerText = 'Test SMTP';
            }
        }
    },

    /**
     * VISITOR / LOGIN TRIGGER
     * Triggered on actual successful login event. Generates unique loginEventId per login attempt.
     */
    async sendLoginNotification(userName = 'Merchant', userEmail = '') {
        const siteId = MailAutomationController.getSiteId();
        const loginEventId = `LOGIN_${siteId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const sessionKey = `login_mail_sent_${siteId}`;
        if (sessionStorage.getItem(sessionKey)) {
            console.log("[MAIL AUTOMATION] Login notification already sent for this browser session. Skipping.");
            return;
        }

        console.log("[MAIL AUTOMATION] Triggering login notification email event:", loginEventId);

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

            const result = await res.json();
            if (res.ok && result.success) {
                sessionStorage.setItem(sessionKey, 'true');
                console.log("[MAIL AUTOMATION] Login notification email sent successfully to:", result.recipient);
            } else {
                console.warn("[MAIL AUTOMATION] Login notification notice:", result.message || result.error);
            }
        } catch (e) {
            console.warn("[MAIL AUTOMATION] Login notification dispatch warning:", e.message);
        }
    }
};

// IMMEDIATELY ATTACH GLOBAL WINDOW FUNCTIONS UPON SCRIPT LOAD
window.MailAutomationController = MailAutomationController;
window.openMailAutomationModal = () => MailAutomationController.openModal();
window.closeMailAutomationModal = () => MailAutomationController.closeModal();
window.saveMailSettings = () => MailAutomationController.saveSettings();
window.testSmtpConnection = () => MailAutomationController.testSmtpConnection();

document.addEventListener('DOMContentLoaded', () => {
    MailAutomationController.init();
});
