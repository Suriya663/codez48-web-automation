import { initAuthListener, trackReferralVisit } from './auth-secure.js';
import { fetchSellers, handleGlobalSearch, renderDirectory, allSellers } from './search.js';
import { showView, updateNavUI } from './navigation.js';
import { initOnboarding, refreshConversionCTAs } from './onboarding.js';
import { trackVisitor } from './analytics.js';

/**
 * Global App Initialization
 */
const initApp = () => {
    // 1. Initial State & Hash Routing
    const initialHash = window.location.hash.replace('#', '');

    // Parse 1-Click Email Collaboration Token Action URL
    if (initialHash.startsWith('collab-action')) {
        const queryStr = initialHash.includes('?') ? initialHash.split('?')[1] : '';
        const urlParams = new URLSearchParams(queryStr);
        const token = urlParams.get('token');
        const collabAction = urlParams.get('action') || 'accept';

        if (token) {
            fetch('/.netlify/functions/send-login-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'PROCESS_COLLAB_TOKEN',
                    collabToken: token,
                    collabAction: collabAction
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert(`🤝 CODEZ48 Collaboration Notice:\n${data.message}`);
                    window.location.hash = '';
                    if (data.sellerB) window.showPublicProfile(data.sellerB);
                } else {
                    alert("Collaboration Token Notice: " + (data.error || "Token invalid or expired."));
                }
            })
            .catch(err => {
                console.warn("[COLLAB TOKEN PROCESS NOTICE]:", err.message);
            });
        }
    }

    if (initialHash === 'push') {
        showView('tracker');
        setTimeout(() => { if (window.handleToolAction) window.handleToolAction('push'); }, 100);
    } else if (initialHash === 'tracker') {
        showView('tracker');
    } else if (initialHash === 'order-successful') {
        showView('landing');
        setTimeout(() => {
            alert("🛒 Order Placed Successfully!\nYour request has been transmitted to the merchant.");
            window.location.hash = '';
        }, 500);
    } else if (initialHash === 'payment-verified-successful') {
        showView('landing');
        setTimeout(() => {
            const toast = document.createElement('div');
            toast.className = 'fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-black text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-8 duration-500 border border-white/10';
            toast.innerHTML = `
                <div class="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                    <i class="fa-solid fa-check text-white text-sm"></i>
                </div>
                <div class="text-left">
                    <p class="text-[10px] font-black uppercase tracking-widest text-emerald-400">Security Protocol Verified</p>
                    <p class="text-xs font-bold">Payment Verified Successfully • Connected to Meta Pixel Registry</p>
                </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.classList.add('animate-out', 'fade-out', 'slide-out-to-top-8');
                setTimeout(() => toast.remove(), 500);
                window.location.hash = '';
            }, 5000);
        }, 500);
    } else {
        showView('landing');
    }

    // 2. Global Referral Proxy
    window.trackReferralVisit = trackReferralVisit;

    // 3. Referral Tracking
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    const hash = initialHash;
    const isProfileVisit = hash && !['pricing', 'merchant-directory', 'auth', 'push', 'tracker'].includes(hash);

    if (ref) {
        sessionStorage.setItem('dev_referral_code', ref);
        trackReferralVisit(ref, isProfileVisit);
    } else {
        const storedRef = sessionStorage.getItem('dev_referral_code');
        if (storedRef && isProfileVisit) {
            trackReferralVisit(storedRef, true);
        }
    }

    // 3. Onboarding & Tracking
    trackVisitor();
    initOnboarding();
    refreshConversionCTAs();

    // 3. Auth Sync
    initAuthListener(() => {
        // Stop automatic profile opening on reload.
        // User must manually click their profile to open it.
        /*
        const hash = window.location.hash.replace('#', '');
        if (window.currentUser && !window.currentUser.isAnonymous && !hash) {
            showPublicProfile(window.currentUser.uid, window.currentUser);
        }
        */
    });

    // 3. Data Fetch
    fetchSellers(() => {
        // Handle initial routing if hash present
        const hash = window.location.hash.replace('#', '');
        if (hash && hash !== 'auth' && !['pricing', 'merchant-directory'].includes(hash)) {
             // Logic to show profile from hash...
        }
    });

    // 4. Search Protection Logic
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
        searchInput.value = '';
        searchInput.addEventListener('input', (e) => handleGlobalSearch(e.target.value));

        const sanitizeSearchField = () => {
            const val = searchInput.value;
            if (val.startsWith('SLR-') || val.length > 20) {
                searchInput.value = '';
                if (allSellers.length > 0) renderDirectory();
            }
        };

        window.addEventListener('load', sanitizeSearchField);
        const killerInterval = setInterval(sanitizeSearchField, 500);
        setTimeout(() => clearInterval(killerInterval), 5000);
    }
};

document.addEventListener('DOMContentLoaded', initApp);
