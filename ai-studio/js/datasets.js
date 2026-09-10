import { db, auth } from '../../js/firebase-config.js';
import {
    collection, query, where, getDocs, setDoc, doc,
    serverTimestamp, orderBy
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

/**
 * AI STUDIO DATASET CONTROLLER
 */
export const StudioDatasets = {
    finalizedDatasets: [],

    init() {
        console.log("[AI DATASETS] Initialized.");
    },

    async loadRegistry() {
        const pendingList = document.getElementById('pending-curation-list');
        const finalizedList = document.getElementById('finalized-datasets-list');

        if (!auth.currentUser) return;

        try {
            // 1. Fetch Pending Workspaces (those with GENERATED items)
            const qQA = query(collection(db, "qaItems"), where("ownerId", "==", auth.currentUser.uid), where("status", "==", "GENERATED"));
            const qaSnap = await getDocs(qQA);

            const pendingWorkspaceIds = new Set();
            qaSnap.forEach(d => pendingWorkspaceIds.add(d.data().workspaceId));

            if (pendingWorkspaceIds.size === 0) {
                pendingList.innerHTML = '<p class="col-span-full text-center text-slate-300 py-10 text-[8px] font-black uppercase">No projects awaiting curation</p>';
            } else {
                this.renderPendingCuration(pendingList, Array.from(pendingWorkspaceIds));
            }

            // 2. Fetch Finalized Datasets
            const qDS = query(collection(db, "ai_datasets"), where("ownerId", "==", auth.currentUser.uid), orderBy("createdAt", "desc"));
            const dsSnap = await getDocs(qDS);

            if (dsSnap.empty) {
                finalizedList.innerHTML = '<p class="col-span-full text-center text-slate-300 py-10 text-[8px] font-black uppercase">No finalized datasets in registry</p>';
            } else {
                this.renderFinalizedDatasets(finalizedList, dsSnap.docs.map(d => d.data()));
            }

        } catch (e) {
            console.error("[AI DATASETS] Registry load error:", e.message);
        }
    },

    async renderPendingCuration(container, wsIds) {
        container.innerHTML = '';
        for (const wsId of wsIds) {
            const wsSnap = await getDocs(query(collection(db, "ai_workspaces"), where("workspaceId", "==", wsId)));
            if (wsSnap.empty) continue;
            const ws = wsSnap.docs[0].data();

            const card = document.createElement('div');
            card.className = "glass-card-white p-6 flex justify-between items-center group cursor-pointer hover:border-amber-500 transition-all";
            card.onclick = () => window.StudioQA.openCuration(wsId);
            card.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                    </div>
                    <div>
                        <h5 class="text-sm font-black text-slate-900 uppercase tracking-tight">${ws.name}</h5>
                        <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Awaiting Curation Phase</p>
                    </div>
                </div>
                <button class="bg-black text-white px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Review Data</button>
            `;
            container.appendChild(card);
        }
    },

    renderFinalizedDatasets(container, list) {
        container.innerHTML = list.map(ds => `
            <div class="glass-card-white p-6 space-y-4 border border-slate-100">
                <div class="flex justify-between items-start">
                    <div class="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <i class="fa-solid fa-database"></i>
                    </div>
                    <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[7px] font-black uppercase tracking-widest border border-emerald-100">${ds.version}</span>
                </div>
                <div>
                    <h5 class="text-sm font-black text-slate-900 uppercase tracking-tight">${ds.name}</h5>
                    <p class="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">${ds.itemCount} Verified Samples</p>
                </div>
                <div class="pt-3 border-t border-slate-50 flex justify-between items-center text-[7px] font-black text-slate-300 uppercase tracking-widest">
                    <span>Ready for Training</span>
                    <i class="fa-solid fa-circle-check text-emerald-500"></i>
                </div>
            </div>
        `).join('');
    },

    async startFinalization() {
        const workspaceId = window.StudioQA.activeWorkspaceId;
        if (!workspaceId) return;

        const name = prompt("Enter a name for this dataset version (e.g., Knowledge Base v1.0):");
        if (!name) return;

        const loader = document.getElementById('global-loader');
        loader.classList.remove('hidden');

        try {
            // 1. Fetch all ACCEPTED items for this workspace
            const q = query(collection(db, "qaItems"), where("workspaceId", "==", workspaceId), where("status", "==", "ACCEPTED"));
            const snap = await getDocs(q);

            if (snap.empty) {
                throw new Error("No accepted items found to finalize.");
            }

            const dsId = 'DS-' + Math.random().toString(36).substr(2, 9).toUpperCase();
            const dsRef = doc(db, "ai_datasets", dsId);

            const datasetData = {
                datasetId: dsId,
                workspaceId: workspaceId,
                ownerId: auth.currentUser.uid,
                name: name,
                version: 'v1.0',
                itemCount: snap.size,
                status: 'DATASET_READY',
                createdAt: new Date().toISOString()
            };

            await setDoc(dsRef, datasetData);

            // 2. Mark items as FINALIZED
            for (const d of snap.docs) {
                await setDoc(doc(db, "qaItems", d.id), { status: 'FINALIZED', datasetId: dsId }, { merge: true });
            }

            alert("Success! Dataset finalized and versioned in the registry.");
            window.StudioQA.closeCuration();
            window.switchView('datasets');
        } catch (e) {
            alert("Finalization Error: " + e.message);
        } finally {
            loader.classList.add('hidden');
        }
    }
};

window.StudioDatasets = StudioDatasets;
