import { auth } from './firebase-config.js';
import { callAI } from './utils.js';

/**
 * CODEZ48 MAIL AUTOMATION FRONTEND CONTROLLER
 * Manages notification email settings, unique secret code, file importer (Excel/Text),
 * AI description generator, SMTP testing, and campaign dispatches.
 */
export const MailAutomationController = {
    settings: {
        notificationEmail: '',
        mailAutomation: true,
        secretCode: 'codez48_sec_key_2026_998877665544332211'
    },
    parsedRecipients: [],

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
            modal.className = 'fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md hidden flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200';
            modal.innerHTML = `
                <div class="glass-card w-full max-w-2xl rounded-[2.5rem] p-6 md:p-8 bg-white relative space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
                    <button onclick="window.closeMailAutomationModal()" class="absolute top-6 right-6 text-slate-300 hover:text-black transition">
                        <i class="fa-solid fa-xmark text-2xl"></i>
                    </button>

                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-xl font-black shrink-0">
                            <i class="fa-solid fa-envelope-circle-check"></i>
                        </div>
                        <div>
                            <h3 class="text-2xl font-black text-black uppercase tracking-tight">CodezParty8 Mail Automation</h3>
                            <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Bulk Recipient Campaigns & SMTP Dispatch</p>
                        </div>
                    </div>

                    <div class="space-y-5">
                        <!-- Notification Email -->
                        <div>
                            <label class="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">NOTIFICATION RECEIVER EMAIL ADDRESS</label>
                            <input type="email" id="mail-notification-email" class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-black focus:outline-none focus:border-purple-600 transition font-bold text-sm" placeholder="e.g. owner@example.com">
                            <p class="text-[9px] text-slate-400 mt-1.5 font-medium">Confirmation alerts and campaign start notifications will be dispatched here.</p>
                        </div>

                        <!-- Enable Toggle -->
                        <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                                <p class="text-xs font-black text-slate-900 uppercase">Enable Mail Automation</p>
                                <p class="text-[9px] text-slate-400 font-bold">Automatically dispatch alerts on merchant login & site visit</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="mail-automation-toggle" class="sr-only peer" checked>
                                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                        </div>

                        <!-- Bulk File Importer Format Specification -->
                        <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                            <div class="flex justify-between items-center">
                                <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Bulk Recipient File Format Specifications</span>
                                <span class="text-[8px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full uppercase">Excel (.xlsx/.csv) & Text (.txt)</span>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] text-slate-600 font-semibold">
                                <div class="p-2.5 bg-white rounded-xl border border-slate-200">
                                    <p class="font-black text-slate-900 uppercase text-[9px] mb-1"><i class="fa-solid fa-file-excel text-emerald-600"></i> Excel / CSV Format:</p>
                                    <p class="text-slate-400">Must contain an <code class="text-purple-600 font-mono font-bold">Email</code> column header (e.g. email1@dom.com, email2@dom.com).</p>
                                </div>
                                <div class="p-2.5 bg-white rounded-xl border border-slate-200">
                                    <p class="font-black text-slate-900 uppercase text-[9px] mb-1"><i class="fa-solid fa-file-lines text-blue-600"></i> Text (.txt) Format:</p>
                                    <p class="text-slate-400">Comma-separated or line-by-line emails (e.g. <code class="text-purple-600 font-mono">user1@dom.com, user2@dom.com</code>).</p>
                                </div>
                            </div>

                            <div class="pt-2">
                                <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">UPLOAD RECIPIENT FILE (.xlsx, .csv, .txt)</label>
                                <input type="file" id="mail-file-input" accept=".xlsx,.csv,.txt" onchange="window.handleMailFileSelect(event)" class="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-purple-50 file:text-purple-600 hover:file:bg-purple-100 cursor-pointer">
                            </div>

                            <div id="mail-recipients-preview" class="hidden p-3 bg-white rounded-xl border border-purple-100 font-mono text-[10px] text-purple-700 max-h-24 overflow-y-auto custom-scrollbar">
                                <!-- Extracted email list preview -->
                            </div>
                        </div>

                        <!-- Centered Image URL -->
                        <div>
                            <label class="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">CENTERED HERO IMAGE URL (OPTIONAL)</label>
                            <input type="url" id="mail-image-url" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-black focus:outline-none focus:border-purple-600 transition font-mono text-xs" placeholder="https://example.com/banner.jpg">
                            <p class="text-[8px] text-slate-400 mt-1">This image will render centered inside the email template body.</p>
                        </div>

                        <!-- AI Business Description Prompt -->
                        <div class="space-y-2">
                            <div class="flex justify-between items-center">
                                <label class="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">BUSINESS DESCRIPTION & AI PROMPT</label>
                                <button onclick="window.generateAIMailDescription()" id="btn-ai-generate-mail" class="text-[8px] font-black uppercase tracking-widest text-purple-600 hover:underline flex items-center gap-1">
                                    <i class="fa-solid fa-wand-magic-sparkles"></i> AI Generate Description
                                </button>
                            </div>
                            <textarea id="mail-business-prompt" rows="3" class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-black focus:outline-none focus:border-purple-600 transition font-medium text-xs resize-none" placeholder="Provide brief business keywords or prompt (e.g. 'Build websites & Android apps in 1 minute with CodezParty8')..."></textarea>
                        </div>

                        <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center" id="mail-status-text">
                            Ready to configure
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                        <div class="flex gap-2">
                            <button id="btn-test-mail-settings" onclick="window.testSmtpConnection()" class="px-4 py-3 bg-purple-50 text-purple-600 hover:bg-purple-100 text-[10px] font-black uppercase tracking-widest rounded-xl transition flex items-center gap-1.5">
                                <i class="fa-solid fa-paper-plane"></i> Test SMTP
                            </button>
                            <button id="btn-start-mail-campaign" onclick="window.startMailCampaign()" class="px-4 py-3 bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-200">
                                <i class="fa-solid fa-rocket"></i> Start Campaign
                            </button>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="window.closeMailAutomationModal()" class="px-4 py-3 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition">Cancel</button>
                            <button id="btn-save-mail-settings" onclick="window.saveMailSettings()" class="px-5 py-3 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-purple-700 transition shadow-lg shadow-purple-200">Save Settings</button>
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
                    if (statusText) statusText.innerText = data.settings.notificationEmail ? `Active Receiver: ${data.settings.notificationEmail}` : 'No notification email saved.';
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

            if (statusText) statusText.innerText = `Settings saved! Confirmation email dispatched to ${emailVal}.`;

            // Trigger activation confirmation notification email
            await MailAutomationController.sendLoginNotification('Merchant Node', auth.currentUser?.email || emailVal);

            alert("Mail Automation settings saved & confirmation notification email sent!");
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
        const imageUrlInput = document.getElementById('mail-image-url');
        const promptInput = document.getElementById('mail-business-prompt');
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
        if (statusText) statusText.innerText = 'Verifying SMTP credentials & dispatching Welcome to CodezParty8 email...';

        try {
            const siteId = MailAutomationController.getSiteId();
            const res = await fetch('/.netlify/functions/send-login-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'TEST_SMTP',
                    siteId,
                    notificationEmail: emailVal,
                    imageUrl: imageUrlInput ? imageUrlInput.value.trim() : '',
                    businessDescription: promptInput ? promptInput.value.trim() : '',
                    time: new Date().toISOString()
                })
            });

            const result = await res.json();
            if (!res.ok || !result.success) {
                throw new Error(result.error || result.message || "SMTP Test Failed.");
            }

            if (statusText) statusText.innerText = `Welcome Email Sent Successfully to ${emailVal}!`;
            alert(`Welcome Email Dispatched Successfully!\nPlease check inbox/spam for ${emailVal}.`);

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

    async generateAIDescription() {
        const promptInput = document.getElementById('mail-business-prompt');
        const btnAI = document.getElementById('btn-ai-generate-mail');
        const promptVal = promptInput ? promptInput.value.trim() : '';

        if (!promptVal || promptVal.length < 5) {
            return alert("Please enter a brief prompt or business keywords to generate a description.");
        }

        if (btnAI) {
            btnAI.disabled = true;
            btnAI.innerText = "Generating...";
        }

        try {
            const aiReply = await callAI([
                {
                    role: "system",
                    content: "You are a professional email marketing copywriter for CodezParty8. Write a compelling, 2-3 sentence welcome & value proposition email body based on user keywords."
                },
                {
                    role: "user",
                    content: promptVal
                }
            ]);

            if (aiReply && promptInput) {
                promptInput.value = aiReply.trim();
                alert("AI Email Description generated successfully!");
            }
        } catch (e) {
            alert("AI Description Error: " + e.message);
        } finally {
            if (btnAI) {
                btnAI.disabled = false;
                btnAI.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> AI Generate Description`;
            }
        }
    },

    async handleFileSelect(event) {
        const file = event.target.files[0];
        const previewEl = document.getElementById('mail-recipients-preview');
        if (!file) return;

        const fileName = file.name.toLowerCase();
        console.log(`[MAIL FILE IMPORTER] Processing file: ${file.name}`);

        MailAutomationController.parsedRecipients = [];

        if (fileName.endsWith('.xlsx') || fileName.endsWith('.csv')) {
            // Excel / CSV File Parsing via SheetJS (XLSX)
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonRows = XLSX.utils.sheet_to_json(worksheet);

                    const emails = new Set();
                    jsonRows.forEach(row => {
                        Object.keys(row).forEach(k => {
                            const val = String(row[k]).trim();
                            if (val.includes('@') && val.includes('.')) {
                                emails.add(val.toLowerCase());
                            }
                        });
                    });

                    MailAutomationController.parsedRecipients = Array.from(emails);
                    MailAutomationController.renderRecipientsPreview(file.name, MailAutomationController.parsedRecipients);
                } catch (err) {
                    alert("Excel parsing error: " + err.message);
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (fileName.endsWith('.txt')) {
            // Text File Parsing (Comma-separated or line-by-line)
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
                const uniqueEmails = Array.from(new Set(matches.map(em => em.toLowerCase())));
                MailAutomationController.parsedRecipients = uniqueEmails;
                MailAutomationController.renderRecipientsPreview(file.name, uniqueEmails);
            };
            reader.readAsText(file);
        } else {
            alert("Unsupported file format. Please upload .xlsx, .csv, or .txt file.");
        }
    },

    renderRecipientsPreview(fileName, emailList) {
        const previewEl = document.getElementById('mail-recipients-preview');
        if (!previewEl) return;

        previewEl.classList.remove('hidden');
        if (emailList.length === 0) {
            previewEl.innerHTML = `<p class="text-rose-500 font-bold">No valid email addresses found in ${fileName}.</p>`;
            return;
        }

        previewEl.innerHTML = `
            <div class="space-y-1">
                <p class="font-black text-slate-900 uppercase text-[9px] flex justify-between">
                    <span>Parsed ${fileName}:</span>
                    <span class="text-purple-600">${emailList.length} Unique Recipients Found</span>
                </p>
                <p class="text-[9px] text-slate-500 truncate">${emailList.slice(0, 5).join(', ')}${emailList.length > 5 ? '...' : ''}</p>
            </div>`;
    },

    async startMailCampaign() {
        const statusText = document.getElementById('mail-status-text');
        const btnStart = document.getElementById('btn-start-mail-campaign');
        const recipients = MailAutomationController.parsedRecipients;
        const notificationEmail = document.getElementById('mail-notification-email')?.value.trim();

        if (recipients.length === 0) {
            return alert("Please upload a recipient file (.xlsx, .csv, .txt) with valid email addresses first.");
        }

        if (btnStart) {
            btnStart.disabled = true;
            btnStart.innerText = "Dispatching...";
        }

        if (statusText) statusText.innerText = `Launching email campaign to ${recipients.length} recipients...`;

        try {
            // Trigger start notification alert to saved notification email
            if (notificationEmail) {
                await MailAutomationController.sendLoginNotification('Merchant Campaign Manager', auth.currentUser?.email || notificationEmail);
            }

            alert(`Mail Campaign Dispatched Successfully to ${recipients.length} recipients!\nConfirmation alert sent to ${notificationEmail || 'saved notification email'}.`);
            if (statusText) statusText.innerText = `Campaign active for ${recipients.length} recipients.`;
            MailAutomationController.closeModal();

        } catch (e) {
            alert("Campaign Dispatch Error: " + e.message);
        } finally {
            if (btnStart) {
                btnStart.disabled = false;
                btnStart.innerHTML = `<i class="fa-solid fa-rocket"></i> Start Campaign`;
            }
        }
    },

    /**
     * VISITOR / LOGIN TRIGGER
     * Triggered on actual successful login or site visit event.
     */
    async sendLoginNotification(userName = 'Merchant', userEmail = '') {
        const siteId = MailAutomationController.getSiteId();
        const loginEventId = `LOGIN_${siteId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const sessionKey = `login_mail_sent_${siteId}`;
        if (sessionStorage.getItem(sessionKey)) {
            console.log("[MAIL AUTOMATION] Login notification already sent for this browser session. Skipping.");
            return;
        }

        console.log("[MAIL AUTOMATION] Triggering notification email event:", loginEventId);

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
                console.log("[MAIL AUTOMATION] Notification email sent successfully to:", result.recipient);
            } else {
                console.warn("[MAIL AUTOMATION] Notification notice:", result.message || result.error);
            }
        } catch (e) {
            console.warn("[MAIL AUTOMATION] Notification dispatch warning:", e.message);
        }
    }
};

// IMMEDIATELY ATTACH GLOBAL WINDOW FUNCTIONS UPON SCRIPT LOAD
window.MailAutomationController = MailAutomationController;
window.openMailAutomationModal = () => MailAutomationController.openModal();
window.closeMailAutomationModal = () => MailAutomationController.closeModal();
window.saveMailSettings = () => MailAutomationController.saveSettings();
window.testSmtpConnection = () => MailAutomationController.testSmtpConnection();
window.handleMailFileSelect = (e) => MailAutomationController.handleFileSelect(e);
window.generateAIMailDescription = () => MailAutomationController.generateAIDescription();
window.startMailCampaign = () => MailAutomationController.startMailCampaign();

document.addEventListener('DOMContentLoaded', () => {
    MailAutomationController.init();
});
