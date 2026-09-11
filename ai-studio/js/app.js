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
            sidebar.classList.toggle('-translate-x-full');
            overlay.classList.toggle('hidden');
        };

        window.switchView = (viewId) => this.switchView(viewId);
    },

    async handleUserAuthenticated(user) {
        const nameEl = document.getElementById('user-display-name');
        if (nameEl) nameEl.innerText = user.email || "Anonymous Architect";

        this.refreshDashboardStats();
        if (window.StudioWorkspace) window.StudioWorkspace.load();
    },

    switchView(viewId) {
        document.querySelectorAll('.sidebar-item').forEach(btn => {
            btn.classList.toggle('active', btn.id === `nav-${viewId}`);
        });

        document.querySelectorAll('.studio-view').forEach(view => {
            view.classList.toggle('active', view.id === `view-${viewId}`);
        });

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
        if (titleEl) titleEl.innerText = titles[viewId] || 'AI Studio';

        // Lazy-load view controllers
        if (viewId === 'qa-builder' && window.StudioQA) window.StudioQA.loadWorkspaces();
        if (viewId === 'datasets' && window.StudioDatasets) window.StudioDatasets.loadRegistry();
        if (viewId === 'playground' && window.StudioPlayground) window.StudioPlayground.load();
        if (viewId === 'models') this.loadProductionModels();
        if (viewId === 'providers' && window.StudioProviders) window.StudioProviders.loadConnections();
        if (viewId === 'text-to-text' && window.StudioTextToText) window.StudioTextToText.startWizard();

        if (window.innerWidth < 768) {
            const sidebar = document.getElementById('studio-sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        }
    },

    async refreshDashboardStats() {
        if (!this.currentUser) return;
        try {
            const userId = this.currentUser.uid;
            const mSnap = await getDocs(query(collection(db, "ai_datasets"), where("ownerId", "==", userId)));
            document.getElementById('stat-active-models').innerText = mSnap.size;
            document.getElementById('stat-datasets').innerText = mSnap.size;
        } catch (e) {}
    },

    async loadProductionModels() {
        const grid = document.getElementById('production-models-grid');
        if (!grid || !this.currentUser) return;

        try {
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
                            <div class="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><i class="fa-solid fa-brain"></i></div>
                            <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase border border-emerald-100">Ready</span>
                        </div>
                        <h4 class="text-sm font-black text-slate-900 uppercase">${m.name}</h4>
                        <p class="text-[9px] text-slate-400 font-bold uppercase">RAG Assistant • v${m.version}</p>
                        <div class="pt-4 border-t border-slate-50 flex gap-2">
                            <button onclick="switchView('playground')" class="flex-1 py-2 bg-black text-white rounded-lg text-[8px] font-black uppercase shadow-lg">Test</button>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (e) {}
    },

    showAuthError(msg) {
        alert(msg);
    },

    logout() {
        auth.signOut().then(() => location.href = '../index.html');
    }
};

window.StudioApp = StudioApp;
window.StudioAuth = { logout: () => StudioApp.logout() };
window.switchView = (id) => StudioApp.switchView(id);

StudioApp.init();
