import { showPublicProfile } from './profile.js';
import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { trackEvent } from './analytics.js';
import { refreshConversionCTAs } from './onboarding.js';

export const navigationState = {
    authMode: 'login'
};

/**
 * Switch between SPA views
 */
export const showView = (viewName) => {
    const target = document.getElementById(`${viewName}-view`);
    if (!target) return;

    const isAlreadyActive = target.classList.contains('view-active');

    if (!isAlreadyActive) {
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('view-active'));
        target.classList.add('view-active');

        // Reset scroll position to top
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        // Ensure body scroll is unlocked when changing views
        document.body.classList.remove('overflow-hidden');

        trackEvent('view_changed', { view: viewName });
        refreshConversionCTAs();

        if (viewName === 'tracker') {
            if (window.showTrackerSection) window.showTrackerSection('list');
        }
    }

    const nav = document.getElementById('main-nav');
    if (nav) nav.classList.toggle('hidden', ['seller', 'developer', 'automation'].includes(viewName));

    if (viewName === 'landing' && !window.location.hash) window.location.hash = '';
    if (viewName === 'auth') window.location.hash = 'auth';
};

/**
 * Mobile Hamburger Toggle
 */
export const toggleMobileMenu = () => {
    const menu = document.getElementById('mobile-nav-menu');
    if (menu) menu.classList.toggle('hidden');
};

/**
 * Switch Registration Steps
 */
export const setWizardStep = (step) => {
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(`auth-step-${step}`);
    if (target) target.classList.remove('hidden');
};

/**
 * Update Header UI based on Auth State
 */
export const updateNavUI = (currentUser) => {
    const regBtn = document.getElementById('nav-register-btn');
    const profileBtn = document.getElementById('nav-profile-btn');
    const regBtnMob = document.getElementById('nav-register-btn-mobile');
    const profileBtnMob = document.getElementById('nav-profile-btn-mobile');

    const starterCta = document.getElementById('cta-starter-btn');
    const premiumCta = document.getElementById('cta-premium-btn');

    const isMerchant = currentUser && (currentUser.sellerId || currentUser.isPending);

    if (isMerchant) {
        if(regBtn) regBtn.classList.add('hidden');
        if(profileBtn) {
            profileBtn.classList.remove('hidden');
            if (currentUser.logo) {
                profileBtn.innerHTML = `<img src="${currentUser.logo}" class="w-full h-full object-cover">`;
            } else {
                profileBtn.innerHTML = `<i class="fa-solid fa-circle-user text-2xl text-royal"></i>`;
            }
        }

        if(regBtnMob) regBtnMob.classList.add('hidden');
        if(profileBtnMob) {
            profileBtnMob.classList.remove('hidden');
            if (currentUser.logo) {
                profileBtnMob.querySelector('i')?.classList.add('hidden');
                let img = profileBtnMob.querySelector('img');
                if (!img) {
                    img = document.createElement('img');
                    img.className = "w-6 h-6 rounded-full object-cover";
                    profileBtnMob.prepend(img);
                }
                img.src = currentUser.logo;
            }
        }

        if(starterCta) starterCta.classList.add('hidden');
        if(premiumCta) premiumCta.classList.add('hidden');
    } else {
        if(regBtn) regBtn.classList.remove('hidden');
        if(profileBtn) profileBtn.classList.add('hidden');
        if(regBtnMob) regBtnMob.classList.remove('hidden');
        if(profileBtnMob) profileBtnMob.classList.add('hidden');
        if(starterCta) starterCta.classList.remove('hidden');
        if(premiumCta) premiumCta.classList.remove('hidden');
    }
};

/**
 * Logout Logic
 */
export const userLogout = () => {
    if(confirm("Logout from CODEZ48 Network?")) {
        const sId = localStorage.getItem('tori_seller_id') || 'site_001';
        const user = window.currentUser || {};
        fetch('/.netlify/functions/send-login-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'USER_LOGOUT_ALERT',
                siteId: sId,
                sellerId: sId,
                userName: user.brand || user.username || 'Merchant Node',
                userEmail: user.email || ''
            })
        }).catch(() => {});
        localStorage.removeItem('tori_seller_id');
        window.location.reload();
    }
};

// --- Modal & Action Handlers ---

export const openShareProfile = (id, name) => {
    window.currentShareId = id;
    window.currentShareName = name;
    document.getElementById('share-profile-modal').classList.remove('hidden');
};

export const closeShareProfile = () => {
    document.getElementById('share-profile-modal').classList.add('hidden');
};

export const openNodeSettings = async (id) => {
    let docSnap = await getDoc(doc(db, "sellers", id));
    if (!docSnap.exists()) docSnap = await getDoc(doc(db, "seller_requests", id));

    if(docSnap.exists()){
        const d = docSnap.data();

        // Update current language name
        const langNames = { en: 'English', ta: 'தமிழ்', hi: 'हिन्दी', ml: 'മലയാളം', te: 'తెలుగు' };
        const currentLang = localStorage.getItem('codez48_lang') || 'en';
        const langDisplay = document.getElementById('current-lang-name');
        if (langDisplay) langDisplay.innerText = langNames[currentLang];

        document.getElementById('settings-res-id').innerText = d.sellerId || 'N/A';
        document.getElementById('settings-res-pass').innerText = d.password || 'N/A';

        document.getElementById('settings-res-id').classList.add('blur-sm');
        document.getElementById('settings-res-pass').classList.add('blur-sm');

        const activationDate = d.approvedAt || d.date;
        if (activationDate) {
            const dateObj = new Date(activationDate);
            document.getElementById('settings-res-date').innerText = dateObj.toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric'
            });

            const now = new Date();
            const diffMs = now - dateObj;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const remaining = Math.max(0, 30 - diffDays);

            document.getElementById('settings-res-days').innerText = `${remaining} Days`;
            const progress = (remaining / 30) * 100;
            const progressEl = document.getElementById('settings-res-progress');
            if (progressEl) progressEl.style.width = `${progress}%`;

            const rechargeContainer = document.getElementById('recharge-node-container');
            if (rechargeContainer) rechargeContainer.classList.toggle('hidden', remaining > 3);
        }

        switchSettingsTab('details');
        document.getElementById('node-settings-modal').classList.remove('hidden');
    }
};

export const closeNodeSettings = () => {
    document.getElementById('node-settings-modal').classList.add('hidden');
};

export const switchSettingsTab = (tab) => {
    const isDetails = tab === 'details';
    const detailView = document.getElementById('settings-view-details');
    const ledgerView = document.getElementById('settings-view-ledger');
    if (detailView) detailView.classList.toggle('hidden', !isDetails);
    if (ledgerView) ledgerView.classList.toggle('hidden', isDetails);

    const btnD = document.getElementById('tab-btn-details');
    const btnL = document.getElementById('tab-btn-ledger');
    if (btnD) btnD.className = isDetails ? 'text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full bg-black text-white' : 'text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full bg-slate-100 text-slate-400';
    if (btnL) btnL.className = !isDetails ? 'text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full bg-black text-white' : 'text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full bg-slate-100 text-slate-400';
};

export const openEditProfile = async (id) => {
    window.currentEditSellerId = id;
    const docSnap = await getDoc(doc(db, "sellers", id));
    if(docSnap.exists()){
        const d = docSnap.data();
        document.getElementById('edit-site-name').value = d.brand || '';
        document.getElementById('edit-site-logo').value = d.logo || '';
        document.getElementById('edit-secondary-link').value = d.secondaryLink || '';
        document.getElementById('edit-services-desc').value = d.servicesDescription || '';
        document.getElementById('edit-product-desc').value = d.productDescription || '';
        document.getElementById('edit-profile-modal').classList.remove('hidden');
    }
};

export const closeEditProfile = () => {
    document.getElementById('edit-profile-modal').classList.add('hidden');
};

// Global Exposure for HTML
window.showView = showView;
window.toggleMobileMenu = toggleMobileMenu;
window.userLogout = userLogout;
window.openShareProfile = openShareProfile;
window.closeShareProfile = closeShareProfile;
window.openNodeSettings = openNodeSettings;
window.closeNodeSettings = closeNodeSettings;
window.switchSettingsTab = switchSettingsTab;
window.openEditProfile = openEditProfile;
window.closeEditProfile = closeEditProfile;
window.setWizardStep = setWizardStep;
window.goToMyProfile = () => { if (window.currentUser) showPublicProfile(window.currentUser.uid, window.currentUser); };
window.revealCredential = (type) => {
    const el = document.getElementById(type === 'id' ? 'settings-res-id' : 'settings-res-pass');
    if (el) el.classList.toggle('blur-sm');
};
