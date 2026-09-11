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
            select.innerHTML = '<option value="">Select Target Workspace</option>';
            const q = query(collection(db, "ai_workspaces"), where("ownerId", "==", auth.currentUser.uid), orderBy("updatedAt", "desc"));
            const snap = await getDocs(q);

            if (snap.empty) {
                select.innerHTML = '<option value="">No active workspaces found</option>';
                return;
            }

            snap.forEach(d => {
                select.innerHTML += `<option value="${d.id}">${d.data().name}</option>`;
            });
        } catch (e) {
            console.error("[AI QA] Workspace registry load error:", e);
        }
    },

    async startGeneration() {
        if (this.isGenerating) return;

        const source = document.getElementById('qa-source-text').value.trim();
        const workspaceId = document.getElementById('qa-target-ws').value;
        const provider = document.getElementById('qa-provider-select').value;

        if (!source || source.length < 50) return alert("Source text too short (min 50 chars).");
        if (source.length > 50000) return alert("Source text exceeds 50,000 characters limit.");
        if (!workspaceId) return alert("Please select a target workspace.");

        console.log("[AI QA] Starting pipeline for workspace:", workspaceId);

        this.isGenerating = true;
        const statusPill = document.getElementById('gen-status-pill');
        if (statusPill) statusPill.classList.remove('hidden');

        const streamCont = document.getElementById('qa-live-stream');
        if (streamCont) streamCont.innerHTML = '';

        try {
            const idToken = await auth.currentUser.getIdToken();
            const chunks = source.split('\n\n').filter(c => c.trim().length > 20);

            console.log(`[AI QA] Ingested ${chunks.length} chunks.`);

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                this.renderStatus(`Generating intelligence from chunk ${i+1} of ${chunks.length}...`);

                const response = await fetch('/.netlify/functions/ai-qa-generate-item', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + idToken
                    },
                    body: JSON.stringify({ workspaceId, provider, chunk, index: i })
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({ error: "Network Error" }));
                    this.renderError(err.error || "Generation Failed");
                    break;
                }

                const result = await response.json();
                if (result.success) {
                    this.renderItem(result.qa);
                } else {
                    this.renderStatus(`Chunk ${i+1} skipped: ${result.error}`);
                }
            }
        } catch (e) {
            console.error("[AI QA] Pipeline Crash:", e);
            this.renderError(e.message);
        } finally {
            this.isGenerating = false;
            if (statusPill) statusPill.classList.add('hidden');
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
        itemEl.className = "p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm space-y-6 animate-in slide-in-from-bottom-4 duration-500 hover:border-indigo-500 transition-all";
        itemEl.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span class="text-indigo-600 text-[9px] font-black uppercase tracking-widest">Protocol Intelligence Node Generated</span>
                </div>
                <button onclick="window.StudioQA.openCuration('${qa.workspaceId}')" class="bg-black text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all">Curate Item</button>
            </div>
            <div class="space-y-4">
                <div class="space-y-1">
                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Autonomous Question</p>
                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold text-slate-900">${qa.question}</div>
                </div>
                <div class="space-y-1">
                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Grounded AI Answer</p>
                    <div class="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-medium text-slate-600 leading-relaxed">${qa.answer.replace(/\n/g, '<br>')}</div>
                </div>
            </div>
            <div class="pt-4 border-t border-slate-50 flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-widest">
                <span>Model: ${qa.model}</span>
                <span>Workspace: ${qa.workspaceId}</span>
            </div>
        `;
        streamCont.insertBefore(itemEl, streamCont.firstChild);
        streamCont.scrollTop = 0;
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
