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
        window.StudioWorkspace = StudioWorkspace;
        console.log("[AI WORKSPACE] Module Initialized.");
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
        console.log("[AI WORKSPACE] Initialization Start.");
        const name = document.getElementById('wiz-ws-name').value.trim();
        const desc = document.getElementById('wiz-ws-desc').value.trim();

        if (!name) return alert("Please provide a name for your workspace.");

        const loader = document.getElementById('global-loader');
        if (loader) loader.classList.remove('hidden');

        try {
            console.log("[AI WORKSPACE] Validating session...");
            if (!auth.currentUser) {
                console.warn("[AI WORKSPACE] No user session found. Requesting ID Token might fail.");
            }

            const idToken = await auth.currentUser.getIdToken();
            console.log("[AI WORKSPACE] Dispatching secure creation request to Netlify...");

            const response = await fetch('/.netlify/functions/ai-workspace-create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + idToken
                },
                body: JSON.stringify({ name, description: desc })
            });

            console.log("[AI WORKSPACE] Netlify Response Status:", response.status);

            if (!response.ok) {
                let msg = "Server Error";
                try {
                    const errData = await response.json();
                    msg = errData.error || msg;
                } catch (e) {
                    msg = `Protocol Error (${response.status})`;
                }
                throw new Error(msg);
            }

            const result = await response.json();

            if (result.success) {
                console.log("[AI WORKSPACE] Registry updated successfully:", result.workspaceId);
                this.closeWizard();

                // Aggressive reload
                await this.load();

                // Show success feedback
                alert("SUCCESS: Workspace initialized and synchronized.");

                if (window.switchView) window.switchView('workspaces');
            } else {
                console.error("[AI WORKSPACE] Registry Rejection:", result.error);
                alert("Creation Failed: " + (result.error || "Unknown server response."));
            }
        } catch (e) {
            console.error("[AI WORKSPACE] Fatal Execution Error:", e);
            alert("System Error: " + e.message);
        } finally {
            if (loader) loader.classList.add('hidden');
        }
    },

    async load() {
        const grid = document.getElementById('workspaces-grid');
        const homeList = document.getElementById('recent-workspaces-list');

        console.log("[AI WORKSPACE] Refreshing project registry...");

        if (!grid || !auth.currentUser) {
            console.warn("[AI WORKSPACE] Load skipped: UI or Auth not ready.");
            return;
        }

        try {
            const q = query(
                collection(db, "ai_workspaces"),
                where("ownerId", "==", auth.currentUser.uid),
                orderBy("updatedAt", "desc")
            );

            const snap = await getDocs(q);
            this.workspaces = snap.docs.map(d => d.data());

            console.log(`[AI WORKSPACE] Retrieved ${this.workspaces.length} projects.`);

            this.render(grid, this.workspaces);
            if (homeList) this.render(homeList, this.workspaces.slice(0, 4), true);
        } catch (e) {
            console.error("[AI WORKSPACE] Registry Sync Error:", e.message);
            if (e.message.includes('requires an index')) {
                if (window.StudioApp) window.StudioApp.renderIndexError(grid, e.message);
            } else {
                grid.innerHTML = `<p class="col-span-full text-center text-rose-500 py-10 font-bold uppercase text-[9px]">Protocol Sync Failure: ${e.message}</p>`;
            }
        }
    },

    render(container, list, isMini = false) {
        if (list.length === 0) {
            if (!isMini) container.innerHTML = '<div class="col-span-full py-20 text-center text-slate-400 font-medium">No projects found. Use the "+" button to begin.</div>';
            return;
        }

        container.innerHTML = list.map(ws => `
            <div class="glass-card-white p-8 group cursor-pointer hover:border-indigo-600 transition-all relative overflow-hidden" onclick="window.StudioWorkspace.openWorkspace('${ws.workspaceId}')">
                <div class="flex justify-between items-start mb-4">
                    <div class="w-12 h-12 bg-slate-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">
                        <i class="fa-solid fa-folder"></i>
                    </div>
                    <span class="px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 text-[8px] font-black uppercase tracking-widest border border-slate-100">${ws.status}</span>
                </div>
                <h4 class="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">${ws.name}</h4>
                <p class="text-[10px] text-slate-400 font-medium mt-1 line-clamp-2">${ws.description || 'No description provided.'}</p>
                <div class="pt-4 mt-4 border-t border-slate-50 flex justify-between items-center text-[7px] font-black text-slate-300 uppercase tracking-widest">
                    <span>ID: ${ws.workspaceId}</span>
                    <i class="fa-solid fa-arrow-right-long text-indigo-600 opacity-0 group-hover:opacity-100 transition-all"></i>
                </div>
            </div>
        `).join('');
    },

    openWorkspace(wsId) {
        console.log("[AI WORKSPACE] Accessing Context:", wsId);
        // Persist selection
        this.activeWorkspaceId = wsId;
        if (window.switchView) window.switchView('text-to-text');
    }
};

window.StudioWorkspace = StudioWorkspace;
StudioWorkspace.init();
