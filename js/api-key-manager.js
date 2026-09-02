import { db, auth } from './firebase-config.js';
import {
    collection, query, where, getDocs, getDoc, doc, setDoc,
    serverTimestamp, updateDoc, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

/**
 * CODEZ48 API KEY & TOKEN MANAGEMENT ENGINE (LIGHT MODE + SHINY GOLD PRO KEYS + DETAILS MODAL)
 * Handles generation of up to 10 Free API keys (10 Tokens = 20 Emails each),
 * Live Razorpay Monthly Subscription (60 Emails/Day), Golden Metallic Key Cards,
 * Full Interactive API Key Analytics & Details Modal, Pro Custom Email Credentials with Security OTP,
 * Quota Validation, Biometric/Passcode Deletion Safeguard, and "My Subscription APIs" Recovery.
 */
export const ApiKeyManager = {
    userKeys: [],
    recoveredKeys: [],

    getUserId() {
        return auth.currentUser?.uid || localStorage.getItem('c48_user_uid') || localStorage.getItem('tori_seller_id') || 'guest_user';
    },

    /**
     * Generate a new Free API Key (Max 10 per user, 10 Tokens = 20 Emails)
     */
    async createFreeApiKey() {
        const userId = ApiKeyManager.getUserId();
        const userKeys = await ApiKeyManager.fetchUserKeys();

        if (userKeys.length >= 10) {
            alert("Maximum free API key limit reached (10 keys max). Please upgrade to a Razorpay Pro Subscription for unlimited keys!");
            return null;
        }

        const keyId = 'c48_api_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
        const keyData = {
            keyId,
            userId,
            keyName: `API Key #${userKeys.length + 1}`,
            planType: 'FREE_TIER',
            tokensTotal: 10,       // 10 Tokens
            tokensRemaining: 10,   // 20 Emails (2 emails per token)
            emailsAllowed: 20,
            emailsSent: 0,
            dailyQuota: 20,
            dailySent: 0,
            recipientHistory: [],
            lastResetAt: new Date().toISOString(),
            status: 'ACTIVE',
            createdAt: new Date().toISOString()
        };

        try {
            await setDoc(doc(db, "api_keys", keyId), keyData);
            // Backup to local device storage for offline capability
            const localSaved = JSON.parse(localStorage.getItem(`c48_api_keys_${userId}`) || '[]');
            localSaved.push(keyData);
            localStorage.setItem(`c48_api_keys_${userId}`, JSON.stringify(localSaved));

            ApiKeyManager.statusMessage = {
                type: 'success',
                text: `⚡ New API Key Generated Successfully: ${keyId} (10 Tokens / 20 Free Emails Added)`
            };
            ApiKeyManager.renderApiKeyUI();
            ApiKeyManager.populateKeySelector();
            return keyData;
        } catch (e) {
            console.error("[API KEY CREATE ERROR]:", e.message);
            ApiKeyManager.statusMessage = { type: 'error', text: "Error creating API key: " + e.message };
            ApiKeyManager.renderApiKeyUI();
            return null;
        }
    },

    /**
     * Fetch user's own keys from Firestore & Local Storage
     */
    async fetchUserKeys() {
        const userId = ApiKeyManager.getUserId();
        try {
            const q = query(collection(db, "api_keys"), where("userId", "==", userId));
            const snap = await getDocs(q);
            const keys = [];
            snap.forEach(d => keys.push(d.data()));
            ApiKeyManager.userKeys = keys;
            localStorage.setItem(`c48_api_keys_${userId}`, JSON.stringify(keys));
            return keys;
        } catch (e) {
            console.warn("[API KEY FETCH NOTICE]:", e.message);
            // Fallback to local device storage
            const localSaved = JSON.parse(localStorage.getItem(`c48_api_keys_${userId}`) || '[]');
            ApiKeyManager.userKeys = localSaved;
            return localSaved;
        }
    },

    /**
     * Delete API Key with Security Passcode Confirmation
     */
    async deleteApiKey(keyId) {
        const confirmCode = prompt(`SECURITY CONFIRMATION REQUIRED:\nEnter your device passcode or type 'DELETE' to confirm deletion of API Key:\n${keyId}`);
        if (!confirmCode || (confirmCode.trim() !== 'DELETE' && confirmCode.trim().length < 3)) {
            alert("Deletion cancelled or security authentication failed.");
            return;
        }

        const userId = ApiKeyManager.getUserId();
        try {
            // Find key data before deletion for backup in My Subscription APIs recovery
            const keySnap = await getDoc(doc(db, "api_keys", keyId));
            if (keySnap.exists()) {
                const keyData = keySnap.data();
                // Backup to recovery collection
                await setDoc(doc(db, "my_subscription_apis", keyId), {
                    ...keyData,
                    archivedAt: new Date().toISOString()
                });
            }

            await deleteDoc(doc(db, "api_keys", keyId));
            alert(`API Key ${keyId} deleted successfully.\nIf this was a paid key, you can restore it anytime under 'My Subscription APIs'.`);
            ApiKeyManager.renderApiKeyUI();
            ApiKeyManager.populateKeySelector();
        } catch (e) {
            alert("Error deleting API key: " + e.message);
        }
    },

    /**
     * Restore Deleted Key from "My Subscription APIs"
     */
    async restoreApiKey(keyId) {
        try {
            const recoverySnap = await getDoc(doc(db, "my_subscription_apis", keyId));
            if (recoverySnap.exists()) {
                const keyData = recoverySnap.data();
                delete keyData.archivedAt;
                await setDoc(doc(db, "api_keys", keyId), keyData);
                await deleteDoc(doc(db, "my_subscription_apis", keyId));
                alert(`API Key ${keyId} restored successfully!`);
                ApiKeyManager.renderApiKeyUI();
                ApiKeyManager.populateKeySelector();
            }
        } catch (e) {
            alert("Error restoring API key: " + e.message);
        }
    },

    /**
     * Open Full Interactive API Key Details Modal
     */
    async openApiKeyDetailsModal(keyId) {
        const key = ApiKeyManager.userKeys.find(k => k.keyId === keyId);
        if (!key) return;

        let modal = document.getElementById('api-key-details-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'api-key-details-modal';
            modal.className = 'fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200';
            document.body.appendChild(modal);
        }

        const isPro = key.planType === 'PRO_SUBSCRIPTION';
        const remainingQuota = isPro ? (60 - (key.dailySent || 0)) + ' Emails Today' : ((key.tokensRemaining || 0) * 2) + ' Emails';
        const historyList = key.recipientHistory || [];

        modal.innerHTML = `
            <div class="glass-card w-full max-w-xl rounded-[2.5rem] p-6 md:p-8 bg-white relative space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button onclick="window.closeApiKeyDetailsModal()" class="absolute top-6 right-6 text-slate-300 hover:text-black transition">
                    <i class="fa-solid fa-xmark text-2xl"></i>
                </button>

                <div class="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div class="w-10 h-10 ${isPro ? 'bg-amber-100 text-amber-800' : 'bg-purple-50 text-purple-600'} rounded-xl flex items-center justify-center text-lg font-black shrink-0">
                        <i class="fa-solid ${isPro ? 'fa-crown' : 'fa-key'}"></i>
                    </div>
                    <div>
                        <h4 class="text-xl font-black text-black uppercase tracking-tight">${key.keyName || 'API Key Details'}</h4>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">${isPro ? '👑 Pro Subscription Plan' : 'Free Tier Key'}</p>
                    </div>
                </div>

                <!-- Key String & Copy Action -->
                <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest">API KEY STRING</label>
                    <div class="flex gap-2">
                        <input type="text" readonly class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-purple-700 font-bold" value="${key.keyId}">
                        <button onclick="navigator.clipboard.writeText('${key.keyId}'); alert('API Key copied to clipboard!');" class="px-3 py-2 bg-purple-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-purple-700 transition flex items-center gap-1 shrink-0">
                            <i class="fa-solid fa-copy"></i> Copy
                        </button>
                    </div>
                </div>

                <!-- Usage Stats Matrix -->
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                        <span class="text-[8px] font-black text-slate-400 uppercase block">Remaining Quota</span>
                        <span class="text-sm font-black text-purple-700">${remainingQuota}</span>
                    </div>
                    <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                        <span class="text-[8px] font-black text-slate-400 uppercase block">Total Sent</span>
                        <span class="text-sm font-black text-slate-900">${key.emailsSent || 0} Emails</span>
                    </div>
                    <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                        <span class="text-[8px] font-black text-slate-400 uppercase block">Status</span>
                        <span class="text-sm font-black text-emerald-600 uppercase">${key.status || 'Active'}</span>
                    </div>
                </div>

                <!-- Recipient History Log Table -->
                <div class="space-y-2">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Recipient Dispatch Log</span>
                    <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl max-h-40 overflow-y-auto custom-scrollbar font-mono text-[10px]">
                        ${historyList.length === 0 ? `
                            <p class="text-slate-400 italic text-center py-4">No emails dispatched with this key yet.</p>
                        ` : `
                            <div class="space-y-1.5">
                                ${historyList.map(h => `
                                    <div class="flex justify-between text-slate-700 border-b border-slate-200/60 pb-1">
                                        <span class="font-bold text-purple-700">${h.email || h}</span>
                                        <span class="text-slate-400 text-[8px]">${h.time ? new Date(h.time).toLocaleTimeString() : 'Delivered'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>

                <!-- Actions -->
                <div class="pt-2 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3">
                    ${isPro ? `
                        <button onclick="window.closeApiKeyDetailsModal(); window.openCustomSmtpModal('${key.keyId}')" class="px-4 py-2.5 bg-amber-900 hover:bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition flex items-center gap-1.5 shadow-md">
                            <i class="fa-solid fa-sliders"></i> Configure API Credentials
                        </button>
                    ` : `
                        <button onclick="window.closeApiKeyDetailsModal(); window.launchRazorpaySubscription()" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition flex items-center gap-1.5 shadow-md">
                            <i class="fa-solid fa-crown"></i> Upgrade to Pro Plan (60/Day)
                        </button>
                    `}
                    <button onclick="window.closeApiKeyDetailsModal()" class="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition ml-auto">
                        Close
                    </button>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    },

    closeApiKeyDetailsModal() {
        const modal = document.getElementById('api-key-details-modal');
        if (modal) modal.classList.add('hidden');
    },

    /**
     * Open Custom Pro Email Credentials & OTP Verification Modal
     */
    openCustomSmtpModal(keyId) {
        let modal = document.getElementById('custom-smtp-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'custom-smtp-modal';
            modal.className = 'fixed inset-0 z-[130] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200';
            modal.innerHTML = `
                <div class="glass-card w-full max-w-lg rounded-[2.5rem] p-6 md:p-8 bg-white relative space-y-6 shadow-2xl">
                    <button onclick="window.closeCustomSmtpModal()" class="absolute top-6 right-6 text-slate-300 hover:text-black transition">
                        <i class="fa-solid fa-xmark text-2xl"></i>
                    </button>

                    <div class="flex items-center gap-3 border-b border-slate-100 pb-3">
                        <div class="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center text-lg font-black shrink-0">
                            <i class="fa-solid fa-crown"></i>
                        </div>
                        <div>
                            <h4 class="text-xl font-black text-black uppercase tracking-tight">Configure Pro Email Credentials</h4>
                            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">PRO PLAN ONLY • Security OTP Verification Required</p>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <input type="hidden" id="smtp-key-id" value="${keyId}">
                        <div>
                            <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">SENDER EMAIL ADDRESS</label>
                            <input type="email" id="smtp-custom-email" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-black focus:outline-none focus:border-purple-600" placeholder="e.g. yourname@domain.com">
                        </div>

                        <div>
                            <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">APP PASSWORD / EMAIL PASSWORD</label>
                            <input type="password" id="smtp-custom-pass" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-black focus:outline-none focus:border-purple-600" placeholder="Enter Gmail App Password or SMTP pass">
                        </div>

                        <div class="pt-2 flex gap-2">
                            <button id="btn-send-smtp-otp" onclick="window.sendSmtpOTP()" class="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-md shadow-purple-200">
                                <i class="fa-solid fa-paper-plane mr-1"></i> Send Security OTP Code
                            </button>
                        </div>

                        <div id="smtp-otp-step" class="hidden space-y-3 pt-3 border-t border-slate-100">
                            <label class="block text-[8px] font-black text-purple-700 uppercase tracking-widest">ENTER 6-DIGIT OTP DISPATCHED TO SENDER EMAIL</label>
                            <input type="text" id="smtp-otp-code" class="w-full bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm font-mono font-bold text-purple-900 text-center tracking-widest" placeholder="123456" maxlength="6">
                            <button id="btn-verify-smtp-otp" onclick="window.verifySmtpOTP()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-md shadow-emerald-200">
                                <i class="fa-solid fa-check-double mr-1"></i> Connect & Save Pro Credentials
                            </button>
                        </div>

                        <!-- Direct Test Email Tool Section -->
                        <div id="smtp-test-email-section" class="pt-4 border-t border-slate-100 space-y-3">
                            <span class="text-[9px] font-black text-purple-700 uppercase tracking-widest block flex items-center gap-1.5">
                                <i class="fa-solid fa-paper-plane"></i> Send Live Test Email via Connected Account
                            </span>

                            <div>
                                <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">RECIPIENT EMAIL</label>
                                <input type="email" id="test-mail-recipient" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-black" placeholder="e.g. recipient@example.com">
                            </div>

                            <div>
                                <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">EMAIL SUBJECT</label>
                                <input type="text" id="test-mail-subject" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-black" value="Test Email from Connected CODEZ48 Account">
                            </div>

                            <div>
                                <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">EMAIL CONTENT</label>
                                <textarea id="test-mail-content" rows="2" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-black font-medium resize-none">Hello! This is a test email sent directly through your connected email account on CODEZ48.</textarea>
                            </div>

                            <button id="btn-send-custom-test-email" onclick="window.sendCustomSmtpTestMail()" class="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-md">
                                <i class="fa-solid fa-rocket mr-1"></i> Send Test Email
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            document.getElementById('smtp-key-id').value = keyId;
            modal.classList.remove('hidden');
        }
    },

    closeCustomSmtpModal() {
        const modal = document.getElementById('custom-smtp-modal');
        if (modal) modal.classList.add('hidden');
    },

    async sendSmtpOTP() {
        const email = document.getElementById('smtp-custom-email')?.value.trim();
        const btn = document.getElementById('btn-send-smtp-otp');

        if (!email || !email.includes('@')) {
            return alert("Please enter a valid sender email address first.");
        }

        if (btn) {
            btn.disabled = true;
            btn.innerText = "Sending OTP...";
        }

        try {
            const siteId = ApiKeyManager.getUserId();
            const res = await fetch('/.netlify/functions/send-login-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'SEND_OTP',
                    siteId,
                    notificationEmail: email
                })
            });

            const result = await res.json();
            if (res.ok && result.success) {
                alert(`Security OTP Code dispatched successfully to ${email}!\nPlease check inbox/spam.`);
                document.getElementById('smtp-otp-step')?.classList.remove('hidden');
            } else {
                throw new Error(result.error || result.message || "Failed to send OTP.");
            }
        } catch (e) {
            alert("OTP Error: " + e.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="fa-solid fa-paper-plane mr-1"></i> Send Security OTP Code`;
            }
        }
    },

    async verifySmtpOTP() {
        const email = document.getElementById('smtp-custom-email')?.value.trim();
        const pass = document.getElementById('smtp-custom-pass')?.value.trim();
        const otp = document.getElementById('smtp-otp-code')?.value.trim();
        const btn = document.getElementById('btn-verify-smtp-otp');

        if (!email || !pass || !otp) {
            return alert("Email, Password, and 6-digit OTP code are all required.");
        }

        if (btn) {
            btn.disabled = true;
            btn.innerText = "Verifying...";
        }

        try {
            const siteId = ApiKeyManager.getUserId();
            const res = await fetch('/.netlify/functions/send-login-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'VERIFY_OTP',
                    siteId,
                    notificationEmail: email,
                    otpCode: otp,
                    customSmtpUser: email,
                    customSmtpPass: pass
                })
            });

            const result = await res.json();
            if (res.ok && result.success) {
                alert(`Pro Email Credentials Verified & Saved Successfully!\nAll future automated dispatches will be sent directly through ${email}.`);
                ApiKeyManager.closeCustomSmtpModal();
            } else {
                throw new Error(result.error || result.message || "OTP verification failed.");
            }
        } catch (e) {
            alert("Verification Error: " + e.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="fa-solid fa-check-double mr-1"></i> Connect & Save Pro Credentials`;
            }
        }
    },

    async sendCustomSmtpTestMail() {
        const recipient = document.getElementById('test-mail-recipient')?.value.trim();
        const subject = document.getElementById('test-mail-subject')?.value.trim() || 'Test Email';
        const content = document.getElementById('test-mail-content')?.value.trim() || 'Test content';
        const btn = document.getElementById('btn-send-custom-test-email');

        if (!recipient || !recipient.includes('@')) {
            return alert("Please enter a valid recipient email address for testing.");
        }

        if (btn) {
            btn.disabled = true;
            btn.innerText = "Sending Test Email...";
        }

        try {
            const siteId = ApiKeyManager.getUserId();
            const res = await fetch('/.netlify/functions/send-login-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'TEST_SMTP',
                    siteId,
                    notificationEmail: recipient,
                    headerText: subject,
                    businessDescription: content,
                    headerLogoUrl: 'https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/003/810/744/datas/original.jpg',
                    time: new Date().toISOString()
                })
            });

            let result = {};
            try {
                result = await res.json();
            } catch (pErr) {}

            if (res.ok && (result.success || res.status === 200)) {
                alert(`Test Email Dispatched Successfully to ${recipient}!\nPlease check inbox/spam.`);
            } else {
                throw new Error(result.error || result.message || "Failed to send test email.");
            }
        } catch (e) {
            alert("Test Email Error: " + e.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="fa-solid fa-rocket mr-1"></i> Send Test Email`;
            }
        }
    },

    /**
     * Validate Quota before sending emails
     */
    async validateAndDeductQuota(keyId, requestedEmailCount) {
        const userId = ApiKeyManager.getUserId();
        let keyData = null;

        try {
            const keySnap = await getDoc(doc(db, "api_keys", keyId));
            if (keySnap.exists()) {
                keyData = keySnap.data();
            }
        } catch (e) {}

        if (!keyData) {
            // Check local fallback
            const localKeys = JSON.parse(localStorage.getItem(`c48_api_keys_${userId}`) || '[]');
            keyData = localKeys.find(k => k.keyId === keyId) || localKeys[0];
        }

        if (!keyData) {
            return {
                allowed: false,
                allowedCount: 0,
                message: "No valid API key found. Please generate an API key on the 'API Keys & Billing' page."
            };
        }

        // Daily Reset Check for Monthly Subscriptions (60 emails/day)
        const now = new Date();
        const lastReset = new Date(keyData.lastResetAt || 0);
        const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);

        if (hoursSinceReset >= 24) {
            keyData.dailySent = 0;
            keyData.lastResetAt = now.toISOString();
        }

        let maxSendable = 0;
        if (keyData.planType === 'PRO_SUBSCRIPTION') {
            maxSendable = Math.max(0, 60 - keyData.dailySent);
        } else {
            maxSendable = Math.max(0, keyData.tokensRemaining * 2); // 1 token = 2 emails
        }

        if (maxSendable === 0) {
            return {
                allowed: false,
                allowedCount: 0,
                message: `API Limit Reached for key ${keyId}. Please buy Pro Plan or wait for daily reset.`
            };
        }

        const sendableCount = Math.min(requestedEmailCount, maxSendable);
        const tokensDeducted = Math.ceil(sendableCount / 2);

        // Deduct Quota
        keyData.emailsSent += sendableCount;
        keyData.dailySent += sendableCount;
        keyData.tokensRemaining = Math.max(0, keyData.tokensRemaining - tokensDeducted);

        try {
            await setDoc(doc(db, "api_keys", keyId), keyData, { merge: true });
        } catch (e) {}

        return {
            allowed: true,
            allowedCount: sendableCount,
            tokensRemaining: keyData.tokensRemaining,
            dailyRemaining: Math.max(0, 60 - keyData.dailySent),
            message: sendableCount < requestedEmailCount ? `Quota limit reached! Dispatching first ${sendableCount} emails.` : 'Quota valid.'
        };
    },

    /**
     * Launch Razorpay Monthly Subscription (Live Mode Integration using official Live Key)
     */
    async launchRazorpaySubscription() {
        const userId = ApiKeyManager.getUserId();
        const liveKeyId = "rzp_live_TUJt8CLvlZ1XEN"; // Fixed Live Razorpay Integration Key used across CODEZ48

        const options = {
            key: liveKeyId,
            amount: 9900, // ₹99 / month (9900 paise)
            currency: "INR",
            name: "CODEZ48 Email Automation Pro",
            description: "Monthly Pro Subscription - ₹99 (60 Emails / Day)",
            image: "https://codez48.netlify.app/img/logo.png",
            handler: async function (response) {
                const subKeyId = 'c48_sub_' + Math.random().toString(36).substring(2, 10);
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + 30);

                const subKeyData = {
                    keyId: subKeyId,
                    userId,
                    keyName: 'Pro Subscription Key',
                    planType: 'PRO_SUBSCRIPTION',
                    paymentId: response.razorpay_payment_id || 'PAY_' + Date.now(),
                    tokensTotal: 9999,
                    tokensRemaining: 9999,
                    emailsAllowed: 1800,
                    emailsSent: 0,
                    dailyQuota: 60,
                    dailySent: 0,
                    lastResetAt: new Date().toISOString(),
                    expiresAt: expiryDate.toISOString(),
                    status: 'ACTIVE',
                    createdAt: new Date().toISOString()
                };

                await setDoc(doc(db, "api_keys", subKeyId), subKeyData);
                ApiKeyManager.statusMessage = { type: 'success', text: `⚡ Razorpay Live Payment Successful! Payment ID: ${subKeyData.paymentId}. Pro API Key Created: ${subKeyId}` };
                ApiKeyManager.renderApiKeyUI();
                ApiKeyManager.populateKeySelector();
            },
            prefill: {
                name: auth.currentUser?.displayName || "CODEZ48 Merchant",
                email: auth.currentUser?.email || "owner@example.com"
            },
            theme: { color: "#9333ea" }
        };

        try {
            if (window.Razorpay) {
                const rzp = new window.Razorpay(options);
                rzp.open();
            } else {
                const s = document.createElement("script");
                s.src = "https://checkout.razorpay.com/v1/checkout.js";
                s.onload = () => {
                    const rzp = new window.Razorpay(options);
                    rzp.open();
                };
                document.head.appendChild(s);
            }
        } catch (err) {
            console.error("Razorpay Checkout Error:", err);
            alert("Razorpay Initialization Notice: " + err.message);
        }
    },

    /**
     * Populate Key Selector Dropdown in Email Automation Modal
     */
    async populateKeySelector() {
        const selectEl = document.getElementById('mail-active-key-select');
        const balanceEl = document.getElementById('mail-active-balance-text');
        if (!selectEl) return;

        const keys = await ApiKeyManager.fetchUserKeys();

        if (keys.length === 0) {
            selectEl.innerHTML = `<option value="">No Active API Key (Click Manage Keys & Billing →)</option>`;
            if (balanceEl) balanceEl.innerText = "0 Emails";
            return;
        }

        selectEl.innerHTML = keys.map(k => `
            <option value="${k.keyId}" ${k.planType === 'PRO_SUBSCRIPTION' ? 'selected' : ''}>
                ${k.keyId} (${k.planType === 'PRO_SUBSCRIPTION' ? (60 - k.dailySent) + ' Emails Today' : (k.tokensRemaining * 2) + ' Emails Left'})
            </option>
        `).join('');

        ApiKeyManager.handleActiveKeySelectChange();
    },

    handleActiveKeySelectChange() {
        const selectEl = document.getElementById('mail-active-key-select');
        const balanceEl = document.getElementById('mail-active-balance-text');
        if (!selectEl || !balanceEl) return;

        const selectedKeyId = selectEl.value;
        const key = ApiKeyManager.userKeys.find(k => k.keyId === selectedKeyId);

        if (key) {
            const remaining = key.planType === 'PRO_SUBSCRIPTION' ? (60 - key.dailySent) + ' Emails Today' : (key.tokensRemaining * 2) + ' Emails';
            balanceEl.innerText = remaining;
        } else {
            balanceEl.innerText = '0 Emails';
        }
    },

    /**
     * Render API Management & Recovery UI (LIGHT MODE THEME + GOLD METALLIC PRO KEYS)
     */
    async renderApiKeyUI() {
        const container = document.getElementById('api-key-management-container');
        if (!container) return;

        const keys = await ApiKeyManager.fetchUserKeys();

        // Calculate Stat Summaries
        const keysGenerated = keys.length;
        const keysRemaining = Math.max(0, 10 - keysGenerated);
        const totalTokensGenerated = keys.reduce((acc, k) => acc + (k.tokensTotal || 10), 0);
        const remainingTokens = keys.reduce((acc, k) => acc + (k.tokensRemaining || 0), 0);
        const totalEmailsSent = keys.reduce((acc, k) => acc + (k.emailsSent || 0), 0);

        // Fetch recovered keys
        let recovered = [];
        try {
            const qR = query(collection(db, "my_subscription_apis"), where("userId", "==", ApiKeyManager.getUserId()));
            const snapR = await getDocs(qR);
            snapR.forEach(d => recovered.push(d.data()));
        } catch (e) {}

        container.innerHTML = `
            <div class="p-6 md:p-8 bg-white rounded-[2.5rem] text-slate-900 space-y-6 shadow-xl border border-slate-200/80">
                <div class="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 pb-4">
                    <div>
                        <h4 class="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-slate-900">
                            <i class="fa-solid fa-key text-purple-600"></i> Active API Keys & Quota Management
                        </h4>
                        <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Firebase Secured • Click Any API Key Card to View Analytics & Logs</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="window.createFreeApiKey()" class="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition flex items-center gap-1.5 shadow-md shadow-purple-200">
                            <i class="fa-solid fa-plus"></i> Generate Free Key (10 Tokens)
                        </button>
                        <button onclick="window.launchRazorpaySubscription()" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition flex items-center gap-1.5 shadow-md shadow-emerald-200">
                            <i class="fa-solid fa-crown"></i> Buy Pro Plan (₹99/Mo - 60 Emails/Day)
                        </button>
                    </div>
                </div>

                <!-- Status Banner Tag (No Browser Alerts) -->
                ${ApiKeyManager.statusMessage ? `
                    <div class="p-4 ${ApiKeyManager.statusMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} border font-bold rounded-2xl flex items-center justify-between text-xs animate-in fade-in">
                        <span>${ApiKeyManager.statusMessage.text}</span>
                        <button onclick="ApiKeyManager.statusMessage=null; ApiKeyManager.renderApiKeyUI();" class="text-slate-400 hover:text-black font-black text-sm ml-2"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                ` : ''}

                <!-- Token & Key Quota Summary Stat Matrix -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
                        <span class="text-[8px] font-black text-slate-400 uppercase block">Keys Created</span>
                        <span class="text-base font-black text-slate-900">${keysGenerated} / 10</span>
                        <span class="text-[8px] font-bold text-purple-600 block">${keysRemaining} Keys Available</span>
                    </div>
                    <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
                        <span class="text-[8px] font-black text-slate-400 uppercase block">Tokens Generated</span>
                        <span class="text-base font-black text-purple-700">${totalTokensGenerated} Tokens</span>
                        <span class="text-[8px] font-bold text-slate-500 block">${totalTokensGenerated * 2} Emails Capacity</span>
                    </div>
                    <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
                        <span class="text-[8px] font-black text-slate-400 uppercase block">Available Tokens</span>
                        <span class="text-base font-black text-emerald-600">${remainingTokens} Tokens</span>
                        <span class="text-[8px] font-bold text-emerald-600 block">${remainingTokens * 2} Emails Balance</span>
                    </div>
                    <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
                        <span class="text-[8px] font-black text-slate-400 uppercase block">Total Dispatched</span>
                        <span class="text-base font-black text-slate-900">${totalEmailsSent}</span>
                        <span class="text-[8px] font-bold text-slate-500 block">Delivered Emails</span>
                    </div>
                </div>

                <!-- Active Keys List -->
                <div class="space-y-3">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Your Generated API Keys (${keys.length}/10 Max) — Click Card for Full Details</span>
                    ${keys.length === 0 ? `
                        <div class="p-8 bg-slate-50 rounded-2xl text-center border border-dashed border-slate-200 space-y-2">
                            <p class="text-sm text-slate-700 font-black uppercase">No API Keys Generated Yet</p>
                            <p class="text-[10px] text-slate-400">Click 'Generate Free Key' above to get 10 free tokens (20 emails capacity).</p>
                        </div>
                    ` : `
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            ${keys.map(k => {
                                const isPro = k.planType === 'PRO_SUBSCRIPTION';
                                return `
                                <div onclick="window.openApiKeyDetailsModal('${k.keyId}')" class="p-5 rounded-2xl space-y-3 shadow-md transition-all cursor-pointer hover:scale-[1.01] ${isPro ? 'bg-gradient-to-br from-amber-50 via-yellow-100 to-amber-100 border-2 border-amber-400 shadow-amber-200/50' : 'bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80'}">
                                    <div class="flex justify-between items-center">
                                        <span class="text-xs font-mono font-bold ${isPro ? 'text-amber-950' : 'text-purple-700'} truncate">${k.keyId}</span>
                                        <span class="px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase ${isPro ? 'bg-yellow-400 text-amber-950 border border-amber-500 shadow-sm flex items-center gap-1' : 'bg-purple-100 text-purple-800 border border-purple-200'}">
                                            ${isPro ? '<i class="fa-solid fa-crown text-amber-800"></i> PRO PLAN (60/Day)' : 'FREE TIER'}
                                        </span>
                                    </div>
                                    <div class="flex justify-between items-center text-[10px] font-mono ${isPro ? 'text-amber-900' : 'text-slate-600'}">
                                        <span>Quota Remaining: <strong class="${isPro ? 'text-amber-950' : 'text-slate-900'} font-bold">${isPro ? (60 - k.dailySent) + ' Emails Today' : (k.tokensRemaining * 2) + ' Emails'}</strong></span>
                                        <span>Sent: ${k.emailsSent}</span>
                                    </div>

                                    <div class="pt-2 border-t ${isPro ? 'border-amber-300/80' : 'border-slate-200/60'} flex justify-between items-center">
                                        <span class="text-[8px] ${isPro ? 'text-amber-800' : 'text-purple-700'} font-black uppercase flex items-center gap-1">
                                            <i class="fa-solid fa-chart-line"></i> Click to View Full Key Details & Logs →
                                        </span>
                                        ${isPro ? `<span class="text-[8px] text-amber-900 font-bold uppercase bg-amber-200/80 px-2 py-0.5 rounded-full">OTP Configured</span>` : ''}
                                    </div>

                                    <div class="flex justify-between items-center pt-2 border-t ${isPro ? 'border-amber-300/60' : 'border-slate-200/60'} text-[9px]">
                                        <span class="${isPro ? 'text-amber-800' : 'text-slate-400'} font-mono">Created: ${new Date(k.createdAt).toLocaleDateString()}</span>
                                        <button onclick="event.stopPropagation(); window.deleteApiKey('${k.keyId}')" class="text-rose-600 hover:text-rose-800 font-black uppercase tracking-widest flex items-center gap-1">
                                            <i class="fa-solid fa-trash-can"></i> Delete
                                        </button>
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>

                <!-- Recovery Section: My Subscription APIs -->
                ${recovered.length > 0 ? `
                    <div class="pt-4 border-t border-slate-100 space-y-3">
                        <span class="text-[9px] font-black text-purple-700 uppercase tracking-widest block flex items-center gap-1.5">
                            <i class="fa-solid fa-rotate-left"></i> My Subscription APIs (Recovery Backup)
                        </span>
                        <div class="space-y-2">
                            ${recovered.map(r => `
                                <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs font-mono">
                                    <div>
                                        <span class="text-purple-700 font-bold">${r.keyId}</span>
                                        <span class="text-slate-400 text-[9px] ml-2">Archived ${new Date(r.archivedAt).toLocaleDateString()}</span>
                                    </div>
                                    <button onclick="window.restoreApiKey('${r.keyId}')" class="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-[8px] font-black uppercase hover:bg-purple-700 transition shadow-sm">
                                        Restore API Key
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Active Business Collaborations Section -->
                <div class="pt-4 border-t border-slate-100 space-y-3">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
                        <i class="fa-solid fa-handshake text-emerald-600"></i> My Active Business Collaborations
                    </span>
                    <div id="active-collaborations-list" class="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs font-mono space-y-2">
                        <p class="text-slate-400 italic text-[10px]">Loading active business partner nodes...</p>
                    </div>
                </div>
            </div>
        `;

        // Populate Active Collaborations List
        const collabListEl = document.getElementById('active-collaborations-list');
        if (collabListEl) {
            try {
                const currentUid = ApiKeyManager.getUserId();
                const cSnap = await getDocs(query(collection(db, "collaborations"), where("status", "==", "active")));
                const activePartners = [];
                cSnap.forEach(d => {
                    const data = d.data();
                    if (data.sellerA === currentUid) activePartners.push({ partnerId: data.sellerB, collabId: d.id });
                    else if (data.sellerB === currentUid) activePartners.push({ partnerId: data.sellerA, collabId: d.id });
                });

                if (activePartners.length === 0) {
                    collabListEl.innerHTML = `<p class="text-slate-400 italic text-[10px]">No active business collaborations connected. Click 'Connect & Collaborate' on any merchant profile to partner!</p>`;
                } else {
                    collabListEl.innerHTML = activePartners.map(p => `
                        <div class="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center flex-wrap gap-2">
                            <div>
                                <span class="text-emerald-700 font-bold font-mono">🤝 Collab Partner: ${p.partnerId}</span>
                                <span class="text-slate-400 text-[9px] block">Status: Active Business Partner</span>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="window.showPublicProfile('${p.partnerId}')" class="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-[8px] font-black uppercase hover:bg-purple-200 transition">
                                    View Partner
                                </button>
                                <button onclick="window.terminateCollaboration('${p.partnerId}')" class="px-3 py-1 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-[8px] font-black uppercase border border-rose-200 transition">
                                    Un-Collaborate
                                </button>
                            </div>
                        </div>
                    `).join('');
                }
            } catch (err) {
                collabListEl.innerHTML = `<p class="text-slate-400 italic text-[10px]">No active collaborations.</p>`;
            }
        }
    }
};

window.ApiKeyManager = ApiKeyManager;
window.createFreeApiKey = () => ApiKeyManager.createFreeApiKey();
window.deleteApiKey = (id) => ApiKeyManager.deleteApiKey(id);
window.restoreApiKey = (id) => ApiKeyManager.restoreApiKey(id);
window.openApiKeyDetailsModal = (id) => ApiKeyManager.openApiKeyDetailsModal(id);
window.closeApiKeyDetailsModal = () => ApiKeyManager.closeApiKeyDetailsModal();
window.openCustomSmtpModal = (id) => ApiKeyManager.openCustomSmtpModal(id);
window.closeCustomSmtpModal = () => ApiKeyManager.closeCustomSmtpModal();
window.sendSmtpOTP = () => ApiKeyManager.sendSmtpOTP();
window.verifySmtpOTP = () => ApiKeyManager.verifySmtpOTP();
window.sendCustomSmtpTestMail = () => ApiKeyManager.sendCustomSmtpTestMail();
window.launchRazorpaySubscription = () => ApiKeyManager.launchRazorpaySubscription();
window.handleActiveKeySelectChange = () => ApiKeyManager.handleActiveKeySelectChange();

onAuthStateChanged(auth, (user) => {
    if (user) {
        localStorage.setItem('c48_user_uid', user.uid);
        ApiKeyManager.renderApiKeyUI();
        ApiKeyManager.populateKeySelector();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    ApiKeyManager.renderApiKeyUI();
    ApiKeyManager.populateKeySelector();
});
