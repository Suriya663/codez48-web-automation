import { db, auth } from '../../js/firebase-config.js';
import {
    collection, query, where, getDocs, doc, getDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

/**
 * AI STUDIO TEXT-TO-TEXT WIZARD CONTROLLER
 */
export const StudioTextToText = {
    currentStep: 1,
    wizardData: {
        workspaceId: null,
        task: null,
        provider: 'groq',
        buildingMethod: 'rag'
    },

    init() {
        window.StudioTextToText = StudioTextToText;
        console.log("[AI TEXT-TO-TEXT] Protocol Initialized.");
    },

    async startWizard() {
        this.currentStep = 1;
        this.renderStep();
    },

    async renderStep() {
        const container = document.getElementById('text-to-text-wizard-container');
        if (!container) return;

        if (this.currentStep === 1) {
            // Step 1: Select Workspace
            const q = query(collection(db, "ai_workspaces"), where("ownerId", "==", auth.currentUser.uid));
            const snap = await getDocs(q);

            container.innerHTML = `
                <div class="space-y-8 animate-in fade-in">
                    <div class="text-center space-y-2">
                        <h3 class="text-2xl font-black uppercase">Step 1: Select Workspace</h3>
                        <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">Identify the project node for this AI transformation</p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${snap.docs.map(d => `
                            <div onclick="window.StudioTextToText.selectWorkspace('${d.id}')" class="p-6 border border-slate-100 rounded-2xl hover:border-indigo-600 cursor-pointer transition-all ${this.wizardData.workspaceId === d.id ? 'border-indigo-600 bg-indigo-50/30' : 'bg-slate-50'}">
                                <h4 class="text-sm font-black uppercase">${d.data().name}</h4>
                            </div>
                        `).join('')}
                    </div>
                    ${snap.empty ? '<p class="text-center text-slate-400 text-xs py-10">No workspaces found. Please create one in Studio Home.</p>' : ''}
                    <div class="pt-8 flex justify-center">
                        <button onclick="window.StudioTextToText.nextStep()" class="btn-black px-12 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest ${!this.wizardData.workspaceId ? 'opacity-50 pointer-events-none' : ''}">Continue</button>
                    </div>
                </div>
            `;
        } else if (this.currentStep === 2) {
            // Step 2: Select Task
            const tasks = [
                { id: 'qa', name: 'Question Answering', icon: 'fa-comments' },
                { id: 'summarize', name: 'Summarization', icon: 'fa-align-left' },
                { id: 'translate', name: 'Translation', icon: 'fa-language' },
                { id: 'rewrite', name: 'Text Rewriting', icon: 'fa-pen-nib' }
            ];
            container.innerHTML = `
                <div class="space-y-8 animate-in fade-in">
                    <div class="text-center space-y-2">
                        <h3 class="text-2xl font-black uppercase">Step 2: Define Task</h3>
                        <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">What should your text AI specialize in?</p>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        ${tasks.map(t => `
                            <div onclick="window.StudioTextToText.selectTask('${t.id}')" class="p-6 border border-slate-100 rounded-2xl hover:border-indigo-600 cursor-pointer transition-all text-center space-y-3 ${this.wizardData.task === t.id ? 'border-indigo-600 bg-indigo-50/30' : 'bg-slate-50'}">
                                <i class="fa-solid ${t.icon} text-2xl text-indigo-600"></i>
                                <h4 class="text-xs font-black uppercase">${t.name}</h4>
                            </div>
                        `).join('')}
                    </div>
                    <div class="pt-8 flex justify-between">
                        <button onclick="window.StudioTextToText.prevStep()" class="text-slate-400 text-[10px] font-black uppercase">Back</button>
                        <button onclick="window.StudioTextToText.nextStep()" class="btn-black px-12 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest ${!this.wizardData.task ? 'opacity-50 pointer-events-none' : ''}">Continue</button>
                    </div>
                </div>
            `;
        } else if (this.currentStep === 3) {
            // Step 3: Knowledge Source
            container.innerHTML = `
                <div class="space-y-8 animate-in fade-in">
                    <div class="text-center space-y-2">
                        <h3 class="text-2xl font-black uppercase">Step 3: Knowledge Ingestion</h3>
                        <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">Provide the raw data for your AI to master</p>
                    </div>
                    <div class="space-y-4">
                        <textarea id="wiz-source-text" rows="10" class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 text-sm font-medium focus:outline-none focus:border-indigo-600 resize-none" placeholder="Paste your documentation, notes, or knowledge base here..."></textarea>
                    </div>
                    <div class="pt-8 flex justify-between items-center">
                        <button onclick="window.StudioTextToText.prevStep()" class="text-slate-400 text-[10px] font-black uppercase">Back</button>
                        <button onclick="window.StudioTextToText.launchPipeline()" class="bg-indigo-600 text-white px-12 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100">Initialize Pipeline</button>
                    </div>
                </div>
            `;
        }
    },

    selectWorkspace(id) {
        this.wizardData.workspaceId = id;
        this.renderStep();
    },

    selectTask(id) {
        this.wizardData.task = id;
        this.renderStep();
    },

    nextStep() {
        this.currentStep++;
        this.renderStep();
    },

    prevStep() {
        this.currentStep--;
        this.renderStep();
    },

    async launchPipeline() {
        const source = document.getElementById('wiz-source-text').value.trim();
        if (source.length < 50) return alert("Knowledge source too short. Please provide at least 50 characters.");

        const loader = document.getElementById('global-loader');
        if (loader) loader.classList.remove('hidden');

        // Set QA Builder values and switch view
        const sourceField = document.getElementById('qa-source-text');
        const targetField = document.getElementById('qa-target-ws');

        if (sourceField) sourceField.value = source;
        if (targetField) targetField.value = this.wizardData.workspaceId;

        setTimeout(() => {
            window.switchView('qa-builder');
            if (loader) loader.classList.add('hidden');
            if (window.StudioQA) window.StudioQA.startGeneration();
        }, 800);
    }
};

window.StudioTextToText = StudioTextToText;
StudioTextToText.init();
