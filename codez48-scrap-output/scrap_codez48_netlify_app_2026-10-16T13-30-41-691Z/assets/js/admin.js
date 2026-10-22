import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, getDoc, setDoc, deleteDoc, updateDoc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { sendFast2SMS } from './utils.js';

const escapeHtml = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

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

/**
 * Load Developer Payout Requests
 */
export const loadDeveloperPayoutRequests = () => {
    const listEl = document.getElementById('dev-payout-requests-list');
    if (!listEl) return;

    const q = query(collection(db, "dev_prog_payouts"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            listEl.innerHTML = `<p class="text-gray-500 italic p-4 text-center">No developer payout requests recorded.</p>`;
            return;
        }

        listEl.innerHTML = snapshot.docs.map(docSnap => {
            const p = docSnap.data();
            const pid = docSnap.id;
            const status = p.status || 'pending';

            let statusBadge = '';
            if (status === 'pending') statusBadge = `<span class="bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Pending</span>`;
            else if (status === 'approved') statusBadge = `<span class="bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Approved</span>`;
            else if (status === 'paid') statusBadge = `<span class="bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Paid</span>`;
            else if (status === 'not_paid') statusBadge = `<span class="bg-orange-900/30 text-orange-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Not Paid</span>`;
            else if (status === 'cancelled') statusBadge = `<span class="bg-rose-900/30 text-rose-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Cancelled</span>`;

            let actionBtns = '';
            if (status === 'pending') {
                actionBtns = `
                    <button onclick="window.approvePayoutRequest('${pid}')" class="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-[8px] uppercase">Approve</button>
                    <button onclick="window.updatePayoutStatus('${pid}', 'cancelled')" class="px-3 py-1 bg-rose-900/30 hover:bg-rose-600 text-rose-400 hover:text-white font-bold rounded text-[8px] uppercase">Cancel</button>
                `;
            } else if (status === 'approved' || status === 'not_paid') {
                actionBtns = `
                    <button onclick="window.updatePayoutStatus('${pid}', 'paid')" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[8px] uppercase">Paid</button>
                    <button onclick="window.updatePayoutStatus('${pid}', 'not_paid')" class="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded text-[8px] uppercase">Not Paid</button>
                    <button onclick="window.updatePayoutStatus('${pid}', 'cancelled')" class="px-3 py-1 bg-rose-900/30 hover:bg-rose-600 text-rose-400 hover:text-white font-bold rounded text-[8px] uppercase">Cancel</button>
                `;
            }

            return `
                <div class="p-4 bg-gray-800 rounded-xl border border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div class="flex items-center gap-3">
                            <span class="font-bold text-white text-sm">${escapeHtml(p.name || 'Developer')}</span>
                            ${statusBadge}
                        </div>
                        <p class="text-gray-400 text-[10px] mt-1">Email: <span class="text-blue-400 font-bold">${escapeHtml(p.email || 'N/A')}</span> | Mobile: <span class="text-white font-bold">${escapeHtml(p.mobile || 'N/A')}</span></p>
                        <p class="text-yellow-400 font-mono text-[10px]">UPI ID: <strong>${escapeHtml(p.upiId || 'N/A')}</strong></p>
                        <p class="text-gray-500 text-[9px] mt-0.5">${new Date(p.timestamp || Date.now()).toLocaleString()}</p>
                    </div>
                    <div class="text-right flex flex-col md:items-end gap-2 w-full md:w-auto">
                        <span class="text-xl font-black text-emerald-400 font-mono">₹${p.amount}</span>
                        <div class="flex gap-2">
                            ${actionBtns}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    });
};

window.approvePayoutRequest = async (payoutId) => {
    if (!confirm("Approve this developer payout request? Status will change to 'Approved'.")) return;
    try {
        await updateDoc(doc(db, "dev_prog_payouts", payoutId), { status: 'approved', approvedAt: new Date().toISOString() });
        alert("Payout Request Approved.");
    } catch (e) {
        alert("Error approving payout: " + e.message);
    }
};

window.updatePayoutStatus = async (payoutId, newStatus) => {
    try {
        await updateDoc(doc(db, "dev_prog_payouts", payoutId), { status: newStatus, lastUpdated: new Date().toISOString() });
        alert(`Payout status updated to: ${newStatus.toUpperCase()}`);
    } catch (e) {
        alert("Error updating status: " + e.message);
    }
};

window.submitDeveloperPayoutRequest = async (amount, upiId, name, mobile, email) => {
    if (!amount || amount <= 0 || !upiId) return alert("Valid amount and UPI ID required.");
    try {
        const payoutId = `PAYOUT_${Date.now()}`;
        await setDoc(doc(db, "dev_prog_payouts", payoutId), {
            payoutId,
            amount: Number(amount),
            upiId: upiId.trim(),
            name: name || 'Developer',
            mobile: mobile || 'N/A',
            email: email || '',
            status: 'pending',
            timestamp: new Date().toISOString()
        });

        // Dispatch Dual Payout Alert Email (Developer Admin + Requesting User with 24h Promise)
        await fetch('/.netlify/functions/send-login-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'DEVELOPER_PAYOUT_REQUEST_ALERT',
                amount: Number(amount),
                upiId: upiId.trim(),
                name: name || 'Developer',
                mobile: mobile || 'N/A',
                email: email || ''
            })
        });

        alert(`⚡ Payout Request Submitted Successfully!\nYour request for ₹${amount} will be processed within 24 hours.`);
    } catch (e) {
        alert("Payout Request Error: " + e.message);
    }
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
window.loadDeveloperPayoutRequests = loadDeveloperPayoutRequests;
