import { db, auth } from './firebase-config.js';
import {
    collection, query, where, onSnapshot, getDocs, doc, setDoc, updateDoc,
    deleteDoc, serverTimestamp, orderBy, limit
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

/**
 * AUTOMATION ENGINE CONTROLLER
 * Manages background business rules, logs, and manual triggers.
 */
export const AutomationTool = {
    unsubscribers: [],

    init() {
        console.log("[AUTOMATION] Tool Initializing...");
        window.AutomationTool = AutomationTool;

        const btnCreate = document.getElementById('btn-create-automation');
        if (btnCreate) btnCreate.onclick = () => AutomationTool.openCreateModal();

        auth.onAuthStateChanged(user => {
            if (user) {
                AutomationTool.syncDashboard();
                AutomationTool.syncGlobalLogs();
            }
        });
    },

    syncDashboard() {
        const uid = auth.currentUser?.uid || localStorage.getItem('tori_seller_id');
        if (!uid) return;

        const q = query(collection(db, "service_automations"), where("ownerId", "==", uid));
        const unsub = onSnapshot(q, (snap) => {
            const container = document.getElementById('active-rules-list');
            if (!container) return;

            if (snap.empty) {
                container.innerHTML = `
                    <div class="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                        <i class="fa-solid fa-microchip text-5xl text-slate-100 mb-6"></i>
                        <p class="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No active business rules</p>
                    </div>`;
                return;
            }

            container.innerHTML = '';
            snap.forEach(docSnap => {
                const data = docSnap.data();
                const id = docSnap.id;
                container.appendChild(AutomationTool.createRuleCard(id, data));
            });
        });

        AutomationTool.unsubscribers.push(unsub);
    },

    syncGlobalLogs() {
        const uid = auth.currentUser?.uid || localStorage.getItem('tori_seller_id');
        if (!uid) return;

        const q = query(
            collection(db, "service_automation_logs"),
            where("ownerId", "==", uid),
            orderBy("timestamp", "desc"),
            limit(20)
        );

        const unsub = onSnapshot(q, (snap) => {
            const container = document.getElementById('automation-global-logs');
            if (!container) return;

            if (snap.empty) {
                container.innerHTML = '<p class="text-[10px] text-slate-300 font-bold uppercase text-center py-10">Awaiting signals...</p>';
                return;
            }

            container.innerHTML = snap.docs.map(d => {
                const log = d.data();
                const time = log.timestamp ? new Date(log.timestamp.toDate ? log.timestamp.toDate() : log.timestamp).toLocaleTimeString() : 'Now';
                const statusColor = log.status === 'SUCCESS' ? 'text-emerald-500' : (log.status === 'WARNING' ? 'text-amber-500' : 'text-rose-500');

                return `
                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 animate-in fade-in slide-in-from-right-2">
                        <div class="flex justify-between items-center">
                            <span class="text-[8px] font-black uppercase text-slate-400">${log.type.replace('_', ' ')}</span>
                            <span class="text-[8px] font-bold text-slate-400">${time}</span>
                        </div>
                        <p class="text-[10px] font-bold text-slate-700 leading-tight">${log.details}</p>
                        <p class="text-[7px] font-black uppercase ${statusColor}">${log.status}</p>
                    </div>`;
            }).join('');
        });

        AutomationTool.unsubscribers.push(unsub);
    },

    createRuleCard(id, data) {
        const div = document.createElement('div');
        div.className = "bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-emerald-500/30 transition-all";

        const lastRun = data.lastRunAt ? new Date(data.lastRunAt.toDate ? data.lastRunAt.toDate() : data.lastRunAt).toLocaleString() : 'Never';
        const isActive = data.status === 'ACTIVE';

        div.innerHTML = `
            <div class="flex items-center gap-6 flex-1 min-w-0">
                <div class="w-14 h-14 rounded-2xl ${isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-300'} flex items-center justify-center text-2xl shrink-0 transition-colors">
                    <i class="fa-solid ${AutomationTool.getTypeIcon(data.type)}"></i>
                </div>
                <div class="min-w-0">
                    <div class="flex items-center gap-3 mb-1">
                        <h4 class="text-lg font-black text-black uppercase tracking-tight truncate">${data.name}</h4>
                        <span class="px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}">${data.status}</span>
                    </div>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">Type: ${data.type.replace('_', ' ')} • Last Run: ${lastRun}</p>
                    <p class="text-xs text-slate-600 mt-2 font-medium italic">"${data.lastResult || 'Idle'}"</p>
                </div>
            </div>
            <div class="flex items-center gap-3 shrink-0">
                <button onclick="window.AutomationTool.runNow('${id}')" class="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition shadow-sm" title="Run Now">
                    <i class="fa-solid fa-play text-xs"></i>
                </button>
                <button onclick="window.AutomationTool.toggleStatus('${id}', '${data.status}')" class="px-5 py-2.5 ${isActive ? 'bg-amber-50 text-amber-600' : 'bg-emerald-600 text-white'} rounded-xl text-[9px] font-black uppercase tracking-widest transition shadow-sm">
                    ${isActive ? 'Pause' : 'Resume'}
                </button>
                <button onclick="window.AutomationTool.deleteAutomation('${id}')" class="p-3 text-slate-200 hover:text-rose-500 transition">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
            </div>
        `;
        return div;
    },

    getTypeIcon(type) {
        switch(type) {
            case 'LOW_STOCK': return 'fa-boxes-stacked';
            case 'UPTIME_CHECK': return 'fa-globe';
            case 'DAILY_REPORT': return 'fa-file-invoice-dollar';
            default: return 'fa-microchip';
        }
    },

    openCreateModal() {
        document.getElementById('create-automation-modal').classList.remove('hidden');
    },

    closeCreateModal() {
        document.getElementById('create-automation-modal').classList.add('hidden');
    },

    handleTypeChange() {
        const type = document.getElementById('new-auto-type').value;
        ['config-low-stock', 'config-uptime', 'config-report'].forEach(id => document.getElementById(id).classList.add('hidden'));

        if (type === 'LOW_STOCK') document.getElementById('config-low-stock').classList.remove('hidden');
        else if (type === 'UPTIME_CHECK') document.getElementById('config-uptime').classList.remove('hidden');
        else if (type === 'DAILY_REPORT') document.getElementById('config-report').classList.remove('hidden');
    },

    async confirmCreate() {
        const name = document.getElementById('new-auto-name').value.trim();
        const type = document.getElementById('new-auto-type').value;
        const uid = auth.currentUser?.uid || localStorage.getItem('tori_seller_id');

        if (!name) return alert("Please provide a name.");

        let config = {};
        if (type === 'LOW_STOCK') config.threshold = document.getElementById('cfg-threshold').value;
        else if (type === 'UPTIME_CHECK') config.url = document.getElementById('cfg-url').value;

        const loader = document.getElementById('global-loader');
        loader.classList.remove('hidden');

        try {
            const autoId = 'AUTO-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            await setDoc(doc(db, "service_automations", autoId), {
                ownerId: uid,
                name,
                type,
                status: 'ACTIVE',
                config,
                lastRunAt: null,
                lastResult: 'Waiting for first run',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            AutomationTool.closeCreateModal();
            alert("Automation rule deployed successfully!");
        } catch (e) {
            alert("Deployment Error: " + e.message);
        } finally {
            loader.classList.add('hidden');
        }
    },

    async runNow(id) {
        const apiKey = localStorage.getItem('c48_user_api_key'); // Assume it exists or fetch it
        // Since it's web, we can also just use Firestore directly for "Run Now" trigger or call the Netlify function

        // Let's use the Netlify function to verify authentication consistency
        const loader = document.getElementById('global-loader');
        loader.classList.remove('hidden');

        try {
            // Check if we have an API Key saved (for CLI parity)
            // If not, we use the user's session token to call a secure endpoint
            const idToken = await auth.currentUser.getIdToken();

            const res = await fetch('/.netlify/functions/cli-automation-manager', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': await AutomationTool.getEffectiveApiKey()
                },
                body: JSON.stringify({ action: 'RUN', automationId: id })
            });

            const data = await res.json();
            if (data.success) {
                alert("Execution Result: " + data.result);
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            alert("Execution Error: " + e.message);
        } finally {
            loader.classList.add('hidden');
        }
    },

    async toggleStatus(id, current) {
        const newStatus = current === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        try {
            await updateDoc(doc(db, "service_automations", id), {
                status: newStatus,
                updatedAt: serverTimestamp()
            });
        } catch (e) { alert(e.message); }
    },

    async deleteAutomation(id) {
        if (!confirm("Delete this rule?")) return;
        try { await deleteDoc(doc(db, "service_automations", id)); } catch (e) { alert(e.message); }
    },

    async getEffectiveApiKey() {
        // Find an active API Key for this user to authorize the tool
        const uid = auth.currentUser.uid;
        const q = query(collection(db, "api_keys"), where("userId", "==", uid), where("status", "==", "ACTIVE"), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) {
            // Generate a temporary one if none exists? Or ask user to go to API page.
            throw new Error("No active API Key found. Please generate one in 'API Keys & Billing' first.");
        }
        return snap.docs[0].id;
    }
};

window.handleAutoTypeChange = () => AutomationTool.handleTypeChange();
window.confirmCreateAutomation = () => AutomationTool.confirmCreate();
window.closeCreateAutomationModal = () => AutomationTool.closeCreateModal();

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('engine-view')) AutomationTool.init();
});
