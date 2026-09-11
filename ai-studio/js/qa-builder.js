import { db, auth } from '../../js/firebase-config.js';
import {
    collection, query, where, getDocs, doc, setDoc, orderBy, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

/**
 * AI STUDIO Q&A BUILDER CONTROLLER
 */
export const StudioQA = {
    isGenerating: false,

    init() {
        console.log("[AI QA] Initialized.");
    },

    async loadWorkspaces() {
        const select = document.getElementById('qa-target-ws');
        if (!select || !auth.currentUser) return;

        try {
            const q = query(collection(db, "ai_workspaces"), where("ownerId", "==", auth.currentUser.uid));
            const snap = await getDocs(q);
            select.innerHTML = snap.docs.map(d => `<option value="${d.id}">${d.data().name}</option>`).join('');
        } catch (e) {}
    },

    async startGeneration() {
        if (this.isGenerating) return;

        const source = document.getElementById('qa-source-text').value.trim();
        const workspaceId = document.getElementById('qa-target-ws').value;
        const provider = document.getElementById('qa-provider-select').value;

        if (!source || source.length < 50) return alert("Source text too short.");
        if (!workspaceId) return alert("Select workspace.");

        this.isGenerating = true;
        document.getElementById('gen-status-pill').classList.remove('hidden');
        const streamCont = document.getElementById('qa-live-stream');
        streamCont.innerHTML = '';

        try {
            const idToken = await auth.currentUser.getIdToken();
            const chunks = source.split('\n\n').filter(c => c.trim().length > 20);

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                this.renderStatus(`Processing chunk ${i+1} of ${chunks.length}...`);

                const response = await fetch('/.netlify/functions/ai-qa-generate-item', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + idToken
                    },
                    body: JSON.stringify({ workspaceId, provider, chunk, index: i })
                });

                if (!response.ok) {
                    const err = await response.json();
                    this.renderError(err.error);
                    break;
                }

                const result = await response.json();
                this.renderItem(result.qa);
            }
        } catch (e) {
            this.renderError(e.message);
        } finally {
            this.isGenerating = false;
            document.getElementById('gen-status-pill').classList.add('hidden');
        }
    },

    renderStatus(msg) {
        const streamCont = document.getElementById('qa-live-stream');
        const statusEl = document.createElement('div');
        statusEl.className = "text-[8px] font-black text-slate-400 uppercase text-center animate-pulse py-2";
        statusEl.innerText = msg;
        streamCont.appendChild(statusEl);
        streamCont.scrollTop = streamCont.scrollHeight;
    },

    renderError(msg) {
        const streamCont = document.getElementById('qa-live-stream');
        const errEl = document.createElement('div');
        errEl.className = "p-4 bg-rose-50 rounded-2xl text-[9px] text-rose-600 font-bold uppercase";
        errEl.innerText = `[PIPELINE_FAILURE] ${msg}`;
        streamCont.appendChild(errEl);
    },

    renderItem(qa) {
        const streamCont = document.getElementById('qa-live-stream');
        const itemEl = document.createElement('div');
        itemEl.className = "p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm space-y-4 animate-in slide-in-from-bottom-2";
        itemEl.innerHTML = `
            <div class="flex justify-between items-start">
                <span class="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest">Training Pair Generated</span>
                <button onclick="window.StudioQA.openCuration('${qa.workspaceId}')" class="text-indigo-600 hover:text-indigo-800 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">Review <i class="fa-solid fa-arrow-right"></i></button>
            </div>
            <p class="text-xs font-bold text-slate-900">${qa.question}</p>
            <p class="text-xs text-slate-500 leading-relaxed font-medium">${qa.answer}</p>
        `;
        streamCont.appendChild(itemEl);
        streamCont.scrollTop = streamCont.scrollHeight;
    },

    // --- CURATION LOGIC ---
    activeWorkspaceId: null,
    pendingItems: [],
    activeIndex: -1,

    async openCuration(workspaceId) {
        this.activeWorkspaceId = workspaceId;
        document.getElementById('curation-modal').classList.remove('hidden');
        await this.loadPendingItems(workspaceId);
    },

    closeCuration() {
        document.getElementById('curation-modal').classList.add('hidden');
        this.activeIndex = -1;
    },

    async loadPendingItems(workspaceId) {
        const listCont = document.getElementById('curation-items-list');
        listCont.innerHTML = '<p class="text-center text-slate-300 py-10 animate-pulse text-[8px] font-black uppercase">Scanning Registry...</p>';

        try {
            const q = query(collection(db, "qaItems"), where("workspaceId", "==", workspaceId), where("status", "==", "GENERATED"), orderBy("createdAt", "asc"));
            const snap = await getDocs(q);
            this.pendingItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            if (this.pendingItems.length === 0) {
                listCont.innerHTML = '<p class="text-center text-slate-400 py-10 text-[8px] font-bold">ALL ITEMS CURATED</p>';
                document.getElementById('btn-finalize-dataset').classList.remove('hidden');
                return;
            }

            this.renderCurationList();
            this.updateStats();
        } catch (e) {
            listCont.innerHTML = `<p class="text-rose-500 text-[8px] font-bold uppercase p-4">Sync Error: ${e.message}</p>`;
        }
    },

    renderCurationList() {
        const listCont = document.getElementById('curation-items-list');
        listCont.innerHTML = this.pendingItems.map((item, idx) => `
            <div onclick="window.StudioQA.selectItem(${idx})" class="p-3 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-all ${this.activeIndex === idx ? 'bg-indigo-50 border-indigo-200' : ''}">
                <p class="text-[9px] font-bold text-slate-900 line-clamp-1">${item.question}</p>
            </div>
        `).join('');
    },

    selectItem(index) {
        this.activeIndex = index;
        this.renderCurationList();

        const item = this.pendingItems[index];
        document.getElementById('curation-editor-empty').classList.add('hidden');
        document.getElementById('curation-editor-content').classList.remove('hidden');

        document.getElementById('edit-qa-question').value = item.question;
        document.getElementById('edit-qa-answer').value = item.answer;
        document.getElementById('curation-source-preview').innerText = item.sourceChunk;

        document.getElementById('item-status-badge').innerText = item.status;

        document.getElementById('btn-reject-item').classList.remove('opacity-50', 'pointer-events-none');
        document.getElementById('btn-accept-item').classList.remove('opacity-50', 'pointer-events-none');
    },

    async acceptActiveItem() {
        if (this.activeIndex === -1) return;
        const item = this.pendingItems[this.activeIndex];
        const newQuestion = document.getElementById('edit-qa-question').value.trim();
        const newAnswer = document.getElementById('edit-qa-answer').value.trim();

        try {
            await updateDoc(doc(db, "qaItems", item.id), {
                question: newQuestion,
                answer: newAnswer,
                status: 'ACCEPTED',
                curatedAt: serverTimestamp()
            });

            this.pendingItems.splice(this.activeIndex, 1);
            if (this.pendingItems.length > 0) {
                this.selectItem(Math.min(this.activeIndex, this.pendingItems.length - 1));
            } else {
                this.activeIndex = -1;
                document.getElementById('curation-editor-content').classList.add('hidden');
                document.getElementById('curation-editor-empty').classList.remove('hidden');
            }
            this.renderCurationList();
            this.updateStats();
        } catch (e) { alert(e.message); }
    },

    async rejectActiveItem() {
        if (this.activeIndex === -1) return;
        const item = this.pendingItems[this.activeIndex];
        if (!confirm("Permanently reject this training pair?")) return;

        try {
            await deleteDoc(doc(db, "qaItems", item.id));
            this.pendingItems.splice(this.activeIndex, 1);
            if (this.pendingItems.length > 0) {
                this.selectItem(Math.min(this.activeIndex, this.pendingItems.length - 1));
            }
            this.renderCurationList();
            this.updateStats();
        } catch (e) { alert(e.message); }
    },

    updateStats() {
        document.getElementById('curation-stats-label').innerText = `${this.pendingItems.length} items awaiting review`;
        if (this.pendingItems.length === 0) document.getElementById('btn-finalize-dataset').classList.remove('hidden');
    }
};

window.StudioQA = StudioQA;
StudioQA.init();
