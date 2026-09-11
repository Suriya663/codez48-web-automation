import { db, auth } from '../../js/firebase-config.js';
import {
    collection, query, where, getDocs, orderBy, doc, getDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

/**
 * AI STUDIO PLAYGROUND CONTROLLER
 */
export const StudioPlayground = {
    activeModelId: null,
    activeDatasetId: null,
    chatHistory: [],

    init() {
        console.log("[AI PLAYGROUND] Initialized.");
        this.setupAutoResize();
    },

    async load() {
        const select = document.getElementById('playground-model-select');
        if (!select || !auth.currentUser) return;

        try {
            // Fetch finalized models/datasets
            const q = query(collection(db, "ai_datasets"), where("ownerId", "==", auth.currentUser.uid));
            const snap = await getDocs(q);

            select.innerHTML = '<option value="">Select Target Intelligence</option>';
            snap.forEach(d => {
                const ds = d.data();
                select.innerHTML += `<option value="${ds.datasetId}">${ds.name} (v1.0)</option>`;
            });

            select.onchange = (e) => this.selectModel(e.target.value);
        } catch (e) {
            console.error("[AI PLAYGROUND] Load error:", e.message);
        }
    },

    async selectModel(datasetId) {
        if (!datasetId) {
            this.activeDatasetId = null;
            return;
        }
        this.activeDatasetId = datasetId;
        console.log("[AI PLAYGROUND] Data context linked:", datasetId);

        // Reset chat
        this.chatHistory = [];
        this.renderChat();

        const contextStatus = document.getElementById('playground-context-status');
        contextStatus.innerHTML = `
            <div class="flex items-center justify-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p class="text-[8px] text-slate-900 font-black uppercase">Knowledge Node Linked</p>
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
        if (!this.activeDatasetId) return alert("Please select a target intelligence (dataset) before sending messages.");

        // 1. Add User Message
        this.chatHistory.push({ role: 'user', content: text });
        input.value = '';
        input.style.height = 'auto';
        this.renderChat();

        // 2. Show Thinking State
        this.renderAIThinking();

        try {
            const startTime = Date.now();

            // --- RAG SIMULATION LOGIC ---
            // In Phase 16, this will call the Python ML Service for real retrieval.
            // For now, we simulate finding relevant info in the dataset.

            await new Promise(r => setTimeout(r, 1500)); // Simulate retrieval & inference
            const latency = Date.now() - startTime;

            // Mock Response based on system logic
            const response = `[PROTOCOL_RESPONSE] I am the Codez48 AI instance for your dataset. \n\nI have retrieved contextual parameters from node ${this.activeDatasetId}. Based on your input: "${text.substring(0, 30)}...", I am processing the grounded response. \n\nNote: In Phase 15, this will be connected to your OpenAI/Groq provider with real document retrieval.`;

            // Update Metadata
            const meta = document.getElementById('inference-meta');
            meta.classList.remove('hidden');
            document.getElementById('meta-latency').innerText = `${latency} ms`;
            document.getElementById('meta-tokens').innerText = `${Math.round(text.length/4 + response.length/4)} tokens`;

            // 3. Add AI Message
            this.chatHistory.push({ role: 'assistant', content: response });
            this.renderChat();

        } catch (e) {
            console.error("[AI PLAYGROUND] Pipeline error:", e);
            this.chatHistory.push({ role: 'assistant', content: `[PIPELINE_ERROR] Handshake failed: ${e.message}`, isError: true });
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
                <div class="${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'} max-w-[80%] space-y-1">
                    <p class="text-[7px] font-black uppercase tracking-widest ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}">${msg.role}</p>
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
        thinking.className = "flex justify-start animate-in fade-in";
        thinking.innerHTML = `
            <div class="chat-bubble-ai flex items-center gap-3">
                <div class="flex gap-1">
                    <div class="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></div>
                    <div class="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div class="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Retriving Context...</span>
            </div>
        `;
        container.appendChild(thinking);
        container.scrollTop = container.scrollHeight;
    }
};

window.StudioPlayground = StudioPlayground;
