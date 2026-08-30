import { db, auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

/**
 * Update About Page Navigation based on Auth
 */
const updateNavUI = (userData) => {
    const joinBtn = document.getElementById('nav-join-btn');
    const profileBtn = document.getElementById('nav-profile-btn');
    const joinBtnMob = document.getElementById('nav-join-btn-mobile');
    const profileBtnMob = document.getElementById('nav-profile-btn-mobile');

    const isMerchant = userData && (userData.sellerId || userData.isPending);

    if (isMerchant) {
        if(joinBtn) joinBtn.classList.add('hidden');
        if(profileBtn) {
            profileBtn.classList.remove('hidden');
            const alias = userData.username || userData.sellerId;
            profileBtn.onclick = () => window.location.href = `index.html#${alias}${userData.tier === 'premium' ? '' : '.codeez'}`;
        }
        if(joinBtnMob) joinBtnMob.classList.add('hidden');
        if(profileBtnMob) {
            profileBtnMob.classList.remove('hidden');
            const alias = userData.username || userData.sellerId;
            profileBtnMob.onclick = () => {
                window.location.href = `index.html#${alias}${userData.tier === 'premium' ? '' : '.codeez'}`;
            };
        }
    } else {
        if(joinBtn) joinBtn.classList.remove('hidden');
        if(profileBtn) profileBtn.classList.add('hidden');
        if(joinBtnMob) joinBtnMob.classList.remove('hidden');
        if(profileBtnMob) profileBtnMob.classList.add('hidden');
    }
};

window.toggleMobileMenu = () => {
    const menu = document.getElementById('mobile-nav-menu');
    if(menu) menu.classList.toggle('hidden');
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        let sDoc = await getDoc(doc(db, "sellers", user.uid));
        const storedSellerId = localStorage.getItem('tori_seller_id');
        if (!sDoc.exists() && storedSellerId) {
            sDoc = await getDoc(doc(db, "sellers", storedSellerId));
        }

        if(sDoc.exists()) {
            updateNavUI({ ...sDoc.data(), uid: sDoc.id });
        } else {
            const reqId = storedSellerId || user.uid;
            const rDoc = await getDoc(doc(db, "seller_requests", reqId));
            if (rDoc.exists()) {
                updateNavUI({ ...rDoc.data(), uid: rDoc.id, isPending: true });
            } else {
                updateNavUI(null);
            }
        }
    } else {
        updateNavUI(null);
    }
});
