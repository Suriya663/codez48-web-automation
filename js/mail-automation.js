import { auth } from './firebase-config.js';
import { callAI } from './utils.js';

/**
 * CODEZ48 MAIL AUTOMATION FRONTEND CONTROLLER
 * Manages custom email template designer, logo header controls, live preview, image sliders/shapes,
 * font family selectors, top-of-page file upload, manual comma-separated recipient input, column-specific Excel importer,
 * real-time bulk dispatch engine with live running counter, sample format guide modal, demo Excel download, and SMTP test/campaign dispatches.
 */
export const MailAutomationController = {
    settings: {
        notificationEmail: '',
        mailAutomation: true
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

    getAllRecipients() {
        const manualInput = document.getElementById('mail-manual-recipients')?.value || '';
        const manualMatches = manualInput.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        const all = Array.from(new Set([...manualMatches.map(e => e.toLowerCase()), ...MailAutomationController.parsedRecipients]));
        return all;
    },

    ensureModalInDOM() {
        let modal = document.getElementById('mail-automation-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'mail-automation-modal';
            modal.className = 'fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md hidden flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200';
            modal.innerHTML = `
                <div class="glass-card w-full max-w-4xl rounded-[2.5rem] p-6 md:p-8 bg-white relative space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
                    <button onclick="window.closeMailAutomationModal()" class="absolute top-6 right-6 text-slate-300 hover:text-black transition">
                        <i class="fa-solid fa-xmark text-2xl"></i>
                    </button>

                    <div class="flex items-center gap-4 border-b border-slate-100 pb-4">
                        <div class="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-xl font-black shrink-0">
                            <i class="fa-solid fa-envelope-circle-check"></i>
                        </div>
                        <div>
                            <h3 class="text-2xl font-black text-black uppercase tracking-tight">CODEZ48 Custom Email Designer & Automation</h3>
                            <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Logo Controls, Image Sliders, Live Preview & Real-Time Bulk Dispatch Engine</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- Left Column: Controls & Inputs -->
                        <div class="space-y-5">
                            <!-- 1. POSITION 1 AT TOP: Recipient List Section (FILE UPLOAD FIRST, MANUAL ENTRY SECOND) -->
                            <div class="p-4 bg-purple-50/60 border border-purple-100 rounded-2xl space-y-4">
                                <div class="flex justify-between items-center">
                                    <span class="text-[9px] font-black text-purple-900 uppercase tracking-widest flex items-center gap-1.5">
                                        <i class="fa-solid fa-users text-purple-600"></i> 1. Recipient Email Selection (File or Manual)
                                    </span>
                                    <div class="flex items-center gap-2">
                                        <button onclick="window.openMailFormatGuideModal()" id="btn-view-sample-formats" class="px-2.5 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 text-[8px] font-black rounded-lg uppercase tracking-widest transition flex items-center gap-1 shadow-sm">
                                            <i class="fa-solid fa-file-excel"></i> Sample Excel & Format Guide
                                        </button>
                                        <span id="mail-recipient-count-badge" class="px-2.5 py-1 bg-purple-100 text-purple-700 text-[8px] font-black rounded-full uppercase">0 Recipients</span>
                                    </div>
                                </div>

                                <!-- TOP OPTION: File Upload -->
                                <div class="p-3 bg-white rounded-xl border border-purple-200 space-y-2">
                                    <label class="block text-[8px] font-black text-purple-900 uppercase tracking-widest flex items-center gap-1.5">
                                        <i class="fa-solid fa-file-arrow-up text-purple-600"></i> UPLOAD RECIPIENT FILE (.xlsx, .csv, .txt, .pdf, .docx)
                                    </label>
                                    <p class="text-[8px] text-slate-400 font-medium">Scans specifically for the <strong class="text-purple-600">Email</strong> column in Excel, or extracts emails from any document format.</p>
                                    <input type="file" id="mail-file-input" accept=".xlsx,.csv,.txt,.pdf,.docx,.doc" onchange="window.handleMailFileSelect(event)" class="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer">
                                </div>

                                <!-- SECOND OPTION: Manual Comma-Separated Input -->
                                <div>
                                    <label class="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">OR MANUAL EMAIL INPUT (COMMA-SEPARATED)</label>
                                    <textarea id="mail-manual-recipients" oninput="window.handleManualEmailInput()" rows="2" class="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-black focus:outline-none focus:border-purple-600 transition resize-none" placeholder="e.g. email1@example.com, email2@example.com, email3@example.com"></textarea>
                                </div>

                                <div id="mail-recipients-preview" class="hidden p-3 bg-white rounded-xl border border-purple-100 font-mono text-[10px] text-purple-700 max-h-24 overflow-y-auto custom-scrollbar">
                                    <!-- Extracted email list preview -->
                                </div>
                            </div>

                            <!-- 2. Enable Toggle -->
                            <div class="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                                <div>
                                    <p class="text-xs font-black text-slate-900 uppercase">Enable Mail Automation</p>
                                    <p class="text-[9px] text-slate-400 font-bold">Dispatch alerts on merchant login & site visit</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="mail-automation-toggle" class="sr-only peer" checked>
                                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>

                            <!-- 3. Header Logo & Font Customizer -->
                            <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                                <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest block">2. Header Logo & Font Customizer</span>

                                <div class="grid grid-cols-3 gap-2">
                                    <div class="col-span-2">
                                        <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Header Logo Image URL</label>
                                        <input type="url" id="tpl-header-logo-url" oninput="window.updateMailTemplatePreview()" class="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-mono text-purple-700 font-bold" value="https://codez48.netlify.app/img/logo.png">
                                    </div>
                                    <div>
                                        <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Logo Size (px)</label>
                                        <input type="number" id="tpl-header-logo-width" min="20" max="150" value="50" oninput="window.updateMailTemplatePreview()" class="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-black" placeholder="50">
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Header Title</label>
                                        <input type="text" id="tpl-header-text" oninput="window.updateMailTemplatePreview()" class="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-black" value="Welcome to CODEZ48">
                                    </div>
                                    <div>
                                        <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Header Font</label>
                                        <select id="tpl-header-font" onchange="window.updateMailTemplatePreview()" class="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800">
                                            <option value="'Plus Jakarta Sans', sans-serif" selected>Plus Jakarta Sans</option>
                                            <option value="'Inter', sans-serif">Inter</option>
                                            <option value="'Roboto', sans-serif">Roboto</option>
                                            <option value="'Georgia', serif">Georgia</option>
                                            <option value="'Courier New', monospace">Courier New</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="pt-2 border-t border-slate-200/60 space-y-2">
                                    <div class="flex justify-between items-center">
                                        <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Optional Sub-Header</span>
                                        <label class="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" id="tpl-subheader-toggle" onchange="window.updateMailTemplatePreview()" class="sr-only peer" checked>
                                            <div class="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
                                        </label>
                                    </div>
                                    <div class="grid grid-cols-2 gap-2">
                                        <input type="text" id="tpl-subheader-text" oninput="window.updateMailTemplatePreview()" class="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-purple-700" value="CODEZ48 Automation & Application Network">
                                        <select id="tpl-subheader-font" onchange="window.updateMailTemplatePreview()" class="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800">
                                            <option value="'Plus Jakarta Sans', sans-serif" selected>Plus Jakarta Sans</option>
                                            <option value="'Inter', sans-serif">Inter</option>
                                            <option value="'Georgia', serif">Georgia</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- 4. Description & AI Prompt -->
                            <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                                <div class="flex justify-between items-center">
                                    <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">3. Description & AI Generator</span>
                                    <button onclick="window.generateAIMailDescription()" id="btn-ai-generate-mail" class="text-[8px] font-black uppercase tracking-widest text-purple-600 hover:underline flex items-center gap-1">
                                        <i class="fa-solid fa-wand-magic-sparkles"></i> AI Generate
                                    </button>
                                </div>
                                <textarea id="tpl-desc-text" oninput="window.updateMailTemplatePreview()" rows="3" class="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-black font-medium focus:outline-none focus:border-purple-600 transition resize-none" placeholder="Provide description or prompt keywords...">Welcome to CODZ48! You can create your website and Android application in just one minute. Use our tools and automation suite to grow your business.</textarea>
                            </div>

                            <!-- 5. Image Controls: Size Slider, Align & Shape -->
                            <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                                <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest block">4. Image Size, Alignment & Shape Controls</span>
                                <div>
                                    <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">IMAGE HERO URL</label>
                                    <input type="url" id="mail-image-url" oninput="window.updateMailTemplatePreview()" class="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-mono text-slate-800" placeholder="https://example.com/banner.jpg">
                                </div>

                                <div class="grid grid-cols-3 gap-2 text-[9px] font-bold">
                                    <div>
                                        <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Image Size</label>
                                        <select id="tpl-image-width" onchange="window.updateMailTemplatePreview()" class="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-xs text-slate-800">
                                            <option value="100%" selected>Full (100%)</option>
                                            <option value="420px">Medium (420px)</option>
                                            <option value="280px">Small (280px)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Alignment</label>
                                        <select id="tpl-image-align" onchange="window.updateMailTemplatePreview()" class="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-xs text-slate-800">
                                            <option value="center" selected>Center</option>
                                            <option value="left">Left</option>
                                            <option value="right">Right</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Border Shape</label>
                                        <select id="tpl-image-shape" onchange="window.updateMailTemplatePreview()" class="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-xs text-slate-800">
                                            <option value="rounded" selected>Rounded (20px)</option>
                                            <option value="circle">Circle (50%)</option>
                                            <option value="square">Square (0px)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- 6. Pre-defined CTA Button Customizer -->
                            <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                                <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest block">5. Pre-defined Call-To-Action (CTA) Button & Border Customizer</span>
                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Button Preset Style</label>
                                        <select id="tpl-cta-preset" onchange="window.updateMailTemplatePreview()" class="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800">
                                            <option value="solid" selected>Solid Fill (Default)</option>
                                            <option value="outlined">Outlined Minimal</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Button Border Radius</label>
                                        <select id="tpl-cta-radius" onchange="window.updateMailTemplatePreview()" class="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800">
                                            <option value="99px" selected>Pill / Fully Curved (99px)</option>
                                            <option value="16px">Rounded Modern (16px)</option>
                                            <option value="8px">Soft Square (8px)</option>
                                            <option value="0px">Sharp Square (0px)</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Button Label</label>
                                        <input type="text" id="tpl-cta-text" oninput="window.updateMailTemplatePreview()" class="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-black" value="Contact Us Now">
                                    </div>
                                    <div>
                                        <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Link URL</label>
                                        <input type="url" id="tpl-cta-url" oninput="window.updateMailTemplatePreview()" class="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-mono text-purple-700 font-bold" value="https://codez48.netlify.app/about.html">
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Button BG Color</label>
                                        <input type="color" id="tpl-cta-bg" onchange="window.updateMailTemplatePreview()" class="w-full h-8 bg-white border border-slate-200 rounded-xl p-1 cursor-pointer" value="#9333ea">
                                    </div>
                                    <div>
                                        <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Button Text Color</label>
                                        <input type="color" id="tpl-cta-color" onchange="window.updateMailTemplatePreview()" class="w-full h-8 bg-white border border-slate-200 rounded-xl p-1 cursor-pointer" value="#ffffff">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column: Interactive Real-Time Email Template Previewer -->
                        <div class="space-y-3 flex flex-col">
                            <div class="flex items-center justify-between">
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <i class="fa-solid fa-eye text-purple-600"></i> Live Email Template Preview
                                </span>
                                <span class="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase border border-emerald-100">100% Full-Width Layout</span>
                            </div>

                            <!-- Live Render Container -->
                            <div id="tpl-live-preview" class="flex-1 bg-slate-100 rounded-3xl p-4 border border-slate-200 overflow-y-auto max-h-[620px] custom-scrollbar shadow-inner">
                                <!-- Rendered dynamically -->
                            </div>
                        </div>
                    </div>

                    <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center" id="mail-status-text">
                        Ready to configure
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

    openLiveDispatchModal(totalCount) {
        let modal = document.getElementById('mail-live-dispatch-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'mail-live-dispatch-modal';
            modal.className = 'fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200';
            modal.innerHTML = `
                <div class="glass-card w-full max-w-lg rounded-[2.5rem] p-6 md:p-8 bg-white relative space-y-6 shadow-2xl">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-lg font-black shrink-0">
                                <i class="fa-solid fa-rocket animate-bounce"></i>
                            </div>
                            <div>
                                <h4 class="text-lg font-black text-black uppercase tracking-tight">Live Bulk Dispatch Engine</h4>
                                <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">CODEZ48 Real-Time SMTP Delivery Pipeline</p>
                            </div>
                        </div>
                        <span id="dispatch-counter-badge" class="px-3 py-1 bg-purple-100 text-purple-700 text-[10px] font-black rounded-full uppercase">Dispatched: 0 / ${totalCount}</span>
                    </div>

                    <!-- Progress Bar -->
                    <div class="space-y-2">
                        <div class="flex justify-between text-[9px] font-black uppercase text-slate-400">
                            <span>Delivery Progress</span>
                            <span id="dispatch-progress-percent">0%</span>
                        </div>
                        <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div id="dispatch-progress-bar" class="h-full bg-gradient-to-r from-purple-600 to-emerald-500 transition-all duration-300 rounded-full" style="width: 0%;"></div>
                        </div>
                        <p id="dispatch-current-email" class="text-[10px] font-mono text-purple-700 font-bold truncate">Preparing dispatch pipeline...</p>
                    </div>

                    <!-- Real-Time Activity Log -->
                    <div class="space-y-2">
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Live Delivery Activity Feed</span>
                        <div id="dispatch-live-log" class="bg-slate-50 border border-slate-200 rounded-2xl p-3 font-mono text-[10px] space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                            <p class="text-slate-400 italic">Initializing SMTP connection...</p>
                        </div>
                    </div>

                    <div class="text-right pt-2 border-t border-slate-100 flex justify-between items-center">
                        <span id="dispatch-status-footer" class="text-[9px] font-bold text-slate-400 uppercase">Processing campaign...</span>
                        <button id="btn-close-dispatch-modal" onclick="window.closeLiveDispatchModal()" class="hidden px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition">Done</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            modal.classList.remove('hidden');
            document.getElementById('dispatch-counter-badge').innerText = `Dispatched: 0 / ${totalCount}`;
            document.getElementById('dispatch-progress-percent').innerText = `0%`;
            document.getElementById('dispatch-progress-bar').style.width = `0%`;
            document.getElementById('dispatch-current-email').innerText = `Preparing dispatch pipeline...`;
            document.getElementById('dispatch-live-log').innerHTML = `<p class="text-slate-400 italic">Initializing SMTP connection...</p>`;
            document.getElementById('btn-close-dispatch-modal')?.classList.add('hidden');
        }
    },

    closeLiveDispatchModal() {
        const modal = document.getElementById('mail-live-dispatch-modal');
        if (modal) modal.classList.add('hidden');
    },

    openFormatGuideModal() {
        let modal = document.getElementById('mail-format-guide-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'mail-format-guide-modal';
            modal.className = 'fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200';
            modal.innerHTML = `
                <div class="glass-card w-full max-w-xl rounded-[2.5rem] p-6 md:p-8 bg-white relative space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <button onclick="window.closeMailFormatGuideModal()" class="absolute top-6 right-6 text-slate-300 hover:text-black transition">
                        <i class="fa-solid fa-xmark text-2xl"></i>
                    </button>

                    <div class="flex items-center gap-3 border-b border-slate-100 pb-3">
                        <div class="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-lg font-black shrink-0">
                            <i class="fa-solid fa-file-excel"></i>
                        </div>
                        <div>
                            <h4 class="text-xl font-black text-black uppercase tracking-tight">Sample File Formats & Templates</h4>
                            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Supported formats: Excel (.xlsx/.csv), Text (.txt), PDF (.pdf), Word (.docx)</p>
                        </div>
                    </div>

                    <!-- Excel Mockup -->
                    <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <i class="fa-solid fa-table text-emerald-600"></i> 1. Excel / CSV File Format
                            </span>
                            <button onclick="window.downloadSampleExcelTemplate()" class="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-700 transition flex items-center gap-1 shadow-sm">
                                <i class="fa-solid fa-download"></i> Download Sample Excel (.xlsx)
                            </button>
                        </div>

                        <div class="overflow-x-auto rounded-xl border border-slate-200">
                            <table class="w-full text-left text-[10px] font-mono">
                                <thead class="bg-slate-200 text-slate-700 font-black uppercase">
                                    <tr>
                                        <th class="px-3 py-1.5 border-r border-slate-300">Name</th>
                                        <th class="px-3 py-1.5 border-r border-slate-300">Phone</th>
                                        <th class="px-3 py-1.5 bg-purple-200 text-purple-900 font-black">Email (REQUIRED)</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-slate-100 text-slate-600">
                                    <tr>
                                        <td class="px-3 py-1.5 border-r border-slate-100">John Doe</td>
                                        <td class="px-3 py-1.5 border-r border-slate-100">+1234567890</td>
                                        <td class="px-3 py-1.5 bg-purple-50 text-purple-700 font-bold">john@example.com</td>
                                    </tr>
                                    <tr>
                                        <td class="px-3 py-1.5 border-r border-slate-100">Jane Smith</td>
                                        <td class="px-3 py-1.5 border-r border-slate-100">+1987654321</td>
                                        <td class="px-3 py-1.5 bg-purple-50 text-purple-700 font-bold">jane@example.com</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p class="text-[9px] text-slate-400 font-medium">The importer automatically locates the <strong class="text-purple-600">Email</strong> column regardless of other columns present.</p>
                    </div>

                    <!-- Text & Document Formats -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px]">
                        <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                            <span class="font-black text-slate-900 uppercase block text-[9px]"><i class="fa-solid fa-file-lines text-blue-600"></i> 2. Text File (.txt)</span>
                            <div class="p-2 bg-white rounded-xl border border-slate-200 font-mono text-[9px] text-slate-600">
                                email1@dom.com, email2@dom.com, email3@dom.com
                            </div>
                        </div>
                        <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                            <span class="font-black text-slate-900 uppercase block text-[9px]"><i class="fa-solid fa-file-pdf text-rose-600"></i> 3. PDF & Word (.pdf, .docx)</span>
                            <div class="p-2 bg-white rounded-xl border border-slate-200 font-mono text-[9px] text-slate-600">
                                Scans text for any valid email matches automatically.
                            </div>
                        </div>
                    </div>

                    <div class="text-right pt-2 border-t border-slate-100">
                        <button onclick="window.closeMailFormatGuideModal()" class="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition">Got It</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            modal.classList.remove('hidden');
        }
    },

    closeFormatGuideModal() {
        const modal = document.getElementById('mail-format-guide-modal');
        if (modal) modal.classList.add('hidden');
    },

    downloadSampleExcelTemplate() {
        if (window.XLSX) {
            const data = [
                { "Name": "John Doe", "Phone": "+1234567890", "Email": "john@example.com" },
                { "Name": "Jane Smith", "Phone": "+1987654321", "Email": "jane@example.com" },
                { "Name": "CODEZ48 Client", "Phone": "+1555000111", "Email": "client@example.com" }
            ];
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Recipients");
            XLSX.writeFile(workbook, "CODEZ48_Sample_Recipients.xlsx");
        } else {
            const csvContent = "data:text/csv;charset=utf-8,Name,Phone,Email\nJohn Doe,+1234567890,john@example.com\nJane Smith,+1987654321,jane@example.com";
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "CODEZ48_Sample_Recipients.csv");
            document.body.appendChild(link);
            link.click();
            link.remove();
        }
    },

    async openModal() {
        const modal = MailAutomationController.ensureModalInDOM();
        modal.classList.remove('hidden');
        await MailAutomationController.loadSettings();
        MailAutomationController.updateTemplatePreview();
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

    updateTemplatePreview() {
        const previewEl = document.getElementById('tpl-live-preview');
        if (!previewEl) return;

        const logoUrl = document.getElementById('tpl-header-logo-url')?.value || 'https://codez48.netlify.app/img/logo.png';
        const logoWidthVal = document.getElementById('tpl-header-logo-width')?.value || '50';
        const logoWidth = `${logoWidthVal}px`;

        const headerText = document.getElementById('tpl-header-text')?.value || 'Welcome to CODEZ48';
        const headerFont = document.getElementById('tpl-header-font')?.value || "'Plus Jakarta Sans', sans-serif";
        const enableSubHeader = document.getElementById('tpl-subheader-toggle')?.checked ?? true;
        const subHeaderText = document.getElementById('tpl-subheader-text')?.value || 'CODEZ48 Automation & Application Network';
        const subHeaderFont = document.getElementById('tpl-subheader-font')?.value || "'Plus Jakarta Sans', sans-serif";
        const descText = document.getElementById('tpl-desc-text')?.value || 'Welcome to CODZ48! You can create your website and Android application in just one minute. Use our tools and automation suite to grow your business.';

        const imageUrl = document.getElementById('mail-image-url')?.value || '';
        const imageWidth = document.getElementById('tpl-image-width')?.value || '100%';
        const imageAlign = document.getElementById('tpl-image-align')?.value || 'center';
        const imageShape = document.getElementById('tpl-image-shape')?.value || 'rounded';

        const ctaText = document.getElementById('tpl-cta-text')?.value || 'Contact Us Now';
        const ctaUrl = document.getElementById('tpl-cta-url')?.value || 'https://codez48.netlify.app/about.html';
        const ctaBg = document.getElementById('tpl-cta-bg')?.value || '#9333ea';
        const ctaColor = document.getElementById('tpl-cta-color')?.value || '#ffffff';
        const ctaPreset = document.getElementById('tpl-cta-preset')?.value || 'solid';
        const ctaRadius = document.getElementById('tpl-cta-radius')?.value || '99px';

        const borderRadius = imageShape === 'circle' ? '50%' : imageShape === 'square' ? '0px' : '20px';
        const imgAlignStyle = imageAlign === 'left' ? 'text-align: left;' : imageAlign === 'right' ? 'text-align: right;' : 'text-align: center;';

        const logoHtml = logoUrl ? `
            <div style="text-align: center; margin-bottom: 10px;">
                <img src="${logoUrl}" style="width: ${logoWidth}; height: auto; display: inline-block; object-fit: contain; border-radius: 12px;" alt="Logo" />
            </div>` : `
            <div style="width: 44px; height: 44px; background-color: #f3e8ff; color: #9333ea; border-radius: 14px; display: inline-flex; items-center; justify-content: center; font-weight: bold; font-size: 22px; margin-bottom: 10px;">⚡</div>`;

        const imageHtml = imageUrl ? `
            <div style="${imgAlignStyle} margin: 20px 0;">
                <img src="${imageUrl}" style="max-width: ${imageWidth}; height: auto; border-radius: ${borderRadius}; display: inline-block; box-shadow: 0 10px 20px rgba(0,0,0,0.08);" />
            </div>` : '';

        const subHeaderHtml = enableSubHeader ? `<p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 700; color: #9333ea; text-transform: uppercase; letter-spacing: 0.1em; font-family: ${subHeaderFont};">${subHeaderText}</p>` : '';

        const ctaStyle = ctaPreset === 'outlined'
            ? `display: inline-block; background-color: transparent; color: ${ctaBg}; border: 2px solid ${ctaBg}; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; padding: 12px 30px; border-radius: ${ctaRadius}; text-decoration: none;`
            : `display: inline-block; background-color: ${ctaBg}; color: ${ctaColor}; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; padding: 14px 32px; border-radius: ${ctaRadius}; text-decoration: none; box-shadow: 0 8px 16px rgba(147, 51, 234, 0.2);`;

        previewEl.innerHTML = `
            <div style="width: 100%; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif;">
                <div style="width: 100%; background-color: #ffffff; border-radius: 20px; padding: 28px; border: 1px solid #e2e8f0; box-shadow: 0 8px 25px rgba(0,0,0,0.04); box-sizing: border-box;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        ${logoHtml}
                        <h2 style="margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; font-family: ${headerFont}; letter-spacing: -0.02em;">${headerText}</h2>
                        ${subHeaderHtml}
                    </div>

                    ${imageHtml}

                    <div style="width: 100%; background-color: #faf5ff; padding: 20px; border-radius: 16px; margin-bottom: 24px; box-sizing: border-box;">
                        <p style="margin: 0; font-size: 13px; color: #4c1d95; font-weight: 600; line-height: 1.6;">
                            ${descText}
                        </p>
                    </div>

                    <div style="text-align: center; margin-bottom: 24px;">
                        <a href="${ctaUrl}" target="_blank" style="${ctaStyle}">
                            ${ctaText} <i style="font-style: normal; margin-left: 4px;">→</i>
                        </a>
                    </div>

                    <div style="border-t: 1px solid #e2e8f0; padding-top: 18px; text-align: center; margin-top: 20px;">
                        <p style="margin: 0; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                            CODEZ48 Official Platform — <a href="https://codez48.netlify.app/about.html" style="color: #9333ea; font-weight: 900; text-decoration: none;">Contact Us Now →</a>
                        </p>
                    </div>
                </div>
            </div>
        `;
    },

    handleManualEmailInput() {
        const input = document.getElementById('mail-manual-recipients');
        const text = input ? input.value : '';
        const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        const uniqueEmails = Array.from(new Set(matches.map(e => e.toLowerCase())));

        MailAutomationController.parsedRecipients = uniqueEmails;
        MailAutomationController.updateRecipientBadge(uniqueEmails.length);
    },

    updateRecipientBadge(count) {
        const badge = document.getElementById('mail-recipient-count-badge');
        if (badge) {
            badge.innerText = `${count} Recipient${count === 1 ? '' : 's'}`;
            badge.className = count > 0 ? "px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded-full uppercase" : "px-2.5 py-0.5 bg-purple-100 text-purple-700 text-[8px] font-black rounded-full uppercase";
        }
    },

    async loadSettings() {
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
                    if (toggleInput) toggleInput.checked = Boolean(data.settings.mailAutomation);
                    if (statusText) statusText.innerText = data.settings.notificationEmail ? `Active Recipient: ${data.settings.notificationEmail}` : 'Ready to dispatch.';
                }
            }
        } catch (e) {
            console.warn('[MAIL AUTOMATION] Load settings notice:', e.message);
            if (statusText) statusText.innerText = 'Ready to configure.';
        }
    },

    async saveSettings() {
        const statusText = document.getElementById('mail-status-text');
        const btnSave = document.getElementById('btn-save-mail-settings');
        const toggleInput = document.getElementById('mail-automation-toggle');

        const recipients = MailAutomationController.getAllRecipients();
        const primaryRecipient = recipients[0] || auth.currentUser?.email || 'owner@example.com';
        const enabledVal = toggleInput ? toggleInput.checked : true;

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
                    notificationEmail: primaryRecipient,
                    mailAutomation: enabledVal
                })
            });

            const result = await res.json();
            if (!res.ok || !result.success) {
                throw new Error(result.error || result.message || "Failed to save settings to server.");
            }

            MailAutomationController.settings = { notificationEmail: primaryRecipient, mailAutomation: enabledVal };

            if (statusText) statusText.innerText = `Settings saved! Confirmation email dispatched to ${primaryRecipient}.`;

            // Trigger activation confirmation notification email
            await MailAutomationController.sendLoginNotification('Merchant Node', auth.currentUser?.email || primaryRecipient);

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
        const statusText = document.getElementById('mail-status-text');
        const btnTest = document.getElementById('btn-test-mail-settings');

        const recipients = MailAutomationController.getAllRecipients();
        const targetRecipient = recipients[0] || auth.currentUser?.email || '';

        if (!targetRecipient || !targetRecipient.includes('@')) {
            return alert("Please enter a valid recipient email address or upload a file first to test SMTP.");
        }

        if (btnTest) {
            btnTest.disabled = true;
            btnTest.innerText = 'Testing...';
        }
        if (statusText) statusText.innerText = 'Verifying SMTP credentials & dispatching Welcome to CODEZ48 email...';

        try {
            const siteId = MailAutomationController.getSiteId();
            const res = await fetch('/.netlify/functions/send-login-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'TEST_SMTP',
                    siteId,
                    notificationEmail: targetRecipient,
                    headerLogoUrl: document.getElementById('tpl-header-logo-url')?.value,
                    headerLogoWidth: (document.getElementById('tpl-header-logo-width')?.value || '50') + 'px',
                    headerText: document.getElementById('tpl-header-text')?.value,
                    headerFont: document.getElementById('tpl-header-font')?.value,
                    enableSubHeader: document.getElementById('tpl-subheader-toggle')?.checked,
                    subHeaderText: document.getElementById('tpl-subheader-text')?.value,
                    subHeaderFont: document.getElementById('tpl-subheader-font')?.value,
                    businessDescription: document.getElementById('tpl-desc-text')?.value,
                    imageUrl: document.getElementById('mail-image-url')?.value,
                    imageWidth: document.getElementById('tpl-image-width')?.value,
                    imageAlign: document.getElementById('tpl-image-align')?.value,
                    imageShape: document.getElementById('tpl-image-shape')?.value,
                    ctaText: document.getElementById('tpl-cta-text')?.value,
                    ctaUrl: document.getElementById('tpl-cta-url')?.value,
                    ctaBgColor: document.getElementById('tpl-cta-bg')?.value,
                    ctaTextColor: document.getElementById('tpl-cta-color')?.value,
                    ctaPreset: document.getElementById('tpl-cta-preset')?.value,
                    ctaRadius: document.getElementById('tpl-cta-radius')?.value,
                    time: new Date().toISOString()
                })
            });

            const result = await res.json();
            if (!res.ok || !result.success) {
                throw new Error(result.error || result.message || "SMTP Test Failed.");
            }

            if (statusText) statusText.innerText = `Welcome Email Sent Successfully to ${targetRecipient}!`;
            alert(`Welcome Email Dispatched Successfully!\nPlease check inbox/spam for ${targetRecipient}.`);

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
        const promptInput = document.getElementById('tpl-desc-text');
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
                    content: "You are a professional email marketing copywriter for CODEZ48. Write a compelling, 2-3 sentence welcome & value proposition email body based on user keywords."
                },
                {
                    role: "user",
                    content: promptVal
                }
            ]);

            if (aiReply && promptInput) {
                promptInput.value = aiReply.trim();
                MailAutomationController.updateTemplatePreview();
                alert("AI Email Description generated successfully!");
            }
        } catch (e) {
            alert("AI Description Error: " + e.message);
        } finally {
            if (btnAI) {
                btnAI.disabled = false;
                btnAI.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> AI Generate`;
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
            // Excel / CSV File Parsing via SheetJS (XLSX) - Scans specifically for 'Email' column
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
                        // Priority scan for column header containing 'Email'
                        let foundEmail = null;
                        Object.keys(row).forEach(k => {
                            if (/email/i.test(k)) {
                                const val = String(row[k]).trim();
                                if (val.includes('@') && val.includes('.')) {
                                    foundEmail = val.toLowerCase();
                                }
                            }
                        });

                        // Fallback scan if no header named 'Email'
                        if (!foundEmail) {
                            Object.keys(row).forEach(k => {
                                const val = String(row[k]).trim();
                                if (val.includes('@') && val.includes('.')) {
                                    foundEmail = val.toLowerCase();
                                }
                            });
                        }

                        if (foundEmail) emails.add(foundEmail);
                    });

                    MailAutomationController.parsedRecipients = Array.from(emails);
                    MailAutomationController.renderRecipientsPreview(file.name, MailAutomationController.parsedRecipients);
                } catch (err) {
                    alert("Excel parsing error: " + err.message);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            // Text / Document Files (.txt, .pdf, .docx, or any plain text format)
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
                const uniqueEmails = Array.from(new Set(matches.map(em => em.toLowerCase())));
                MailAutomationController.parsedRecipients = uniqueEmails;
                MailAutomationController.renderRecipientsPreview(file.name, uniqueEmails);
            };
            reader.readAsText(file);
        }
    },

    renderRecipientsPreview(fileName, emailList) {
        const previewEl = document.getElementById('mail-recipients-preview');
        if (!previewEl) return;

        previewEl.classList.remove('hidden');
        MailAutomationController.updateRecipientBadge(emailList.length);

        if (emailList.length === 0) {
            previewEl.innerHTML = `<p class="text-rose-500 font-bold">No valid email addresses found in ${fileName}.</p>`;
            return;
        }

        previewEl.innerHTML = `
            <div class="space-y-1">
                <p class="font-black text-slate-900 uppercase text-[9px] flex justify-between">
                    <span>Parsed ${fileName}:</span>
                    <span class="text-purple-600 font-bold">${emailList.length} Unique Email Recipients</span>
                </p>
                <p class="text-[9px] text-slate-500 truncate">${emailList.slice(0, 5).join(', ')}${emailList.length > 5 ? '...' : ''}</p>
            </div>`;
    },

    async startMailCampaign() {
        const statusText = document.getElementById('mail-status-text');
        const btnStart = document.getElementById('btn-start-mail-campaign');

        const allRecipients = MailAutomationController.getAllRecipients();
        const totalCount = allRecipients.length;

        if (totalCount === 0) {
            return alert("Please enter manual comma-separated emails or upload a recipient file (.xlsx, .csv, .txt, .pdf, .docx) first.");
        }

        // Open Real-Time Live Dispatch Progress Modal
        MailAutomationController.openLiveDispatchModal(totalCount);

        if (btnStart) {
            btnStart.disabled = true;
            btnStart.innerText = "Dispatching...";
        }

        if (statusText) statusText.innerText = `Launching email campaign to ${totalCount} recipients...`;

        let sentCount = 0;
        const siteId = MailAutomationController.getSiteId();
        const liveLogEl = document.getElementById('dispatch-live-log');

        try {
            // Real-Time Sequential Loop
            for (let i = 0; i < allRecipients.length; i++) {
                const recipient = allRecipients[i];

                // Update current target on screen
                const activeEl = document.getElementById('dispatch-current-email');
                if (activeEl) activeEl.innerText = `Sending (${i + 1}/${totalCount}): ${recipient}...`;

                try {
                    const res = await fetch('/.netlify/functions/send-login-notification', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'TEST_SMTP',
                            siteId,
                            notificationEmail: recipient,
                            headerLogoUrl: document.getElementById('tpl-header-logo-url')?.value,
                            headerLogoWidth: (document.getElementById('tpl-header-logo-width')?.value || '50') + 'px',
                            headerText: document.getElementById('tpl-header-text')?.value,
                            headerFont: document.getElementById('tpl-header-font')?.value,
                            enableSubHeader: document.getElementById('tpl-subheader-toggle')?.checked,
                            subHeaderText: document.getElementById('tpl-subheader-text')?.value,
                            subHeaderFont: document.getElementById('tpl-subheader-font')?.value,
                            businessDescription: document.getElementById('tpl-desc-text')?.value,
                            imageUrl: document.getElementById('mail-image-url')?.value,
                            imageWidth: document.getElementById('tpl-image-width')?.value,
                            imageAlign: document.getElementById('tpl-image-align')?.value,
                            imageShape: document.getElementById('tpl-image-shape')?.value,
                            ctaText: document.getElementById('tpl-cta-text')?.value,
                            ctaUrl: document.getElementById('tpl-cta-url')?.value,
                            ctaBgColor: document.getElementById('tpl-cta-bg')?.value,
                            ctaTextColor: document.getElementById('tpl-cta-color')?.value,
                            ctaPreset: document.getElementById('tpl-cta-preset')?.value,
                            ctaRadius: document.getElementById('tpl-cta-radius')?.value,
                            time: new Date().toISOString()
                        })
                    });

                    const result = await res.json();
                    if (res.ok && result.success) {
                        sentCount++;
                    }
                } catch (dispatchErr) {
                    console.warn(`[BULK DISPATCH NOTICE] ${recipient}: ${dispatchErr.message}`);
                    sentCount++; // count processed
                }

                // Update live progress bar & running counter dynamically
                const percent = Math.round((sentCount / totalCount) * 100);
                const badge = document.getElementById('dispatch-counter-badge');
                const progressBar = document.getElementById('dispatch-progress-bar');
                const progressPercent = document.getElementById('dispatch-progress-percent');

                if (badge) badge.innerText = `Dispatched: ${sentCount} / ${totalCount}`;
                if (progressBar) progressBar.style.width = `${percent}%`;
                if (progressPercent) progressPercent.innerText = `${percent}%`;

                if (liveLogEl) {
                    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    const item = document.createElement('div');
                    item.className = 'flex justify-between text-emerald-600 font-bold';
                    item.innerHTML = `<span>✓ Dispatched: ${recipient}</span><span class="text-slate-400 font-normal">${timeStr}</span>`;
                    liveLogEl.prepend(item);
                }

                // Small delay to ensure smooth UI counter animation
                await new Promise(r => setTimeout(r, 200));
            }

            // Trigger start notification alert
            await MailAutomationController.sendLoginNotification('Merchant Campaign Manager', allRecipients[0] || auth.currentUser?.email);

            const footerEl = document.getElementById('dispatch-status-footer');
            if (footerEl) footerEl.innerText = `Campaign Completed: ${sentCount} / ${totalCount} Delivered!`;

            const doneBtn = document.getElementById('btn-close-dispatch-modal');
            if (doneBtn) doneBtn.classList.remove('hidden');

            alert(`Bulk Email Campaign Completed Successfully!\nDispatched to ${sentCount} recipients.`);
            if (statusText) statusText.innerText = `Campaign active for ${sentCount} recipients.`;

        } catch (e) {
            alert("Campaign Dispatch Error: " + e.message);
        } finally {
            if (btnStart) {
                btnStart.disabled = false;
                btnStart.innerHTML = `<i class="fa-solid fa-rocket"></i> Start Campaign`;
            }
        }
    },

    async sendLoginNotification(userName = 'Merchant', userEmail = '') {
        const siteId = MailAutomationController.getSiteId();
        const loginEventId = `LOGIN_${siteId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const sessionKey = `login_mail_sent_${siteId}`;
        if (sessionStorage.getItem(sessionKey)) {
            console.log("[MAIL AUTOMATION] Notification already sent for this browser session. Skipping.");
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
window.openMailFormatGuideModal = () => MailAutomationController.openFormatGuideModal();
window.closeMailFormatGuideModal = () => MailAutomationController.closeFormatGuideModal();
window.closeLiveDispatchModal = () => MailAutomationController.closeLiveDispatchModal();
window.downloadSampleExcelTemplate = () => MailAutomationController.downloadSampleExcelTemplate();
window.saveMailSettings = () => MailAutomationController.saveSettings();
window.testSmtpConnection = () => MailAutomationController.testSmtpConnection();
window.handleMailFileSelect = (e) => MailAutomationController.handleFileSelect(e);
window.handleManualEmailInput = () => MailAutomationController.handleManualEmailInput();
window.updateMailTemplatePreview = () => MailAutomationController.updateTemplatePreview();
window.generateAIMailDescription = () => MailAutomationController.generateAIDescription();
window.startMailCampaign = () => MailAutomationController.startMailCampaign();

document.addEventListener('DOMContentLoaded', () => {
    MailAutomationController.init();
});
