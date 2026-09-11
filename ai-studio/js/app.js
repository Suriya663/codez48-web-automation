import { auth, db } from '../../js/firebase-config.js';
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
    collection, query, where, getDocs, orderBy
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

/**
 * AI STUDIO CORE APPLICATION CONTROLLER
 */
export const StudioApp = {
    currentUser: null,

    async init() {
        console.log("[AI STUDIO] Initializing core modules...");

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.currentUser = user;
                this.handleUserAuthenticated(user);
            } else {
                console.log("[AI STUDIO] No session. Handshaking...");
                try {
                    await signInAnonymously(auth);
                } catch (e) {
                    this.showAuthError("Handshake failed. Check connection.");
                }
            }
        });

        window.toggleSidebar = () => {
            const sidebar = document.getElementById('studio-sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if(sidebar) sidebar.classList.toggle('-translate-x-full');
            if(overlay) overlay.classList.toggle('hidden');
        };

        window.switchView = (viewId) => this.switchView(viewId);
    },

    async handleUserAuthenticated(user) {
        console.log("[AI STUDIO] Session active:", user.uid);
        const nameEl = document.getElementById('user-display-name');
        if (nameEl) nameEl.innerText = user.email || "Anonymous Architect";

        this.refreshDashboardStats();
        if (window.StudioWorkspace) window.StudioWorkspace.load();
    },

    switchView(viewId) {
        console.log(`[AI STUDIO] Navigating to: ${viewId}`);

        // 1. Sidebar UI Update
        document.querySelectorAll('.sidebar-item').forEach(btn => {
            btn.classList.toggle('active', btn.id === `nav-${viewId}`);
        });

        // 2. View Visibility Update
        const views = document.querySelectorAll('.studio-view');
        let viewFound = false;
        views.forEach(view => {
            if (view.id === `view-${viewId}`) {
                view.classList.add('active');
                view.classList.remove('hidden');
                viewFound = true;
            } else {
                view.classList.remove('active');
                view.classList.add('hidden');
            }
        });

        if (!viewFound) console.warn(`[AI STUDIO] View target not found: view-${viewId}`);

        // 3. Title Update
        const titles = {
            'home': 'Studio Dashboard',
            'workspaces': 'My Workspaces',
            'text-to-text': 'Text → Text Protocol',
            'datasets': 'Knowledge Registry',
            'qa-builder': 'Autonomous Q&A Builder',
            'providers': 'AI Connections',
            'training': 'Training Pipeline',
            'playground': 'AI Playground',
            'models': 'Production Models',
            'api-keys': 'Developer API Keys'
        };

        const titleEl = document.getElementById('view-title');
        if (titleEl) titleEl.innerText = titles[viewId] || 'AI Studio Module';

        // 4. Controller Bootstrapping
        this.initView(viewId);

        // 5. Mobile Close
        if (window.innerWidth < 768) {
            const sidebar = document.getElementById('studio-sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar) sidebar.classList.add('-translate-x-full');
            if (overlay) overlay.classList.add('hidden');
        }
    },

    initView(viewId) {
        try {
            if (viewId === 'home') {
                this.refreshDashboardStats();
                if (window.StudioWorkspace) window.StudioWorkspace.load();
            }
            if (viewId === 'workspaces' && window.StudioWorkspace) window.StudioWorkspace.load();
            if (viewId === 'qa-builder' && window.StudioQA) window.StudioQA.loadWorkspaces();
            if (viewId === 'datasets' && window.StudioDatasets) window.StudioDatasets.loadRegistry();
            if (viewId === 'playground' && window.StudioPlayground) window.StudioPlayground.load();
            if (viewId === 'models') this.loadProductionModels();
            if (viewId === 'providers' && window.StudioProviders) window.StudioProviders.loadConnections();
            if (viewId === 'text-to-text' && window.StudioTextToText) window.StudioTextToText.startWizard();
        } catch (e) {
            console.error(`[AI STUDIO] View Init Error (${viewId}):`, e);
        }
    },

    async refreshDashboardStats() {
        if (!this.currentUser) return;
        try {
            const userId = this.currentUser.uid;

            // Models Count (Finalized Datasets as models for now)
            const dSnap = await getDocs(query(collection(db, "ai_datasets"), where("ownerId", "==", userId)));

            const modelsEl = document.getElementById('stat-active-models');
            const modelsBadge = document.getElementById('stat-active-models-badge');
            const datasetsEl = document.getElementById('stat-datasets');

            if (modelsEl) modelsEl.innerText = dSnap.size;
            if (modelsBadge) modelsBadge.innerText = `${dSnap.size} Ready`;
            if (datasetsEl) datasetsEl.innerText = dSnap.size;

        } catch (e) {
            console.warn("[AI STUDIO] Stats sync notice:", e.message);
        }
    },

    async loadProductionModels() {
        const grid = document.getElementById('production-models-grid');
        if (!grid || !this.currentUser) return;

        try {
            grid.innerHTML = '<div class="col-span-full py-10 text-center animate-pulse text-slate-300 text-[8px] font-black uppercase">Scanning Production Tiers...</div>';
            const q = query(collection(db, "ai_datasets"), where("ownerId", "==", this.currentUser.uid), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);

            if (snap.empty) {
                grid.innerHTML = '<div class="col-span-full py-20 text-center text-slate-300 font-black uppercase text-[10px]">No finalized models</div>';
                return;
            }

            grid.innerHTML = snap.docs.map(d => {
                const m = d.data();
                return `
                    <div class="glass-card-white p-8 space-y-4">
                        <div class="flex justify-between items-start">
                            <div class="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm"><i class="fa-solid fa-brain"></i></div>
                            <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase border border-emerald-100">Ready</span>
                        </div>
                        <h4 class="text-sm font-black text-slate-900 uppercase tracking-tight">${m.name}</h4>
                        <p class="text-[9px] text-slate-400 font-bold uppercase">RAG Assistant • v${m.version || '1.0'}</p>
                        <div class="pt-4 border-t border-slate-50 flex gap-2">
                            <button onclick="switchView('playground')" class="flex-1 py-2.5 bg-black text-white rounded-xl text-[8px] font-black uppercase shadow-lg active:scale-95 transition-all">Launch Test</button>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (e) {
            console.error("[AI STUDIO] Model Registry Error:", e);
            grid.innerHTML = `<p class="col-span-full text-center text-rose-500 py-10 font-bold uppercase text-[9px]">Sync Error</p>`;
        }
    },

    showAuthError(msg) {
        alert(msg);
    },

    logout() {
        if(confirm("Terminate Architect Session?")) {
            auth.signOut().then(() => location.href = '../index.html');
        }
    }
};

window.StudioApp = StudioApp;
window.StudioAuth = { logout: () => StudioApp.logout() };
window.switchView = (id) => StudioApp.switchView(id);

// Initial Load Handler
window.addEventListener('load', () => {
    StudioApp.init();
});
