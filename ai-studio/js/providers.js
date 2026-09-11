import { db, auth } from '../../js/firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

/**
 * AI STUDIO PROVIDER CONTROLLER
 */
export const StudioProviders = {
    init() { console.log("[AI PROVIDERS] Initialized."); },

    async loadConnections() {
        const grid = document.getElementById('providers-grid');
        if (!grid || !auth.currentUser) return;

        try {
            const snap = await getDocs(query(collection(db, "providerConnections"), where("ownerId", "==", auth.currentUser.uid)));
            const active = snap.docs.map(d => d.data());
            this.render(grid, active);
        } catch (e) {}
    },

    render(container, active) {
        const providers = [
            { id: 'openai', name: 'OpenAI', icon: 'fa-robot', color: 'slate' },
            { id: 'groq', name: 'Groq', icon: 'fa-bolt', color: 'orange' }
        ];

        container.innerHTML = providers.map(p => {
            const conn = active.find(c => c.provider === p.id);
            return `
                <div class="glass-card-white p-8 space-y-6">
                    <div class="flex justify-between items-start">
                        <div class="w-14 h-14 bg-${p.color}-50 text-${p.color}-600 rounded-2xl flex items-center justify-center text-2xl"><i class="fa-solid ${p.icon}"></i></div>
                        <span class="px-3 py-1 rounded-full text-[8px] font-black uppercase ${conn ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-400'}">${conn ? 'Connected' : 'Not Linked'}</span>
                    </div>
                    <h4 class="text-xl font-black text-slate-900 uppercase">${p.name}</h4>
                    <button onclick="window.StudioProviders.openConnectModal('${p.id}')" class="w-full py-3 ${conn ? 'bg-slate-50 text-slate-900' : 'bg-black text-white'} rounded-xl text-[9px] font-black uppercase tracking-widest">${conn ? 'Update Key' : 'Link Provider'}</button>
                </div>
            `;
        }).join('');
    },

    openConnectModal(provider) {
        const key = prompt(`Enter your ${provider} API Key:`);
        if (!key) return;
        this.save(provider, key);
    },

    async save(provider, apiKey) {
        try {
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch('/.netlify/functions/ai-provider-connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
                body: JSON.stringify({ provider, apiKey })
            });
            const data = await res.json();
            if (data.success) { alert("Connected!"); this.loadConnections(); } else alert(data.error);
        } catch (e) { alert(e.message); }
    }
};

window.StudioProviders = StudioProviders;
StudioProviders.init();
