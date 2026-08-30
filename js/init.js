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
    if (initialHash === 'push') {
        showView('tracker');
        setTimeout(() => { if (window.handleToolAction) window.handleToolAction('push'); }, 100);
    } else if (initialHash === 'tracker') {
        showView('tracker');
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
