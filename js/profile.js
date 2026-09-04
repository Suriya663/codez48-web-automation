import { db } from './firebase-config.js';
import { doc, getDoc, getDocs, collection, query, where, updateDoc, increment, setDoc, serverTimestamp, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { showView } from './navigation.js';
import { t } from './translations.js';
import { allSellers } from './search.js';
import { refreshConversionCTAs, getSessionLogos } from './onboarding.js';

/**
 * Helper: Truncate text with "Read More"
 */
const formatDescription = (text, id, title) => {
    if (!text) return '';
    const limit = 150;
    if (text.length <= limit) {
        return `<p class="text-slate-400 text-sm md:text-base font-medium leading-relaxed border-t border-slate-50 pt-4"><strong class="text-black uppercase text-[10px] tracking-widest block mb-1">${title}</strong>${text}</p>`;
    }

    const short = text.substring(0, limit) + "...";
    return `
        <div class="border-t border-slate-50 pt-4">
            <strong class="text-black uppercase text-[10px] tracking-widest block mb-1">${title}</strong>
            <p id="desc-short-${id}" class="text-slate-400 text-sm md:text-base font-medium leading-relaxed">${short} <button onclick="window.toggleFullDesc('${id}')" class="text-royal font-black hover:underline ml-1">Read More</button></p>
            <p id="desc-full-${id}" class="text-slate-400 text-sm md:text-base font-medium leading-relaxed hidden">${text} <button onclick="window.toggleFullDesc('${id}')" class="text-royal font-black hover:underline ml-1">Show Less</button></p>
        </div>
    `;
};

/**
 * Check Active Collaboration Status between two merchants (STRICT PUBLIC PRIVACY GUARD)
 */
export const checkCollabStatus = async (sellerA, sellerB) => {
    if (!sellerA || !sellerB) return false;
    try {
        const cSnap = await getDocs(query(collection(db, "collaborations"), where("status", "==", "active")));
        let isCollab = false;
        cSnap.forEach(d => {
            const data = d.data();
            if ((data.sellerA === sellerA && data.sellerB === sellerB) || (data.sellerA === sellerB && data.sellerB === sellerA)) {
                isCollab = true;
            }
        });
        return isCollab;
    } catch (e) {
        return false;
    }
};

/**
 * Confirm Wallet Recharge via In-Modal Amount Input
 */
export const confirmTopUpWallet = async (sellerId) => {
    const inputEl = document.getElementById('wallet-topup-amount');
    const amount = Number(inputEl ? inputEl.value : 0);

    if (!amount || isNaN(amount) || amount < 10) {
        alert("Please enter a valid recharge amount (minimum ₹10).");
        return;
    }

    const options = {
        key: "rzp_live_TUJt8CLvlZ1XEN",
        amount: amount * 100,
        currency: "INR",
        name: "CODEZ48 Wallet Recharge",
        description: `Wallet Top-Up: ₹${amount}`,
        image: "https://codez48.netlify.app/img/logo.png",
        handler: async function (response) {
            try {
                const sRef = doc(db, "sellers", sellerId);
                const sSnap = await getDoc(sRef);
                const currentBalance = sSnap.exists() ? (Number(sSnap.data().walletBalance) || 0) : 0;
                const newBalance = currentBalance + amount;

                // Credit wallet and reactivate site status
                await updateDoc(sRef, {
                    walletBalance: newBalance,
                    status: 'active',
                    lastActivatedAt: new Date().toISOString()
                });

                // Record transaction
                await addDoc(collection(db, "wallet_transactions"), {
                    sellerId,
                    type: 'RECHARGE_TOP_UP',
                    amount: amount,
                    remainingBalance: newBalance,
                    paymentId: response.razorpay_payment_id || 'PAY_' + Date.now(),
                    description: `Wallet Top-Up via Razorpay`,
                    timestamp: new Date().toISOString()
                });

                alert(`⚡ Wallet Recharged Successfully!\nAdded ₹${amount}. New Wallet Balance: ₹${newBalance}\nWebsite is ACTIVE.`);
                openMerchantWalletModal(sellerId);
            } catch (err) {
                alert("Wallet Update Notice: " + err.message);
            }
        },
        prefill: {
            email: window.currentUser?.email || '',
            contact: ''
        },
        theme: { color: "#2563EB" }
    };

    if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
    } else {
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = () => {
            const rzp = new window.Razorpay(options);
            rzp.open();
        };
        document.head.appendChild(s);
    }
};

/**
 * Open Professional FinTech Merchant Wallet Modal
 */
export const openMerchantWalletModal = async (sellerId) => {
    let modal = document.getElementById('merchant-wallet-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'merchant-wallet-modal';
        modal.className = 'fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200';
        document.body.appendChild(modal);
    }

    try {
        const sRef = doc(db, "sellers", sellerId);
        const sSnap = await getDoc(sRef);
        const sellerData = sSnap.exists() ? sSnap.data() : (window.currentUser || {});

        const walletBalance = Number(sellerData.walletBalance) || 0;
        const dailyFee = sellerData.dailyFee || (sellerData.tier === 'premium' ? 133 : 83);
        const isInactive = sellerData.status === 'deactivated_insufficient_funds';

        let historyRows = [];
        try {
            const q = query(collection(db, "wallet_transactions"), where("sellerId", "==", sellerId));
            const snap = await getDocs(q);
            snap.forEach(d => historyRows.push(d.data()));
            historyRows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (e) {}

        modal.innerHTML = `
            <div class="glass-card w-full max-w-xl rounded-[2.5rem] p-6 md:p-8 bg-white relative space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button onclick="window.closeMerchantWalletModal()" class="absolute top-6 right-6 text-slate-300 hover:text-black transition">
                    <i class="fa-solid fa-xmark text-2xl"></i>
                </button>

                <div class="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div class="w-10 h-10 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-sm">
                        <i class="fa-solid fa-wallet"></i>
                    </div>
                    <div>
                        <h4 class="text-xl font-black text-slate-900 uppercase tracking-tight">Merchant Wallet</h4>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">24-Hour Cycle Fee: ₹${dailyFee} / Day</p>
                    </div>
                </div>

                <!-- Metallic FinTech Balance Card -->
                <div class="p-6 rounded-[2rem] bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white shadow-xl relative overflow-hidden space-y-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <span class="text-[9px] font-black uppercase text-purple-300 tracking-widest block">Available Balance</span>
                            <span class="text-3xl md:text-4xl font-black tracking-tight text-white mt-1 block">₹${walletBalance.toFixed(2)}</span>
                        </div>
                        <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase ${isInactive ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}">
                            ${isInactive ? '⚠️ Paused' : '🟢 Website Active'}
                        </span>
                    </div>

                    <div class="flex justify-between items-center pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-400">
                        <span>Daily Rate: ₹${dailyFee}/Day</span>
                        <span class="text-[9px] font-bold text-purple-300">24-Hour Cycle</span>
                    </div>
                </div>

                <!-- In-Modal Wallet Recharge Form Container -->
                <div id="wallet-recharge-form-container" class="p-5 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-3">
                    <div class="flex justify-between items-center">
                        <span class="text-[10px] font-black uppercase text-purple-900 tracking-widest flex items-center gap-1.5">
                            <i class="fa-solid fa-credit-card text-purple-600"></i> Recharge Wallet Balance
                        </span>
                        <span class="text-[9px] font-bold text-slate-500 uppercase">Enter Amount Below</span>
                    </div>
                    <div>
                        <label class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">ENTER RECHARGE AMOUNT (₹)</label>
                        <div class="flex gap-2">
                            <input type="number" id="wallet-topup-amount" min="10" value="200" class="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm font-black text-purple-950 focus:outline-none focus:border-purple-600">
                            <button onclick="window.confirmTopUpWallet('${sellerId}')" class="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition shadow-md shadow-purple-200 shrink-0 flex items-center gap-1.5">
                                <i class="fa-solid fa-bolt"></i> Pay Now →
                            </button>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 pt-1 flex-wrap">
                        <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-1">Quick Presets:</span>
                        <button onclick="document.getElementById('wallet-topup-amount').value = 100" class="px-2.5 py-1 bg-white hover:bg-purple-100 border border-purple-200 text-purple-800 text-[8px] font-black rounded-lg transition shadow-sm">+₹100</button>
                        <button onclick="document.getElementById('wallet-topup-amount').value = 200" class="px-2.5 py-1 bg-white hover:bg-purple-100 border border-purple-200 text-purple-800 text-[8px] font-black rounded-lg transition shadow-sm">+₹200</button>
                        <button onclick="document.getElementById('wallet-topup-amount').value = 500" class="px-2.5 py-1 bg-white hover:bg-purple-100 border border-purple-200 text-purple-800 text-[8px] font-black rounded-lg transition shadow-sm">+₹500</button>
                        <button onclick="document.getElementById('wallet-topup-amount').value = 1000" class="px-2.5 py-1 bg-white hover:bg-purple-100 border border-purple-200 text-purple-800 text-[8px] font-black rounded-lg transition shadow-sm">+₹1000</button>
                    </div>
                </div>

                ${isInactive ? `
                    <div class="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs font-bold flex items-center justify-between">
                        <span>⚠️ Website is currently paused due to insufficient wallet balance. Please add at least ₹${dailyFee} to reactivate.</span>
                    </div>
                ` : ''}

                <!-- Transaction History -->
                <div class="space-y-3">
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Billing & Transaction History</span>
                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 max-h-48 overflow-y-auto custom-scrollbar font-mono text-[10px]">
                        ${historyRows.length === 0 ? `
                            <p class="text-slate-400 italic text-center py-6">No wallet transactions recorded yet.</p>
                        ` : `
                            <div class="space-y-2">
                                ${historyRows.map(h => `
                                    <div class="flex justify-between items-center border-b border-slate-200/60 pb-2">
                                        <div>
                                            <span class="font-bold text-slate-900 block">${h.description || h.type}</span>
                                            <span class="text-slate-400 text-[8px]">${new Date(h.timestamp).toLocaleString()}</span>
                                        </div>
                                        <div class="text-right">
                                            <span class="${h.amount > 0 ? 'text-emerald-600 font-bold' : 'text-slate-700 font-bold'}">${h.amount > 0 ? '+' : ''}₹${h.amount}</span>
                                            <span class="text-slate-400 text-[8px] block">Bal: ₹${h.remainingBalance}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>

                <div class="text-right pt-2 border-t border-slate-100">
                    <button onclick="window.closeMerchantWalletModal()" class="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition">
                        Close
                    </button>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    } catch (err) {
        alert("Wallet Modal Error: " + err.message);
    }
};

export const closeMerchantWalletModal = () => {
    const modal = document.getElementById('merchant-wallet-modal');
    if (modal) modal.classList.add('hidden');
};

/**
 * Open Dedicated AI Business Suggestions Modal (Triggered by Bell Icon for Owner Only)
 */
export const openAiSuggestionsModal = async (sellerId) => {
    let modal = document.getElementById('ai-suggestions-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ai-suggestions-modal';
        modal.className = 'fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200';
        document.body.appendChild(modal);
    }

    try {
        const sRef = doc(db, "sellers", sellerId);
        const sSnap = await getDoc(sRef);
        const sellerData = sSnap.exists() ? sSnap.data() : (window.currentUser || {});

        const allSnap = await getDocs(collection(db, "sellers"));
        const otherMerchants = [];
        allSnap.forEach(d => {
            if (d.id !== sellerId) {
                otherMerchants.push({ id: d.id, ...d.data() });
            }
        });

        const currentDesc = (sellerData.productDescription || '' + sellerData.servicesDescription || '' + sellerData.brand || '').toLowerCase();

        const suggestions = otherMerchants.map(m => {
            let score = 1;
            const mText = (m.productDescription || '' + m.servicesDescription || '' + m.brand || '').toLowerCase();

            if (currentDesc.includes('store') || currentDesc.includes('retail') || currentDesc.includes('shop') || currentDesc.includes('offline')) {
                if (mText.includes('it') || mText.includes('software') || mText.includes('website') || mText.includes('ai') || mText.includes('marketing')) score += 8;
            }
            if (currentDesc.includes('electrical') || currentDesc.includes('wiring') || currentDesc.includes('hardware')) {
                if (mText.includes('electronic') || mText.includes('supply') || mText.includes('component')) score += 8;
            }

            return { merchant: m, score };
        }).sort((a, b) => b.score - a.score).slice(0, 3).map(s => s.merchant);

        modal.innerHTML = `
            <div class="glass-card w-full max-w-2xl rounded-[2.5rem] p-6 md:p-8 bg-white relative space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
                <button onclick="window.closeAiSuggestionsModal()" class="absolute top-6 right-6 text-slate-300 hover:text-black transition">
                    <i class="fa-solid fa-xmark text-2xl"></i>
                </button>

                <div class="flex items-center gap-3 border-b border-purple-100 pb-3">
                    <div class="w-10 h-10 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-sm">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                    </div>
                    <div>
                        <h4 class="text-xl font-black text-black uppercase tracking-tight">AI Synergy Business Match</h4>
                        <p class="text-xs text-slate-500 font-medium">Recommended business partners to source products, expand IT infrastructure, and boost marketing.</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    ${suggestions.map(m => `
                        <div id="modal-suggestion-card-${m.id}" class="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between relative group">
                            <div class="space-y-2">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                        <img src="${m.logo || 'https://placehold.co/100x100?text=Node'}" class="w-full h-full object-contain">
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <h5 class="text-xs font-black text-black truncate uppercase">${m.brand || 'Merchant Node'}</h5>
                                        <p class="text-[8px] font-mono text-purple-700 font-bold truncate">${m.companyName || 'Verified Synergy Partner'}</p>
                                    </div>
                                </div>
                                <p class="text-[9px] text-slate-500 font-medium line-clamp-2">${m.description || 'Offers business collaboration opportunities.'}</p>
                            </div>

                            <div class="pt-2 border-t border-slate-200 flex justify-between items-center">
                                <button onclick="window.closeAiSuggestionsModal(); window.sendCollabRequest('${m.id}')" class="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[8px] font-black uppercase tracking-widest transition shadow-md shadow-purple-200 flex items-center justify-center gap-1">
                                    <i class="fa-solid fa-handshake"></i> Connect & Collaborate
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="text-right pt-2 border-t border-slate-100">
                    <button onclick="window.closeAiSuggestionsModal()" class="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition">
                        Close
                    </button>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    } catch (err) {
        alert("Suggestions Error: " + err.message);
    }
};

export const closeAiSuggestionsModal = () => {
    const modal = document.getElementById('ai-suggestions-modal');
    if (modal) modal.classList.add('hidden');
};

/**
 * Terminate/Un-collaborate Active Partnership
 */
export const terminateCollaboration = async (targetSellerId) => {
    const currentSellerId = localStorage.getItem('tori_seller_id') || window.currentUser?.uid || window.currentUser?.sellerId;
    if (!currentSellerId) {
        alert("Please login to manage collaborations.");
        return;
    }

    if (!confirm("Are you sure you want to end this business collaboration? The partner link and badge will be removed from both profiles.")) {
        return;
    }

    try {
        const cSnap = await getDocs(query(collection(db, "collaborations"), where("status", "==", "active")));
        for (const docSnap of cSnap.docs) {
            const data = docSnap.data();
            if ((data.sellerA === currentSellerId && data.sellerB === targetSellerId) || (data.sellerA === targetSellerId && data.sellerB === currentSellerId)) {
                await updateDoc(docSnap.ref, { status: 'terminated', terminatedAt: new Date().toISOString() });
            }
        }

        alert("🤝 Un-collaboration complete. Partnership link & badge removed.");
        showPublicProfile(targetSellerId, window.currentUser);
    } catch (e) {
        alert("Un-collaborate Error: " + e.message);
    }
};

/**
 * Send Collaboration Request with Unique Token & Black & White Email Dispatch
 */
export const sendCollabRequest = async (targetSellerId) => {
    const currentSellerId = localStorage.getItem('tori_seller_id') || window.currentUser?.uid || window.currentUser?.sellerId;
    if (!currentSellerId) {
        alert("Please login to initiate a business collaboration.");
        showView('auth');
        return;
    }

    if (currentSellerId === targetSellerId) {
        alert("Self-collaboration is restricted.");
        return;
    }

    try {
        const [targetDoc, currentDoc] = await Promise.all([
            getDoc(doc(db, "sellers", targetSellerId)),
            getDoc(doc(db, "sellers", currentSellerId))
        ]);

        const targetData = targetDoc.exists() ? targetDoc.data() : {};
        const currentData = currentDoc.exists() ? currentDoc.data() : (window.currentUser || {});

        const collabToken = `collab_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const reqId = `COL_${currentSellerId}_${targetSellerId}`;

        await setDoc(doc(db, "collaboration_requests", reqId), {
            reqId,
            collabToken,
            fromSellerId: currentSellerId,
            toSellerId: targetSellerId,
            fromBrand: currentData.brand || currentData.username || 'Merchant Partner',
            fromEmail: currentData.email || '',
            fromDescription: currentData.productDescription || currentData.servicesDescription || currentData.description || 'Verified Business Entity',
            status: 'pending',
            createdAt: new Date().toISOString()
        });

        // Trigger Black & White Email Dispatch to Target Merchant
        if (targetData.email && targetData.email.includes('@')) {
            await fetch('/.netlify/functions/send-login-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'SEND_COLLAB_EMAIL',
                    toEmail: targetData.email,
                    fromBrand: currentData.brand || currentData.username || 'Merchant Partner',
                    fromSellerId: currentSellerId,
                    fromDescription: currentData.productDescription || currentData.servicesDescription || currentData.description || 'Verified Business Entity',
                    collabToken
                })
            });
        }

        alert(`🤝 Collaboration Request Dispatched!\nA Black & White verification email with your unique token (${collabToken}) has been sent to ${targetData.email || 'the merchant'}.`);
        showPublicProfile(targetSellerId, window.currentUser);
    } catch (e) {
        alert("Collaboration Error: " + e.message);
    }
};

/**
 * Render Merchant Public Profile
 */
export const showPublicProfile = async (sellerId, currentUser) => {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.remove('hidden');

    try {
        let sellerDoc = await getDoc(doc(db, "sellers", sellerId));
        let isPending = false;

        if (!sellerDoc.exists()) {
            sellerDoc = await getDoc(doc(db, "seller_requests", sellerId));
            if (sellerDoc.exists()) {
                isPending = true;
            } else {
                if (currentUser && currentUser.uid === sellerId) {
                    renderProfileCreationCTA();
                    showView('public-profile');
                    return;
                }
                throw new Error("Merchant Not Found");
            }
        }

        const cta = document.getElementById('profile-conversion-cta');
        if (cta) cta.classList.add('hidden');

        const seller = sellerDoc.data();
        const sellerData = { id: sellerDoc.id, ...seller };

        // Check if seller account is deactivated due to insufficient wallet balance
        const isInactive = seller.status === 'deactivated_insufficient_funds';

        // Strictly check if current user is an active Collab Partner (STRICT PRIVACY GUARD)
        const currentSId = localStorage.getItem('tori_seller_id') || currentUser?.uid;
        const isCollabPartner = await checkCollabStatus(sellerId, currentSId);
        const isOwner = currentUser && (currentUser.uid === sellerId || currentUser.sellerId === sellerId);

        const adminContainer = document.getElementById('admin-action-container');
        if (adminContainer) {
            adminContainer.innerHTML = `
                <button onclick="openShareProfile('${sellerId}', '${seller.brand || 'Elite Node'}')" class="bg-slate-50 text-slate-400 text-[9px] font-black px-6 py-2.5 rounded-full uppercase tracking-widest flex items-center gap-2 border border-slate-100 hover:text-black hover:border-slate-200 transition">
                    <i class="fa-solid fa-share-nodes"></i> Share Node
                </button>
            `;

            if (isOwner) {
                if (isPending) {
                    adminContainer.innerHTML += `
                        <span class="bg-amber-100 text-amber-600 text-[10px] font-black px-6 py-2.5 rounded-full uppercase tracking-widest border border-amber-200">
                            <i class="fa-solid fa-clock"></i> Authorization Pending
                        </span>
                    `;
                } else {
                    adminContainer.innerHTML += `
                        <button onclick="window.openAiSuggestionsModal('${sellerId}')" class="relative bg-purple-100 text-purple-800 hover:bg-purple-200 text-xs font-black px-4 py-2.5 rounded-full flex items-center gap-1.5 transition shadow-sm" title="AI Business Synergy Suggestions">
                            <i class="fa-solid fa-bell text-sm"></i>
                            <span class="text-[9px] font-black uppercase">Suggestions</span>
                            <span class="absolute -top-1 -right-1 w-3 h-3 bg-purple-600 rounded-full border-2 border-white animate-pulse"></span>
                        </button>
                        <button onclick="window.openMerchantWalletModal('${sellerId}')" class="bg-purple-600 hover:bg-purple-700 text-white text-[9px] font-black px-6 py-2.5 rounded-full uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-purple-200 transition">
                            <i class="fa-solid fa-wallet"></i> Wallet
                        </button>
                        <button onclick="openNodeSettings('${sellerId}')" class="bg-black text-white text-[9px] font-black px-6 py-2.5 rounded-full uppercase tracking-widest flex items-center gap-2 shadow-lg">
                            <i class="fa-solid fa-gear"></i> Settings
                        </button>
                        <button onclick="openEditProfile('${sellerId}')" class="bg-slate-50 text-black text-[9px] font-black px-6 py-2.5 rounded-full uppercase tracking-widest flex items-center gap-2 border border-slate-200">
                            <i class="fa-solid fa-pen-to-square"></i> Edit Identity
                        </button>
                        <button onclick="window.location.href='seller/developer.html?view=products'" class="bg-slate-100 text-slate-500 text-[9px] font-black px-6 py-2.5 rounded-full uppercase tracking-widest flex items-center gap-2">
                            <i class="fa-solid fa-box-archive"></i> Inventory
                        </button>
                        <button onclick="window.location.href='seller/developer.html'" class="btn-royal text-[9px] font-black px-6 py-2.5 rounded-full uppercase tracking-widest flex items-center gap-2">
                            <i class="fa-solid fa-gauge"></i> Admin Console
                        </button>
                        <button onclick="window.userLogout()" class="bg-red-50 text-red-600 text-[9px] font-black px-6 py-2.5 rounded-full uppercase tracking-widest border border-red-100 flex items-center gap-2">
                            <i class="fa-solid fa-power-off"></i> Logout
                        </button>
                    `;
                }
            }
        }

        const displayUrl = seller.tier === 'premium'
            ? (seller.customUrl || `${seller.username}.tori.network`)
            : `${seller.username || 'user'}.codeez`;

        const followersCount = seller.followersCount || 0;
        const isFollowing = currentUser ? (seller.followers?.includes(currentUser.uid)) : false;
        const isPremiumTier = (seller.tier?.toLowerCase() === 'premium') || (seller.revenue >= 4000) || (seller.email?.toLowerCase() === 'codez4848@gmail.com');

        let followBtnText = isFollowing ? 'Following' : 'Follow Node';

        const template = seller.preferredTemplate || 'templateA';
        const target = document.getElementById('profile-render-target');
        if (target) {
            target.className = `view-active ${template === 'templateA' ? 'template-a' : 'template-b'}`;
            target.innerHTML = `
                ${isInactive ? `
                    <div class="max-w-4xl mx-auto my-8 p-8 bg-rose-50 border-2 border-rose-300 rounded-[2.5rem] text-center shadow-lg">
                        <div class="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 font-bold text-2xl">⚠️</div>
                        <h3 class="text-2xl font-black text-rose-900 uppercase tracking-tight">Website Temporarily Paused</h3>
                        <p class="text-xs text-rose-700 font-medium mt-2 max-w-md mx-auto">This merchant website is currently inactive due to pending daily plan fee. Please recharge wallet to bring online.</p>
                    </div>
                ` : ''}

                <div class="profile-header">
                    <div class="logo-container bg-slate-50 rounded-[3rem] border border-slate-50 flex items-center justify-center p-1 shadow-2xl overflow-hidden">
                        <img src="${seller.logo || 'https://placehold.co/200x200?text=Logo'}" class="w-full h-full object-contain mix-blend-multiply">
                    </div>
                    <div class="max-w-5xl mx-auto">
                        <div class="flex justify-center items-center gap-3 mb-6 flex-wrap">
                            <span class="text-[10px] font-black text-royal uppercase tracking-[0.2em]">${displayUrl}</span>
                            <span class="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">${followersCount} Followers</span>
                            ${isCollabPartner ? `
                                <span class="px-3 py-1 bg-emerald-100 text-emerald-800 font-black text-[9px] rounded-full uppercase border border-emerald-300 shadow-sm flex items-center gap-1">
                                    🤝 Collab Partner
                                </span>
                            ` : ''}
                        </div>
                        <h1 class="text-4xl md:text-8xl font-black text-black mb-4 tracking-tightest uppercase flex items-center justify-center gap-4 flex-wrap leading-none">
                            ${seller.brand || 'Elite Node'}
                            ${isPremiumTier ? `<i class="fa-solid fa-circle-check text-blue-500 text-3xl md:text-6xl drop-shadow-sm self-center" title="Verified Merchant"></i>` : ''}
                        </h1>
                        ${seller.companyName ? `<p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Managed by ${seller.companyName}</p>` : ''}

                        <div class="space-y-6 mb-10">
                            <p class="text-slate-500 text-lg md:text-xl font-medium leading-relaxed">${seller.description || 'Verified Business Entity.'}</p>
                            ${formatDescription(seller.servicesDescription, 'services', 'Services Overview')}
                            ${formatDescription(seller.productDescription, 'products', 'Product Line')}
                        </div>

                        <div class="flex flex-wrap justify-center gap-4">
                            <button onclick="window.handleFollow('${sellerId}')" class="${isFollowing ? 'bg-slate-100 text-slate-400' : 'btn-black'} text-[10px] font-black px-10 py-4 rounded-full uppercase tracking-widest shadow-xl">
                                ${followBtnText}
                            </button>
                            ${isCollabPartner ? `
                                <button onclick="window.terminateCollaboration('${sellerId}')" class="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black px-8 py-4 rounded-full uppercase tracking-widest shadow-lg hover:bg-rose-600 hover:text-white transition">
                                    <i class="fa-solid fa-handshake-slash"></i> Un-Collaborate
                                </button>
                            ` : `
                                <button onclick="window.sendCollabRequest('${sellerId}')" class="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black px-10 py-4 rounded-full uppercase tracking-widest shadow-xl flex items-center gap-2">
                                    <i class="fa-solid fa-handshake"></i> Connect & Collaborate
                                </button>
                            `}
                            <a href="seller/index.html?s=${(seller.tier === 'premium' || seller.tier === 'Premium') ? (seller.customUrl || seller.username) : (seller.username + '.codeez')}" class="btn-royal text-[10px] font-black px-10 py-4 rounded-full uppercase tracking-widest shadow-xl flex items-center justify-center">
                                Go to Product Page
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }

        showView('public-profile');
    } catch (e) {
        console.error(e);
        alert("Error loading profile: " + e.message);
    } finally {
        if (loader) loader.classList.add('hidden');
    }
};

/**
 * Handle Follow/Unfollow Node
 */
export const handleFollow = async (sellerId, currentUser) => {
    if (!currentUser) {
        alert("Please login to follow.");
        showView('auth');
        return;
    }

    if (currentUser.uid === sellerId) return alert("Self-following restricted.");

    const sellerRef = doc(db, "sellers", sellerId);
    const sellerSnap = await getDoc(sellerRef);
    if(!sellerSnap.exists()) return;
    const sellerData = sellerSnap.data();

    const followers = sellerData.followers || [];
    const isFollowing = followers.includes(currentUser.uid);

    const myRef = doc(db, "sellers", currentUser.uid);

    try {
        if (isFollowing) {
            const newFollowers = followers.filter(id => id !== currentUser.uid);
            await updateDoc(sellerRef, { followers: newFollowers, followersCount: increment(-1) });
            if (!currentUser.isAnonymous) {
                await updateDoc(myRef, { followingCount: increment(-1) });
            }
        } else {
            followers.push(currentUser.uid);
            await updateDoc(sellerRef, { followers: followers, followersCount: increment(1) });
            if (!currentUser.isAnonymous) {
                await updateDoc(myRef, { followingCount: increment(1) });
            }
        }
        showPublicProfile(sellerId, currentUser);
    } catch(e) {
        console.error("Social Sync Error:", e);
        alert("Social Sync Error: Connection issue or profile restricted.");
    }
};

/**
 * Share Profile logic
 */
export const shareProfileTo = (platform) => {
    const url = `${window.location.origin}${window.location.pathname}#${window.currentShareId}`;
    const text = `Connect with ${window.currentShareName} on CODEZ48!`;

    if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    } else if (platform === 'copy') {
        navigator.clipboard.writeText(url).then(() => alert("Link Copied."));
    }
    const modal = document.getElementById('share-profile-modal');
    if (modal) modal.classList.add('hidden');
};

/**
 * Save Profile changes
 */
export const saveProfileChanges = async () => {
    if(!window.currentEditSellerId) return;
    const brand = document.getElementById('edit-site-name').value.trim();
    const logo = document.getElementById('edit-site-logo').value.trim();
    const secondaryLink = document.getElementById('edit-secondary-link').value.trim();
    const servicesDescription = document.getElementById('edit-services-desc').value.trim();
    const productDescription = document.getElementById('edit-product-desc').value.trim();

    try {
        await updateDoc(doc(db, "sellers", window.currentEditSellerId), {
            brand, logo, secondaryLink, servicesDescription, productDescription,
            lastUpdated: new Date().toISOString()
        });
        alert("Updated Successfully.");
        const modal = document.getElementById('edit-profile-modal');
        if (modal) modal.classList.add('hidden');
        showPublicProfile(window.currentEditSellerId, window.currentUser);
    } catch(e) { alert(e.message); }
};

export const handleEditLogoUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const compressedBase64 = await compressImage(e.target.result, 400, 400);
        const inputEl = document.getElementById('edit-site-logo');
        if (inputEl) inputEl.value = compressedBase64;
    };
    reader.readAsDataURL(file);
};

const renderProfileCreationCTA = () => {
    const cta = document.getElementById('profile-conversion-cta');
    const target = document.getElementById('profile-render-target');
    if (cta) {
        cta.classList.remove('hidden');
        cta.innerHTML = `
            <div class="relative bg-black rounded-[2.5rem] p-8 text-white shadow-2xl text-center space-y-4">
                <h3 class="text-2xl font-black uppercase">${t('profile_cta_title')}</h3>
                <button onclick="openRegisterWizard()" class="bg-white text-black px-8 py-3 rounded-full text-xs font-black uppercase">
                    ${t('create_now')}
                </button>
            </div>
        `;
    }
    if (target) target.innerHTML = `<div class="py-20 text-center text-slate-300 uppercase font-black">No profile data found</div>`;
};

// Exposed Globals
window.handleFollow = (id) => handleFollow(id, window.currentUser);
window.showPublicProfile = (id) => showPublicProfile(id, window.currentUser);
window.sendCollabRequest = (id) => sendCollabRequest(id);
window.acceptCollabRequest = (reqId, fromId, toId) => acceptCollabRequest(reqId, fromId, toId);
window.terminateCollaboration = (id) => terminateCollaboration(id);
window.openAiSuggestionsModal = (id) => openAiSuggestionsModal(id);
window.closeAiSuggestionsModal = () => closeAiSuggestionsModal();
window.openMerchantWalletModal = (id) => openMerchantWalletModal(id);
window.closeMerchantWalletModal = () => closeMerchantWalletModal();
window.topUpWallet = (id) => topUpWallet(id);
window.confirmTopUpWallet = (id) => confirmTopUpWallet(id);
window.handleEditLogoUpload = handleEditLogoUpload;
window.shareProfileTo = shareProfileTo;
window.saveProfileChanges = saveProfileChanges;
