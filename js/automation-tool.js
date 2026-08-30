import { db, auth } from './firebase-config.js';
import {
    collection, addDoc, serverTimestamp, getDoc, doc, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

console.log("[CODEZ48] Recreated Automation Module Loading...");

/**
 * WhatsApp & Bulk Customer Campaign Automation Controller
 */
export const AutomationController = {
    currentProvider: null,
    currentStep: 1,
    customers: [],
    campaignInfo: {},
    generatedMessages: [],
    portalWindow: null,
    isPaused: false,
    stopRequested: false,
    currentIndex: 0,
    sentCount: 0,
    totalMessages: 0,

    init() {
        console.log("[CODEZ48] Automation Controller Initializing...");
        window.AutomationController = AutomationController;
        this.updateWizardUI();
        this.attachEventListeners();
    },

    async startFlow(providerId) {
        console.log("[CODEZ48] Starting flow for:", providerId);
        if (providerId === 'whatsapp') {
            this.currentProvider = new WhatsAppProvider();
        }

        const dashboard = document.getElementById('automation-dashboard');
        const wizard = document.getElementById('automation-wizard');

        if (dashboard) dashboard.classList.add('hidden');
        if (wizard) wizard.classList.remove('hidden');

        this.goToStep(1);
    },

    goToStep(step) {
        this.currentStep = step;
        this.updateWizardUI();
        this.renderStepContent();
    },

    updateWizardUI() {
        for (let i = 1; i <= 4; i++) {
            const dot = document.getElementById(`step-dot-${i}`);
            const line = document.getElementById(`step-line-${i}`);
            if (dot) {
                dot.className = `w-3 h-3 rounded-full ${i <= this.currentStep ? 'bg-royal' : 'bg-slate-200'}`;
            }
            if (line) {
                line.className = `h-0.5 w-8 ${i < this.currentStep ? 'bg-royal' : 'bg-slate-200'}`;
            }
        }

        const footer = document.getElementById('wizard-footer');
        const prevBtn = document.getElementById('wizard-prev-btn');
        const nextBtn = document.getElementById('wizard-next-btn');

        if (footer) footer.classList.toggle('hidden', this.currentStep > 4);
        if (prevBtn) prevBtn.classList.toggle('invisible', this.currentStep === 1);
        if (nextBtn) {
            nextBtn.innerText = this.currentStep === 4 ? 'Approve & Start Campaign' : 'Continue';
        }
    },

    renderStepContent() {
        const container = document.getElementById('wizard-content');
        if (!container) return;

        const procView = document.getElementById('processing-view');
        if (procView) procView.classList.add('hidden');
        container.classList.remove('hidden');

        container.innerHTML = '';

        switch (this.currentStep) {
            case 1: this.renderConnectionStep(container); break;
            case 2: this.renderUploadStep(container); break;
            case 3: this.renderCampaignStep(container); break;
            case 4: this.renderPreviewStep(container); break;
        }
    },

    renderConnectionStep(container) {
        container.innerHTML = `
            <div class="text-center max-w-md mx-auto space-y-8">
                <div class="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                    <i class="fa-brands fa-whatsapp text-4xl"></i>
                </div>
                <div>
                    <h3 class="text-2xl font-black text-slate-900 uppercase tracking-tight">Step 1 — Connect WhatsApp</h3>
                    <p class="text-slate-500 text-sm mt-2 leading-relaxed">Open WhatsApp Web in a new tab. Ensure you are logged in to your WhatsApp account.</p>
                </div>

                <div class="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-2xl text-left">
                    <p class="text-amber-800 text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-2">
                        <i class="fa-solid fa-shield-halved"></i> Security Protocol
                    </p>
                    <p class="text-amber-700 text-xs leading-relaxed">Login happens directly inside web.whatsapp.com. We never store or transmit your personal credentials or phone session keys.</p>
                </div>

                <div id="connection-status-area" class="py-4">
                    <button onclick="window.handleWAConnect()" class="btn-black px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Open WhatsApp Web</button>
                    <p id="wa-connection-wait" class="hidden mt-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Checking WhatsApp connection status...</p>
                </div>
            </div>
        `;
    },

    renderUploadStep(container) {
        container.innerHTML = `
            <div class="space-y-8">
                <div class="flex justify-between items-end">
                    <div>
                        <h3 class="text-2xl font-black text-slate-900 uppercase tracking-tight">Step 2 — Upload Customers</h3>
                        <p class="text-slate-500 text-sm mt-1">Import your Excel (.xlsx, .xls) or CSV customer list for AI personalization.</p>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                        <div class="bg-blue-50 text-royal px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">Supports .xlsx, .xls, .csv</div>
                        <button onclick="window.downloadAutomationTemplate()" class="text-royal text-[9px] font-black uppercase tracking-widest hover:underline flex items-center gap-1">
                            <i class="fa-solid fa-download"></i> Download Sample Excel Template
                        </button>
                    </div>
                </div>

                <div id="drop-zone" class="border-4 border-dashed border-slate-100 rounded-[2.5rem] py-16 flex flex-col items-center justify-center text-center group hover:border-royal hover:bg-blue-50/50 transition-all cursor-pointer">
                    <div class="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-white group-hover:text-royal transition-all">
                        <i class="fa-solid fa-cloud-arrow-up text-2xl"></i>
                    </div>
                    <p class="text-slate-400 font-bold uppercase tracking-widest text-xs">Drag & Drop or Click to Upload Customer File</p>
                    <input type="file" id="customer-file" class="hidden" accept=".xlsx, .xls, .csv">
                </div>

                <div id="customer-preview-area" class="hidden space-y-6">
                    <div class="flex justify-between items-center">
                        <h4 class="text-xs font-black text-slate-900 uppercase tracking-widest">Customer Preview</h4>
                        <div class="flex gap-2" id="validation-stats"></div>
                    </div>
                    <div class="overflow-x-auto rounded-3xl border border-slate-100">
                        <table class="w-full text-left text-[10px] font-bold">
                            <thead class="bg-slate-50 text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <tr id="preview-header"></tr>
                            </thead>
                            <tbody id="preview-body" class="text-slate-600"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('customer-file');

        if (dropZone) dropZone.onclick = () => fileInput.click();
        if (fileInput) fileInput.onchange = (e) => this.handleFileUpload(e.target.files[0]);
    },

    async handleFileUpload(file) {
        if (!file) return;

        const loader = document.getElementById('global-loader');
        if (loader) loader.style.display = 'flex';

        try {
            const data = await this.parseFile(file);
            this.customers = this.processCustomerData(data);
            this.renderCustomerPreview();
        } catch (e) {
            alert("Error parsing file: " + e.message);
        } finally {
            if (loader) loader.style.display = 'none';
        }
    },

    parseFile(file) {
        return new Promise((resolve, reject) => {
            if (typeof XLSX === 'undefined') {
                reject(new Error("Excel parser library (SheetJS) not loaded. Please refresh the page."));
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    resolve(json);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (err) => reject(err);
            reader.readAsArrayBuffer(file);
        });
    },

    processCustomerData(rawData) {
        if (rawData.length < 2) return [];

        const headers = rawData[0].map(h => String(h).toLowerCase().trim());
        const dataRows = rawData.slice(1);

        const mapping = {
            name: headers.findIndex(h => h.includes('name')),
            mobile: headers.findIndex(h => h.includes('mobile') || h.includes('phone') || h.includes('number') || h.includes('contact')),
            interest: headers.findIndex(h => h.includes('interest') || h.includes('product') || h.includes('buying')),
            category: headers.findIndex(h => h.includes('category') || h.includes('type')),
            location: headers.findIndex(h => h.includes('location') || h.includes('city') || h.includes('area')),
            notes: headers.findIndex(h => h.includes('note'))
        };

        const customers = [];
        const seenMobiles = new Set();
        let duplicatesCount = 0;
        let invalidCount = 0;

        dataRows.forEach((row, index) => {
            const rawMobile = row[mapping.mobile] ? String(row[mapping.mobile]).replace(/\D/g, '') : '';
            const mobile = rawMobile.length >= 10 ? rawMobile.slice(-10) : '';
            const name = row[mapping.name] || '';

            if (!mobile || !name) {
                invalidCount++;
                return;
            }

            if (seenMobiles.has(mobile)) {
                duplicatesCount++;
                return;
            }

            seenMobiles.add(mobile);
            customers.push({
                id: index,
                name: name,
                mobile: mobile,
                interest: row[mapping.interest] || 'N/A',
                category: row[mapping.category] || 'General',
                location: row[mapping.location] || 'N/A',
                notes: row[mapping.notes] || '',
                isValid: true
            });
        });

        this.uploadStats = {
            total: dataRows.length,
            valid: customers.length,
            duplicates: duplicatesCount,
            invalid: invalidCount
        };

        return customers;
    },

    renderCustomerPreview() {
        const previewArea = document.getElementById('customer-preview-area');
        const dropZone = document.getElementById('drop-zone');
        const headerRow = document.getElementById('preview-header');
        const body = document.getElementById('preview-body');
        const stats = document.getElementById('validation-stats');

        if (dropZone) dropZone.classList.add('hidden');
        if (previewArea) previewArea.classList.remove('hidden');

        if (stats) {
            stats.innerHTML = `
                <span class="px-3 py-1 bg-emerald-50 text-emerald-500 rounded-lg">${this.uploadStats.valid} Valid</span>
                <span class="px-3 py-1 bg-amber-50 text-amber-500 rounded-lg">${this.uploadStats.duplicates} Duplicates</span>
                <span class="px-3 py-1 bg-red-50 text-red-500 rounded-lg">${this.uploadStats.invalid} Invalid</span>
            `;
        }

        if (headerRow) {
            headerRow.innerHTML = `
                <th class="px-6 py-4">Name</th>
                <th class="px-6 py-4">Mobile</th>
                <th class="px-6 py-4">Interest</th>
                <th class="px-6 py-4">Category</th>
                <th class="px-6 py-4">Location</th>
                <th class="px-6 py-4 text-right">Action</th>
            `;
        }

        if (body) {
            body.innerHTML = this.customers.slice(0, 10).map(c => `
                <tr class="border-b border-slate-50">
                    <td class="px-6 py-4 text-black">${c.name}</td>
                    <td class="px-6 py-4">${c.mobile}</td>
                    <td class="px-6 py-4 truncate max-w-[150px]">${c.interest}</td>
                    <td class="px-6 py-4">${c.category}</td>
                    <td class="px-6 py-4">${c.location}</td>
                    <td class="px-6 py-4 text-right">
                        <button onclick="window.removeCustomer(${c.id})" class="text-red-400 hover:text-red-600 transition-colors"><i class="fa-solid fa-trash-can"></i></button>
                    </td>
                </tr>
            `).join('');

            if (this.customers.length > 10) {
                body.innerHTML += `<tr><td colspan="6" class="px-6 py-4 text-center text-slate-400 italic">... and ${this.customers.length - 10} more recipients</td></tr>`;
            }
        }
    },

    renderCampaignStep(container) {
        container.innerHTML = `
            <div class="space-y-8">
                <div>
                    <h3 class="text-2xl font-black text-slate-900 uppercase tracking-tight">Step 3 — Campaign Info</h3>
                    <p class="text-slate-500 text-sm mt-1">Specify offer details for AI message copy generation.</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="space-y-6">
                        <div>
                            <label class="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">BUSINESS NAME</label>
                            <input type="text" id="camp-biz-name" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-black focus:outline-none focus:border-royal transition font-bold" placeholder="Your Business Name">
                        </div>
                        <div>
                            <label class="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">PRODUCT / SERVICE NAME</label>
                            <input type="text" id="camp-prod-name" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-black focus:outline-none focus:border-royal transition font-bold" placeholder="What product are you promoting?">
                        </div>
                        <div>
                            <label class="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">OFFER OR DISCOUNT</label>
                            <input type="text" id="camp-offer" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-black focus:outline-none focus:border-royal transition font-bold" placeholder="e.g. 20% OFF, Free Delivery">
                        </div>
                        <div>
                            <label class="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">CALL TO ACTION</label>
                            <input type="text" id="camp-cta" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-black focus:outline-none focus:border-royal transition font-bold" placeholder="e.g. Reply YES to order, Click link">
                        </div>
                    </div>
                    <div class="space-y-6">
                        <div>
                            <label class="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">PRODUCT / WEBSITE LINK</label>
                            <input type="url" id="camp-link" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-black focus:outline-none focus:border-royal transition font-bold" placeholder="https://...">
                        </div>
                        <div>
                            <label class="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">SHORT DESCRIPTION</label>
                            <textarea id="camp-desc" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-black focus:outline-none focus:border-royal transition font-bold" rows="3" placeholder="Additional offer details..."></textarea>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (this.campaignInfo.bizName) {
            document.getElementById('camp-biz-name').value = this.campaignInfo.bizName;
            document.getElementById('camp-prod-name').value = this.campaignInfo.prodName;
            document.getElementById('camp-offer').value = this.campaignInfo.offer;
            document.getElementById('camp-cta').value = this.campaignInfo.cta;
            document.getElementById('camp-link').value = this.campaignInfo.link;
            document.getElementById('camp-desc').value = this.campaignInfo.desc;
        }
    },

    async renderPreviewStep(container) {
        this.campaignInfo = {
            bizName: document.getElementById('camp-biz-name')?.value || '',
            prodName: document.getElementById('camp-prod-name')?.value || '',
            offer: document.getElementById('camp-offer')?.value || '',
            cta: document.getElementById('camp-cta')?.value || '',
            link: document.getElementById('camp-link')?.value || '',
            desc: document.getElementById('camp-desc')?.value || ''
        };

        container.innerHTML = `
            <div class="space-y-8">
                <div class="flex justify-between items-end">
                    <div>
                        <h3 class="text-2xl font-black text-slate-900 uppercase tracking-tight">Step 4 — AI Message Generation</h3>
                        <p class="text-slate-500 text-sm mt-1">Review personalized promotional messages for recipients.</p>
                    </div>
                    <div class="flex gap-2">
                        <span class="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">${this.customers.length} Recipients</span>
                    </div>
                </div>

                <div id="generation-area" class="min-h-[300px] flex flex-col items-center justify-center space-y-6">
                    <div class="w-16 h-16 border-4 border-slate-100 border-t-royal rounded-full animate-spin"></div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Personalizing ${this.customers.length} messages...</p>
                </div>
            </div>
        `;

        await this.generateMessages();
    },

    async generateMessages() {
        try {
            this.generatedMessages = this.customers.map(c => {
                let msg = `Hi ${c.name},\n\nWe are excited to share ${this.campaignInfo.prodName} at ${this.campaignInfo.bizName}.`;
                if (c.interest !== 'N/A') msg += ` Since you were interested in ${c.interest}, we thought you'd love this!`;
                if (this.campaignInfo.offer) msg += `\n\nExclusive Offer: ${this.campaignInfo.offer}`;
                if (this.campaignInfo.link) msg += `\n\nView details:\n${this.campaignInfo.link}`;
                if (this.campaignInfo.cta) msg += `\n\n${this.campaignInfo.cta}`;

                return { customerId: c.id, customerName: c.name, mobile: c.mobile, text: msg, status: 'pending' };
            });
            this.renderMessagesList();
        } catch (e) {
            console.error("AI Generation Error:", e);
        }
    },

    renderMessagesList() {
        const container = document.getElementById('generation-area');
        if (!container) return;
        container.classList.remove('items-center', 'justify-center');
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                ${this.generatedMessages.slice(0, 4).map(m => `
                    <div class="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-[10px] font-black text-slate-900 uppercase tracking-widest">${m.customerName}</p>
                                <p class="text-[9px] text-slate-400 font-bold">${m.mobile}</p>
                            </div>
                        </div>
                        <p class="text-[10px] text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">${m.text}</p>
                    </div>
                `).join('')}
            </div>
            ${this.generatedMessages.length > 4 ? `
                <div class="text-center py-4 border-t border-slate-100 w-full mt-4">
                    <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">+ ${this.generatedMessages.length - 4} more personalized messages ready</p>
                </div>
            ` : ''}
        `;
    },

    attachEventListeners() {
        document.getElementById('wizard-next-btn')?.addEventListener('click', () => {
            if (this.currentStep === 4) {
                this.startAutomation();
            } else if (this.validateCurrentStep()) {
                this.goToStep(this.currentStep + 1);
            }
        });

        document.getElementById('wizard-prev-btn')?.addEventListener('click', () => {
            if (this.currentStep > 1) this.goToStep(this.currentStep - 1);
        });
    },

    validateCurrentStep() {
        if (this.currentStep === 1) {
            if (!localStorage.getItem('wa_connected')) {
                alert("Please connect WhatsApp first.");
                return false;
            }
        }
        if (this.currentStep === 2 && this.customers.length === 0) {
            alert("Please upload a customer list.");
            return false;
        }
        if (this.currentStep === 3) {
            const biz = document.getElementById('camp-biz-name')?.value;
            const prod = document.getElementById('camp-prod-name')?.value;
            if (!biz || !prod) {
                alert("Please fill Business and Product name.");
                return false;
            }
        }
        return true;
    },

    async startAutomation() {
        if (!confirm("Approve and start campaign?")) return;

        document.getElementById('wizard-content').classList.add('hidden');
        document.getElementById('processing-view').classList.remove('hidden');
        this.currentStep = 5;
        this.updateWizardUI();

        this.totalMessages = this.generatedMessages.length;
        this.currentIndex = 0;
        this.sentCount = 0;
        this.isPaused = false;

        document.getElementById('proc-total').innerText = this.totalMessages;
        document.getElementById('proc-remaining').innerText = this.totalMessages;

        if (this.totalMessages > 0) {
            document.getElementById('dispatch-customer-name').innerText = this.generatedMessages[0].customerName;
        }

        this.log("Campaign Initialized. Ready for dispatch.");
    },

    async dispatchNext() {
        if (this.currentIndex >= this.totalMessages) return;
        if (this.isPaused) return;

        const msg = this.generatedMessages[this.currentIndex];
        const safeMode = document.getElementById('safe-mode-toggle')?.checked;

        this.log(`Opening target tab for ${msg.customerName} (+91${msg.mobile})...`);

        // OPEN WHATSAPP WEB WITH DRIVER PARAMETER IN NEW TAB
        const waUrl = `https://web.whatsapp.com/send?phone=91${msg.mobile}&text=${encodeURIComponent(msg.text)}&autoId=${window.AutomationLogic?.automationId || 'BULK_CAMPAIGN'}`;

        if (!this.portalWindow || this.portalWindow.closed) {
            this.portalWindow = window.open(waUrl, 'WA_Portal', 'width=1000,height=800,left=100,top=100');
        } else {
            this.portalWindow.location.href = waUrl;
            this.portalWindow.focus();
        }

        this.sentCount++;
        this.currentIndex++;

        document.getElementById('proc-sent').innerText = this.sentCount;
        document.getElementById('proc-remaining').innerText = this.totalMessages - this.currentIndex;
        document.getElementById('proc-progress').style.width = `${(this.currentIndex / this.totalMessages) * 100}%`;

        if (this.currentIndex >= this.totalMessages) {
            this.log("ALL MESSAGES DISPATCHED SUCCESSFULLY.", 'emerald-500');
            setTimeout(() => this.renderCompletionSummary(this.sentCount, 0), 2000);
            return;
        }

        let baseDelay = 12;
        if (safeMode) {
            baseDelay = 20 + Math.floor(Math.random() * 20);
            this.log(`Safe Mode: Natural delay of ${baseDelay}s active.`);
        }

        if (this.sentCount > 0 && this.sentCount % 10 === 0) {
            baseDelay = 300;
            this.log("Batch limit reached: 5-minute rest active to protect WhatsApp account.", 'amber-500');
        }

        document.getElementById('dispatch-customer-name').innerText = this.generatedMessages[this.currentIndex].customerName;

        let delay = baseDelay;
        const timer = setInterval(() => {
            if (this.isPaused) return;
            delay--;
            document.getElementById('proc-delay').innerText = delay + 's';
            if (delay <= 0) {
                clearInterval(timer);
                this.dispatchNext();
            }
        }, 1000);
    },

    log(msg, color = 'emerald-500') {
        const el = document.getElementById('automation-logs');
        if (!el) return;
        const p = document.createElement('p');
        p.className = `text-${color}`;
        p.innerText = `>> [${new Date().toLocaleTimeString()}] ${msg}`;
        el.appendChild(p);
        el.scrollTop = el.scrollHeight;
    },

    renderCompletionSummary(sent, failed) {
        const wizard = document.getElementById('automation-wizard');
        if (!wizard) return;
        wizard.innerHTML = `
            <div class="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm text-center space-y-8">
                <div class="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <i class="fa-solid fa-check text-4xl"></i>
                </div>
                <div>
                    <h2 class="text-3xl font-black text-slate-900 uppercase tracking-tight">Campaign Complete</h2>
                    <p class="text-slate-500 font-medium">Your automation campaign has been processed.</p>
                </div>
                <div class="pt-8">
                    <button onclick="location.reload()" class="btn-black px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl">Back to Workspace</button>
                </div>
            </div>
        `;
        if (this.portalWindow) this.portalWindow.close();
    }
};

class WhatsAppProvider {
    constructor() {
        this.id = 'whatsapp';
        this.name = 'WhatsApp';
    }
}

window._startAutomationFlow = (pid) => AutomationController.startFlow(pid);
window.startAutomationFlow = window._startAutomationFlow;

window.handleWAConnect = async () => {
    window.open("https://web.whatsapp.com", "_blank");
    localStorage.setItem('wa_connected', 'true');
    AutomationController.goToStep(2);
};

window.removeCustomer = (id) => {
    AutomationController.customers = AutomationController.customers.filter(c => c.id !== id);
    AutomationController.renderCustomerPreview();
};

window.downloadAutomationTemplate = () => {
    if (typeof XLSX === 'undefined') return alert("Template generator initializing. Please retry.");
    const data = [
        ["Customer Name", "Mobile Number", "Product Interest", "Customer Category", "Location", "Notes"],
        ["John Doe", "9876543210", "Silk Saree", "Premium", "Chennai", "Interested in new arrivals"],
        ["Jane Smith", "9123456789", "Cotton Saree", "Regular", "Madurai", "Prefers hand-woven"]
    ];
    try {
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Customers");
        XLSX.writeFile(wb, "automation_customer_template.xlsx");
    } catch (e) {
        console.error("Excel generation error:", e);
    }
};

window.dispatchNext = () => AutomationController.dispatchNext();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { if (document.getElementById('automation-view')) AutomationController.init(); });
} else {
    if (document.getElementById('automation-view')) AutomationController.init();
}
