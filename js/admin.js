import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, getDoc, setDoc, deleteDoc, updateDoc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { sendFast2SMS } from './utils.js';

/**
 * Switch Admin Tabs
 */
export const switchAdminTab = (tab) => {
    const isRegistry = tab === 'registry';
    document.getElementById('admin-panel-registry').classList.toggle('hidden', !isRegistry);
    document.getElementById('admin-panel-analytics').classList.toggle('hidden', isRegistry);

    const regBtn = document.getElementById('admin-tab-registry');
    const anaBtn = document.getElementById('admin-tab-analytics');

    if (isRegistry) {
        regBtn.className = "bg-black text-white text-[10px] font-black px-6 py-3 rounded-full uppercase tracking-widest shadow-lg";
        anaBtn.className = "bg-white text-slate-400 text-[10px] font-black px-6 py-3 rounded-full uppercase tracking-widest border border-slate-100";
    } else {
        anaBtn.className = "bg-black text-white text-[10px] font-black px-6 py-3 rounded-full uppercase tracking-widest shadow-lg";
        regBtn.className = "bg-white text-slate-400 text-[10px] font-black px-6 py-3 rounded-full uppercase tracking-widest border border-slate-100";
        loadAnalyticsData();
    }
};

/**
 * Load Analytics Dashboard Data
 */
export const loadAnalyticsData = () => {
    // 1. Visitors Summary
    onSnapshot(doc(db, "analytics_summary", "visitors"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('stats-total-visitors').innerText = data.totalVisits || 0;
            document.getElementById('stats-unique-visitors').innerText = data.uniqueVisitors || 0;
        }
    });

    // 2. Funnel Data
    onSnapshot(doc(db, "analytics_summary", "funnel"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const funnel = [
                { id: 'landing_page_visit', label: 'Visitors' },
                { id: 'onboarding_started', label: 'Onboarding Starts' },
                { id: 'onboarding_completed', label: 'Onboarding Done' },
                { id: 'cta_create_clicked', label: 'Create Clicks' },
                { id: 'registration_started', label: 'Reg. Starts' },
                { id: 'registration_completed', label: 'Registrations' },
                { id: 'profile_created', label: 'Profiles Created' },
                { id: 'checkout_started', label: 'Checkout' },
                { id: 'payment_completed', label: 'Payments' }
            ];

            const container = document.getElementById('funnel-container');
            if (!container) return;
            container.innerHTML = '';

            const maxVal = data['landing_page_visit'] || 1;
            funnel.forEach(step => {
                const val = data[step.id] || 0;
                const pct = Math.round((val / maxVal) * 100);

                const bar = document.createElement('div');
                bar.className = "space-y-1";
                bar.innerHTML = `
                    <div class="flex justify-between text-[9px] font-black uppercase tracking-widest">
                        <span class="text-slate-400">${step.label}</span>
                        <span class="text-black">${val} (${pct}%)</span>
                    </div>
                    <div class="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                        <div class="h-full bg-royal transition-all duration-1000" style="width: ${pct}%"></div>
                    </div>
                `;
                container.appendChild(bar);
            });

            // Conversion rate calculation
            const payments = data['payment_completed'] || 0;
            const convRate = ((payments / maxVal) * 100).toFixed(1);
            document.getElementById('stats-conversion-rate').innerText = `${convRate}%`;
        }
    });

    // 3. Recent Activity
    const activityQuery = query(collection(db, "analytics_events"), orderBy("timestamp", "desc"), limit(20));
    onSnapshot(activityQuery, (snapshot) => {
        const list = document.getElementById('analytics-activity-list');
        if (!list) return;
        list.innerHTML = '';
        snapshot.forEach(docSnap => {
            const ev = docSnap.data();
            const time = ev.timestamp ? new Date(ev.timestamp.toDate()).toLocaleTimeString() : '...';
            const row = document.createElement('tr');
            row.className = "border-b border-slate-50 hover:bg-slate-50 transition";
            row.innerHTML = `
                <td class="px-6 py-4 text-slate-400">${ev.visitorId}</td>
                <td class="px-6 py-4 uppercase text-black">${ev.eventName.replace(/_/g, ' ')}</td>
                <td class="px-6 py-4 text-royal">${ev.page}</td>
                <td class="px-6 py-4 text-slate-300">${time}</td>
            `;
            list.appendChild(row);
        });
    });
};

/**
 * Architect Console Listeners
 */
export const loadDeveloperData = () => {
    onSnapshot(collection(db, "sellers"), (snapshot) => {
        const totalEl = document.getElementById('dev-total-merchants');
        if (totalEl) totalEl.innerText = snapshot.size;

        let premiumCount = 0;
        let totalRev = 0;
        const list = document.getElementById('dev-merchants-list');
        if (!list) return;
        list.innerHTML = '';

        snapshot.forEach(docSnap => {
            const s = docSnap.data();
            if(s.tier === 'premium') premiumCount++;
            totalRev += (s.revenue || 0);

            const row = document.createElement('tr');
            row.className = "hover:bg-slate-50 transition border-b border-slate-50";
            row.innerHTML = `
                <td class="px-10 py-6 font-mono text-[10px] text-slate-400 font-bold">${docSnap.id}</td>
                <td class="px-10 py-6">
                    <p class="text-black font-extrabold text-sm uppercase tracking-tight">${s.brand || 'Merchant'}</p>
                    <p class="text-[10px] text-slate-400 font-medium">@${s.username} | ${s.email}</p>
                </td>
                <td class="px-10 py-6 text-center">
                    <span class="text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${s.tier==='premium'?'bg-royal/10 text-royal':'bg-slate-100 text-slate-500'}">${s.tier || 'basic'}</span>
                </td>
                <td class="px-10 py-6 text-right text-black font-black">₹${(s.revenue || 0).toLocaleString()}</td>
                <td class="px-10 py-6 text-center">
                    <button onclick="window.toggleMerchantTier('${docSnap.id}', '${s.tier}')" class="text-slate-200 hover:text-royal transition p-3 text-lg"><i class="fa-solid fa-shuffle"></i></button>
                    <button onclick="window.deleteMerchant('${docSnap.id}')" class="text-slate-200 hover:text-red-500 transition p-3 text-lg"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            `;
            list.appendChild(row);
        });

        const premEl = document.getElementById('dev-premium-count');
        if (premEl) premEl.innerText = premiumCount;

        const revEl = document.getElementById('stats-total-revenue');
        if (revEl) revEl.innerText = `₹${totalRev.toLocaleString()}`;
    });

    onSnapshot(collection(db, "seller_requests"), (snap) => {
        const pendingEl = document.getElementById('dev-pending-count');
        if (pendingEl) pendingEl.innerText = snap.size;

        const reqList = document.getElementById('dev-requests-list');
        if(!reqList) return;
        reqList.innerHTML = '';
        snap.forEach(docSnap => {
            const r = docSnap.data();
            const row = document.createElement('div');
            row.className = "bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center mb-2";
            row.innerHTML = `
                <div><p class="text-xs font-black text-black uppercase">@${r.username}</p><p class="text-[10px] text-slate-400 font-bold">${r.brand}</p></div>
                <div class="flex gap-2">
                    <button onclick="window.approveRequest('${docSnap.id}')" class="bg-black text-white text-[9px] font-black px-4 py-2 rounded-full uppercase">Approve</button>
                    <button onclick="window.rejectRequest('${docSnap.id}')" class="bg-white text-slate-400 text-[9px] font-black px-4 py-2 rounded-full uppercase border">Reject</button>
                </div>
            `;
            reqList.appendChild(row);
        });
    });
};

// Exposed Actions
window.approveRequest = async (id) => {
    if(!confirm("Authorize Node?")) return;
    const reqRef = doc(db, "seller_requests", id);
    const snap = await getDoc(reqRef);
    if(snap.exists()) {
        const data = snap.data();
        await setDoc(doc(db, "sellers", id), { ...data, status: 'active', approvedAt: new Date().toISOString() });
        await deleteDoc(reqRef);
        if(data.mobile) sendFast2SMS(data.mobile, "NODE ACTIVATED.");
    }
};

window.rejectRequest = async (id) => {
    if(confirm("Reject Node?")) await deleteDoc(doc(db, "seller_requests", id));
};

window.toggleMerchantTier = async (id, currentTier) => {
    const next = currentTier === 'premium' ? 'basic' : 'premium';
    if(confirm(`Toggle to ${next.toUpperCase()}?`)) {
        await updateDoc(doc(db, "sellers", id), { tier: next });
    }
};

window.deleteMerchant = async (id) => {
    if(confirm("Decommission node?")) await deleteDoc(doc(db, "sellers", id));
};

window.switchAdminTab = switchAdminTab;
window.loadDeveloperData = loadDeveloperData;
