import { db } from './firebase-config.js';
import { doc, getDoc, getDocs, collection, query, where, updateDoc, increment, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
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
                // No profile found - Show Conversion CTA if it's the current user
                if (currentUser && currentUser.uid === sellerId) {
                    renderProfileCreationCTA();
                    showView('public-profile');
                    return;
                }
                throw new Error("Merchant Not Found");
            }
        }

        // Hide CTA if profile exists
        const cta = document.getElementById('profile-conversion-cta');
        if (cta) cta.classList.add('hidden');

        const seller = sellerDoc.data();
        const sellerData = { id: sellerDoc.id, ...seller };

        const safeBrand = (seller.brand || 'Elite Node').replace(/'/g, "\\'");
        const safeAppName = (seller.androidAppName || seller.brand || 'MerchantApp').replace(/'/g, "\\'");
        const safeStorefront = `https://torikredik.com/seller/index.html?s=${(seller.tier === 'premium' || seller.tier === 'Premium') ? (seller.customUrl || seller.username) : (seller.username + '.codeez')}`;

        if (!isPending) {
            const urlAlias = (seller.tier === 'premium' || seller.tier === 'Premium')
                ? (seller.customUrl || seller.username)
                : `${seller.username}.codeez`;

            if(window.location.hash !== `#${urlAlias}`) {
                window.history.pushState(null, null, `#${urlAlias}`);
            }
        }

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
        if (!isFollowing && currentUser && currentUser.followers?.includes(sellerId)) {
            followBtnText = 'Follow Back';
        }

        const template = seller.preferredTemplate || 'templateA';
        const target = document.getElementById('profile-render-target');
        if (target) {
            target.className = `view-active ${template === 'templateA' ? 'template-a' : 'template-b'}`;
            if (template === 'templateA') {
                target.innerHTML = `
                    <div class="profile-header">
                        <div class="logo-container bg-slate-50 rounded-[3rem] border border-slate-50 flex items-center justify-center p-1 shadow-2xl overflow-hidden">
                            <img src="${seller.logo || 'https://placehold.co/200x200?text=Logo'}" class="w-full h-full object-contain mix-blend-multiply">
                        </div>
                        <div class="max-w-5xl mx-auto">
                            <div class="flex justify-center items-center gap-3 mb-6">
                                <span class="text-[10px] font-black text-royal uppercase tracking-[0.2em]">${displayUrl}</span>
                                <span class="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                                <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">${followersCount} Followers</span>
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

                            <div class="mb-12 max-w-2xl mx-auto">
                                <div id="services-summary-${sellerId}" class="flex flex-wrap justify-center gap-2">
                                    ${(seller.services || []).slice(0, 5).map(s => `<span class="bg-slate-50 border border-slate-100 text-slate-400 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">${s}</span>`).join('')}
                                    ${(seller.services || []).length > 5 ? `<button onclick="window.toggleFullServices('${sellerId}')" class="text-royal text-[9px] font-black uppercase tracking-widest ml-2 hover:underline">... +${seller.services.length - 5} More</button>` : ''}
                                </div>
                            </div>
                            <div class="flex flex-wrap justify-center gap-4">
                                <button onclick="window.handleFollow('${sellerId}')" class="${isFollowing ? 'bg-slate-100 text-slate-400' : 'btn-black'} text-[10px] font-black px-10 py-4 rounded-full uppercase tracking-widest shadow-xl">
                                    ${followBtnText}
                                </button>
                                <a href="seller/index.html?s=${(seller.tier === 'premium' || seller.tier === 'Premium') ? (seller.customUrl || seller.username) : (seller.username + '.codeez')}" class="btn-royal text-[10px] font-black px-10 py-4 rounded-full uppercase tracking-widest shadow-xl flex items-center justify-center">
                                    Go to Product Page
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Template B
                target.innerHTML = `
                    <div class="template-b">
                        <div class="banner bg-slate-100 shadow-inner">
                            <img src="${seller.banner || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2070'}" alt="Banner">
                        </div>
                        <div class="profile-header">
                            <aside class="space-y-8 md:sticky md:top-32">
                                <div class="w-full aspect-square md:w-80 md:h-80 bg-white rounded-[2rem] border border-slate-100 flex items-center justify-center p-1 shadow-xl">
                                    <img src="${seller.logo || 'https://placehold.co/200x200?text=Logo'}" class="w-full h-full object-contain mix-blend-multiply">
                                </div>
                                <div class="space-y-4">
                                    <div class="flex items-center gap-2"><span class="text-[9px] font-black text-royal uppercase tracking-widest">${displayUrl}</span></div>
                                    <div class="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest"><i class="fa-solid fa-users"></i><span>${followersCount} Followers</span></div>
                                    <button onclick="window.handleFollow('${sellerId}')" class="w-full ${isFollowing ? 'bg-slate-50 text-slate-300' : 'btn-royal'} py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest">${followBtnText}</button>
                                </div>
                            </aside>
                            <div>
                                <h1 class="text-3xl md:text-5xl font-black text-black mb-3 uppercase tracking-tightest flex flex-wrap items-center gap-3 leading-none">
                                    ${seller.brand}
                                    ${isPremiumTier ? `<i class="fa-solid fa-circle-check text-blue-500 text-xl md:text-3xl self-center" title="Verified Merchant"></i>` : ''}
                                </h1>
                                <div class="space-y-6">
                                    <p class="text-slate-500 text-base md:text-lg font-medium leading-relaxed">${seller.description}</p>
                                    ${formatDescription(seller.servicesDescription, 'services', 'Services')}
                                    ${formatDescription(seller.productDescription, 'products', 'Products')}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        // Spotlight & Products Grid Logic
        const spotlightContainer = document.getElementById('profile-spotlight-container');
        if (spotlightContainer) spotlightContainer.innerHTML = '';
        if (isPremiumTier && seller.featuredProductId) {
             const pDoc = await getDoc(doc(db, "products", seller.featuredProductId));
             if (pDoc.exists()) {
                 const p = pDoc.data();
                 if (spotlightContainer) {
                     spotlightContainer.innerHTML = `
                         <div class="max-w-5xl mx-auto px-6 mb-16">
                            <div class="bg-gradient-to-br from-royal to-indigo-900 rounded-[3.5rem] p-1 shadow-2xl">
                                <div class="bg-white rounded-[3.4rem] overflow-hidden flex flex-col md:flex-row items-center gap-10 p-8 md:p-16">
                                    <div class="w-full md:w-1/2 aspect-square bg-slate-50 rounded-[2.5rem] p-8 relative group overflow-hidden">
                                        <div class="absolute top-6 left-6 z-10 bg-royal text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-lg animate-bounce">
                                            Featured Highlight
                                        </div>
                                        <img src="${p.image}" class="w-full h-full object-contain transition duration-700 group-hover:scale-110">
                                    </div>
                                    <div class="w-full md:w-1/2 text-center md:text-left space-y-6">
                                        <h2 class="text-3xl md:text-5xl font-black text-black tracking-tightest uppercase">${p.name}</h2>
                                        <p class="text-slate-500 text-lg leading-relaxed">${p.description || 'Premium selection.'}</p>
                                        <div class="flex items-center justify-center md:justify-start gap-8">
                                            <div>
                                                <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Exclusive Value</p>
                                                <p class="text-4xl font-black text-royal">₹${p.price}</p>
                                            </div>
                                            <button onclick="window.location.href='seller/index.html?s=${(seller.tier === 'premium' || seller.tier === 'Premium') ? (seller.customUrl || seller.username) : (seller.username + '.codeez')}&pid=${pDoc.id}'" class="btn-black text-[10px] font-black px-12 py-5 rounded-full uppercase tracking-widest shadow-2xl">
                                                Aquire Now
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                         </div>
                     `;
                 }
             }
        }

        const pq = query(collection(db, "products"), where("sellerId", "==", sellerId));
        const pSnap = await getDocs(pq);
        const pGrid = document.getElementById('profile-products-grid');
        if (pGrid) {
            pGrid.innerHTML = '';
            pGrid.className = "flex flex-row overflow-x-auto gap-4 md:gap-8 pb-8 custom-scrollbar scroll-smooth snap-x";
            pSnap.forEach(pDoc => {
                const p = pDoc.data();
                const card = document.createElement('div');
                card.className = "glass-card p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-white space-y-4 md:space-y-6 flex-shrink-0 w-[240px] md:w-[320px] group transition-all hover:shadow-2xl snap-center cursor-pointer";
                card.onclick = () => window.location.href = `seller/index.html?s=${(seller.tier === 'premium' || seller.tier === 'Premium') ? (seller.customUrl || seller.username) : (seller.username + '.codeez')}&pid=${pDoc.id}`;
                card.innerHTML = `
                    <div class="aspect-square bg-slate-50 rounded-2xl md:rounded-3xl p-4 md:p-6 overflow-hidden relative">
                        <img src="${p.image || 'https://placehold.co/300x300?text=Product'}" class="w-full h-full object-contain transition duration-500 group-hover:scale-110">
                    </div>
                    <div class="space-y-3 md:space-y-4">
                        <h5 class="font-black text-black text-sm md:text-lg leading-tight">${p.name}</h5>
                        <div class="flex justify-between items-end pt-2">
                            <div>
                                <p class="text-[8px] md:text-[9px] font-black text-slate-300 uppercase tracking-widest">Net Value</p>
                                <span class="text-xl md:text-3xl font-black text-royal">₹${p.price}</span>
                            </div>
                            <div class="bg-black text-white text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-xl opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                                Acquire
                            </div>
                        </div>
                    </div>
                `;
                pGrid.appendChild(card);
            });
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
            // Only update "Following" count if the user is a merchant
            if (!currentUser.isAnonymous) {
                await updateDoc(myRef, { followingCount: increment(-1) });
            }
        } else {
            followers.push(currentUser.uid);
            await updateDoc(sellerRef, { followers: followers, followersCount: increment(1) });
            // Only update "Following" count if the user is a merchant
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
 * APK Download Handler
 */
export const triggerApkDownload = async (sellerId, username, appName, storefrontUrl) => {
    const statusA = document.getElementById(`app-download-status-${sellerId}`);
    const showStatus = (text) => { if(statusA) { statusA.innerText = text; statusA.classList.remove('hidden'); } };
    const hideStatus = () => { if(statusA) statusA.classList.add('hidden'); };

    const buildRef = doc(db, "apk_build_queue", sellerId);
    try {
        const snap = await getDoc(buildRef);
        if (snap.exists()) {
            const data = snap.data();
            if (data.status === 'completed' && data.apkUrl) {
                showStatus("Ready! Downloading...");
                window.open(data.apkUrl, '_blank');
                setTimeout(hideStatus, 3000);
            } else showStatus("Request pending.");
        } else {
            showStatus("Requesting...");
            await setDoc(buildRef, { sellerId, username, appName, storefrontUrl, status: 'pending', timestamp: serverTimestamp() });
            setTimeout(() => showStatus("Sent!"), 2000);
            setTimeout(hideStatus, 6000);
        }
    } catch(e) { showStatus("Error."); }
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

/**
 * Render Profile Creation CTA for users without one
 */
const renderProfileCreationCTA = () => {
    const cta = document.getElementById('profile-conversion-cta');
    const target = document.getElementById('profile-render-target');
    const productsGrid = document.getElementById('profile-products-grid');

    if (cta) {
        const finalLogos = getSessionLogos();

        cta.classList.remove('hidden');
        cta.innerHTML = `
            <div class="relative group mx-auto max-w-full overflow-hidden">
                <div class="absolute inset-0 bg-white blur-[80px] rounded-full scale-110 opacity-50"></div>
                <div class="relative bg-black rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-16 text-white shadow-2xl overflow-hidden">
                    <div class="absolute top-0 right-0 w-64 h-64 bg-royal/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                    <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-10">
                        <div class="text-center md:text-left space-y-4">
                            <div class="inline-flex items-center gap-2 bg-white/10 text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-white/10">
                                Node Discovery
                            </div>
                            <h3 class="text-2xl md:text-5xl font-black uppercase tracking-tightest leading-tight break-words px-2">${t('profile_cta_title')}</h3>
                            <p class="text-white/60 font-medium text-base md:text-lg max-w-md break-words px-2">${t('profile_cta_desc')}</p>

                            <div class="flex items-center justify-center md:justify-start gap-4 pt-4">
                                <div class="flex -space-x-2 overflow-hidden">
                                    ${finalLogos.map(url => `<img class="inline-block h-8 w-8 rounded-full ring-2 ring-black object-cover bg-white" src="${url}" alt="Node">`).join('')}
                                </div>
                                <p class="text-[8px] font-black text-white/40 uppercase tracking-widest">Active Nodes</p>
                            </div>
                        </div>
                        <button onclick="openRegisterWizard(); window.trackEvent('cta_create_clicked', { location: 'profile' })" class="bg-white text-black px-10 md:px-12 py-4 md:py-5 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-royal hover:text-white transition-all duration-300 transform hover:scale-105 w-full md:w-auto">
                            ${t('create_now')}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    if (target) target.innerHTML = `<div class="py-32 text-center">
        <div class="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-200">
            <i class="fa-solid fa-ghost text-3xl"></i>
        </div>
        <p class="text-slate-300 font-black uppercase tracking-[0.2em] text-[10px]">No protocol data detected</p>
    </div>`;
    if (productsGrid) productsGrid.innerHTML = '';
};

// Exposed Globals
window.handleFollow = (id) => handleFollow(id, window.currentUser);
window.triggerApkDownload = triggerApkDownload;
window.showPublicProfile = (id) => showPublicProfile(id, window.currentUser);
window.shareProfileTo = shareProfileTo;
window.saveProfileChanges = saveProfileChanges;
window.toggleFullServices = (id) => {
    const s = document.getElementById(`services-summary-${id}`);
    if (s) s.classList.toggle('hidden');
};
window.toggleFullDesc = (id) => {
    const s = document.getElementById(`desc-short-${id}`);
    const f = document.getElementById(`desc-full-${id}`);
    if (s && f) {
        s.classList.toggle('hidden');
        f.classList.toggle('hidden');
    }
};
