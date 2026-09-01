import { db } from './firebase-config.js';
import { doc, getDoc, getDocs, collection, query, where, updateDoc, increment, setDoc, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
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
        let terminatedCount = 0;
        for (const docSnap of cSnap.docs) {
            const data = docSnap.data();
            if ((data.sellerA === currentSellerId && data.sellerB === targetSellerId) || (data.sellerA === targetSellerId && data.sellerB === currentSellerId)) {
                await updateDoc(docSnap.ref, { status: 'terminated', terminatedAt: new Date().toISOString() });
                terminatedCount++;
            }
        }

        alert("🤝 Un-collaboration complete. Partnership link & badge removed.");
        showPublicProfile(targetSellerId, window.currentUser);
    } catch (e) {
        alert("Un-collaborate Error: " + e.message);
    }
};

/**
 * Dismiss/Hide Individual AI Suggestion Card
 */
export const dismissSuggestion = (merchantId) => {
    const card = document.getElementById(`suggestion-card-${merchantId}`);
    if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => card.remove(), 250);
    }
};

/**
 * Section-Level Collapse/Expand for AI Suggestions
 */
export const toggleSuggestionsSection = () => {
    const bodyEl = document.getElementById('ai-suggestions-body');
    const iconEl = document.getElementById('ai-suggestions-toggle-icon');
    if (!bodyEl) return;

    if (bodyEl.classList.contains('hidden')) {
        bodyEl.classList.remove('hidden');
        if (iconEl) iconEl.className = 'fa-solid fa-chevron-up';
        localStorage.removeItem('c48_suggestions_collapsed');
    } else {
        bodyEl.classList.add('hidden');
        if (iconEl) iconEl.className = 'fa-solid fa-chevron-down';
        localStorage.setItem('c48_suggestions_collapsed', 'true');
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
 * Accept Collaboration Request
 */
export const acceptCollabRequest = async (reqId, fromSellerId, toSellerId) => {
    try {
        const collabId = `PARTNER_${fromSellerId}_${toSellerId}`;
        await setDoc(doc(db, "collaborations", collabId), {
            collabId,
            sellerA: fromSellerId,
            sellerB: toSellerId,
            status: 'active',
            activatedAt: new Date().toISOString()
        });

        await updateDoc(doc(db, "collaboration_requests", reqId), { status: 'accepted' });
        alert("🤝 Collaboration Accepted! You are now official business partners.");
        showPublicProfile(toSellerId, window.currentUser);
    } catch (e) {
        alert("Accept Error: " + e.message);
    }
};

/**
 * Render AI "Suggestions to Grow Your Business" at TOP of Profile with Collapse Toggle
 */
export const renderBusinessSuggestions = async (currentSeller) => {
    const suggestionsContainer = document.getElementById('ai-business-suggestions-container');
    if (!suggestionsContainer) return;

    try {
        const allSnap = await getDocs(collection(db, "sellers"));
        const otherMerchants = [];
        allSnap.forEach(d => {
            if (d.id !== currentSeller.id) {
                otherMerchants.push({ id: d.id, ...d.data() });
            }
        });

        if (otherMerchants.length === 0) {
            suggestionsContainer.innerHTML = '';
            return;
        }

        const isCollapsed = localStorage.getItem('c48_suggestions_collapsed') === 'true';

        // Deep AI Match logic: pair offline stores with IT/website creation, wiring with electronics suppliers
        const currentDesc = (currentSeller.productDescription || '' + currentSeller.servicesDescription || '' + currentSeller.brand || '').toLowerCase();

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

        suggestionsContainer.innerHTML = `
            <div class="max-w-5xl mx-auto px-6 pt-6 mb-8">
                <div class="p-6 md:p-8 bg-gradient-to-br from-purple-50 via-slate-50 to-purple-50/50 rounded-[2.5rem] border border-purple-100/80 shadow-xl space-y-4">
                    <div class="flex justify-between items-center border-b border-purple-100 pb-3">
                        <div class="flex items-center gap-2">
                            <span class="px-3 py-1 bg-purple-100 text-purple-800 text-[8px] font-black rounded-full uppercase tracking-widest border border-purple-200">
                                <i class="fa-solid fa-wand-magic-sparkles mr-1 text-purple-600"></i> AI Synergy Match
                            </span>
                            <h3 class="text-lg md:text-xl font-black text-black uppercase tracking-tight">Suggestions to Grow Your Business</h3>
                        </div>
                        <button onclick="window.toggleSuggestionsSection()" class="px-3 py-1 bg-white border border-slate-200 text-slate-500 hover:text-black rounded-xl text-[9px] font-black uppercase tracking-widest transition flex items-center gap-1.5 shadow-sm">
                            <span>Collapse / Expand</span>
                            <i id="ai-suggestions-toggle-icon" class="fa-solid ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
                        </button>
                    </div>

                    <div id="ai-suggestions-body" class="${isCollapsed ? 'hidden' : ''} space-y-3">
                        <p class="text-xs text-slate-500 font-medium">Recommended business partners to source products, expand IT infrastructure, and boost marketing.</p>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            ${suggestions.map(m => `
                                <div id="suggestion-card-${m.id}" class="p-4 bg-white rounded-2xl border border-purple-100/80 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between relative group">
                                    <button onclick="window.dismissSuggestion('${m.id}')" class="absolute top-3 right-3 w-6 h-6 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-full flex items-center justify-center text-xs transition" title="Dismiss / Hide Suggestion">
                                        <i class="fa-solid fa-xmark"></i>
                                    </button>
                                    <div class="space-y-2 pr-6">
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                                <img src="${m.logo || 'https://placehold.co/100x100?text=Node'}" class="w-full h-full object-contain">
                                            </div>
                                            <div class="min-w-0 flex-1">
                                                <h5 class="text-xs font-black text-black truncate uppercase">${m.brand || 'Merchant Node'}</h5>
                                                <p class="text-[8px] font-mono text-purple-700 font-bold truncate">${m.companyName || 'Verified Synergy Partner'}</p>
                                            </div>
                                        </div>
                                        <p class="text-[9px] text-slate-500 font-medium line-clamp-2">${m.description || 'Offers business collaboration opportunities.'}</p>
                                    </div>

                                    <div class="pt-2 border-t border-slate-100 flex justify-between items-center">
                                        <button onclick="window.sendCollabRequest('${m.id}')" class="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[8px] font-black uppercase tracking-widest transition shadow-md shadow-purple-200 flex items-center justify-center gap-1">
                                            <i class="fa-solid fa-handshake"></i> Connect & Collaborate
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        console.warn("[AI SUGGESTIONS NOTICE]:", e.message);
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

        // Strictly check if current user is an active Collab Partner (STRICT PRIVACY GUARD)
        const currentSId = localStorage.getItem('tori_seller_id') || currentUser?.uid;
        const isCollabPartner = await checkCollabStatus(sellerId, currentSId);

        const adminContainer = document.getElementById('admin-action-container');
        if (adminContainer) {
            adminContainer.innerHTML = `
                <button onclick="openShareProfile('${sellerId}', '${seller.brand || 'Elite Node'}')" class="bg-slate-50 text-slate-400 text-[9px] font-black px-6 py-2.5 rounded-full uppercase tracking-widest flex items-center gap-2 border border-slate-100 hover:text-black hover:border-slate-200 transition">
                    <i class="fa-solid fa-share-nodes"></i> Share Node
                </button>
            `;

            if (currentUser && (currentUser.uid === sellerId || currentUser.sellerId === sellerId)) {
                if (isPending) {
                    adminContainer.innerHTML += `
                        <span class="bg-amber-100 text-amber-600 text-[10px] font-black px-6 py-2.5 rounded-full uppercase tracking-widest border border-amber-200">
                            <i class="fa-solid fa-clock"></i> Authorization Pending
                        </span>
                    `;
                } else {
                    adminContainer.innerHTML += `
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
                <!-- AI Suggestions Container Positioned at TOP by Default -->
                <div id="ai-business-suggestions-container"></div>

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

        // Render AI Suggestions
        await renderBusinessSuggestions(sellerData);

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
window.dismissSuggestion = (id) => dismissSuggestion(id);
window.toggleSuggestionsSection = () => toggleSuggestionsSection();
window.shareProfileTo = shareProfileTo;
window.saveProfileChanges = saveProfileChanges;
