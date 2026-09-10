import { db, auth } from '../../js/firebase-config.js';
import {
    collection, query, where, getDocs, orderBy
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

/**
 * AI STUDIO PLAYGROUND CONTROLLER
 */
export const StudioPlayground = {
    activeModel: null,
    chatHistory: [],

    init() {
        console.log("[AI PLAYGROUND] Initialized.");
        this.setupAutoResize();
    },

    async loadModels() {
        const select = document.getElementById('playground-model-select');
        if (!select || !auth.currentUser) return;

        try {
            // Fetch both Draft and Finalized models for testing
            const q = query(collection(db, "ai_models"), where("ownerId", "==", auth.currentUser.uid));
            const snap = await getDocs(q);

            select.innerHTML = '<option value="">Select Target Model</option>';
            snap.forEach(d => {
                const m = d.data();
                select.innerHTML += `<option value="${d.id}">${m.name} (${m.version || 'v1.0'})</option>`;
            });

            select.onchange = (e) => this.selectModel(e.target.value);
        } catch (e) {
            console.error("[AI PLAYGROUND] Error loading models:", e);
        }
    },

    selectModel(modelId) {
        if (!modelId) {
            this.activeModel = null;
            return;
        }
        this.activeModel = modelId;
        console.log("[AI PLAYGROUND] Target model selected:", modelId);

        // Reset chat
        this.chatHistory = [];
        this.renderChat();

        const contextStatus = document.getElementById('playground-context-status');
        contextStatus.innerHTML = `
            <div class="flex items-center justify-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p class="text-[8px] text-slate-900 font-black uppercase">Model Node Linked</p>
            </div>
        `;
    },

    setupAutoResize() {
        const textarea = document.getElementById('playground-msg-input');
        if (!textarea) return;
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight) + 'px';
        });
    },

    async sendMessage() {
        const input = document.getElementById('playground-msg-input');
        const text = input.value.trim();

        if (!text) return;
        if (!this.activeModel) return alert("Please select a target model before sending messages.");

        // Add User Message
        this.chatHistory.push({ role: 'user', content: text });
        input.value = '';
        input.style.height = 'auto';
        this.renderChat();

        // Show Thinking State
        this.renderAIThinking();

        try {
            // Simulate Inference Delay
            const startTime = Date.now();
            await new Promise(r => setTimeout(r, 1500));
            const latency = Date.now() - startTime;

            // Simulated AI Response based on model task (Mock for Phase 14)
            const response = `[PROTOCOL_RESPONSE] I am the AI instance for Model ID: ${this.activeModel}. Your input "${text.substring(0, 20)}..." has been processed through my text-to-text transformation logic. \n\nIn a production deployment, my response would be grounded in your curated dataset.`;

            // Update Metadata
            document.getElementById('inference-meta').classList.remove('hidden');
            document.getElementById('meta-latency').innerText = `${latency} ms`;
            document.getElementById('meta-tokens').innerText = `${Math.round(text.length / 4 + response.length / 4)} tokens`;

            // Add AI Message
            this.chatHistory.push({ role: 'assistant', content: response });
            this.renderChat();

        } catch (e) {
            console.error("[AI PLAYGROUND] Inference Error:", e);
            this.chatHistory.push({ role: 'assistant', content: `[ERROR] Protocol timeout or inference failure: ${e.message}`, isError: true });
            this.renderChat();
        }
    },

    renderChat() {
        const container = document.getElementById('playground-chat-history');
        if (this.chatHistory.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-20">
                    <i class="fa-solid fa-comments text-6xl"></i>
                    <p class="text-xs font-black uppercase tracking-widest">Initialize conversation to begin testing</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.chatHistory.map(msg => `
            <div class="flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div class="max-w-[80%] ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none' : 'bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-tl-none'} p-5 shadow-sm space-y-2">
                    <p class="text-[8px] font-black uppercase tracking-widest ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}">${msg.role}</p>
                    <p class="text-sm font-medium leading-relaxed">${msg.content.replace(/\n/g, '<br>')}</p>
                </div>
            </div>
        `).join('');
        container.scrollTop = container.scrollHeight;
    },

    renderAIThinking() {
        const container = document.getElementById('playground-chat-history');
        const thinking = document.createElement('div');
        thinking.id = 'ai-thinking-bubble';
        thinking.className = "flex justify-start animate-in fade-in slide-in-from-bottom-2";
        thinking.innerHTML = `
            <div class="bg-white border border-slate-100 p-5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3">
                <div class="flex gap-1">
                    <div class="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></div>
                    <div class="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div class="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Architect is thinking...</span>
            </div>
        `;
        container.appendChild(thinking);
        container.scrollTop = container.scrollHeight;
    }
};

window.StudioPlayground = StudioPlayground;
