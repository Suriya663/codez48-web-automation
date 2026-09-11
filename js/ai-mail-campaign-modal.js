import { db, auth } from './firebase-config.js';
import { collection, getDocs, setDoc, doc, updateDoc, deleteDoc, query, where, getDoc, orderBy } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

/**
 * CODEZ48 AI MAIL CAMPAIGN & EMAIL COMMERCE AUTOMATION MODAL CONTROLLER
 * Manages A-to-Z AI Mail Campaign workspace, Developer Contact Database with intelligent file import & deduplication,
 * Campaign Wizard with Product Selection, Wallet Credits with custom input box & Razorpay (1 Credit = ₹1), and sequential background dispatch.
 */
export const AiMailCampaignModal = {
    selectedProduct: null,

    init() {
        console.log("[AI MAIL CAMPAIGN] Controller Initialized.");
        AiMailCampaignModal.ensureModalInDOM();
    },

    ensureModalInDOM() {
        let modal = document.getElementById('ai-mail-campaign-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ai-mail-campaign-modal';
            modal.className = 'fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-md hidden flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200';
            modal.innerHTML = `
                <div class="glass-card w-full max-w-5xl rounded-[3rem] p-6 md:p-10 bg-white relative space-y-8 shadow-2xl max-h-[88vh] overflow-y-auto custom-scrollbar overflow-x-hidden">
                    <button onclick="window.closeAiMailCampaignModal()" class="absolute top-8 right-8 text-slate-300 hover:text-black transition">
                        <i class="fa-solid fa-xmark text-2xl"></i>
                    </button>

                    <div class="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 pb-6">
                        <div>
                            <span class="px-3 py-1 bg-purple-100 text-purple-800 text-[8px] font-black rounded-full uppercase tracking-widest border border-purple-200">
                                <i class="fa-solid fa-wand-magic-sparkles mr-1 text-purple-600"></i> AI Mail Campaign & Email Commerce Automation
                            </span>
                            <h2 class="text-2xl md:text-3xl font-black text-black uppercase tracking-tight mt-2">Campaign Command Center</h2>
                        </div>
                    </div>

                    <!-- Workspace Navigation Tabs -->
                    <div class="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200 max-w-lg">
                        <button onclick="window.switchAiCampaignTab('wizard')" id="camp-tab-wizard" class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-black text-white transition-all">Create Campaign</button>
                        <button onclick="window.switchAiCampaignTab('history')" id="camp-tab-history" class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-all">My Campaigns</button>
                        <button onclick="window.switchAiCampaignTab('wallet')" id="camp-tab-wallet" class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-all">Wallet Credits</button>
                        <button onclick="window.switchAiCampaignTab('contacts')" id="camp-tab-contacts" class="hidden flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-purple-700 transition-all">Email Database (Admin)</button>
                    </div>

                    <!-- Tab 1: Campaign Wizard -->
                    <div id="camp-view-wizard" class="space-y-6">
                        <div class="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                            <div class="flex justify-between items-center">
                                <h3 class="text-lg font-black text-black uppercase tracking-tight">Step 1: Business & Product Selection</h3>
                                <div id="camp-seller-id-badge" class="hidden px-3 py-1 bg-white border border-slate-200 rounded-full text-[9px] font-black text-royal uppercase tracking-widest">
                                    Seller ID: <span id="camp-seller-id-val">---</span>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" id="camp-bus-name" placeholder="Business Name" class="bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-royal">
                                <input type="email" id="camp-bus-email" placeholder="Business Email" class="bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-royal">
                                <input type="text" id="camp-bus-phone" placeholder="Contact Phone" class="bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-royal">
                                <select id="camp-goal" class="bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-royal">
                                    <option value="Sell Product">Sell Product</option>
                                    <option value="Generate Leads">Generate Leads</option>
                                    <option value="Promote Business">Promote Business</option>
                                    <option value="Product Launch">Product Launch</option>
                                    <option value="Special Offer">Special Offer</option>
                                </select>
                            </div>

                            <div class="pt-4 border-t border-slate-200 space-y-4">
                                <div class="flex items-center gap-3">
                                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Select Product from Catalog</p>
                                    <div id="camp-admin-sid-input" class="hidden flex items-center gap-2">
                                        <input type="text" id="camp-target-sid" placeholder="Enter Seller ID" class="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[9px] font-bold focus:outline-none focus:border-royal">
                                        <button onclick="window.fetchProductsBySid()" class="px-3 py-1.5 bg-black text-white rounded-lg text-[8px] font-black uppercase">Fetch</button>
                                    </div>
                                </div>
                                <div id="camp-product-list" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <p class="text-slate-400 text-xs italic">Loading products...</p>
                                </div>
                            </div>

                            <textarea id="camp-bus-desc" placeholder="Business / Product Description (Leave blank to use selected product description)" class="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-royal" rows="3"></textarea>
                        </div>

                        <div class="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                            <h3 class="text-lg font-black text-black uppercase tracking-tight">Step 2: AI Content Generation & Tone</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <select id="camp-tone" class="bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-royal">
                                    <option value="Professional">Professional</option>
                                    <option value="Friendly">Friendly</option>
                                    <option value="Premium">Premium</option>
                                    <option value="Sales Focused">Sales Focused</option>
                                    <option value="Formal">Formal</option>
                                </select>
                                <input type="number" id="camp-price" placeholder="Product Price (₹)" class="bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-royal">
                            </div>
                            <button onclick="window.generateAiCampaignCopy()" class="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg flex items-center gap-2">
                                <i class="fa-solid fa-wand-magic-sparkles"></i> Generate AI Email Copy
                            </button>
                        </div>

                        <div class="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                            <h3 class="text-lg font-black text-black uppercase tracking-tight">Step 3: Campaign Preview & Launch (₹1 per email)</h3>
                            <div id="camp-preview-box" class="p-6 bg-white rounded-2xl border border-slate-200 space-y-3 font-mono text-xs">
                                <p class="text-slate-400 italic">Generate AI copy above to preview campaign...</p>
                            </div>
                            <button onclick="window.launchAiCampaign()" class="w-full py-5 bg-black hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl">
                                Deduct Credits & Launch Sequential Campaign 🚀
                            </button>
                        </div>
                    </div>

                    <!-- Tab 2: My Campaigns History -->
                    <div id="camp-view-history" class="hidden space-y-4">
                        <h3 class="text-lg font-black text-black uppercase tracking-tight">My Campaigns (Background Dispatch Active)</h3>
                        <div id="camp-history-list" class="space-y-4">
                            <p class="text-slate-400 text-xs italic">No campaigns launched yet.</p>
                        </div>
                    </div>

                    <!-- Tab 3: Wallet Credits -->
                    <div id="camp-view-wallet" class="hidden space-y-4">
                        <h3 class="text-lg font-black text-black uppercase tracking-tight">Campaign Wallet & Free Credits</h3>
                        <div class="p-5 bg-slate-900 text-white rounded-3xl shadow-xl space-y-5">
                            <div class="flex justify-between items-center">
                                <div>
                                    <span class="text-[7px] uppercase tracking-widest text-purple-300 font-black block mb-1">Available Email Credits</span>
                                    <span id="camp-wallet-balance" class="text-3xl font-black">2 Credits</span>
                                </div>
                                <div class="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-xl text-purple-400">
                                    <i class="fa-solid fa-wallet"></i>
                                </div>
                            </div>

                            <div class="p-3 bg-white/5 rounded-2xl border border-white/5">
                                <p class="text-[9px] text-slate-300 leading-relaxed font-medium">Each email sent costs ₹1 (1 Credit = ₹1). Every eligible new account receives 2 free email credits upon onboarding.</p>
                            </div>

                            <div class="pt-1 space-y-2">
                                <label for="camp-topup-amount" class="block text-[7px] font-black text-purple-300 uppercase tracking-widest ml-2">Enter Credits to Add (₹1 / Credit)</label>
                                <div class="flex flex-wrap sm:flex-nowrap gap-2">
                                    <input type="number" id="camp-topup-amount" min="10" value="100" class="flex-1 min-w-[100px] bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-royal" placeholder="e.g. 100">
                                    <button onclick="window.launchWalletTopUp()" class="w-full sm:w-auto px-6 py-3 bg-white text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition shadow-lg active:scale-95 shrink-0">
                                        Pay & Add Credits 💳
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 4: Developer Email Database Manager -->
                    <div id="camp-view-contacts" class="hidden space-y-6">
                        <div class="flex justify-between items-center flex-wrap gap-4">
                            <div>
                                <h3 class="text-lg font-black text-black uppercase tracking-tight">Authorized Contact Database (Admin Only)</h3>
                                <p class="text-xs text-slate-400 mt-1">Upload TXT, CSV, XLSX, or XLS files. Duplicates are automatically skipped.</p>
                            </div>
                            <div class="flex items-center gap-3">
                                <label class="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-md transition flex items-center gap-2">
                                    <i class="fa-solid fa-file-arrow-up"></i> Upload Contact File (.txt, .csv, .xlsx)
                                    <input type="file" id="contact-file-upload" accept=".txt,.csv,.xlsx,.xls" onchange="window.handleContactFileUpload(event)" class="hidden">
                                </label>
                                <button onclick="window.importBulkContactsPrompt()" class="px-6 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                                    + Bulk Paste
                                </button>
                            </div>
                        </div>

                        <!-- Import Summary Feedback -->
                        <div id="dev-import-summary-box" class="hidden p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-900">
                            <!-- Summary feedback injected here -->
                        </div>

                        <div id="admin-contacts-table-container" class="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-200 p-4">
                            <p class="text-slate-400 text-xs italic text-center py-6">Loading email contact database...</p>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
    },

    async openModal() {
        AiMailCampaignModal.ensureModalInDOM();
        const modal = document.getElementById('ai-mail-campaign-modal');
        if (modal) modal.classList.remove('hidden');
        window.switchAiCampaignTab('wizard');

        try {
            await signInAnonymously(auth);
            const user = auth.currentUser;
            if (user) {
                const userId = user.uid;
                const sId = localStorage.getItem('tori_seller_id');

                if (sId) {
                    const badge = document.getElementById('camp-seller-id-badge');
                    const val = document.getElementById('camp-seller-id-val');
                    if (badge) badge.classList.remove('hidden');
                    if (val) val.innerText = sId;
                }

                AiMailCampaignModal.loadSellerProducts(sId || userId);
                AiMailCampaignModal.syncWalletBalance(userId);

                if (user.email === 'codez4848@gmail.com' || localStorage.getItem('coderAuth')) {
                    const contactsTab = document.getElementById('camp-tab-contacts');
                    const adminSidInput = document.getElementById('camp-admin-sid-input');
                    if (contactsTab) contactsTab.classList.remove('hidden');
                    if (adminSidInput) adminSidInput.classList.remove('hidden');
                }
            }
        } catch (e) {}
    },

    async syncWalletBalance(userId) {
        const wRef = doc(db, 'ai_mail_wallets', userId);
        const wSnap = await getDoc(wRef);
        let bal = 0;
        if (wSnap.exists()) {
            bal = wSnap.data().credits || 0;
        } else {
            bal = 2;
            await setDoc(wRef, { userId, credits: 2, createdAt: new Date().toISOString() }, { merge: true });
        }
        const balEl = document.getElementById('camp-wallet-balance');
        if (balEl) balEl.innerText = `${bal} Credits`;
        return bal;
    },

    fetchProductsBySid() {
        const sid = document.getElementById('camp-target-sid')?.value.trim();
        if (!sid) return alert("Please enter a valid Seller ID");
        AiMailCampaignModal.loadSellerProducts(sid);
    },

    closeModal() {
        const modal = document.getElementById('ai-mail-campaign-modal');
        if (modal) modal.classList.add('hidden');
    },

    switchTab(tab) {
        const tabs = ['wizard', 'history', 'wallet', 'contacts'];
        tabs.forEach(t => {
            const view = document.getElementById(`camp-view-${t}`);
            const btn = document.getElementById(`camp-tab-${t}`);
            if (view) view.classList.add('hidden');
            if (btn) {
                btn.classList.remove('bg-black', 'text-white');
                btn.classList.add('text-slate-400');
            }
        });
        const activeView = document.getElementById(`camp-view-${tab}`);
        const activeBtn = document.getElementById(`camp-tab-${tab}`);
        if (activeView) activeView.classList.remove('hidden');
        if (activeBtn) {
            activeBtn.classList.remove('text-slate-400');
            activeBtn.classList.add('bg-black', 'text-white');
        }

        if (tab === 'contacts') AiMailCampaignModal.loadAdminEmailContacts();
        if (tab === 'history') AiMailCampaignModal.loadCampaigns();
        if (tab === 'wallet') {
            const user = auth.currentUser;
            if (user) AiMailCampaignModal.syncWalletBalance(user.uid);
        }
    },

    async loadSellerProducts(userId) {
        const container = document.getElementById('camp-product-list');
        if (!container) return;
        container.innerHTML = '<p class="text-slate-400 text-xs italic">Scanning catalog...</p>';

        try {
            const sId = localStorage.getItem('tori_seller_id') || userId;
            const qP = query(collection(db, "products"), where("sellerId", "==", sId));
            const snap = await getDocs(qP);

            if (snap.empty) {
                container.innerHTML = '<p class="text-slate-400 text-xs italic col-span-full">No products found. You can still create a campaign using the description box.</p>';
                return;
            }

            container.innerHTML = '';
            snap.forEach(docSnap => {
                const p = docSnap.data();
                const pid = docSnap.id;
                const card = document.createElement('div');
                card.className = 'bg-white p-3 rounded-2xl border border-slate-200 cursor-pointer hover:border-purple-500 transition-all text-left space-y-2 group relative';
                card.onclick = () => AiMailCampaignModal.selectProduct(pid, p, card);
                card.innerHTML = `
                    <div class="w-full h-24 bg-slate-50 rounded-xl overflow-hidden mb-2">
                        <img src="${p.image || ''}" class="w-full h-full object-contain">
                    </div>
                    <p class="text-[10px] font-black uppercase truncate">${escapeHtml(p.name)}</p>
                    <p class="text-[11px] font-bold text-emerald-600">₹${p.price}</p>
                `;
                container.appendChild(card);
            });
        } catch (e) {
            container.innerHTML = `<p class="text-red-500 text-[10px]">Error: ${e.message}</p>`;
        }
    },

    selectProduct(pid, data, cardEl) {
        document.querySelectorAll('#camp-product-list > div').forEach(c => c.classList.remove('ring-2', 'ring-purple-600', 'bg-purple-50/50'));
        cardEl.classList.add('ring-2', 'ring-purple-600', 'bg-purple-50/50');
        AiMailCampaignModal.selectedProduct = { pid, ...data };

        const priceInput = document.getElementById('camp-price');
        if (priceInput) priceInput.value = data.price || 0;

        const descInput = document.getElementById('camp-bus-desc');
        if (descInput && !descInput.value) descInput.value = data.description || '';
    },

    generateCopy() {
        const busName = document.getElementById('camp-bus-name').value.trim() || 'My Business';
        const goal = document.getElementById('camp-goal').value;
        const desc = document.getElementById('camp-bus-desc').value.trim() || (AiMailCampaignModal.selectedProduct ? AiMailCampaignModal.selectedProduct.description : 'Professional product/service offering.');
        const tone = document.getElementById('camp-tone').value;

        const previewBox = document.getElementById('camp-preview-box');
        if (previewBox) {
            previewBox.innerHTML = `
                <p><strong>Subject:</strong> Special Offer from ${escapeHtml(busName)} (${goal})</p>
                <p><strong>Preheader:</strong> Discover our new professional services tailored for you.</p>
                <p class="mt-2"><strong>Headline:</strong> Elevate Your Business Today with ${escapeHtml(busName)}</p>
                <p class="mt-2 text-slate-600"><strong>Body:</strong> Hello,<br><br>${escapeHtml(desc)}<br><br>We are pleased to invite you to explore our latest offerings designed with a ${tone} approach. Don't miss out on this exclusive opportunity.<br><br>Best regards,<br>${escapeHtml(busName)}</p>
            `;
        }
    },

    async launchAiCampaign() {
        const busName = document.getElementById('camp-bus-name').value.trim();
        const email = document.getElementById('camp-bus-email').value.trim();
        if (!busName || !email) return alert("Business Name and Email are required.");

        try {
            await signInAnonymously(auth);
            const user = auth.currentUser;
            const userId = user ? user.uid : 'anon';
            const sId = localStorage.getItem('tori_seller_id') || userId;

            // Check balance before launching
            const balance = await AiMailCampaignModal.syncWalletBalance(userId);
            if (balance <= 0) {
                alert("Insufficient campaign balance. Please top up your wallet.");
                AiMailCampaignModal.switchTab('wallet');
                return;
            }

            const campaignId = 'CAMP_' + Date.now();
            const campaignData = {
                campaignId,
                userId,
                sellerId: sId,
                businessName: busName,
                businessEmail: email,
                title: document.getElementById('camp-goal').value,
                description: document.getElementById('camp-bus-desc').value.trim() || (AiMailCampaignModal.selectedProduct?.description || ''),
                headline: 'Special Offer from ' + busName,
                price: parseFloat(document.getElementById('camp-price')?.value) || 0,
                productId: AiMailCampaignModal.selectedProduct?.pid || null,
                productImage: AiMailCampaignModal.selectedProduct?.image || null,
                status: 'Queued',
                sentCount: 0,
                failedCount: 0,
                createdAt: new Date().toISOString()
            };

            await setDoc(doc(db, 'ai_mail_campaigns', campaignId), campaignData);

            fetch('/.netlify/functions/aiMailCampaignQueue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ campaignId, userId })
            }).catch(() => {});

            alert("Campaign successfully scheduled and queued! Emails will send sequentially one-by-one.");
            AiMailCampaignModal.switchTab('history');
        } catch (e) {
            alert("Launch Error: " + e.message);
        }
    },

    async loadCampaigns() {
        const container = document.getElementById('camp-history-list');
        if (!container) return;
        container.innerHTML = '<p class="text-slate-400 text-xs italic py-10 text-center animate-pulse">Accessing archives...</p>';

        try {
            const user = auth.currentUser;
            if (!user) return;
            const qC = query(collection(db, 'ai_mail_campaigns'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
            const snap = await getDocs(qC);

            if (snap.empty) {
                container.innerHTML = '<p class="text-slate-400 text-xs italic py-10 text-center">No campaigns found.</p>';
                return;
            }

            container.innerHTML = '';
            snap.forEach(d => {
                const c = d.data();
                const status = c.status || 'Pending';
                const isStopped = status.includes('Stopped') || status.includes('Insufficient');

                const card = document.createElement('div');
                card.className = `p-5 rounded-3xl border ${isStopped ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'} shadow-sm space-y-3 transition-all`;
                card.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">${c.title}</p>
                            <h4 class="text-sm font-bold text-black">${escapeHtml(c.businessName)}</h4>
                        </div>
                        <span class="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${isStopped ? 'bg-rose-500 text-white' : 'bg-slate-900 text-white'}">${status}</span>
                    </div>

                    ${isStopped ? `
                        <div class="flex items-center gap-3 p-3 bg-white rounded-2xl border border-rose-200">
                            <i class="fa-solid fa-circle-exclamation text-rose-500"></i>
                            <div class="flex-1">
                                <p class="text-[10px] font-black text-rose-900 uppercase">Your email sending has stopped</p>
                                <p class="text-[8px] text-rose-600 font-bold">Insufficient wallet balance to continue dispatch.</p>
                            </div>
                            <button onclick="window.switchAiCampaignTab('wallet')" class="px-4 py-2 bg-rose-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg active:scale-95">Add Balance</button>
                        </div>
                    ` : ''}

                    <div class="flex items-center justify-between pt-3 border-t border-slate-50">
                        <div class="flex gap-4">
                            <div>
                                <p class="text-[7px] font-black text-slate-300 uppercase">Sent</p>
                                <p class="text-[10px] font-bold text-slate-600">${c.sentCount || 0}</p>
                            </div>
                            <div>
                                <p class="text-[7px] font-black text-slate-300 uppercase">Failed</p>
                                <p class="text-[10px] font-bold text-slate-600">${c.failedCount || 0}</p>
                            </div>
                        </div>
                        <p class="text-[8px] text-slate-400 font-medium">${new Date(c.createdAt).toLocaleDateString()}</p>
                    </div>
                `;
                container.appendChild(card);
            });
        } catch (e) {
            if (e.message && e.message.includes('requires an index')) {
                const indexUrl = e.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
                container.innerHTML = `
                    <div class="p-8 text-center bg-rose-50 border border-rose-200 rounded-[2rem] space-y-4">
                        <div class="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">!</div>
                        <h4 class="text-sm font-black text-rose-900 uppercase">Database Setup Required</h4>
                        <p class="text-[10px] text-rose-700 font-bold max-w-md mx-auto">A Firestore index is required to display your campaign history. Please click the button below to authorize index creation in your Firebase Console.</p>
                        <a href="${indexUrl || '#'}" target="_blank" class="inline-block bg-rose-600 text-white px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">Create Firestore Index</a>
                    </div>
                `;
            } else {
                container.innerHTML = `<p class="text-red-500 text-[10px] py-10 text-center">Error: ${escapeHtml(e.message)}</p>`;
            }
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

            await AiMailCampaignModal.processAndStoreContacts(rawEmails, 'file_import_' + file.name);
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
            AiMailCampaignModal.loadAdminEmailContacts();
        } catch (e) {
            alert("Database Error during import: " + e.message);
        }
    },

    async launchWalletTopUp() {
        const amountInput = document.getElementById('camp-topup-amount');
        const creditsToAdd = amountInput ? parseInt(amountInput.value) : 100;
        if (isNaN(creditsToAdd) || creditsToAdd < 10) return alert("Minimum top-up amount is 10 credits (₹10).");

        const loader = document.getElementById('global-loader');
        if (loader) loader.classList.remove('hidden');

        try {
            // 1. Create Order on Backend
            const orderResp = await fetch('/.netlify/functions/razorpay-create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: creditsToAdd * 100, // paise
                    currency: "INR",
                    notes: {
                        userId: auth.currentUser?.uid || 'anon',
                        type: 'wallet_topup',
                        credits: creditsToAdd
                    }
                })
            });

            if (!orderResp.ok) {
                const errData = await orderResp.json().catch(() => ({ error: "Server Error" }));
                const msg = errData.error || `Initialization Failed (${orderResp.status})`;
                if (msg.includes('credentials') || msg.includes('configured')) {
                    alert("CRITICAL ERROR: Razorpay credentials are not configured in your Netlify Dashboard.\n\nPlease go to Netlify > Site Settings > Environment Variables and add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
                } else {
                    alert("Payment Error: " + msg);
                }
                if (loader) loader.classList.add('hidden');
                return;
            }
            const razorpayOrder = await orderResp.json();

            if (loader) loader.classList.add('hidden');

            const options = {
                key: razorpayOrder.key_id, // Use Key ID from server
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                name: "CODEZ48 AI Mail Campaign",
                description: `Wallet Top-Up (${creditsToAdd} Email Credits)`,
                order_id: razorpayOrder.id,
                handler: async (response) => {
                    if (loader) loader.classList.remove('hidden');

                    // 2. Verify Payment on Backend
                    const verifyResp = await fetch('/.netlify/functions/razorpay-verify-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        })
                    });

                    if (!verifyResp.ok) {
                        const vErr = await verifyResp.json().catch(() => ({ error: "Verification Failed" }));
                        throw new Error(vErr.error || "Payment verification failed.");
                    }

                    const verifyResult = await verifyResp.json();

                    if (verifyResult.success) {
                        try {
                            const userId = auth.currentUser?.uid || 'anon_user';
                            const walletRef = doc(db, 'ai_mail_wallets', userId);
                            const wSnap = await getDoc(walletRef);
                            let currentBal = 0;
                            if (wSnap.exists()) {
                                currentBal = wSnap.data().credits || 0;
                            }
                            const newBal = currentBal + creditsToAdd;

                            await setDoc(walletRef, {
                                userId,
                                credits: newBal,
                                lastTopUpAt: new Date().toISOString(),
                                lastPaymentId: response.razorpay_payment_id
                            }, { merge: true });

                            await setDoc(doc(collection(db, 'wallet_transactions'), 'TX_' + Date.now()), {
                                userId,
                                type: 'credit',
                                amount: creditsToAdd,
                                description: `Razorpay Top-Up (${creditsToAdd} credits)`,
                                paymentId: response.razorpay_payment_id,
                                createdAt: new Date().toISOString(),
                                status: 'success'
                            });

                            alert(`⚡ Top-Up Successful! New Balance: ${newBal} Credits.`);
                            const balEl = document.getElementById('camp-wallet-balance');
                            if (balEl) balEl.innerText = `${newBal} Credits`;
                            if (amountInput) amountInput.value = '';
                        } catch (dbErr) {
                            alert("Database update failed, but payment was successful. Please contact support with ID: " + response.razorpay_payment_id);
                        }
                    } else {
                        alert("Payment Verification Failed: " + verifyResult.error);
                    }
                    if (loader) loader.classList.add('hidden');
                },
                theme: { color: "#2563EB" },
                prefill: {
                    email: auth.currentUser?.email || '',
                    contact: ''
                }
            };

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
            if (loader) loader.classList.add('hidden');
            alert("Payment Error: " + err.message);
        }
    },

    async loadAdminEmailContacts() {
        const container = document.getElementById('admin-contacts-table-container');
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

    async importBulkContacts() {
        const emails = prompt("Paste email addresses separated by commas or newlines:");
        if (!emails) return;
        const list = emails.split(/[\n,]+/).map(e => e.trim()).filter(e => e.includes('@'));
        if (list.length === 0) return alert("No valid emails detected.");

        await AiMailCampaignModal.processAndStoreContacts(list, 'bulk_paste');
    }
};

const escapeHtml = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

// Bind to window for global access
window.openAiMailCampaignModal = AiMailCampaignModal.openModal;
window.closeAiMailCampaignModal = AiMailCampaignModal.closeModal;
window.switchAiCampaignTab = AiMailCampaignModal.switchTab;
window.generateAiCampaignCopy = AiMailCampaignModal.generateCopy;
window.launchAiCampaign = AiMailCampaignModal.launchAiCampaign;
window.launchWalletTopUp = AiMailCampaignModal.launchWalletTopUp;
window.loadAdminEmailContacts = AiMailCampaignModal.loadAdminEmailContacts;
window.importBulkContactsPrompt = AiMailCampaignModal.importBulkContacts;
window.handleContactFileUpload = AiMailCampaignModal.handleFileUpload;
window.fetchProductsBySid = AiMailCampaignModal.fetchProductsBySid;

AiMailCampaignModal.init();
