import { db, auth } from '../../js/firebase-config.js';
import {
    collection, query, where, getDocs, setDoc, doc, orderBy
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

/**
 * AI STUDIO WORKSPACE CONTROLLER
 */
export const StudioWorkspace = {
    workspaces: [],

    init() {
        console.log("[AI WORKSPACE] Initialized.");
    },

    startWizard() {
        document.getElementById('wiz-ws-name').value = '';
        document.getElementById('wiz-ws-desc').value = '';
        document.getElementById('workspace-wizard-modal').classList.remove('hidden');
    },

    closeWizard() {
        document.getElementById('workspace-wizard-modal').classList.add('hidden');
    },

    async createWorkspace() {
        const name = document.getElementById('wiz-ws-name').value.trim();
        const desc = document.getElementById('wiz-ws-desc').value.trim();

        if (!name) return alert("Workspace name required.");

        const loader = document.getElementById('global-loader');
        if (loader) loader.classList.remove('hidden');

        try {
            if (!auth.currentUser) {
                console.log("[AI WORKSPACE] No user session. Handshaking...");
                await signInAnonymously(auth);
            }

            const idToken = await auth.currentUser.getIdToken();
            console.log("[AI WORKSPACE] Token secured. Dispatching creation protocol...");

            const response = await fetch('/.netlify/functions/ai-workspace-create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + idToken
                },
                body: JSON.stringify({ name, description: desc })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Server Error: ${response.status} - ${errText}`);
            }

            const result = await response.json();
            if (result.success) {
                console.log("[AI WORKSPACE] Success:", result.workspaceId);
                this.closeWizard();

                // Aggressive reload
                await this.load();

                // Show success feedback
                alert("Workspace Initialized Successfully!");

                if (window.switchView) window.switchView('workspaces');
            } else {
                alert("Creation Error: " + (result.error || "Unknown response"));
            }
        } catch (e) {
            console.error("[AI WORKSPACE] Creation failure:", e);
            alert("Protocol Failure: " + e.message);
        } finally {
            if (loader) loader.classList.add('hidden');
        }
    },

    async load() {
        const grid = document.getElementById('workspaces-grid');
        const homeList = document.getElementById('recent-workspaces-list');
        if (!grid || !auth.currentUser) return;

        try {
            const q = query(collection(db, "ai_workspaces"), where("ownerId", "==", auth.currentUser.uid), orderBy("updatedAt", "desc"));
            const snap = await getDocs(q);
            this.workspaces = snap.docs.map(d => d.data());

            this.render(grid, this.workspaces);
            if (homeList) this.render(homeList, this.workspaces.slice(0, 4), true);
        } catch (e) {
            grid.innerHTML = `<p class="col-span-full text-center text-rose-500 py-10 font-bold uppercase text-[9px]">Registry Error</p>`;
        }
    },

    render(container, list, isMini = false) {
        if (list.length === 0) {
            if (!isMini) container.innerHTML = '<div class="col-span-full py-20 text-center text-slate-400 font-medium">No workspaces found.</div>';
            return;
        }

        container.innerHTML = list.map(ws => `
            <div class="glass-card-white p-8 group cursor-pointer hover:border-indigo-600 transition-all" onclick="window.StudioWorkspace.openWorkspace('${ws.workspaceId}')">
                <div class="flex justify-between items-start mb-4">
                    <div class="w-12 h-12 bg-slate-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <i class="fa-solid fa-folder"></i>
                    </div>
                    <span class="px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 text-[8px] font-black uppercase">${ws.status}</span>
                </div>
                <h4 class="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase">${ws.name}</h4>
                <p class="text-[10px] text-slate-400 font-medium mt-1 line-clamp-2">${ws.description || 'No description'}</p>
            </div>
        `).join('');
    },

    openWorkspace(wsId) {
        if (window.switchView) window.switchView('text-to-text');
    }
};

window.StudioWorkspace = StudioWorkspace;
StudioWorkspace.init();
