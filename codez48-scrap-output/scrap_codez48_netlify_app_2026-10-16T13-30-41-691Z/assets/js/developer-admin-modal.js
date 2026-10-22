import { db, auth } from './firebase-config.js';
import { collection, getDocs, setDoc, doc, updateDoc, deleteDoc, query, where, getDoc } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

/**
 * CODEZ48 DEVELOPER ADMIN CONTROL CENTER MODAL
 * Manages seller profiles (delete, 1-month ₹4,000 premium subscription assignment), bulk email contact imports,
 * and global push notification broadcasting.
 */
export const DeveloperAdminModal = {
    init() {
        console.log("[DEVELOPER ADMIN MODAL] Initialized.");
        DeveloperAdminModal.ensureModalInDOM();
    },

    ensureModalInDOM() {
        let modal = document.getElementById('developer-admin-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'developer-admin-modal';
            modal.className = 'fixed inset-0 z-[110] bg-slate-900/70 backdrop-blur-md hidden flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200';
            modal.innerHTML = `
                <div class="glass-card w-full max-w-5xl rounded-[3rem] p-6 md:p-10 bg-white relative space-y-8 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
                    <button onclick="window.closeDeveloperAdminModal()" class="absolute top-8 right-8 text-slate-300 hover:text-black transition">
                        <i class="fa-solid fa-xmark text-2xl"></i>
                    </button>

                    <div class="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 pb-6">
                        <div>
                            <span class="px-3 py-1 bg-royal/10 text-royal text-[8px] font-black rounded-full uppercase tracking-widest border border-royal/20">
                                <i class="fa-solid fa-shield-halved mr-1 text-royal"></i> System Architect & Developer Control Center
                            </span>
                            <h2 class="text-2xl md:text-3xl font-black text-black uppercase tracking-tight mt-2">Admin Management Console</h2>
                        </div>
                    </div>

                    <!-- Tabs -->
                    <div class="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200 max-w-lg">
                        <button onclick="window.switchDevAdminTab('sellers')" id="dev-tab-sellers" class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-black text-white transition-all">Sellers</button>
                        <button onclick="window.switchDevAdminTab('contacts')" id="dev-tab-contacts" class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-all">Emails</button>
                        <button onclick="window.switchDevAdminTab('push')" id="dev-tab-push" class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-all">Global Push</button>
                    </div>

                    <!-- Tab 1: Seller Profiles Management -->
                    <div id="dev-view-sellers" class="space-y-6">
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-black text-black uppercase tracking-tight">Registered Merchant Nodes</h3>
                            <button onclick="window.loadDeveloperSellers()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-black rounded-xl text-[9px] font-black uppercase tracking-widest transition">
                                <i class="fa-solid fa-rotate"></i> Refresh List
                            </button>
                        </div>
                        <div id="dev-sellers-table-container" class="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-200 p-4">
                            <p class="text-slate-400 text-xs italic text-center py-6">Loading seller profiles...</p>
                        </div>
                    </div>

                    <!-- Tab 2: Bulk Email Database Management -->
                    <div id="dev-view-contacts" class="hidden space-y-6">
                        <div class="flex justify-between items-center flex-wrap gap-4">
                            <div>
                                <h3 class="text-lg font-black text-black uppercase tracking-tight">Authorized Contact Database</h3>
                                <p class="text-xs text-slate-400 mt-1">Upload files. Duplicates are filtered out.</p>
                            </div>
                            <div class="flex items-center gap-3">
                                <label class="px-6 py-3 bg-royal hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-md transition flex items-center gap-2">
                                    <i class="fa-solid fa-file-arrow-up"></i> Upload File
                                    <input type="file" id="dev-contact-file-upload" accept=".txt,.csv,.xlsx,.xls" onchange="window.handleDevContactFileUpload(event)" class="hidden">
                                </label>
                                <button onclick="window.importDevBulkContactsPaste()" class="px-6 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                                    + Bulk Paste
                                </button>
                            </div>
                        </div>

                        <div id="dev-import-summary-box" class="hidden p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-900"></div>

                        <div id="dev-contacts-table-container" class="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-200 p-4">
                            <p class="text-slate-400 text-xs italic text-center py-6">Loading email database...</p>
                        </div>
                    </div>

                    <!-- Tab 3: Global Push Notifications -->
                    <div id="dev-view-push" class="hidden space-y-6">
                        <div class="p-8 bg-slate-900 text-white rounded-[2.5rem] shadow-xl space-y-6">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h3 class="text-xl font-black uppercase tracking-tight text-white">Broadcast Global Push Alert</h3>
                                    <p class="text-slate-400 text-xs mt-1">Send a real-time message to all subscribers who granted notification permission.</p>
                                </div>
                                <div class="bg-slate-800 border border-slate-700 px-4 py-2 rounded-2xl text-center min-w-[100px]">
                                    <p class="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Live Subscribers</p>
                                    <p id="dev-push-subscriber-count" class="text-xl font-black text-royal">0</p>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Notification Title</label>
                                        <input type="text" id="dev-push-title" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-royal" placeholder="e.g. Platform Update">
                                    </div>
                                    <div>
                                        <label class="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Message Body</label>
                                        <textarea id="dev-push-body" rows="3" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-royal resize-none" placeholder="Enter broadcast message content..."></textarea>
                                    </div>
                                </div>
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Target URL (Optional)</label>
                                        <input type="url" id="dev-push-url" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-royal" placeholder="https://codez48.netlify.app">
                                    </div>
                                    <div>
                                        <label class="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Hero Image URL (Optional)</label>
                                        <input type="url" id="dev-push-image" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-royal" placeholder="https://example.com/alert.jpg">
                                    </div>
                                </div>
                            </div>

                            <div class="pt-4 border-t border-white/5 flex justify-between items-center">
                                <p class="text-[10px] text-slate-400 font-bold uppercase"><i class="fa-solid fa-circle-info mr-1 text-royal"></i> Estimated delivery to all active subscribers.</p>
                                <button onclick="window.sendGlobalPushBroadcast()" id="btn-broadcast-push" class="px-10 py-4 bg-royal hover:bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl transition-all active:scale-95">
                                    Dispatch Global Push 🚀
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
    },

    async openModal() {
        DeveloperAdminModal.ensureModalInDOM();
        const modal = document.getElementById('developer-admin-modal');
        if (modal) modal.classList.remove('hidden');
        window.switchDevAdminTab('sellers');
    },

    closeModal() {
        const modal = document.getElementById('developer-admin-modal');
        if (modal) modal.classList.add('hidden');
    },

    switchTab(tab) {
        const tabs = ['sellers', 'contacts', 'push'];
        tabs.forEach(t => {
            const view = document.getElementById(`dev-view-${t}`);
            const btn = document.getElementById(`dev-tab-${t}`);
            if (view) view.classList.add('hidden');
            if (btn) {
                btn.classList.remove('bg-black', 'text-white');
                btn.classList.add('text-slate-400');
            }
        });
        const activeView = document.getElementById(`dev-view-${tab}`);
        const activeBtn = document.getElementById(`camp-tab-${tab}`) || document.getElementById(`dev-tab-${tab}`);
        if (activeView) activeView.classList.remove('hidden');
        if (activeBtn) {
            activeBtn.classList.remove('text-slate-400');
            activeBtn.classList.add('bg-black', 'text-white');
        }

        if (tab === 'sellers') DeveloperAdminModal.loadSellers();
        if (tab === 'contacts') DeveloperAdminModal.loadContacts();
        if (tab === 'push') DeveloperAdminModal.loadSubscriberCount();
    },

    async loadSubscriberCount() {
        const countEl = document.getElementById('dev-push-subscriber-count');
        if (!countEl) return;
        try {
            const snap = await getDocs(collection(db, "main_site_subscribers"));
            countEl.innerText = snap.size;
        } catch (e) {
            console.error("Error loading subscriber count:", e);
        }
    },

    async loadSellers() {
        const container = document.getElementById('dev-sellers-table-container');
        if (!container) return;
        container.innerHTML = '<p class="text-slate-400 text-xs italic text-center py-6">Loading seller profiles...</p>';
        try {
            const snap = await getDocs(collection(db, 'sellers'));
            if (snap.empty) {
                container.innerHTML = '<p class="text-slate-400 text-xs italic text-center py-6">No merchant profiles found.</p>';
                return;
            }
            let html = '<table class="w-full text-left text-xs"><thead class="border-b border-slate-200 text-slate-400 font-black uppercase text-[9px]"><tr><th class="py-3 px-4">Seller ID</th><th class="py-3 px-4">Business Name</th><th class="py-3 px-4">Email</th><th class="py-3 px-4">Current Tier</th><th class="py-3 px-4 text-center">Actions</th></tr></thead><tbody>';
            snap.forEach(d => {
                const s = d.data();
                const sId = d.id;
                const isPremium = s.tier?.toLowerCase() === 'premium';
                html += `
                    <tr class="border-b border-slate-100 hover:bg-white transition">
                        <td class="py-3 px-4 font-mono font-bold">${escapeHtml(sId)}</td>
                        <td class="py-3 px-4 font-bold">${escapeHtml(s.brand || s.name || 'Merchant')}</td>
                        <td class="py-3 px-4 font-mono text-slate-500">${escapeHtml(s.email)}</td>
                        <td class="py-3 px-4">
                            <span class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${isPremium ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-600'}">
                                ${isPremium ? '⭐ Premium (₹4k)' : 'Starter'}
                            </span>
                        </td>
                        <td class="py-3 px-4 text-center space-x-2">
                            <button onclick="window.assignPremiumPlan('${sId}')" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm transition">
                                👑 Assign ₹4k Premium Plan
                            </button>
                            <button onclick="window.deleteMerchantNode('${sId}')" class="px-3 py-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition">
                                <i class="fa-solid fa-trash"></i> Delete
                            </button>
                        </td>
                    </tr>
                `;
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        } catch (e) {
            container.innerHTML = `<p class="text-red-500 text-xs text-center py-6">Error loading sellers: ${escapeHtml(e.message)}</p>`;
        }
    },

    async assignPremiumPlan(sellerId) {
        if (!confirm(`Assign 1-Month ₹4,000 Elite/Premium Subscription to seller ${sellerId}?`)) return;
        try {
            await updateDoc(doc(db, 'sellers', sellerId), {
                tier: 'premium',
                lastPremiumAssignedAt: new Date().toISOString()
            });
            alert(`Successfully activated 1-Month ₹4,000 Premium Plan for seller ${sellerId}!`);
            DeveloperAdminModal.loadSellers();
        } catch (e) {
            alert("Assignment Error: " + e.message);
        }
    },

    async deleteMerchantNode(sellerId) {
        if (!confirm(`WARNING: Are you sure you want to delete seller profile ${sellerId}? This will remove all associated data.`)) return;
        try {
            await deleteDoc(doc(db, 'sellers', sellerId));
            alert(`Seller profile ${sellerId} deleted successfully.`);
            DeveloperAdminModal.loadSellers();
        } catch (e) {
            alert("Delete Error: " + e.message);
        }
    },

    async loadContacts() {
        const container = document.getElementById('dev-contacts-table-container');
        if (!container) return;
        container.innerHTML = '<p class="text-slate-400 text-xs italic text-center py-6">Loading email contact database...</p>';
        try {
            const snap = await getDocs(collection(db, 'email_contacts'));
            if (snap.empty) {
                container.innerHTML = '<p class="text-slate-400 text-xs italic text-center py-6">No email contacts imported yet.</p>';
                return;
            }
            let html = '<table class="w-full text-left text-xs"><thead class="border-b border-slate-200 text-slate-400 font-black uppercase text-[9px]"><tr><th class="py-3 px-4">Email</th><th class="py-3 px-4">Status</th><th class="py-3 px-4">Source</th></tr></thead><tbody>';
            snap.forEach(d => {
                const c = d.data();
                html += `<tr class="border-b border-slate-100"><td class="py-3 px-4 font-mono">${escapeHtml(c.email)}</td><td class="py-3 px-4">${escapeHtml(c.status || 'active')}</td><td class="py-3 px-4">${escapeHtml(c.source || 'manual')}</td></tr>`;
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        } catch (e) {
            container.innerHTML = `<p class="text-red-500 text-xs text-center py-6">Error loading contacts: ${escapeHtml(e.message)}</p>`;
        }
    },

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.txt') && !fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
            return alert("Unsupported file format. Please upload .txt, .csv, .xlsx, or .xls files.");
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
            const rawEmails = Array.from(new Set(matches.map(em => em.toLowerCase().trim())));

            if (rawEmails.length === 0) {
                return alert("No valid email addresses detected in the file.");
            }

            await DeveloperAdminModal.processAndStoreContacts(rawEmails, 'file_import_' + file.name);
        };
        reader.readAsText(file);
    },

    async processAndStoreContacts(rawEmails, sourceLabel) {
        try {
            const existingSnap = await getDocs(collection(db, 'email_contacts'));
            const existingEmails = new Set();
            existingSnap.forEach(d => existingEmails.add(d.data().email.toLowerCase()));

            let newCount = 0;
            let duplicateCount = 0;

            for (const email of rawEmails) {
                if (existingEmails.has(email)) {
                    duplicateCount++;
                } else {
                    existingEmails.add(email);
                    newCount++;
                    const contactId = 'CONT_' + Math.random().toString(36).substring(2, 9);
                    await setDoc(doc(db, 'email_contacts', contactId), {
                        contactId,
                        email,
                        source: sourceLabel,
                        status: 'active',
                        unsubscribed: false,
                        suppressed: false,
                        createdAt: new Date().toISOString()
                    });
                }
            }

            const summaryBox = document.getElementById('dev-import-summary-box');
            if (summaryBox) {
                summaryBox.classList.remove('hidden');
                summaryBox.innerHTML = `
                    <p><strong>Import Summary:</strong></p>
                    <ul class="mt-1 space-y-0.5 text-[11px] font-normal">
                        <li>Total emails detected: ${rawEmails.length}</li>
                        <li>New unique contacts added: ${newCount}</li>
                        <li>Duplicates skipped: ${duplicateCount}</li>
                    </ul>
                `;
            }

            alert(`Import Complete!\nNew contacts added: ${newCount}\nDuplicates skipped: ${duplicateCount}`);
            DeveloperAdminModal.loadContacts();
        } catch (e) {
            alert("Database Error during import: " + e.message);
        }
    },

    async importBulkPaste() {
        const emails = prompt("Paste email addresses separated by commas or newlines:");
        if (!emails) return;
        const list = emails.split(/[\n,]+/).map(e => e.trim()).filter(e => e.includes('@'));
        if (list.length === 0) return alert("No valid emails detected.");

        await DeveloperAdminModal.processAndStoreContacts(list, 'bulk_paste');
    },

    async broadcastPush() {
        const title = document.getElementById('dev-push-title')?.value.trim();
        const body = document.getElementById('dev-push-body')?.value.trim();
        const url = document.getElementById('dev-push-url')?.value.trim() || '/';
        const image = document.getElementById('dev-push-image')?.value.trim() || null;

        if (!title || !body) return alert("Title and Message Body are required for broadcast.");

        const btn = document.getElementById('btn-broadcast-push');
        const ogText = btn.innerText;
        btn.innerText = "Dispatching Alerts...";
        btn.disabled = true;

        try {
            // Fetch all main site subscribers
            const subSnap = await getDocs(collection(db, "main_site_subscribers"));
            if (subSnap.empty) {
                alert("No active push subscribers found.");
                return;
            }

            const tokens = subSnap.docs.map(d => d.data().fcmToken).filter(t => t);

            // Dispatch via send-notification function
            const idToken = await auth.currentUser?.getIdToken();
            const response = await fetch('/.netlify/functions/send-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + idToken
                },
                body: JSON.stringify({
                    targetTokens: tokens, // We need to handle plural targetTokens in the function
                    welcomeTitle: title,
                    welcomeBody: body,
                    targetUrl: url,
                    heroImage: image
                })
            });

            if (!response.ok) throw new Error(await response.text());

            alert(`Push broadcast sent to ${tokens.length} subscribers successfully!`);
            if (document.getElementById('dev-push-title')) document.getElementById('dev-push-title').value = '';
            if (document.getElementById('dev-push-body')) document.getElementById('dev-push-body').value = '';
        } catch (e) {
            alert("Broadcast Error: " + e.message);
        } finally {
            btn.innerText = ogText;
            btn.disabled = false;
        }
    }
};

const escapeHtml = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

// Bind to window for global access
window.openDeveloperAdminModal = DeveloperAdminModal.openModal;
window.closeDeveloperAdminModal = DeveloperAdminModal.closeModal;
window.switchDevAdminTab = DeveloperAdminModal.switchTab;
window.loadDeveloperSellers = DeveloperAdminModal.loadSellers;
window.assignPremiumPlan = DeveloperAdminModal.assignPremiumPlan;
window.deleteMerchantNode = DeveloperAdminModal.deleteMerchantNode;
window.handleDevContactFileUpload = DeveloperAdminModal.handleFileUpload;
window.importDevBulkContactsPaste = DeveloperAdminModal.importBulkPaste;
window.sendGlobalPushBroadcast = DeveloperAdminModal.broadcastPush;

DeveloperAdminModal.init();
